export type AppRole = "active_brother" | "alumni";

export type AlumniRow = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  college: string | null;
  earliest_year: string | null;
  latest_year: string | null;
  positions_held: string | null;
  all_years_on_composite: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  work_email: string | null;
  company_linkedin_url: string | null;
  company_website: string | null;
  company_logo_url: string | null;
  company_industry: string | null;
  sub_industry: string | null;
  job_function: string | null;
  enriched_person_json: Record<string, unknown> | null;
  profile_summary: string | null;
  referral_power_score?: number | null;
  referral_power_reason?: string | null;
  created_at: string;
  raw_record?: Record<string, unknown>;
};

export type ProfileRow = {
  id: string;
  role: AppRole;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  permanent_address: string | null;
  birthday: string | null;
  onboarding_complete: boolean;
  created_at: string;
};

export type ActiveBrotherProfileRow = {
  id: string;
  profile_id: string;
  school_email: string;
  linkedin_url: string | null;
  hometown: string | null;
  major: string | null;
  graduation_year: number | null;
  current_grade: string | null;
  chapter: string | null;
  career_interests: string | null;
  resume_storage_path: string | null;
  resume_file_name: string | null;
  cover_letter_storage_path: string | null;
  cover_letter_file_name: string | null;
  created_at: string;
};

export type ActiveBrotherCoverLetterRow = {
  id: string;
  profile_id: string;
  storage_path: string;
  file_name: string;
  created_at: string;
};

export type AlumniUserProfileRow = {
  id: string;
  profile_id: string;
  preferred_email: string | null;
  graduation_year: number | null;
  company_name: string | null;
  job_title: string | null;
  claimed_alumni_id?: string | null;
  claimed_alumni_relation?: string | null;
  claim_approved_at?: string | null;
  created_at: string;
};
