# AlumniOS MVP

AlumniOS is a local demo SaaS platform for fraternity alumni search and opportunity analysis.

## Stack
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- ShadCN-style UI components
- Prisma + PostgreSQL

## Run locally

1. Install dependencies
```bash
npm install
```

2. Start PostgreSQL locally and ensure `DATABASE_URL` in `.env` is correct.

3. Run migrations
```bash
npx prisma migrate dev --name init
```

4. Seed data (50 fictional alumni)
```bash
npm run seed
```

5. Run app
```bash
npm run dev
```

## Pages
- `/login` mock login
- `/dashboard`
- `/directory`
- `/alumni/[id]`
- `/internships`
- `/industry`
- `/locations`

## Features
- Seeded alumni dataset with realistic diversity
- Dashboard analytics and charts (Recharts)
- Directory search + filters + natural language parser
- CSV export
- Filter persistence in URL + localStorage
- Internship, industry, and location intelligence views
