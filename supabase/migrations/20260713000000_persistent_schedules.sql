-- Persistent smart schedules linked to the student's canonical To-Do items.

alter table public.tasks
  add column if not exists work_type text not null default 'homework'
    check (work_type in ('homework', 'revision')),
  add column if not exists estimated_minutes integer not null default 60
    check (estimated_minutes between 15 and 720),
  add column if not exists importance integer not null default 3
    check (importance between 1 and 5);

create unique index if not exists tasks_id_user_unique on public.tasks(id, user_id);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  sequence integer not null default 1 check (sequence > 0),
  tip text,
  created_at timestamptz not null default now(),
  constraint schedule_blocks_task_owner_fkey
    foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  constraint schedule_blocks_valid_time check (end_at > start_at)
);

create index if not exists schedule_blocks_user_start_idx
  on public.schedule_blocks(user_id, start_at);
create index if not exists schedule_blocks_task_idx
  on public.schedule_blocks(task_id);

alter table public.schedule_blocks enable row level security;

create policy "users manage their own schedule blocks"
on public.schedule_blocks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "staff read schedule blocks"
on public.schedule_blocks
for select
to authenticated
using (public.is_staff());

grant select, insert, update, delete on public.schedule_blocks to authenticated;
