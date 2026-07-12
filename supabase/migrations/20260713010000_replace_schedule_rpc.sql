-- Atomically replace the signed-in student's timetable after replanning.

create or replace function public.replace_schedule_blocks(p_blocks jsonb)
returns setof public.schedule_blocks
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(coalesce(p_blocks, '[]'::jsonb)) <> 'array' then
    raise exception 'Schedule blocks must be a JSON array';
  end if;

  delete from public.schedule_blocks where user_id = auth.uid();

  return query
  insert into public.schedule_blocks (user_id, task_id, start_at, end_at, sequence, tip)
  select
    auth.uid(),
    (block ->> 'taskId')::uuid,
    (block ->> 'start')::timestamptz,
    (block ->> 'end')::timestamptz,
    coalesce((block ->> 'sequence')::integer, 1),
    nullif(block ->> 'tip', '')
  from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) as block
  returning *;
end;
$$;

grant execute on function public.replace_schedule_blocks(jsonb) to authenticated;
