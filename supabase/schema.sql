create extension if not exists "pgcrypto";

create table if not exists public.alumni (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  first_name text,
  last_name text,
  college text,
  earliest_year text,
  latest_year text,
  positions_held text,
  all_years_on_composite text,
  linkedin_url text,
  job_title text,
  company_name text,
  location text,
  location_city text,
  location_state text,
  work_email text,
  company_linkedin_url text,
  company_website text,
  company_logo_url text,
  company_industry text,
  job_function text,
  enriched_person_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('active_brother', 'alumni')),
  email text,
  first_name text,
  last_name text,
  permanent_address text,
  birthday date,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists permanent_address text;
alter table public.profiles add column if not exists birthday date;

create table if not exists public.active_brother_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  school_email text not null,
  major text,
  graduation_year integer,
  chapter text,
  career_interests text,
  resume_storage_path text,
  resume_file_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.alumni_user_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  preferred_email text,
  graduation_year integer,
  company_name text,
  job_title text,
  created_at timestamptz not null default now()
);

alter table public.alumni enable row level security;
alter table public.profiles enable row level security;
alter table public.active_brother_profiles enable row level security;
alter table public.alumni_user_profiles enable row level security;

create policy "authenticated users can read alumni"
on public.alumni
for select
to authenticated
using (true);

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "users can manage own active brother profile"
on public.active_brother_profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = active_brother_profiles.profile_id
      and profiles.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = active_brother_profiles.profile_id
      and profiles.id = auth.uid()
  )
);

create policy "users can manage own alumni profile"
on public.alumni_user_profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = alumni_user_profiles.profile_id
      and profiles.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = alumni_user_profiles.profile_id
      and profiles.id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "authenticated users can upload own resume"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can read own resume"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
