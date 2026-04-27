# AlumniOS

AlumniOS is a Next.js + Supabase platform for fraternity alumni intelligence, company intelligence, and active-brother career workflows.

## Current scope

- Auth, signup, and onboarding for chapter users
- Alumni directory with LinkedIn-enriched profiles
- Company directory with alumni-company mapping
- Company recruiting intelligence powered by OpenAI web search
- Actives dashboard with resume and cover-letter sharing

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Storage
- Trigger.dev
- OpenAI
- Bright Data
- Apify

## Run locally

1. Install dependencies

```bash
npm install
```

2. Add environment variables in `.env.local` / `.env`

Required app/runtime values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Current enrichment integrations used by the project:

- `OPENAI_API_KEY`
- `BRIGHTDATA_API_KEY`
- `APIFY_API_TOKEN`

3. Start the app

```bash
npm run dev
```

4. Create a production build

```bash
npm run build
```

## Main routes

- `/login`
- `/signup`
- `/onboarding`
- `/dashboard`
- `/directory`
- `/alumni/[id]`
- `/companies`
- `/companies/[id]`
- `/internships-jobs`
- `/actives`
- `/profile`

## Enrichment scripts

```bash
npm run enrich:company-jobs:apify
npm run enrich:company-recruiting:openai
```

## Notes

- Alumni enrichment and company enrichment persist to Supabase.
- Resume and cover-letter uploads use the `resumes` storage bucket.
- Recruiting intelligence is stored in `company_recruiting_analysis`.
- This repo is ready for a small beta if the production Supabase and environment variables are configured correctly.
