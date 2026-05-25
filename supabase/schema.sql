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
  profile_summary text,
  created_at timestamptz not null default now()
);

alter table public.alumni add column if not exists profile_summary text;

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
  linkedin_url text,
  hometown text,
  major text,
  graduation_year integer,
  current_grade text,
  chapter text,
  career_interests text,
  resume_storage_path text,
  resume_file_name text,
  cover_letter_storage_path text,
  cover_letter_file_name text,
  created_at timestamptz not null default now()
);

alter table public.active_brother_profiles add column if not exists linkedin_url text;
alter table public.active_brother_profiles add column if not exists hometown text;
alter table public.active_brother_profiles add column if not exists current_grade text;
alter table public.active_brother_profiles add column if not exists cover_letter_storage_path text;
alter table public.active_brother_profiles add column if not exists cover_letter_file_name text;

create table if not exists public.alumni_user_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  preferred_email text,
  graduation_year integer,
  company_name text,
  job_title text,
  claimed_alumni_id text,
  claimed_alumni_relation text,
  claim_approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.alumni_user_profiles add column if not exists claimed_alumni_id text;
alter table public.alumni_user_profiles add column if not exists claimed_alumni_relation text;
alter table public.alumni_user_profiles add column if not exists claim_approved_at timestamptz;

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

create table if not exists public.company_job_postings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text,
  location text,
  employment_type text,
  seniority_level text,
  is_internship boolean not null default false,
  is_entry_level boolean not null default false,
  is_new_grad boolean not null default false,
  apply_url text,
  posting_url text,
  source text not null default 'apify',
  source_job_id text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'active',
  raw_job_json jsonb,
  normalized_job_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_job_postings_company_id_idx
  on public.company_job_postings (company_id);

create index if not exists company_job_postings_status_idx
  on public.company_job_postings (status);

create unique index if not exists company_job_postings_source_unique
  on public.company_job_postings (company_id, source, source_job_id);

create table if not exists public.company_recruiting_analysis (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  internship_program_exists text,
  entry_level_hiring_exists text,
  likely_recruiting_window text,
  recruiting_cycle_confidence text,
  recruiting_cycle_reason text,
  best_time_to_apply text,
  hiring_intensity text,
  entry_level_friendliness text,
  common_roles_hired text[],
  recommended_alumni_contacts text[],
  job_market_signal text,
  analysis_summary text,
  cited_sources jsonb,
  raw_analysis_json jsonb,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alumni_claim_requests (
  id uuid primary key default gen_random_uuid(),
  alumni_id text not null,
  alumni_relation text not null default 'alumni',
  alumni_name text,
  alumni_company_name text,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alumni_claim_requests_profile_alumni_idx
  on public.alumni_claim_requests (profile_id, alumni_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_company_job_postings_updated_at on public.company_job_postings;
create trigger set_company_job_postings_updated_at
before update on public.company_job_postings
for each row execute function public.set_updated_at();

drop trigger if exists set_company_recruiting_analysis_updated_at on public.company_recruiting_analysis;
create trigger set_company_recruiting_analysis_updated_at
before update on public.company_recruiting_analysis
for each row execute function public.set_updated_at();

drop trigger if exists set_alumni_claim_requests_updated_at on public.alumni_claim_requests;
create trigger set_alumni_claim_requests_updated_at
before update on public.alumni_claim_requests
for each row execute function public.set_updated_at();
