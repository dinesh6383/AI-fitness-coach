begin;

create table public.diet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  food_name text not null check (char_length(btrim(food_name)) between 1 and 120),
  serving_size text not null check (char_length(btrim(serving_size)) between 1 and 80),
  protein_g numeric(7, 2) not null check (protein_g between 0 and 10000),
  carbs_g numeric(7, 2) not null check (carbs_g between 0 and 10000),
  fat_g numeric(7, 2) not null check (fat_g between 0 and 10000),
  fibre_g numeric(7, 2) not null check (fibre_g between 0 and 10000),
  created_at timestamptz not null default now()
);

create index diet_entries_user_date_idx
  on public.diet_entries (user_id, log_date, created_at);

alter table public.diet_entries enable row level security;

revoke all on public.diet_entries from public, anon, authenticated;
grant select, insert on public.diet_entries to authenticated;

create policy "Users can read their diet entries"
  on public.diet_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their diet entries"
  on public.diet_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

commit;
