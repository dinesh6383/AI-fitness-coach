begin;

create or replace function public.save_workout_plan(
  p_profile jsonb,
  p_days jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  profile_data public.profiles;
  saved_day_indexes integer[];
  weekdays constant text[] := array[
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
begin
  if caller_id is null then
    raise exception 'Sign in to save a workout plan' using errcode = '42501';
  end if;

  if jsonb_typeof(p_days) is distinct from 'array' then
    raise exception 'Provide an array of training days' using errcode = '22023';
  end if;

  if jsonb_array_length(p_days) not between 1 and 7 or exists (
    select 1
    from jsonb_array_elements(p_days) as days(day)
    where coalesce(day->>'day_index', '') !~ '^[0-6]$'
      or coalesce(btrim(day->>'name'), '') = ''
      or case when jsonb_typeof(day->'exercise_ids') = 'array'
           then jsonb_array_length(day->'exercise_ids') = 0
           else true
         end
  ) then
    raise exception 'Configure exercises for every training day' using errcode = '22023';
  end if;

  select array_agg(distinct (day->>'day_index')::integer order by (day->>'day_index')::integer)
  into saved_day_indexes
  from jsonb_array_elements(p_days) as days(day);

  if cardinality(saved_day_indexes) <> jsonb_array_length(p_days) then
    raise exception 'Training days must be unique' using errcode = '22023';
  end if;

  -- Use the existing column types for enum, array and JSON compatibility.
  profile_data := jsonb_populate_record(
    null::public.profiles,
    jsonb_build_object(
      'goal', p_profile->'goal',
      'current_weight', p_profile->'current_weight',
      'target_weight', p_profile->'target_weight',
      'experience_level', p_profile->'experience_level',
      'training_days', (
        select jsonb_agg(weekdays[day_index + 1] order by day_index)
        from unnest(saved_day_indexes) as indexes(day_index)
      )
    )
  );

  if profile_data.goal is null or profile_data.experience_level is null
    or profile_data.current_weight is null or profile_data.current_weight <= 0
    or profile_data.target_weight is null or profile_data.target_weight <= 0
  then
    raise exception 'Complete your goal and body information' using errcode = '22023';
  end if;

  -- Serialize replacements for the same user, including their first save.
  perform pg_advisory_xact_lock(hashtextextended('save_workout_plan:' || caller_id::text, 0));

  insert into public.plan_days (user_id, day_index, name, exercise_ids, updated_at)
  select caller_id, day.day_index, day.name, day.exercise_ids, statement_timestamp()
  from jsonb_populate_recordset(null::public.plan_days, p_days) as day
  on conflict (user_id, day_index) do update set
    name = excluded.name,
    exercise_ids = excluded.exercise_ids,
    updated_at = excluded.updated_at;

  delete from public.plan_days
  where user_id = caller_id and day_index <> all(saved_day_indexes);

  if exists (
    select 1 from public.plan_days
    where user_id = caller_id and day_index <> all(saved_day_indexes)
  ) then
    raise exception 'Unable to remove obsolete training days' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, training_days, goal, current_weight, target_weight, experience_level)
  values (
    caller_id, profile_data.training_days, profile_data.goal, profile_data.current_weight,
    profile_data.target_weight, profile_data.experience_level
  )
  on conflict (user_id) do update set
    training_days = excluded.training_days,
    goal = excluded.goal,
    current_weight = excluded.current_weight,
    target_weight = excluded.target_weight,
    experience_level = excluded.experience_level;
end;
$$;

revoke execute on function public.save_workout_plan(jsonb, jsonb) from public, anon;
grant execute on function public.save_workout_plan(jsonb, jsonb) to authenticated;

commit;
