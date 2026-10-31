-- Stage 13: moderator-authored lessons the agent may use as guidance.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lesson text not null check (char_length(btrim(lesson)) between 5 and 300),
  active boolean not null default true,
  created_by text not null,
  from_post uuid references public.events(id) on delete set null
);

alter table public.lessons enable row level security;
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;
grant insert (lesson, created_by, from_post) on public.lessons to authenticated;
grant update (active) on public.lessons to authenticated;
grant all on public.lessons to service_role;

drop policy if exists "Authenticated moderators can read lessons" on public.lessons;
create policy "Authenticated moderators can read lessons"
  on public.lessons for select
  to authenticated
  using (true);

drop policy if exists "Authenticated moderators can add lessons" on public.lessons;
create policy "Authenticated moderators can add lessons"
  on public.lessons for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated moderators can switch lessons" on public.lessons;
create policy "Authenticated moderators can switch lessons"
  on public.lessons for update
  to authenticated
  using (true)
  with check (true);

alter table public.events
  add column if not exists lessons_used text[] not null default '{}';
