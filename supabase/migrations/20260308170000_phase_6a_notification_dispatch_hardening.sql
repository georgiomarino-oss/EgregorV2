alter table public.notification_queue
  add column if not exists provider_message_id text,
  add column if not exists provider_response jsonb not null default '{}'::jsonb;

create unique index if not exists notification_queue_unique_schedule_idx
on public.notification_queue (
  user_id,
  category,
  target_type,
  target_id,
  channel,
  scheduled_for
) nulls not distinct;

create or replace function public.claim_notification_queue_batch(
  p_limit integer default 25,
  p_channel public.notification_channel default 'push'
)
returns table (
  queue_id bigint,
  user_id uuid,
  subscription_id uuid,
  category text,
  target_type text,
  target_id uuid,
  channel text,
  scheduled_for timestamptz,
  payload jsonb,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 200));
  v_now timestamptz := timezone('utc', now());
begin
  return query
  with due as (
    select nq.id
    from public.notification_queue nq
    where nq.channel = coalesce(p_channel, 'push'::public.notification_channel)
      and (
        (
          nq.status = 'pending'::public.notification_queue_status
          and nq.scheduled_for <= v_now
        )
        or (
          nq.status = 'processing'::public.notification_queue_status
          and nq.processed_at is null
          and nq.updated_at <= v_now - interval '5 minutes'
        )
      )
    order by nq.scheduled_for asc, nq.id asc
    for update skip locked
    limit v_limit
  )
  update public.notification_queue nq
  set
    status = 'processing'::public.notification_queue_status,
    attempts = nq.attempts + 1,
    last_error = null,
    processed_at = null,
    updated_at = timezone('utc', now())
  from due
  where nq.id = due.id
  returning
    nq.id as queue_id,
    nq.user_id,
    nq.subscription_id,
    nq.category::text as category,
    nq.target_type::text as target_type,
    nq.target_id,
    nq.channel::text as channel,
    nq.scheduled_for,
    nq.payload,
    nq.attempts;
end;
$$;

create or replace function public.enqueue_due_occurrence_reminders(
  p_horizon_minutes integer default 30,
  p_max_rows integer default 300
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  with config as (
    select
      timezone('utc', now()) as now_utc,
      greatest(5, least(coalesce(p_horizon_minutes, 30), 360)) as horizon_minutes,
      greatest(1, least(coalesce(p_max_rows, 300), 2000)) as max_rows
  ),
  occurrence_jobs as (
    select
      ns.user_id,
      ns.id as subscription_id,
      ns.category,
      ns.target_type,
      ns.target_id,
      ns.channel,
      eo.starts_at_utc - make_interval(mins => greatest(0, least(ns.lead_minutes, 1440))) as scheduled_for,
      jsonb_build_object(
        'occurrence_id', eo.id,
        'series_id', eo.series_id,
        'series_name', coalesce(es.name, ''),
        'starts_at_utc', eo.starts_at_utc,
        'lead_minutes', greatest(0, least(ns.lead_minutes, 1440))
      ) as payload
    from public.notification_subscriptions ns
    join public.event_occurrences eo
      on ns.target_type = 'event_occurrence'::public.notification_target_type
     and ns.target_id = eo.id
    left join public.event_series es
      on es.id = eo.series_id
    cross join config cfg
    where ns.enabled = true
      and ns.channel = 'push'::public.notification_channel
      and ns.category = 'occurrence_reminder'::public.notification_category
      and eo.status in ('scheduled'::public.event_occurrence_status, 'live'::public.event_occurrence_status)
      and eo.starts_at_utc >= cfg.now_utc - interval '15 minutes'
      and eo.starts_at_utc <= cfg.now_utc + make_interval(mins => cfg.horizon_minutes + greatest(0, least(ns.lead_minutes, 1440)))
  ),
  room_jobs as (
    select
      ns.user_id,
      ns.id as subscription_id,
      ns.category,
      ns.target_type,
      ns.target_id,
      ns.channel,
      eo.starts_at_utc - make_interval(mins => greatest(0, least(ns.lead_minutes, 1440))) as scheduled_for,
      jsonb_build_object(
        'room_id', r.id,
        'occurrence_id', eo.id,
        'series_id', eo.series_id,
        'series_name', coalesce(es.name, ''),
        'starts_at_utc', eo.starts_at_utc,
        'lead_minutes', greatest(0, least(ns.lead_minutes, 1440))
      ) as payload
    from public.notification_subscriptions ns
    join public.rooms r
      on ns.target_type = 'room'::public.notification_target_type
     and ns.target_id = r.id
    join public.event_occurrences eo
      on eo.id = r.occurrence_id
    left join public.event_series es
      on es.id = eo.series_id
    cross join config cfg
    where ns.enabled = true
      and ns.channel = 'push'::public.notification_channel
      and ns.category = 'room_reminder'::public.notification_category
      and eo.status in ('scheduled'::public.event_occurrence_status, 'live'::public.event_occurrence_status)
      and eo.starts_at_utc >= cfg.now_utc - interval '15 minutes'
      and eo.starts_at_utc <= cfg.now_utc + make_interval(mins => cfg.horizon_minutes + greatest(0, least(ns.lead_minutes, 1440)))
  ),
  all_jobs as (
    select * from occurrence_jobs
    union all
    select * from room_jobs
  ),
  bounded_jobs as (
    select
      jobs.user_id,
      jobs.subscription_id,
      jobs.category,
      jobs.target_type,
      jobs.target_id,
      jobs.channel,
      jobs.scheduled_for,
      jobs.payload
    from all_jobs jobs
    cross join config cfg
    where jobs.scheduled_for <= cfg.now_utc + make_interval(mins => cfg.horizon_minutes)
      and jobs.scheduled_for >= cfg.now_utc - interval '15 minutes'
    order by jobs.scheduled_for asc
    limit (select max_rows from config)
  )
  insert into public.notification_queue (
    user_id,
    subscription_id,
    category,
    target_type,
    target_id,
    channel,
    status,
    scheduled_for,
    payload
  )
  select
    bj.user_id,
    bj.subscription_id,
    bj.category,
    bj.target_type,
    bj.target_id,
    bj.channel,
    'pending'::public.notification_queue_status,
    bj.scheduled_for,
    bj.payload
  from bounded_jobs bj
  on conflict (
    user_id,
    category,
    target_type,
    target_id,
    channel,
    scheduled_for
  ) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.claim_notification_queue_batch(integer, public.notification_channel) from public;
revoke all on function public.enqueue_due_occurrence_reminders(integer, integer) from public;

revoke execute on function public.claim_notification_queue_batch(integer, public.notification_channel) from anon;
revoke execute on function public.enqueue_due_occurrence_reminders(integer, integer) from anon;

revoke execute on function public.claim_notification_queue_batch(integer, public.notification_channel) from authenticated;
revoke execute on function public.enqueue_due_occurrence_reminders(integer, integer) from authenticated;

grant execute on function public.claim_notification_queue_batch(integer, public.notification_channel) to service_role;
grant execute on function public.enqueue_due_occurrence_reminders(integer, integer) to service_role;
