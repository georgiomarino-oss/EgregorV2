import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY env vars');
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const runId = `rc2-${Date.now()}`;
const password = `Rc2!${Date.now()}Ab`;

function userEmail(label) {
  return `${label}.${runId}@example.test`;
}

async function ensureSignedInUser(label) {
  const email = userEmail(label);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { label, runId },
    });

    if (created.error) {
      throw new Error(`Failed to create ${label} user: ${created.error.message}`);
    }

    signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.user) {
      throw new Error(`Failed to sign in ${label} user after create: ${signIn.error?.message ?? 'unknown'}`);
    }
  }

  if (!signIn.data.user) {
    throw new Error(`No signed-in user returned for ${label}`);
  }

  return { client, email, userId: signIn.data.user.id };
}

function asMessage(error, fallback) {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return `${error.message}`;
  }

  return fallback;
}

async function main() {
  const results = {
    runId,
    startedAt: new Date().toISOString(),
    users: {},
    checks: {},
    artifacts: {},
  };

  let circleId = null;
  let sessionId = null;

  try {
    const host = await ensureSignedInUser('host');
    const participant = await ensureSignedInUser('participant');
    const outsider = await ensureSignedInUser('outsider');

    results.users = {
      host: { email: host.email, userId: host.userId },
      participant: { email: participant.email, userId: participant.userId },
      outsider: { email: outsider.email, userId: outsider.userId },
    };

    const circleInsert = await admin
      .from('circles')
      .insert({
        created_by: host.userId,
        description: `RC2 shared-solo regression ${runId}`,
        name: `RC2 Circle ${runId}`,
      })
      .select('id')
      .single();

    if (circleInsert.error || !circleInsert.data?.id) {
      throw new Error(`Failed to create host circle: ${circleInsert.error?.message ?? 'unknown'}`);
    }

    circleId = circleInsert.data.id;
    results.artifacts.circleId = circleId;

    const membershipInsert = await admin.from('circle_members').upsert(
      [
        { circle_id: circleId, user_id: host.userId },
        { circle_id: circleId, user_id: participant.userId },
      ],
      { onConflict: 'circle_id,user_id' },
    );

    if (membershipInsert.error) {
      throw new Error(`Failed to seed circle memberships: ${membershipInsert.error.message}`);
    }

    const hostSessionInsert = await host.client
      .from('shared_solo_sessions')
      .insert({
        duration_minutes: 5,
        host_user_id: host.userId,
        intention: `RC2 Shared Solo ${runId}`,
        playback_position_ms: 0,
        playback_state: 'idle',
        script_text: 'RC2 regression script body.',
        status: 'active',
        voice_id: 'V904i8ujLitGpMyoTznT',
      })
      .select('id,host_user_id,status,playback_state,playback_position_ms')
      .single();

    if (hostSessionInsert.error || !hostSessionInsert.data?.id) {
      throw new Error(`Host failed to create shared session: ${hostSessionInsert.error?.message ?? 'unknown'}`);
    }

    sessionId = hostSessionInsert.data.id;
    results.artifacts.sessionId = sessionId;

    const hostJoin = await host.client
      .from('shared_solo_session_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: host.userId,
          role: 'host',
          is_active: true,
          last_seen_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,user_id' },
      );

    results.checks.host_start = {
      pass: !hostJoin.error,
      detail: hostJoin.error?.message ?? 'Host created session and joined as host.',
    };

    const participantJoin = await participant.client
      .from('shared_solo_session_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: participant.userId,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,user_id' },
      );

    results.checks.participant_join = {
      pass: !participantJoin.error,
      detail: participantJoin.error?.message ?? 'Participant join succeeded under RLS.',
    };

    const hostSync = await host.client
      .from('shared_solo_sessions')
      .update({
        playback_position_ms: 120000,
        playback_state: 'playing',
        started_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', sessionId)
      .eq('host_user_id', host.userId)
      .select('id,playback_position_ms,playback_state,status')
      .single();

    const participantReadAfterSync = await participant.client
      .from('shared_solo_sessions')
      .select('id,playback_position_ms,playback_state,status')
      .eq('id', sessionId)
      .maybeSingle();

    const syncPass =
      !hostSync.error &&
      !participantReadAfterSync.error &&
      participantReadAfterSync.data?.playback_position_ms === 120000 &&
      participantReadAfterSync.data?.playback_state === 'playing';

    results.checks.sync = {
      pass: Boolean(syncPass),
      detail: syncPass
        ? 'Participant observed host playback state update.'
        : `Host sync error=${hostSync.error?.message ?? 'none'} participant read error=${participantReadAfterSync.error?.message ?? 'none'} participant state=${JSON.stringify(participantReadAfterSync.data)}`,
    };

    const participantBackground = await participant.client
      .from('shared_solo_session_participants')
      .update({ is_active: false, last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', participant.userId);

    const participantResume = await participant.client
      .from('shared_solo_session_participants')
      .update({ is_active: true, last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', participant.userId)
      .select('session_id,user_id,is_active,last_seen_at')
      .single();

    results.checks.background_resume = {
      pass:
        !participantBackground.error &&
        !participantResume.error &&
        participantResume.data?.is_active === true,
      detail:
        participantBackground.error?.message || participantResume.error?.message
          ? `background=${participantBackground.error?.message ?? 'ok'} resume=${participantResume.error?.message ?? 'ok'}`
          : 'Participant presence recovered after background/resume simulation.',
    };

    const hostEndSession = await host.client
      .from('shared_solo_sessions')
      .update({
        status: 'ended',
        playback_state: 'ended',
        ended_at: new Date().toISOString(),
        playback_position_ms: 300000,
      })
      .eq('id', sessionId)
      .eq('host_user_id', host.userId)
      .select('id,status,playback_state,ended_at')
      .single();

    const hostEndParticipants = await host.client
      .from('shared_solo_session_participants')
      .update({ is_active: false, last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('is_active', true);

    results.checks.host_end_cleanup = {
      pass: !hostEndSession.error && !hostEndParticipants.error,
      detail:
        hostEndSession.error?.message || hostEndParticipants.error?.message
          ? `session=${hostEndSession.error?.message ?? 'ok'} participants=${hostEndParticipants.error?.message ?? 'ok'}`
          : 'Host ended session and participant rows were deactivated.',
    };

    const participantRejoinAfterEnd = await participant.client
      .from('shared_solo_session_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: participant.userId,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,user_id' },
      );

    results.checks.unauthorized_rejoin_after_end = {
      pass: Boolean(participantRejoinAfterEnd.error),
      detail:
        participantRejoinAfterEnd.error?.message ??
        'Unexpected success: participant rejoined ended session.',
    };

    const outsiderJoin = await outsider.client
      .from('shared_solo_session_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: outsider.userId,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,user_id' },
      );

    results.checks.authenticated_non_member_denial = {
      pass: Boolean(outsiderJoin.error),
      detail: outsiderJoin.error?.message ?? 'Unexpected success: outsider joined session.',
    };

    const participantReadAfterEnd = await participant.client
      .from('shared_solo_sessions')
      .select('id,status')
      .eq('id', sessionId)
      .maybeSingle();

    results.checks.post_end_read_scope = {
      pass: !participantReadAfterEnd.error && !participantReadAfterEnd.data,
      detail: participantReadAfterEnd.error
        ? `Error reading post-end scope: ${participantReadAfterEnd.error.message}`
        : participantReadAfterEnd.data
          ? `Unexpected visibility remained: ${JSON.stringify(participantReadAfterEnd.data)}`
          : 'Participant no longer has shared session visibility after host cleanup.',
    };

    const allChecksPass = Object.values(results.checks).every((check) => check.pass === true);
    results.summary = {
      allChecksPass,
      totalChecks: Object.keys(results.checks).length,
      passedChecks: Object.values(results.checks).filter((check) => check.pass === true).length,
    };
  } catch (error) {
    results.fatal = asMessage(error, 'Unknown regression harness failure');
  } finally {
    try {
      if (sessionId) {
        await admin.from('shared_solo_session_participants').delete().eq('session_id', sessionId);
        await admin.from('shared_solo_sessions').delete().eq('id', sessionId);
      }
      if (circleId) {
        await admin.from('circle_members').delete().eq('circle_id', circleId);
        await admin.from('circles').delete().eq('id', circleId);
      }
    } catch (cleanupError) {
      results.cleanupError = asMessage(cleanupError, 'Unknown cleanup failure');
    }

    results.finishedAt = new Date().toISOString();
    const outputPath = new URL('./shared-solo-regression-result.json', import.meta.url);
    writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(JSON.stringify(results, null, 2));
  }
}

await main();