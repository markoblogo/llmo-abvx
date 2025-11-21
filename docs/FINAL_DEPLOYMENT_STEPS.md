# Final Production Deployment Steps for LLMO Directory

## Pre-Deployment Checklist

### ✅ Files Verified
- [x] All routes exist (/, /pricing, /faq, /about, /contact, /privacy, /terms)
- [x] robots.txt in /public
- [x] sitemap.xml in /public
- [x] RSS feed at /feed.xml
- [x] 404 page (not-found.tsx)
- [x] OG image (og-cover.jpg)
- [x] Production Next.js config
- [x] Vercel config with cron jobs

---

## Step 1: Push to GitHub

**Action Required:** Use the v0 UI to push your code to GitHub

1. Click the **GitHub icon** in the top right of v0
2. Select your repository: `v0-llmo`
3. Commit message: "Production-ready deployment v1.0"
4. Push to `main` branch

---

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `v0-llmo`
3. Project name: `llmo-directory`
4. Framework Preset: **Next.js** (auto-detected)
5. Root Directory: `./` (leave default)

### 2.2 Configure Environment Variables

Add the following environment variables in Vercel:

**Supabase:**
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

**Stripe:**
\`\`\`
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PRICE_ID=your_price_id
STRIPE_WEBHOOK_SECRET=your_webhook_secret
\`\`\`

**Resend:**
\`\`\`
RESEND_API_KEY=your_resend_api_key
\`\`\`

**Other:**
\`\`\`
NEXT_PUBLIC_SITE_URL=https://llmo.abvx.xyz
\`\`\`

### 2.3 Deploy

Click **Deploy** and wait for the build to complete (2-3 minutes).

---

## Step 3: Configure Custom Domain

1. Go to your Vercel project → **Settings** → **Domains**
2. Add domain: `llmo.abvx.xyz`
3. Follow Vercel's DNS configuration instructions
4. Add CNAME record in your DNS provider:
   \`\`\`
   Type: CNAME
   Name: llmo (or @)
   Value: cname.vercel-dns.com
   \`\`\`
5. Wait for DNS propagation (5-30 minutes)

---

## Step 4: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://llmo.abvx.xyz/api/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copy the **Signing secret**
6. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
7. Redeploy the application

---

## Step 5: Run Database Migrations

Execute the SQL scripts in your Supabase SQL Editor in this order:

1. `scripts/01-create-links-table.sql`
2. `scripts/02-create-subscriptions-table.sql`
3. `scripts/03-create-profiles-table.sql`
4. `scripts/04-update-links-table.sql`
5. `scripts/05-update-subscriptions-table.sql`
6. `scripts/06-create-email-logs-table.sql`

**Important:** Run each script separately and verify success before proceeding.

---

## Step 6: Verify Resend Domain

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add domain: `llmo.abvx.xyz`
3. Add the DNS records provided by Resend to your DNS provider
4. Wait for verification (5-30 minutes)
5. Test email sending from Admin Dashboard → Emails → Send Test Email

---

## Step 7: Post-Deployment Verification

### 7.1 Test All Routes

Visit and verify these URLs return 200 OK:

- [ ] https://llmo.abvx.xyz/
- [ ] https://llmo.abvx.xyz/about
- [ ] https://llmo.abvx.xyz/pricing
- [ ] https://llmo.abvx.xyz/faq
- [ ] https://llmo.abvx.xyz/contact
- [ ] https://llmo.abvx.xyz/privacy
- [ ] https://llmo.abvx.xyz/terms
- [ ] https://llmo.abvx.xyz/register
- [ ] https://llmo.abvx.xyz/login
- [ ] https://llmo.abvx.xyz/robots.txt
- [ ] https://llmo.abvx.xyz/sitemap.xml
- [ ] https://llmo.abvx.xyz/feed.xml

### 7.2 Test User Flows

- [ ] Register new account
- [ ] Verify email confirmation works
- [ ] Login with credentials
- [ ] Add a new link
- [ ] View dashboard
- [ ] Test Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify subscription upgrade
- [ ] Test contact form
- [ ] Test admin access (promote a user to admin first)

### 7.3 Test Admin Features

- [ ] Access admin dashboard at /admin
- [ ] View users list
- [ ] View links list
- [ ] View subscriptions list
- [ ] View email logs
- [ ] Send test email
- [ ] Verify backlink
- [ ] Promote user to admin

### 7.4 SEO Verification

1. **Google Search Console:**
   - Add property: `https://llmo.abvx.xyz`
   - Submit sitemap: `https://llmo.abvx.xyz/sitemap.xml`
   - Ping Google: `https://www.google.com/ping?sitemap=https://llmo.abvx.xyz/sitemap.xml`

2. **Validate Structured Data:**
   - Go to [Rich Results Test](https://search.google.com/test/rich-results)
   - Test URL: `https://llmo.abvx.xyz`
   - Verify Organization schema is detected

3. **Test Social Cards:**
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### 7.5 Performance Check

- [ ] Run [PageSpeed Insights](https://pagespeed.web.dev/)
- [ ] Target: 90+ score on mobile and desktop
- [ ] Check Core Web Vitals

---

## Step 8: Monitor & Maintain

### Set Up Monitoring

1. **Vercel Analytics:**
   - Enable in Vercel Dashboard → Analytics
   - Monitor page views, performance, and errors

2. **Supabase Monitoring:**
   - Check database usage
   - Monitor API requests
   - Review logs for errors

3. **Stripe Dashboard:**
   - Monitor payments
   - Check for failed transactions
   - Review webhook logs

### Regular Maintenance

- **Daily:** Check email logs for failed sends
- **Weekly:** Review new user registrations and link submissions
- **Monthly:** Review subscription renewals and payment failures
- **Quarterly:** Update dependencies and security patches

---

## Troubleshooting

### Build Fails

- Check Vercel build logs
- Verify all environment variables are set
- Ensure TypeScript has no errors

### Database Connection Issues

- Verify Supabase URL and anon key
- Check RLS policies are enabled
- Ensure tables exist

### Email Not Sending

- Verify Resend API key
- Check domain verification status
- Review email logs in admin dashboard

### Stripe Webhook Not Working

- Verify webhook secret matches
- Check webhook endpoint URL
- Review Stripe webhook logs

---

## Success Criteria

When all steps are complete, you should see:

✅ Site accessible at https://llmo.abvx.xyz
✅ All routes return 200 OK
✅ User registration and login working
✅ Stripe payments processing
✅ Emails sending successfully
✅ Admin dashboard accessible
✅ Sitemap indexed by Google
✅ Social cards displaying correctly
✅ Performance score 90+

---

## Final Confirmation

Once everything is verified, you can confirm:

> ✅ Production build deployed successfully on Vercel — llmo.abvx.xyz is live.

---

**Need Help?**

- Vercel Support: https://vercel.com/help
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com
- Resend Support: https://resend.com/support
