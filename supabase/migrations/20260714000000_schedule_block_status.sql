-- Track each dated study session independently. Completing today's revision
-- must not complete the revision topic or remove its future sessions.

alter table public.schedule_blocks
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'doing', 'done'));

create index if not exists schedule_blocks_user_status_start_idx
  on public.schedule_blocks(user_id, status, start_at);
