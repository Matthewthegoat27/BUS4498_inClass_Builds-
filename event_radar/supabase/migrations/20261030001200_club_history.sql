-- Stage 12: track replacements and waiting updates to earlier club posts.
alter table public.events
  add column if not exists replaced_by uuid,
  add column if not exists updates_id uuid;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('published', 'waiting', 'rejected', 'archived', 'replaced'));

drop policy if exists "Authenticated moderators can review events" on public.events;
create policy "Authenticated moderators can review events"
  on public.events for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected', 'replaced'));
