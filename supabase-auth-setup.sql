-- Run this in Supabase SQL Editor.
-- This starts fresh by deleting existing money_tracker rows, then locks the
-- table so each signed-in user can only access their own transactions.

delete from public.money_tracker;

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

create policy "Users can read own transactions"
on public.money_tracker
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own transactions"
on public.money_tracker
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own active transactions"
on public.money_tracker
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    deleted_at is null
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'sidpk93@gmail.com'
  )
);

create policy "Only sidpk93@gmail.com can delete own transactions"
on public.money_tracker
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'sidpk93@gmail.com'
);
