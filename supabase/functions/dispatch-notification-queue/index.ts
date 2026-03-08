import { createClient } from "npm:@supabase/supabase-js@2.58.0";

import { corsHeaders } from "../_shared/cors.ts";
import {
  EXPO_PERMANENT_ERROR_CODES,
  normalizeExpoErrorCode,
  resolveDispatchDecision,
  type DispatchResolutionStatus,
} from "../_shared/notificationDispatchPolicy.ts";

const EXPO_PUSH_SEND_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_HORIZON_MINUTES = 30;
const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_EXPO_MESSAGES_PER_REQUEST = 100;

interface NotificationQueueJob {
  attempts: number;
  category: string;
  channel: string;
  payload: Record<string, unknown> | null;
  queue_id: number;
  scheduled_for: string;
  subscription_id: string | null;
  target_id: string | null;
  target_type: string;
  user_id: string;
}

interface DeviceTargetRow {
  device_token: string;
  id: string;
  installation_id: string;
  platform: "android" | "ios" | "web";
  push_provider: "apns" | "expo" | "fcm" | "webpush";
}

interface DispatchRequestPayload {
  batchSize?: number;
  horizonMinutes?: number;
  maxAttempts?: number;
}

interface ExpoPushTicketErrorDetails {
  error?: string;
}

interface ExpoPushTicket {
  details?: ExpoPushTicketErrorDetails | null;
  id?: string;
  message?: string;
  status: "error" | "ok";
}

interface ExpoSendResponse {
  data?: ExpoPushTicket[];
  errors?: unknown[];
}

interface DispatchSummary {
  claimed: number;
  enqueuedReminders: number;
  failed: number;
  retried: number;
  sent: number;
}

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function toQueueErrorMessage(messages: string[], fallback: string): string {
  const first = messages.find((message) => typeof message === "string" && message.trim())?.trim();
  if (!first) {
    return fallback;
  }

  return first.length > 2000 ? first.slice(0, 2000) : first;
}

function buildInviteMessage(payload: Record<string, unknown>) {
  const circleName = typeof payload.circle_name === "string" ? payload.circle_name.trim() : "";
  const title = "Circle invite";
  const body = circleName
    ? `You have a new invite to join ${circleName}.`
    : "You have a new invite waiting in Circles.";

  return {
    body,
    title,
  };
}

function buildReminderMessage(payload: Record<string, unknown>, isRoomReminder: boolean) {
  const seriesName = typeof payload.series_name === "string" ? payload.series_name.trim() : "";
  const leadMinutesRaw = Number(payload.lead_minutes);
  const leadMinutes = Number.isFinite(leadMinutesRaw) ? Math.max(0, Math.floor(leadMinutesRaw)) : 0;

  const title = isRoomReminder ? "Live room reminder" : "Live reminder";
  const defaultBody = isRoomReminder
    ? "Your saved room reminder is due now."
    : "Your saved live reminder is due now.";

  if (!seriesName) {
    return {
      body: defaultBody,
      title,
    };
  }

  const leadLabel =
    leadMinutes > 0
      ? `${leadMinutes} minute${leadMinutes === 1 ? "" : "s"}`
      : "right now";

  const body = isRoomReminder
    ? `${seriesName} starts in ${leadLabel}.`
    : `${seriesName} is coming up in ${leadLabel}.`;

  return {
    body,
    title,
  };
}

function buildPushCopy(job: NotificationQueueJob) {
  const payload = job.payload ?? {};
  if (job.category === "invite") {
    return buildInviteMessage(payload);
  }

  if (job.category === "occurrence_reminder") {
    return buildReminderMessage(payload, false);
  }

  if (job.category === "room_reminder") {
    return buildReminderMessage(payload, true);
  }

  return {
    body: "You have a new update in Egregor.",
    title: "Egregor update",
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isPermanentExpoError(code: string | null): boolean {
  return code ? EXPO_PERMANENT_ERROR_CODES.has(code) : false;
}

async function disableDeviceTarget(
  supabaseAdmin: ReturnType<typeof createClient>,
  targetId: string,
): Promise<void> {
  await supabaseAdmin
    .from("notification_device_targets")
    .update({
      disabled_at: new Date().toISOString(),
    })
    .eq("id", targetId);
}

async function fetchActiveExpoTargets(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<DeviceTargetRow[]> {
  const { data, error } = await supabaseAdmin
    .from("notification_device_targets")
    .select("id,installation_id,platform,push_provider,device_token")
    .eq("user_id", userId)
    .eq("push_provider", "expo")
    .is("disabled_at", null);

  if (error) {
    throw new Error(`Failed to load push targets: ${error.message}`);
  }

  return ((data ?? []) as DeviceTargetRow[]).filter(
    (target) => typeof target.device_token === "string" && target.device_token.trim().length > 0,
  );
}

async function sendExpoBatch(messages: Record<string, unknown>[]) {
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN")?.trim();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  const response = await fetch(EXPO_PUSH_SEND_ENDPOINT, {
    body: JSON.stringify(messages),
    headers,
    method: "POST",
  });

  const httpStatus = response.status;
  if (!response.ok) {
    const bodyText = await response.text();
    return {
      bodyText,
      errors: [] as unknown[],
      httpStatus,
      ok: false as const,
      tickets: [] as ExpoPushTicket[],
    };
  }

  const payload = (await response.json()) as ExpoSendResponse;
  return {
    bodyText: null,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    httpStatus,
    ok: true as const,
    tickets: Array.isArray(payload.data) ? payload.data : [],
  };
}

async function finalizeQueueJob(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: {
    errorMessage: string | null;
    providerMessageId?: string | null;
    providerResponse: Record<string, unknown>;
    queueId: number;
    retryDelaySeconds?: number | null;
    status: DispatchResolutionStatus;
  },
) {
  const nowIso = new Date().toISOString();

  const basePatch: Record<string, unknown> = {
    last_error: input.errorMessage,
    provider_message_id: input.providerMessageId ?? null,
    provider_response: input.providerResponse,
  };

  if (input.status === "sent") {
    basePatch.processed_at = nowIso;
    basePatch.status = "sent";
  } else if (input.status === "failed") {
    basePatch.processed_at = nowIso;
    basePatch.status = "failed";
  } else {
    const delaySeconds =
      typeof input.retryDelaySeconds === "number" && input.retryDelaySeconds > 0
        ? Math.floor(input.retryDelaySeconds)
        : 60;
    basePatch.processed_at = null;
    basePatch.scheduled_for = new Date(Date.now() + delaySeconds * 1000).toISOString();
    basePatch.status = "pending";
  }

  const { error } = await supabaseAdmin
    .from("notification_queue")
    .update(basePatch)
    .eq("id", input.queueId)
    .eq("status", "processing");

  if (error) {
    throw new Error(`Failed to finalize queue row ${input.queueId}: ${error.message}`);
  }
}

function requireDispatchSecret(request: Request): string | null {
  const expected = Deno.env.get("NOTIFICATION_DISPATCH_SHARED_SECRET")?.trim();
  if (!expected) {
    return "NOTIFICATION_DISPATCH_SHARED_SECRET is not configured.";
  }

  const provided =
    request.headers.get("x-egregor-dispatch-secret")?.trim() ??
    request.headers.get("x-dispatch-secret")?.trim() ??
    "";
  if (provided !== expected) {
    return "Dispatch secret is invalid.";
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const secretError = requireDispatchSecret(request);
  if (secretError) {
    return jsonResponse(401, {
      detail: secretError,
      error: "Unauthorized",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      detail: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      error: "Missing Supabase configuration",
    });
  }

  let payload: DispatchRequestPayload = {};
  try {
    payload = (await request.json()) as DispatchRequestPayload;
  } catch {
    payload = {};
  }

  const batchSize = clampNumber(payload.batchSize, 1, 200, DEFAULT_BATCH_SIZE);
  const horizonMinutes = clampNumber(payload.horizonMinutes, 5, 360, DEFAULT_HORIZON_MINUTES);
  const maxAttempts = clampNumber(payload.maxAttempts, 1, 10, DEFAULT_MAX_ATTEMPTS);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const summary: DispatchSummary = {
    claimed: 0,
    enqueuedReminders: 0,
    failed: 0,
    retried: 0,
    sent: 0,
  };

  try {
    const { data: enqueuedCount, error: enqueueError } = await supabaseAdmin.rpc(
      "enqueue_due_occurrence_reminders",
      {
        p_horizon_minutes: horizonMinutes,
        p_max_rows: Math.max(batchSize * 4, 50),
      },
    );

    if (enqueueError) {
      return jsonResponse(500, {
        detail: enqueueError.message,
        error: "Failed to enqueue due reminder notifications",
      });
    }

    summary.enqueuedReminders =
      typeof enqueuedCount === "number" && Number.isFinite(enqueuedCount) ? enqueuedCount : 0;

    const { data: claimedRows, error: claimError } = await supabaseAdmin.rpc(
      "claim_notification_queue_batch",
      {
        p_channel: "push",
        p_limit: batchSize,
      },
    );

    if (claimError) {
      return jsonResponse(500, {
        detail: claimError.message,
        error: "Failed to claim queued notifications",
      });
    }

    const jobs = (claimedRows ?? []) as NotificationQueueJob[];
    summary.claimed = jobs.length;

    for (const job of jobs) {
      try {
        if (job.channel !== "push") {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: `Unsupported channel ${job.channel}.`,
            providerResponse: {
              category: job.category,
              channel: job.channel,
              queue_id: job.queue_id,
            },
            queueId: job.queue_id,
            status: "failed",
          });
          summary.failed += 1;
          continue;
        }

        const targets = await fetchActiveExpoTargets(supabaseAdmin, job.user_id);
        if (targets.length === 0) {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: "No active Expo push targets are registered for this user.",
            providerResponse: {
              category: job.category,
              queue_id: job.queue_id,
              target_count: 0,
            },
            queueId: job.queue_id,
            status: "failed",
          });
          summary.failed += 1;
          continue;
        }

        const copy = buildPushCopy(job);
        const messages = targets.map((target) => ({
          body: copy.body,
          data: {
            category: job.category,
            payload: job.payload ?? {},
            queueId: job.queue_id,
            targetId: job.target_id,
            targetType: job.target_type,
          },
          priority: "high",
          sound: "default",
          title: copy.title,
          to: target.device_token,
        }));

        let hadSuccessfulDeliveries = false;
        let hasPermanentError = false;
        let hasRetryableError = false;
        let lastHttpStatus: number | null = null;
        const providerMessageIds: string[] = [];
        const providerErrors: string[] = [];
        const providerErrorCodes: string[] = [];

        const messageChunks = chunkArray(messages, MAX_EXPO_MESSAGES_PER_REQUEST);
        const targetChunks = chunkArray(targets, MAX_EXPO_MESSAGES_PER_REQUEST);

        for (let chunkIndex = 0; chunkIndex < messageChunks.length; chunkIndex += 1) {
          const chunkMessages = messageChunks[chunkIndex] ?? [];
          const chunkTargets = targetChunks[chunkIndex] ?? [];
          if (chunkMessages.length === 0) {
            continue;
          }

          const sendResult = await sendExpoBatch(chunkMessages);
          lastHttpStatus = sendResult.httpStatus;
          if (!sendResult.ok) {
            hasRetryableError = true;
            providerErrors.push(
              sendResult.bodyText?.trim() || `Expo request failed with status ${sendResult.httpStatus}.`,
            );
            continue;
          }

          if (sendResult.errors.length > 0) {
            hasRetryableError = true;
            providerErrors.push("Expo provider returned batch-level errors.");
          }

          if (sendResult.tickets.length !== chunkMessages.length) {
            hasRetryableError = true;
            providerErrors.push(
              `Expo returned ${sendResult.tickets.length} tickets for ${chunkMessages.length} messages.`,
            );
          }

          sendResult.tickets.forEach((ticket, ticketIndex) => {
            const target = chunkTargets[ticketIndex];
            if (ticket.status === "ok") {
              hadSuccessfulDeliveries = true;
              if (typeof ticket.id === "string" && ticket.id.trim()) {
                providerMessageIds.push(ticket.id.trim());
              }
              return;
            }

            const normalizedCode = normalizeExpoErrorCode(ticket.details?.error);
            if (normalizedCode) {
              providerErrorCodes.push(normalizedCode);
            }

            if (isPermanentExpoError(normalizedCode)) {
              hasPermanentError = true;
              if (
                target &&
                (normalizedCode === "DeviceNotRegistered" || normalizedCode === "InvalidProviderToken")
              ) {
                void disableDeviceTarget(supabaseAdmin, target.id);
              }
            } else {
              hasRetryableError = true;
            }

            providerErrors.push(
              ticket.message?.trim() ||
                (normalizedCode ? `Expo provider error ${normalizedCode}.` : "Expo provider error."),
            );
          });
        }

        const decision = resolveDispatchDecision({
          attempts: job.attempts,
          hadSuccessfulDeliveries,
          hasPermanentError,
          hasRetryableError,
          httpStatus: lastHttpStatus,
          maxAttempts,
        });

        const providerResponse = {
          attempts: job.attempts,
          category: job.category,
          error_codes: Array.from(new Set(providerErrorCodes)),
          errors: providerErrors.slice(0, 10),
          http_status: lastHttpStatus,
          target_count: targets.length,
          ticket_ids: providerMessageIds,
        };

        if (decision.status === "sent") {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: null,
            providerMessageId: providerMessageIds[0] ?? null,
            providerResponse,
            queueId: job.queue_id,
            status: "sent",
          });
          summary.sent += 1;
        } else if (decision.status === "retry") {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: toQueueErrorMessage(
              providerErrors,
              `Push dispatch failed and will be retried (attempt ${job.attempts}/${maxAttempts}).`,
            ),
            providerMessageId: null,
            providerResponse,
            queueId: job.queue_id,
            retryDelaySeconds: decision.retryDelaySeconds,
            status: "retry",
          });
          summary.retried += 1;
        } else {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: toQueueErrorMessage(
              providerErrors,
              `Push dispatch failed after ${job.attempts} attempts.`,
            ),
            providerMessageId: null,
            providerResponse,
            queueId: job.queue_id,
            status: "failed",
          });
          summary.failed += 1;
        }
      } catch (jobError) {
        const detail = jobError instanceof Error ? jobError.message : "Unhandled queue job failure.";
        try {
          await finalizeQueueJob(supabaseAdmin, {
            errorMessage: toQueueErrorMessage([detail], "Unhandled queue job failure."),
            providerResponse: {
              category: job.category,
              queue_id: job.queue_id,
            },
            queueId: job.queue_id,
            retryDelaySeconds: 60,
            status: job.attempts >= maxAttempts ? "failed" : "retry",
          });
          if (job.attempts >= maxAttempts) {
            summary.failed += 1;
          } else {
            summary.retried += 1;
          }
        } catch {
          // Finalizer errors are returned in aggregate below.
        }
      }
    }

    return jsonResponse(200, {
      ...summary,
      maxAttempts,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unhandled dispatch failure.";
    return jsonResponse(500, {
      detail,
      error: "dispatch-notification-queue failed",
      summary,
    });
  }
});
