# LLMO Directory

**Make your content visible to AI — Optimize your site for LLMs.**

LLMO Directory is a modern website catalog designed not only for human visitors but for AI models, crawlers, and chatbots. Help your content get discovered by ChatGPT, Claude, Gemini, and other large language models.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## Overview

LLMO Directory helps website owners make their content visible to AI systems through three integrated tools:

- **AI Analyzer** — Analyze your website and get an AI visibility score with actionable recommendations
- **LLMO Directory** — Add your site to an AI-optimized directory with hierarchical categories and advanced filtering
- **llms.txt & Metadata AI** — Automatically generate and update `llms.txt` files and optimize metadata for AI parsing

The platform offers a **free tier** with a 3-month trial for one link, and a **Pro plan** for $9/year with advanced features including automated `llms.txt` updates, featured listings, and priority support.

---

## Features

### Core Features

- **AI Analyzer (Pro)** — Comprehensive site analysis with AI visibility scoring
  - Content structure analysis
  - Semantic markup detection
  - Machine-readable format validation
  - Actionable optimization recommendations

- **LLMO Directory** — Public catalog of AI-optimized websites
  - Hierarchical category system (3 levels)
  - Advanced search and filtering
  - Featured listings with priority placement
  - Status tracking (active, pending, expired)

- **Automated llms.txt Updates** — Pro feature that automatically regenerates your `llms.txt` file every 90 days
  - Scheduled background tasks
  - Webhook integration for instant updates
  - Version control and history tracking

- **Metadata AI** — AI-powered metadata suggestions and optimization
  - Automatic metadata generation
  - Schema.org structured data
  - Open Graph and Twitter Card optimization

### Admin Panel

The admin dashboard provides comprehensive management tools:

- **Overview** — Key metrics and statistics
  - Total users, links, subscriptions
  - Revenue tracking (Stripe integration)
  - Active vs expired subscriptions
  - Recent activity feed

- **Users Management** — Full user administration
  - View all registered users
  - Change user roles (`none`, `basic`, `super`)
  - Manage admin levels
  - Gift subscriptions to users
  - User search and filtering

- **Subscriptions** — Stripe subscription management
  - View all active and expired subscriptions
  - Cancel or renew subscriptions
  - Mark payments as received
  - Filter by status and source

- **Links Management** — Directory entry administration
  - View, approve, or remove directory links
  - Verify backlinks
  - Featured link management
  - Bulk operations

- **Email Logs** — Transactional email tracking (coming soon)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication:** NextAuth.js with Google OAuth provider
- **Payments:** Stripe (subscriptions, checkout, webhooks)
- **Email:** Resend (transactional emails, reminders)
- **AI:** OpenAI API (content analysis, metadata generation)
- **Package Manager:** pnpm
- **Deployment:** Vercel

---

## Environment Variables

The following environment variables are required for the application to run:

### Required Variables

- `NEXTAUTH_URL` — Base URL for NextAuth.js (e.g., `http://localhost:3000` or `https://your-domain.com`)
- `NEXTAUTH_SECRET` — Secret key for encrypting sessions (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_SITE_URL` — Public site URL for absolute links and callbacks
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- `STRIPE_SECRET_KEY` — Stripe secret key (use test key for development)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `NEXT_PUBLIC_STRIPE_PRICE_ID` — Stripe Price ID for Pro subscription
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `RESEND_API_KEY` — Resend API key for emails
- `OPENAI_API_KEY` — OpenAI API key for AI features

### Optional Variables

- `NEXT_PUBLIC_BOOK_POPUP_ENABLED` — Enable welcome modal (default: `false`)
- `NEXT_PUBLIC_AMAZON_BOOK_URL` — Amazon book URL for marketing
- `NEXT_PUBLIC_BOOK_DOWNLOAD_URL` — Free PDF book download URL
- `EMAIL_FROM` — Default sender email address
- `CONTACT_EMAIL` — Contact form recipient email
- `ADMIN_EMAIL` — Admin notifications email
- `CRON_SECRET` — Secret token for cron job authentication
- `DATABASE_URL` — PostgreSQL connection string (if using Prisma)

**📋 Full list of all variables with descriptions and placeholders — see [`.env.example`](./.env.example)**

---

## Local Development

### Prerequisites

- Node.js 18+ or higher
- pnpm (recommended) or npm
- Supabase account and project
- Google Cloud Console project with OAuth credentials
- Stripe account (test mode for development)
- Resend account (for email features)
- OpenAI API key (for AI analyzer features)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd LLMO
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in all required variables in `.env.local` with your actual credentials.

4. **Run the development server:**
   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000` (or port 3005 if specified).

5. **Verify environment configuration:**
   ```bash
   pnpm run check-env
   ```

   This will validate that all required environment variables are set correctly.

### Development Ports

By default, the development server runs on port **3005**. If you need a different port:

```bash
PORT=3000 pnpm dev
```

---

## Build & Lint

### Lint Code

```bash
pnpm lint
```

### Build for Production

```bash
pnpm build
```

This creates an optimized production build in the `.next` directory.

### Start Production Server

```bash
pnpm start
```

---

## Deployment (Vercel)

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository (GitHub, GitLab, or Bitbucket)

### Step 2: Configure Environment Variables

In Vercel project settings → **Environment Variables**, add all variables from `.env.example`:

- Set `NEXTAUTH_URL` to your production domain (e.g., `https://llmo.abvx.xyz`)
- Use **production** Stripe keys (`sk_live_...`, `pk_live_...`)
- Use **production** Supabase credentials
- Set all other variables as required

**Important:** For production, use:
- Live Stripe keys (not test keys)
- Production Supabase project
- Verified domain in Resend
- Strong `NEXTAUTH_SECRET` and `CRON_SECRET`

### Step 3: Deploy

Vercel will automatically:
- Detect Next.js framework
- Install dependencies with `pnpm install`
- Run `pnpm build`
- Deploy to production

The build is standard Next.js — no custom build configuration required.

### Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard → **Developers → Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel

### Step 5: Set Up Cron Jobs (Optional)

If you use Vercel Cron for scheduled tasks:

1. Create `vercel.json` with cron configuration
2. Set `CRON_SECRET` environment variable
3. Configure cron endpoints to require `CRON_SECRET` token

---

## Admin Access

The admin panel is accessible at `/admin` for users with admin privileges.

### Admin Levels

Users have two fields that determine admin access:

- **`role`** — Legacy role field (`admin` or `user`)
- **`admin_level`** — Three-tier admin system:
  - `none` — Regular user (no admin access)
  - `basic` — Basic admin (view-only and limited actions)
  - `super` — Super admin (full access to all admin features)

### Default Super Admin

The super admin is determined by the email address defined in the codebase (`SUPER_ADMIN_EMAIL`). This user can:

- Grant admin privileges to other users
- Change user `admin_level` (none → basic → super)
- Gift subscriptions (set subscription `source = 'gift'`)
- Access all admin features without restrictions

### Setting Up First Admin

After registering your account:

1. Connect to your Supabase database
2. Run the SQL script to set admin privileges:
   ```sql
   UPDATE profiles 
   SET role = 'admin', admin_level = 'super' 
   WHERE email = 'your-email@example.com';
   ```

Alternatively, if you have the email hardcoded as super admin in `lib/auth.ts`, that user automatically gets super admin access.

### Basic Admin vs Super Admin

- **Basic Admin (`admin_level = 'basic'`):**
  - View admin dashboard and statistics
  - View users, subscriptions, and links
  - Limited edit capabilities

- **Super Admin (`admin_level = 'super'`):**
  - All basic admin features
  - Change user roles and admin levels
  - Gift subscriptions
  - Cancel or modify subscriptions
  - Delete users and links
  - Full access to all admin tools

---

## Trial & Plans

### Free Tier

- **3-month free trial** for one link
- Manual `llms.txt` generation
- Basic AI analyzer access
- Public directory listing

### Pro Plan — $9/year

- All free tier features
- **Automated `llms.txt` updates** (every 90 days)
- **Analyzer Pro** access with detailed AI scoring
- AI Metadata suggestions
- **Priority directory listing**
- Email insights reports
- Featured boost option (additional $3 per boost)

### Agency Plan — $30/year

- All Pro features
- Manage up to 50 links
- Team access (3 members)
- Featured placement for top links
- Analytics dashboard
- Priority support

### Trial System

The trial API endpoint (`/api/user/start-pro-trial`) is implemented but currently not active in the UI. It allows users to start a Pro trial programmatically. This feature may be enabled in future updates.

### Subscription Management

Users can:
- Upgrade to Pro via Stripe Checkout
- Manage billing through Stripe Customer Portal
- Receive automatic renewal reminders via email
- View subscription status in their dashboard

---

## Project Structure

```
LLMO/
├── app/                    # Next.js App Router pages
│   ├── [locale]/          # Localized routes (i18n)
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── analyzer/          # AI Analyzer page
│   ├── directory/         # Public directory
│   ├── dashboard/         # User dashboard
│   ├── pricing/           # Pricing page
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                  # Utilities and helpers
│   ├── auth.ts          # Authentication helpers
│   ├── stripe.ts        # Stripe client
│   └── ...
├── pages/                # Pages API routes
│   └── api/             # Legacy API routes
├── prisma/              # Prisma schema (optional)
├── public/              # Static assets
├── scripts/             # Utility scripts
└── locales/             # i18n translation files
```

---

## Additional Scripts

- `pnpm run check-env` — Validate environment variables
- `pnpm run generate-sitemap` — Generate sitemap.xml
- `pnpm run audit-site` — Run content audit
- `pnpm run translate` — Sync translations
- `pnpm run clean` — Clean build cache

---

## License

**Proprietary** — All rights reserved.

This project is private and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

For questions or issues:
- Check the [FAQ page](./app/faq/page.tsx) in the application
- Contact support via the [contact form](./app/contact/page.tsx)
- Review the [docs](./docs/) folder for detailed guides

---

**Built with ❤️ for the AI-first web**
