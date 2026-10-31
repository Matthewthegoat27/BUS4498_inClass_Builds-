-- Stage 11: moderator-managed club knowledge and agent notes.
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  nicknames text not null default '',
  usual_place_code text not null default '',
  usual_place_detail text not null default '',
  active boolean not null default true,
  note text not null default ''
);

alter table public.clubs enable row level security;
revoke all on public.clubs from anon, authenticated;
grant select (id, name, nicknames, active) on public.clubs to anon, authenticated;
grant all on public.clubs to service_role;

drop policy if exists "Active clubs are readable" on public.clubs;
create policy "Active clubs are readable"
  on public.clubs for select
  to anon, authenticated
  using (active);

insert into public.clubs (name, nicknames, usual_place_code, usual_place_detail, active)
values
  ('Board Game Guild', 'BGG, board game club', 'UU', 'Room 220', true),
  ('Mustang Pitch Society', '', '', '', true),
  ('Women in Finance Circle', '', '', '', true),
  ('Sustainability Crew', '', '', '', true),
  ('Accounting Society', '', '', '', true),
  ('Cal Poly Ski & Snowboard Club', '', '', '', true)
on conflict (name) do nothing;

alter table public.events
  add column if not exists agent_notes text[] not null default '{}';

drop policy if exists "Authenticated moderators can clear board" on public.events;
create policy "Authenticated moderators can clear board"
  on public.events for delete
  to authenticated
  using (true);
grant delete on public.events to authenticated;
