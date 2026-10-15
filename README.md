# E-Mtaani Digital

**Mtaani Kiganjani** is a mobile-first portal for applying to and processing local-government services in Tanzania. Citizens can submit service requests, follow their progress, pay configured fees, and download documents when issued. Staff review applications and verify people; administrators manage portal users and configuration. The interface supports Swahili and English.

> This repository contains the application implementation and its current Supabase migrations. Payment-provider settlement, government revenue allocation, and production operating procedures must be confirmed with the responsible authorities before this is treated as a live government collection system. See [Payment and revenue](#payments-and-revenue).

## What the app does

### Citizen portal

- Sign up, sign in, complete a profile, and identify as a Tanzanian citizen, diaspora applicant, or foreign applicant.
- Submit service applications and required details or supporting documents.
- View applications, payment state, messages, and progress through review and issuance.
- Receive account-level verification status. Identity verification belongs to the person’s profile and is intended to be completed once, rather than repeated for every application.
- Download the available receipt, issued certificate, letter, or dispute acknowledgement from the application when its workflow allows it.

### Staff portal

- Review applications, inspect applicant and service details, communicate, request more information, reject, approve, or escalate cases.
- Verify a person’s identity and maintain their verification status separately from an individual application review.
- Apply saved officer signature and official stamp assets where available when approving a document.
- View staff dashboard and application updates. Supabase Realtime is configured for application and user-verification changes; actual delivery depends on the connected project’s publication, authorization policies, and client connection.

### Admin and department workflows

- Manage staff and users, service and office configuration, locations, and administrative activity.
- Route escalated work to departments and provide role-specific portals.
- Support business approval, citizen support, announcements, community reports, and audit activity, where enabled by the deployed app and database configuration.

## Citizen services and configured fees

These are the current values in [`src/constants/serviceFees.ts`](src/constants/serviceFees.ts). They are application configuration, not proof that a tariff has been approved by government.

| Service | Tanzanian citizen | Diaspora | Foreigner |
| --- | ---: | ---: | ---: |
| Burial permit (Kibali cha Mazishi) | TSh 2,000 | TSh 10,000 | TSh 20,000 |
| Celebration permit (Kibali cha Sherehe) | 5% of declared event cost | 10% of declared event cost | 10% of declared event cost |
| Introduction letter (Barua ya Utambulisho) | TSh 2,000 | TSh 10,000 | TSh 10,000 |
| Dispute report (Taarifa ya Mgogoro) | TSh 1,000 | TSh 20,000 | TSh 10,000 |

For a celebration declared at TSh 100,000, the configured fee is TSh 5,000 for a citizen and TSh 10,000 for a diaspora applicant or foreigner. The declared event cost is used as the percentage base; it is not added to the fee. Fee calculations and labels should be checked against the currently deployed code before publishing a tariff.

## Application lifecycle

Applications use statuses including `submitted`, `pending_review`, `pending_payment`, `paid`, `verified`, `approved`, `issued`, `returned`, `rejected`, and `refunded`. The exact path depends on the service and configured workflow. A successful local payment simulation must not be mistaken for gateway-confirmed funds. Document availability should be tied to a trusted payment confirmation and the staff issuance policy used in production.

## Technology

- **Frontend:** React 19, TypeScript, Vite 7, React Router, Tailwind CSS 4.
- **UI and state:** Radix UI, Lucide icons, Framer Motion, Zustand, React Hook Form, and Zod.
- **Backend services:** Supabase Auth and PostgreSQL through `@supabase/supabase-js`; row-level security (RLS) is enabled on core data tables in the schema migrations.
- **Live updates:** Supabase Realtime subscriptions for applications and user verification, subject to database publication and RLS configuration.
- **Documents:** `@react-pdf/renderer` for downloadable PDF documents and receipts; QR/document verification utilities are included in the app.
- **Server endpoint:** `api/admin.ts` provides privileged admin operations. It requires server-side credentials and must only run in a trusted server environment.
- **Deployment configuration:** Vercel settings are in [`vercel.json`](vercel.json); local Vite development includes an `/api/admin` middleware in [`vite.config.ts`](vite.config.ts).

## Architecture and repository map

```text
src/
  app.tsx                 Routes and application shell
  components/             Shared UI, review, verification, payment, and PDF components
  constants/              Service catalogue, fee rules, and emblem data
  context/                Authentication and application contexts
  hooks/                  Application and dashboard data hooks
  lib/                    Supabase client, fees, PDFs, validation, utilities
  pages/                  Citizen, staff, admin, and department screens
  stores/                 Client-side Zustand stores
  types/                  Shared TypeScript types
api/admin.ts              Privileged admin API handler
supabase/
  functions/               Edge Functions
  migrations/              Ordered database schema and policy changes
docs/                      Product, schema, security, deployment, and revenue notes
```

The browser client uses the Supabase publishable/anon key and must be constrained by RLS. Any service-role key belongs only in server-side environment settings; it must never be placed in a `VITE_` variable or shipped to the browser.

## Database overview

The source of truth for schema changes is [`supabase/migrations/`](supabase/migrations/). The core migration defines enums and tables for:

- **Identity and access:** `users`, roles, applicant category, office assignment, profile documents, and activity logs.
- **Service delivery:** `services`, `service_categories`, `applications`, application status and reference numbers, generated documents, and payments.
- **Geography and offices:** `locations`, `offices`, and `office_registry`.
- **Other portal workflows:** business registrations, client relationships, notifications, profile-change requests, agreement notifications, support tickets and responses, community reports and media, announcements, and department routing rules.

Core tables have RLS enabled in the migrations. Review every policy against the intended citizen/staff/admin/department access model before deploying to a new Supabase project. Realtime publication membership alone does not grant a user access to rows; RLS and authorization still apply.

### Apply migrations to a Supabase project

Install the Supabase CLI, authenticate, and link this checkout to the intended project before applying migrations:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the migration list and target project before confirming `db push`. These commands modify the linked database. Do not copy a project reference or credentials from another environment.

## Run locally

### Requirements

- Node.js version supported by the installed Vite version.
- npm.
- A Supabase project for authenticated, database-backed use. Demo mode can be enabled for local UI exploration where supported.

### Install and configure

```powershell
cd C:\path\to\E-Mtaani-Digital-
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` with the values for your own Supabase project:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_DEMO_MODE=false
```

Optional local server values are documented in `.env.example`. The admin API also needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a trusted server environment. Never put the service-role key in a `VITE_` variable, commit real `.env` files, or share production credentials in issues or screenshots.

Start the app and build it:

```powershell
npm run dev
npm run build
```

The local development server normally starts at `http://localhost:5173`. For a production-like local preview after building, run `npm run preview`.

## Payments and revenue

### Current payment implementation

The payment screen currently presents a **simulation/demo flow**. The UI explicitly states that no external payment provider processed the transaction and that there is no GePG connection. A simulated transaction can update application/payment state in the app; this is not evidence of bank, card, PayPal, mobile-money, or government-gateway settlement.

Before accepting real money, integrate an approved provider on the server side, verify signed provider callbacks, reconcile control numbers and amounts against provider records, handle duplicate callbacks/refunds/failures, issue receipts only after confirmed settlement, and protect document issuance from client-side status changes. Do not request or store a citizen's account login password as a substitute for payment authentication.

### Revenue assumptions and public accounting

The portal calculates fees and includes a provisional `splitFee()` example (20% TRA, 10% Halmashauri, 40% Maendeleo ya Jamii, 30% Service Fee). This is **only a software setting**; it is not an approved government allocation, tax treatment, or evidence that those bodies are entitled to the listed shares. The responsible authorities must approve each tariff, legal basis, receiving account, exemptions, provider costs, reconciliation, reporting, and accounting treatment before launch.

The [2-million-user revenue model](docs/revenue-model-tanzania-2-million-users.md) is an illustrative scenario, not a forecast. It makes explicit assumptions about application uptake, service mix, average fee, and payment completion. Registered users are not the same as paid applications or public revenue.

## Security and operational checklist

- Keep real secrets in local ignored environment files or deployment secret settings; commit only `.env.example` placeholders.
- Keep service-role keys server side and restrict the admin endpoint to authorized operators.
- Verify Supabase RLS policies, Auth settings, storage access, rate limits, backups, and audit retention for the actual deployment.
- Confirm the connected project has the required schema migrations and Realtime publication entries.
- Use provider-confirmed payment events; do not trust browser-only payment results for settlement or document issuance.
- Obtain approval for service fees, document templates, stamps, signatures, privacy notices, and records retention from the responsible institutions.
- Test staff/citizen role boundaries and document access using non-production accounts before launch.

## Build, checks, and deployment

```powershell
npm run build
npm run lint
npm run typecheck
npm run test:run
```

Vercel is configured to run the build, serve `dist`, route client-side pages to `index.html`, and add basic response headers. Configure the browser Supabase URL and publishable/anon key as client environment variables. Add privileged server environment values only as server-side secrets. Apply and verify Supabase migrations separately; deploying frontend code does not migrate the database or activate a real payment provider.

## Further documentation

- [Product overview](docs/01-OVERVIEW.md)
- [Technical architecture](docs/02-TECHNICAL-ARCHITECTURE.md)
- [Database schema](docs/03-DATABASE-SCHEMA.md)
- [Services and workflows](docs/05-SERVICES-AND-WORKFLOWS.md)
- [Deployment guide](docs/06-DEPLOYMENT-GUIDE.md)
- [Roles and permissions](docs/07-USER-ROLES-AND-PERMISSIONS.md)
- [Security notes](docs/09-SECURITY.md)
- [Current status and roadmap](docs/10-CURRENT-STATUS.md)
- [Illustrative revenue model](docs/revenue-model-tanzania-2-million-users.md)

## License

The project manifest currently declares `ISC` in `package.json`. Confirm the intended project-wide license and third-party asset rights before redistribution.
