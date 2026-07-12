-- Talk.ItOut Supabase schema
-- Run with `supabase db push`, or paste this file into the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'student' check (role in ('student', 'counselor', 'admin')),
  age integer check (age between 10 and 120),
  school text,
  guardian_consent boolean not null default false,
  preferences jsonb not null default '{"pomodoro":{"focusDuration":25,"breakDuration":5,"longBreakDuration":15,"cyclesBeforeLongBreak":4},"notifications":true}'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  streaks jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles(role);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  subject text,
  due_at timestamptz,
  priority text not null default 'med' check (priority in ('low', 'med', 'high')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_user_due_idx on public.tasks(user_id, due_at);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood integer not null check (mood between 1 and 5),
  note text check (note is null or char_length(note) <= 10000),
  sentiment text check (sentiment is null or sentiment in ('pos', 'neu', 'neg')),
  created_at timestamptz not null default now()
);
create index check_ins_user_created_idx on public.check_ins(user_id, created_at desc);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'pomodoro' check (type = 'pomodoro'),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cycles_completed integer not null default 0 check (cycles_completed >= 0),
  created_at timestamptz not null default now()
);
create index focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create unique index focus_sessions_one_active_per_user
  on public.focus_sessions(user_id) where ended_at is null;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null check (char_length(text) between 1 and 20000),
  sentiment text check (sentiment is null or sentiment in ('pos', 'neu', 'neg')),
  risk_tags text[] not null default '{}',
  severity integer check (severity is null or severity between 1 and 3),
  created_at timestamptz not null default now()
);
create index chat_messages_user_created_idx on public.chat_messages(user_id, created_at desc);

create table public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete set null,
  message_text text not null,
  tags text[] not null default '{}',
  severity integer not null check (severity between 1 and 3),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index risk_flags_status_severity_idx on public.risk_flags(status, severity desc, created_at desc);
create index risk_flags_user_idx on public.risk_flags(user_id, status);

create table public.counselor_messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 5000),
  read boolean not null default false,
  thread_id uuid references public.counselor_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
create index counselor_messages_received_idx on public.counselor_messages(to_user_id, created_at desc);
create index counselor_messages_thread_idx on public.counselor_messages(thread_id, created_at);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index audits_actor_created_idx on public.audits(actor_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();
create trigger risk_flags_touch_updated_at before update on public.risk_flags
for each row execute function public.touch_updated_at();
create trigger counselor_messages_touch_updated_at before update on public.counselor_messages
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, name, email, role, age, school, guardian_consent
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'student',
    nullif(new.raw_user_meta_data ->> 'age', '')::integer,
    nullif(trim(new.raw_user_meta_data ->> 'school'), ''),
    coalesce((new.raw_user_meta_data ->> 'guardianConsent')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = candidate and role in ('counselor', 'admin')
  );
$$;

create or replace function public.is_admin(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = candidate and role = 'admin'
  );
$$;

create or replace function public.update_daily_streak(target_user uuid, streak_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_streak jsonb;
  last_day date;
  next_count integer;
begin
  select item into current_streak
  from public.profiles p,
       jsonb_array_elements(p.streaks) item
  where p.id = target_user and item ->> 'type' = streak_type
  limit 1;

  if current_streak is null then
    update public.profiles
    set streaks = streaks || jsonb_build_array(jsonb_build_object(
      'type', streak_type, 'count', 1, 'lastDate', now()
    ))
    where id = target_user;
    return;
  end if;

  last_day := ((current_streak ->> 'lastDate')::timestamptz at time zone 'UTC')::date;
  if last_day = (now() at time zone 'UTC')::date then
    return;
  elsif last_day = (now() at time zone 'UTC')::date - 1 then
    next_count := coalesce((current_streak ->> 'count')::integer, 0) + 1;
  else
    next_count := 1;
  end if;

  update public.profiles
  set streaks = (
    select jsonb_agg(
      case when item ->> 'type' = streak_type
        then item || jsonb_build_object('count', next_count, 'lastDate', now())
        else item end
    )
    from jsonb_array_elements(streaks) item
  )
  where id = target_user;
end;
$$;

create or replace function public.check_in_streak_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.update_daily_streak(new.user_id, 'checkin');
  return new;
end;
$$;
create trigger update_check_in_streak after insert on public.check_ins
for each row execute function public.check_in_streak_trigger();

create or replace function public.focus_streak_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.ended_at is null and new.ended_at is not null and new.cycles_completed > 0 then
    perform public.update_daily_streak(new.user_id, 'focus');
  end if;
  return new;
end;
$$;
create trigger update_focus_streak after update on public.focus_sessions
for each row execute function public.focus_streak_trigger();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.check_ins enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.risk_flags enable row level security;
alter table public.counselor_messages enable row level security;
alter table public.audits enable row level security;

create policy "profiles are visible to owner and staff" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_staff()
  or exists (
    select 1 from public.counselor_messages message
    where (message.from_user_id = auth.uid() or message.to_user_id = auth.uid())
      and (message.from_user_id = profiles.id or message.to_user_id = profiles.id)
  )
);
create policy "users update their own profile" on public.profiles
for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "users manage their own tasks" on public.tasks
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read tasks" on public.tasks
for select to authenticated using (public.is_staff());

create policy "users manage their own check-ins" on public.check_ins
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read check-ins" on public.check_ins
for select to authenticated using (public.is_staff());

create policy "users manage their own focus sessions" on public.focus_sessions
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read focus sessions" on public.focus_sessions
for select to authenticated using (public.is_staff());

create policy "users read their own chat messages" on public.chat_messages
for select to authenticated using (user_id = auth.uid());
create policy "users clear their own chat messages" on public.chat_messages
for delete to authenticated using (user_id = auth.uid());
create policy "staff read chat messages" on public.chat_messages
for select to authenticated using (public.is_staff());

create policy "staff manage risk flags" on public.risk_flags
for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy "participants read counselor messages" on public.counselor_messages
for select to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "staff start counselor conversations" on public.counselor_messages
for insert to authenticated
with check (
  from_user_id = auth.uid()
  and public.is_staff()
  and thread_id is null
  and exists (select 1 from public.profiles where id = to_user_id and role = 'student')
);
create policy "recipients reply in counselor conversations" on public.counselor_messages
for insert to authenticated
with check (
  from_user_id = auth.uid()
  and thread_id is not null
  and exists (
    select 1 from public.counselor_messages original
    where original.id = thread_id
      and original.to_user_id = auth.uid()
      and original.from_user_id = to_user_id
  )
);
create policy "recipients mark counselor messages read" on public.counselor_messages
for update to authenticated
using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

create policy "users read their own audit entries" on public.audits
for select to authenticated using (actor_id = auth.uid());
create policy "users create their own audit entries" on public.audits
for insert to authenticated with check (actor_id = auth.uid());
create policy "admins read all audit entries" on public.audits
for select to authenticated using (public.is_admin());

revoke update on public.profiles from authenticated;
grant update (name, school, preferences, goals) on public.profiles to authenticated;
revoke update on public.counselor_messages from authenticated;
grant update (read) on public.counselor_messages to authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.check_ins to authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.risk_flags to authenticated;
grant select, insert on public.counselor_messages to authenticated;
grant select, insert on public.audits to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

alter publication supabase_realtime add table public.risk_flags;
alter publication supabase_realtime add table public.counselor_messages;
