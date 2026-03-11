do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t
      on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'event_schedule_type'
      and e.enumlabel = 'lunar_phase'
  ) then
    alter type public.event_schedule_type add value 'lunar_phase';
  end if;
end
$$;
