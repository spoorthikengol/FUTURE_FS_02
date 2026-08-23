# VeloraCRM

Turn leads into relationships.

VeloraCRM is an AI-powered client lead management system for modern revenue teams. It combines pipeline management, activity tracking, analytics, and a recommendation-only AI copilot in a premium dark SaaS workspace.

## Features

- Admin authentication with hashed passwords and HTTP-only JWT cookies
- Lead CRUD, search, filters, sorting, and pagination
- Kanban pipeline with drag-and-drop status changes
- Lead profiles with notes, follow-ups, and AI insights
- Dashboard KPIs, charts, funnel, recent activity, and follow-ups
- Analytics, revenue forecasting, and ROI by source, campaign, and month
- Velora AI assistant plus email draft generation (never auto-sends)
- Public `/contact` form that creates Website / NEW leads
- Activity timeline persisted in MongoDB
- Demo seed data (20+ realistic leads)

## Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- MongoDB + Mongoose
- JWT sessions via `jose`
- bcrypt password hashing
- Recharts, Lucide, Framer Motion, dnd-kit
- Zod validation

## Architecture

- `app/` — App Router pages and API route handlers
- `app/(app)/` — authenticated workspace (dashboard, leads, pipeline, analytics, AI, activity, settings)
- `lib/` — database, auth, validation, analytics, AI service abstraction
- `models/` — Mongoose schemas
- `components/` — reusable UI and feature components
- `scripts/seed.ts` — demo data seeder
- `proxy.ts` — request gate for protected pages and APIs

The AI layer lives in `lib/ai/service.ts`. If `AI_API_KEY` is missing or the provider fails, the app uses a deterministic demo fallback so CRM workflows still work.

Forecasting lives in `lib/analytics/forecast.ts` so the linear projection can later be replaced with a trained model.

## Installation

```bash
npm install
cp .env.example .env.local
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env.local`.

## MongoDB setup

Run a local MongoDB instance, Docker, or Atlas:

```bash
docker run -d --name velora-mongo -p 27017:27017 mongo:7
```

```env
MONGODB_URI=mongodb://127.0.0.1:27017/veloracrm
```

On first connection to an empty database, VeloraCRM seeds an admin user and sample leads automatically. To reseed:

```bash
npm run seed
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign session cookies |
| `APP_URL` | No | Public app URL |
| `CONTACT_CORS_ORIGIN` | No | CORS origin for `/api/contact` |
| `AI_API_KEY` | No | OpenAI-compatible API key |
| `AI_BASE_URL` | No | Provider base URL |
| `AI_MODEL` | No | Model name |

Never commit `.env.local` or API keys.

## AI configuration

1. Create an OpenAI-compatible key.
2. Set `AI_API_KEY`, optionally `AI_BASE_URL` and `AI_MODEL`.
3. Restart the app.

Without a key, email generation, insights, and chat run in demo mode and are labeled as recommendations.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo admin:

- Email: `ivan.p@example.net`
- Password: `VeloraAdmin123!`

Change this password before any production deployment.

## API documentation

Authenticated routes require the `velora_session` cookie from `POST /api/auth/login`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | No | Email/password login |
| POST | `/api/auth/logout` | Yes | Clear session |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/leads` | Yes | List leads (`q`, `status`, `source`, `priority`, `sort`, `order`, `page`, `pageSize`) |
| POST | `/api/leads` | Yes | Create lead |
| GET | `/api/leads/:id` | Yes | Lead, notes, follow-ups |
| PUT | `/api/leads/:id` | Yes | Update lead |
| DELETE | `/api/leads/:id` | Yes | Delete lead |
| PATCH | `/api/leads/:id/status` | Yes | Change status |
| POST | `/api/leads/:id/notes` | Yes | Add note |
| PUT | `/api/leads/:id/notes/:noteId` | Yes | Edit note |
| DELETE | `/api/leads/:id/notes/:noteId` | Yes | Delete note |
| POST | `/api/leads/:id/followups` | Yes | Schedule follow-up |
| PATCH | `/api/followups/:id` | Yes | Update/complete follow-up |
| GET | `/api/followups` | Yes | All follow-ups |
| GET | `/api/analytics` | Yes | KPIs, charts, forecast, ROI |
| GET | `/api/activity` | Yes | Activity timeline |
| POST | `/api/ai/email` | Yes | Generate email draft |
| POST | `/api/ai/insights` | Yes | Lead score and next action |
| POST | `/api/ai/chat` | Yes | Velora AI assistant |
| POST | `/api/contact` | No | Public lead capture |
| GET/PUT | `/api/settings` | Yes | Marketing spend and campaigns |

Responses use `{ success, data }` or `{ success, error }`.

## Deployment

1. Set production `MONGODB_URI` and a strong `JWT_SECRET`.
2. Set `APP_URL` to the public domain.
3. Optionally configure AI keys on the host — never bake them into the client.
4. Build and start:

```bash
npm run build
npm run start
```

Vercel, Docker, or any Node 20.9+ host works. Ensure the MongoDB cluster allows the deployment IP.

## Future improvements

- Team roles and per-seat permissions
- Email sending via a provider with explicit user confirmation
- Real-time activity over websockets
- Replace linear revenue forecast with a trained model
- CRM integrations (calendar, Slack, product analytics)

## License

Private / unlicensed unless otherwise specified.
