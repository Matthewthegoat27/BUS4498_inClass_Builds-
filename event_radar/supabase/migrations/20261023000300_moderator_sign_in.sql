grant select on table public.events to authenticated;

grant update (status, status_reason, reviewed_at, reviewed_by)
  on table public.events
  to authenticated;

create policy "Authenticated moderators can read all events"
  on public.events
  for select
  to authenticated
  using (true);

create policy "Authenticated moderators can review events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected'));
