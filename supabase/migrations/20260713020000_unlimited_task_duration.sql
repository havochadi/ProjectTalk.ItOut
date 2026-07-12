-- Allow students to estimate work of any length; the scheduler divides it
-- into sustainable sessions automatically.

alter table public.tasks
  drop constraint if exists tasks_estimated_minutes_check;

alter table public.tasks
  add constraint tasks_estimated_minutes_check check (estimated_minutes >= 15);
