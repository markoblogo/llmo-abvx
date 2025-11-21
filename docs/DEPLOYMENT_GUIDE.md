# LLMO Directory - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all production environment variables are set in your deployment platform:

**Required Variables:**
\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# Stripe (LIVE MODE - not test mode)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (Production API Key)
RESEND_API_KEY=re_...
\`\`\`

### 2. Database Setup

Run all SQL scripts in order on your **production** Supabase instance:

\`\`\`bash
1. scripts/01-create-links-table.sql
2. scripts/02-create-subscriptions-table.sql
3. scripts/03-create-profiles-table.sql
4. scripts/04-update-links-table.sql
5. scripts/05-update-subscriptions-table.sql
6. scripts/06-create-email-logs-table.sql
\`\`\`

**Important:** Manually create your first admin user:
\`\`\`sql
-- After registering your account, run this:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'a.biletskiy@gmail.com';
\`\`\`

### 3. Stripe Configuration

**Switch to Live Mode:**
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy LIVE mode keys (not test mode)
3. Update environment variables with live keys

**Configure Webhook:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://llmo.abvx.xyz/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Resend Email Configuration

**Verify Domain:**
1. Go to Resend Dashboard → Domains
2. Add domain: `llmo.directory`
3. Add DNS records to your domain provider
4. Wait for verification (can take up to 48 hours)

**Update Email From Address:**
Once domain is verified, emails will send from:
\`\`\`
LLMO Directory <no-reply@llmo.directory>
\`\`\`

Until then, they'll use your Resend sandbox domain.

### 5. Vercel Cron Job Setup

Add this to your `vercel.json` (already included):
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/send-reminders",
    "schedule": "0 9 * * *"
  }]
}
\`\`\`

This runs daily at 9 AM UTC to send expiry reminders.

---

## Deployment Steps

### Option A: Deploy to Vercel (Recommended)

1. **Connect Repository:**
   \`\`\`bash
   # Push code to GitHub
   git init
   git add .
   git commit -m "Initial commit - LLMO Directory"
   git branch -M main
   git remote add origin https://github.com/markoblogo/llmo-directory.git
   git push -u origin main
   \`\`\`

2. **Import to Vercel:**
   - Go to vercel.com/new
   - Import your GitHub repository
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `next build`
   - Output Directory: `.next`

3. **Add Environment Variables:**
   - In Vercel project settings → Environment Variables
   - Add all variables from the checklist above
   - Make sure to select "Production" environment

4. **Configure Custom Domain:**
   - Go to Project Settings → Domains
   - Add custom domain: `llmo.abvx.xyz`
   - Add DNS records to your domain provider:
     \`\`\`
     Type: CNAME
     Name: llmo
     Value: cname.vercel-dns.com
     \`\`\`

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Visit `https://llmo.abvx.xyz`

### Option B: Deploy to v0.dev

1. Click the "Publish" button in v0
2. Follow the prompts to deploy
3. Configure custom domain in deployment settings

---

## Post-Deployment Testing

### Authentication Flow
- [ ] Register new account
- [ ] Verify email confirmation works
- [ ] Login with credentials
- [ ] Test Google OAuth (if configured)
- [ ] Logout and login again

### User Features
- [ ] Add a new link from dashboard
- [ ] View links in dashboard
- [ ] Check subscription status display
- [ ] Test navigation between all pages

### Payment Flow
- [ ] Go to Pricing page
- [ ] Click "Upgrade to Pro"
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify redirect to success page
- [ ] Check subscription updated in dashboard
- [ ] Verify webhook received in Stripe dashboard

### Admin Panel
- [ ] Access /admin (should work for admin user)
- [ ] View all sections: Users, Links, Subscriptions, Emails
- [ ] Test user promotion
- [ ] Test link verification
- [ ] Send test email

### Email System
- [ ] Send test email from admin panel
- [ ] Check email received at a.biletskiy@gmail.com
- [ ] Verify email styling renders correctly
- [ ] Check email logs in admin panel

### Contact Form
- [ ] Submit contact form
- [ ] Verify email received
- [ ] Check success message displays

### SEO & Performance
- [ ] Run Lighthouse audit (target: 90+ for all metrics)
- [ ] Verify meta tags with Facebook Debugger
- [ ] Check Twitter Card preview
- [ ] Verify sitemap.xml loads: `/sitemap.xml`
- [ ] Verify robots.txt loads: `/robots.txt`
- [ ] Test 404 page: visit `/nonexistent-page`

---

## Troubleshooting

### Build Errors

**TypeScript Errors:**
\`\`\`bash
# Run locally to see all errors
npm run build
\`\`\`
Fix all TypeScript errors before deploying.

**Missing Dependencies:**
\`\`\`bash
npm install
\`\`\`

### Runtime Errors

**Supabase Connection Issues:**
- Verify environment variables are set correctly
- Check Supabase project is not paused
- Verify RLS policies allow operations

**Stripe Webhook Not Working:**
- Check webhook URL is correct
- Verify webhook secret matches
- Check Stripe dashboard for webhook delivery logs
- Ensure endpoint is publicly accessible

**Emails Not Sending:**
- Verify RESEND_API_KEY is correct
- Check domain verification status
- Review email logs in admin panel
- Check Resend dashboard for delivery logs

### Performance Issues

**Slow Page Loads:**
- Enable Vercel Analytics
- Check database query performance
- Review Supabase logs for slow queries
- Consider adding database indexes

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Check email logs for failures
- [ ] Review Stripe dashboard for payments
- [ ] Monitor Supabase usage

### Weekly Checks
- [ ] Review user signups and activity
- [ ] Check subscription renewals
- [ ] Review admin panel stats

### Monthly Checks
- [ ] Audit user accounts
- [ ] Review and clean up expired links
- [ ] Check Lighthouse scores
- [ ] Update dependencies

---

## Support Contacts

**Admin Email:** a.biletskiy@gmail.com
**Domain:** https://llmo.abvx.xyz
**GitHub:** https://github.com/markoblogo

---

## Security Notes

1. **Never commit .env files** - Use environment variables in deployment platform
2. **Use HTTPS only** - Vercel provides this automatically
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Monitor Supabase RLS** - Ensure policies are restrictive
5. **Rotate API keys** - If compromised, regenerate immediately

---

## Success Criteria

Your deployment is successful when:

- ✅ All pages load without errors
- ✅ Authentication works (register, login, logout)
- ✅ Stripe payments process correctly
- ✅ Emails send successfully
- ✅ Admin panel accessible and functional
- ✅ Custom domain resolves correctly
- ✅ HTTPS enabled
- ✅ Lighthouse score > 90
- ✅ No console errors in browser
- ✅ All forms submit successfully

---

**Ready to deploy? Follow the steps above and you'll be live in minutes!**
