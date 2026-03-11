-- True in-app account deletion backend verification.
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/true_account_deletion.sql

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  (
    '9d111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'true-delete-user@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '9d222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'true-delete-peer@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, timezone, username)
values
  ('9d111111-1111-4111-8111-111111111111', 'True Delete User', 'UTC', 'true_delete_user'),
  ('9d222222-2222-4222-8222-222222222222', 'True Delete Peer', 'UTC', 'true_delete_peer')
on conflict (id) do update
set
  display_name = excluded.display_name,
  timezone = excluded.timezone,
  username = excluded.username;

insert into public.user_journal_entries (user_id, content)
values ('9d111111-1111-4111-8111-111111111111', 'Temporary journal content for deletion test.');

insert into public.user_privacy_settings (user_id)
values ('9d111111-1111-4111-8111-111111111111')
on conflict (user_id) do nothing;

insert into public.account_deletion_requests (user_id, status, reason, details)
values (
  '9d111111-1111-4111-8111-111111111111',
  'requested'::public.account_deletion_status,
  'true_delete_test',
  'preexisting request row for cleanup verification'
)
on conflict do nothing;

do $$
begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', '9d111111-1111-4111-8111-111111111111', true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform public.run_account_deletion_cleanup('9d111111-1111-4111-8111-111111111111');
    raise exception 'Expected authenticated role to be blocked from run_account_deletion_cleanup.';
  exception
    when others then
      if position('permission denied' in lower(sqlerrm)) = 0
        and position('execute' in lower(sqlerrm)) = 0
      then
        raise;
      end if;
  end;
end;
$$;

reset role;

set local role service_role;
select public.run_account_deletion_cleanup('9d111111-1111-4111-8111-111111111111');
reset role;

do $$
begin
  if exists (
    select 1
    from public.profiles p
    where p.id = '9d111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Expected deletion user profile row to be removed by cleanup.';
  end if;

  if exists (
    select 1
    from public.user_journal_entries entry
    where entry.user_id = '9d111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Expected deletion user journal rows to be removed by cleanup.';
  end if;

  if exists (
    select 1
    from public.user_privacy_settings settings
    where settings.user_id = '9d111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Expected deletion user privacy row to be removed by cleanup.';
  end if;

  if exists (
    select 1
    from public.account_deletion_requests request
    where request.user_id = '9d111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Expected account deletion request rows to be removed by cleanup.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = '9d222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'Cleanup should not remove peer profile rows.';
  end if;
end;
$$;

rollback;
