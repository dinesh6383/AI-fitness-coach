alter table public.diet_entries
  add column calories_kcal numeric(7, 2)
    check (calories_kcal between 0 and 10000);
