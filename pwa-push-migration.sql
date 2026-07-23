create extension if not exists pgcrypto;

create table if not exists public.admin_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firebase_fid text not null unique,
  device_name text,
  user_agent text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_devices_user_id_idx
  on public.admin_push_devices(user_id);

alter table public.admin_push_devices enable row level security;

grant select, insert, update, delete
  on public.admin_push_devices
  to authenticated;

drop policy if exists "van_admin_push_read_own" on public.admin_push_devices;
drop policy if exists "van_admin_push_insert_own" on public.admin_push_devices;
drop policy if exists "van_admin_push_update_own" on public.admin_push_devices;
drop policy if exists "van_admin_push_delete_own" on public.admin_push_devices;

create policy "van_admin_push_read_own"
on public.admin_push_devices
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_van_admin()
);

create policy "van_admin_push_insert_own"
on public.admin_push_devices
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_van_admin()
);

create policy "van_admin_push_update_own"
on public.admin_push_devices
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_van_admin()
)
with check (
  user_id = auth.uid()
  and public.is_van_admin()
);

create policy "van_admin_push_delete_own"
on public.admin_push_devices
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_van_admin()
);

create or replace function public.van_admin_push_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.last_seen_at = coalesce(new.last_seen_at, now());
  return new;
end;
$$;

drop trigger if exists van_admin_push_updated_at on public.admin_push_devices;
create trigger van_admin_push_updated_at
before update on public.admin_push_devices
for each row execute function public.van_admin_push_updated_at();


-- Enable realtime INSERT alerts for audition applications.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'audition_applications'
  ) then
    alter publication supabase_realtime add table public.audition_applications;
  end if;
end $$;

notify pgrst, 'reload schema';
