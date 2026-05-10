-- Run this in Supabase SQL Editor.
-- This keeps existing money_tracker rows and configures access so every
-- signed-in user can view all active transactions, while only
-- sidpk93@gmail.com has admin delete rights.

alter table public.money_tracker
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.money_tracker
add column if not exists description text not null default '';

alter table public.money_tracker
add column if not exists deleted_at timestamptz;

alter table public.money_tracker
alter column user_id set not null;

create index if not exists money_tracker_user_id_idx
on public.money_tracker(user_id);

alter table public.money_tracker
enable row level security;

create or replace function public.is_money_tracker_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) = 'sidpk93@gmail.com'
  );
$$;

revoke all on function public.is_money_tracker_admin() from public;
grant execute on function public.is_money_tracker_admin() to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'money_tracker'
  loop
    execute format(
      'drop policy if exists %I on public.money_tracker',
      existing_policy.policyname
    );
  end loop;
end $$;

create policy "Authenticated users can read all transactions"
on public.money_tracker
for select
to authenticated
using (deleted_at is null);

create policy "Users can create own transactions"
on public.money_tracker
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own active transactions"
on public.money_tracker
for update
to authenticated
using (
  ((select auth.uid()) = user_id and deleted_at is null)
  or public.is_money_tracker_admin()
)
with check (
  (
    (select auth.uid()) = user_id
    and deleted_at is null
  )
  or public.is_money_tracker_admin()
);

create policy "Only sidpk93@gmail.com can delete transactions"
on public.money_tracker
for delete
to authenticated
using (
  public.is_money_tracker_admin()
);
