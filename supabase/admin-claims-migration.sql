alter table public.alumni_user_profiles
  add column if not exists claimed_alumni_id text,
  add column if not exists claimed_alumni_relation text,
  add column if not exists claim_approved_at timestamptz;

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

drop trigger if exists set_alumni_claim_requests_updated_at on public.alumni_claim_requests;
create trigger set_alumni_claim_requests_updated_at
before update on public.alumni_claim_requests
for each row execute function public.set_updated_at();
