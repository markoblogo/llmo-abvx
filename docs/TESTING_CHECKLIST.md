# LLMO Directory - Comprehensive Testing Checklist

Use this checklist to verify all functionality before and after deployment.

---

## 🔐 Authentication & Authorization

### Registration
- [ ] Navigate to `/register`
- [ ] Fill in email and password
- [ ] Submit form
- [ ] Verify success message appears
- [ ] Check email for verification link (if enabled)
- [ ] Verify user created in Supabase `auth.users` table
- [ ] Verify profile created in `profiles` table with role='user'
- [ ] Verify subscription created in `subscriptions` table with plan='free'

### Login
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify redirect to `/dashboard`
- [ ] Check user info displays in navigation
- [ ] Verify session persists on page refresh

### Google OAuth (if configured)
- [ ] Click "Continue with Google" button
- [ ] Complete Google auth flow
- [ ] Verify redirect to dashboard
- [ ] Check profile created correctly

### Logout
- [ ] Click logout button in navigation
- [ ] Verify redirect to home page
- [ ] Verify session cleared
- [ ] Try accessing `/dashboard` - should redirect to login

### Protected Routes
- [ ] While logged out, try accessing `/dashboard` - should redirect to login
- [ ] While logged out, try accessing `/add-link` - should redirect to login
- [ ] While logged out, try accessing `/admin` - should redirect to login
- [ ] While logged in, try accessing `/login` - should redirect to dashboard
- [ ] While logged in, try accessing `/register` - should redirect to dashboard

---

## 🏠 Public Pages

### Home Page (/)
- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] CTA buttons work (Register, View Pricing)
- [ ] Features section displays
- [ ] Terminal-style design renders correctly
- [ ] Responsive on mobile, tablet, desktop

### Pricing Page (/pricing)
- [ ] Page loads without errors
- [ ] Free and Pro plans display
- [ ] Pricing information correct (€1/year for Pro)
- [ ] "Get Started" button works for Free plan
- [ ] "Upgrade to Pro" button works (redirects to Stripe)
- [ ] Feature comparison table displays
- [ ] Responsive layout works

### About Page (/about)
- [ ] Page loads without errors
- [ ] All content sections display
- [ ] "Mentioned In & Blog" section shows
- [ ] Medium blog link works
- [ ] Testimonials display correctly
- [ ] Responsive layout works

### FAQ Page (/faq)
- [ ] Page loads without errors
- [ ] All FAQ items display
- [ ] Accordion expand/collapse works
- [ ] Content is readable and formatted correctly
- [ ] Responsive layout works

### Contact Page (/contact)
- [ ] Page loads without errors
- [ ] Contact form displays
- [ ] All form fields present (name, email, message)
- [ ] Form validation works (required fields)
- [ ] Submit button works
- [ ] Success message displays after submission
- [ ] Email sent to a.biletskiy@gmail.com
- [ ] Error handling works (try with invalid email)

---

## 📊 Dashboard & User Features

### Dashboard (/dashboard)
- [ ] Page loads without errors (requires login)
- [ ] User greeting displays with correct name/email
- [ ] Subscription status card shows:
  - [ ] Current plan (Free/Pro)
  - [ ] Links used / Links allowed
  - [ ] Expiry date
  - [ ] Upgrade button (for free users)
- [ ] Stats cards display:
  - [ ] Total links
  - [ ] Active links
  - [ ] Total clicks
- [ ] Recent links table shows user's links
- [ ] Link status badges display correctly (Active/Pending/Expired)
- [ ] "Add New Link" button works
- [ ] Responsive layout works

### Add Link (/add-link)
- [ ] Page loads without errors (requires login)
- [ ] Form displays with all fields:
  - [ ] URL (required)
  - [ ] Title (required)
  - [ ] Description (required)
  - [ ] Tags (optional)
- [ ] Form validation works
- [ ] Submit button works
- [ ] Success message displays
- [ ] Redirect to dashboard after submission
- [ ] Link appears in dashboard
- [ ] Link saved to Supabase `links` table with status='pending'
- [ ] Error handling works (try submitting invalid URL)

---

## 💳 Stripe Payment Integration

### Checkout Flow
- [ ] Navigate to `/pricing` while logged in
- [ ] Click "Upgrade to Pro" button
- [ ] Verify redirect to Stripe Checkout
- [ ] Stripe session loads correctly
- [ ] Product details correct (€1/year)
- [ ] Complete payment with test card: `4242 4242 4242 4242`
- [ ] Verify redirect to `/payment/success`
- [ ] Success page displays confirmation
- [ ] Redirect to dashboard after 3 seconds

### Webhook Processing
- [ ] Check Stripe dashboard for webhook delivery
- [ ] Verify `checkout.session.completed` event received
- [ ] Check Supabase `subscriptions` table:
  - [ ] Plan updated to 'pro'
  - [ ] Links_allowed updated to 999999
  - [ ] Expiry_date set to 1 year from now
  - [ ] Stripe_customer_id populated
  - [ ] Stripe_subscription_id populated
- [ ] Verify dashboard shows Pro status

### Subscription Management
- [ ] Dashboard displays Pro badge
- [ ] Links allowed shows "Unlimited"
- [ ] Upgrade button hidden for Pro users
- [ ] Test adding more than 3 links (should work for Pro)

---

## 📧 Email System

### Reminder Emails
- [ ] Trigger cron job manually: `/api/cron/send-reminders`
- [ ] Check response for success message
- [ ] Verify emails sent to users with subscriptions expiring in 7 days
- [ ] Check email received in inbox
- [ ] Verify email styling:
  - [ ] Terminal-style design
  - [ ] Neon green accent color (#00FF9C)
  - [ ] IBM Plex Mono font
  - [ ] All links work
- [ ] Check Supabase `email_logs` table for log entry

### Test Email (Admin)
- [ ] Login as admin
- [ ] Navigate to `/admin/emails`
- [ ] Enter test email address
- [ ] Click "Send Test Email"
- [ ] Verify success message
- [ ] Check email received
- [ ] Verify email styling correct
- [ ] Check email log created

### Contact Form Email
- [ ] Submit contact form
- [ ] Check email received at a.biletskiy@gmail.com
- [ ] Verify email contains:
  - [ ] Sender name
  - [ ] Sender email
  - [ ] Message content
- [ ] Reply-to address is sender's email

---

## 🛠️ Admin Panel

### Access Control
- [ ] Login as regular user
- [ ] Try accessing `/admin` - should redirect to login or show access denied
- [ ] Login as admin user (a.biletskiy@gmail.com)
- [ ] Navigate to `/admin` - should load successfully
- [ ] Verify admin badge shows in navigation

### Overview Page (/admin)
- [ ] Page loads without errors
- [ ] Stats cards display:
  - [ ] Total users
  - [ ] Total links
  - [ ] Active subscriptions
  - [ ] Total revenue
- [ ] Recent activity shows
- [ ] All navigation links work

### Users Management (/admin/users)
- [ ] Page loads without errors
- [ ] Users table displays all users
- [ ] Table shows: Name, Email, Role, Plan, Expiry, Last Login
- [ ] Search/filter works (if implemented)
- [ ] "Promote to Admin" button works
- [ ] "Delete User" button works (with confirmation)
- [ ] "Send Reminder" button works
- [ ] Pagination works (if many users)

### Links Management (/admin/links)
- [ ] Page loads without errors
- [ ] Links table displays all links
- [ ] Table shows: URL, Description, Tags, Status, Clicks, Backlink Status
- [ ] "Verify Backlink" button works
- [ ] "Force Renew" button works
- [ ] "Remove Link" button works (with confirmation)
- [ ] Status badges display correctly
- [ ] Click counts display

### Subscriptions Management (/admin/subscriptions)
- [ ] Page loads without errors
- [ ] Subscriptions table displays all subscriptions
- [ ] Table shows: User Email, Plan, Stripe ID, Renewal Date, Payment Status
- [ ] "Mark as Paid" button works
- [ ] "Cancel Subscription" button works
- [ ] "Resend Receipt" button works
- [ ] Payment status badges display correctly

### Emails Management (/admin/emails)
- [ ] Page loads without errors
- [ ] Email logs table displays all sent emails
- [ ] Table shows: Recipient, Subject, Status, Timestamp, Error (if failed)
- [ ] "Send Test Email" form works
- [ ] Test email sends successfully
- [ ] New log entry appears in table
- [ ] Failed emails show error messages

---

## 🎨 Design & UI/UX

### Visual Design
- [ ] Terminal-inspired aesthetic consistent across all pages
- [ ] Monochrome color scheme (black/white/grays)
- [ ] Neon green accent color (#00FF9C) used appropriately
- [ ] IBM Plex Mono font for headings and UI elements
- [ ] Inter font for body text
- [ ] Text contrast meets AA+ standards:
  - [ ] Muted text: #9CA3AF
  - [ ] Secondary headings: #E5E7EB
  - [ ] Primary text: white/black (depending on mode)
- [ ] Hover effects work (subtle glow on buttons)
- [ ] System messages styled correctly

### Dark/Light Mode
- [ ] Dark mode displays correctly
- [ ] Light mode displays correctly
- [ ] Mode toggle works (if implemented)
- [ ] Mode preference persists
- [ ] All text readable in both modes

### Responsive Design
- [ ] Test on mobile (320px - 767px):
  - [ ] Navigation collapses to hamburger menu
  - [ ] All content readable
  - [ ] Forms usable
  - [ ] Tables scroll horizontally
- [ ] Test on tablet (768px - 1023px):
  - [ ] Layout adjusts appropriately
  - [ ] All features accessible
- [ ] Test on desktop (1024px+):
  - [ ] Full layout displays
  - [ ] Optimal reading width maintained

### Navigation
- [ ] Header navigation displays on all pages
- [ ] Logo links to home page
- [ ] All navigation links work:
  - [ ] Home
  - [ ] Pricing
  - [ ] FAQ
  - [ ] About
  - [ ] Contact
  - [ ] Login/Register (when logged out)
  - [ ] Dashboard (when logged in)
  - [ ] Admin (when admin)
- [ ] User menu works (when logged in)
- [ ] Logout button works
- [ ] Active page highlighted (if implemented)

### Footer
- [ ] Footer displays on all pages
- [ ] All footer links work:
  - [ ] About
  - [ ] Pricing
  - [ ] FAQ
  - [ ] Contact
- [ ] Social links work and open in new tabs:
  - [ ] Twitter: https://x.com/abv_creative
  - [ ] GitHub: https://github.com/markoblogo
  - [ ] Medium: https://medium.com/@abvcreative
- [ ] Social links have rel="me" attribute
- [ ] Copyright year correct
- [ ] Footer responsive on mobile

---

## 🔍 SEO & Metadata

### Meta Tags
- [ ] Each page has unique `<title>` tag
- [ ] Each page has unique meta description
- [ ] Meta descriptions under 160 characters
- [ ] Keywords meta tag present (if used)
- [ ] Viewport meta tag present
- [ ] Charset meta tag present (UTF-8)

### Open Graph Tags
- [ ] og:title present on all pages
- [ ] og:description present on all pages
- [ ] og:image present (og-cover.jpg)
- [ ] og:url correct for each page
- [ ] og:type set to "website"
- [ ] og:site_name set to "LLMO Directory"
- [ ] Test with Facebook Debugger: https://developers.facebook.com/tools/debug/

### Twitter Card Tags
- [ ] twitter:card set to "summary_large_image"
- [ ] twitter:title present
- [ ] twitter:description present
- [ ] twitter:image present
- [ ] twitter:creator set to "@abv_creative"
- [ ] Test with Twitter Card Validator: https://cards-dev.twitter.com/validator

### Structured Data (JSON-LD)
- [ ] Organization schema present in layout
- [ ] Product schema present on pricing page (if applicable)
- [ ] WebSite schema present
- [ ] Test with Google Rich Results Test: https://search.google.com/test/rich-results

### Sitemap & Robots
- [ ] sitemap.xml accessible at `/sitemap.xml`
- [ ] Sitemap includes all public pages
- [ ] Sitemap formatted correctly (XML)
- [ ] robots.txt accessible at `/robots.txt`
- [ ] robots.txt allows AI crawlers (GPTBot, Claude-Web, etc.)
- [ ] robots.txt references sitemap

### Favicon
- [ ] Favicon displays in browser tab
- [ ] Favicon correct size and format
- [ ] Apple touch icon present (if applicable)

---

## ⚡ Performance & Technical

### Lighthouse Audit
Run Lighthouse audit (Chrome DevTools) for each major page:

**Home Page:**
- [ ] Performance score > 90
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

**Dashboard:**
- [ ] Performance score > 85
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90

### Loading Performance
- [ ] Initial page load < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] No layout shift (CLS < 0.1)
- [ ] Images load progressively
- [ ] Fonts load without FOIT/FOUT

### Browser Compatibility
Test in multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Console Errors
- [ ] No JavaScript errors in console
- [ ] No 404 errors for resources
- [ ] No CORS errors
- [ ] No mixed content warnings (HTTP/HTTPS)

### Network Requests
- [ ] API calls return correct status codes
- [ ] No unnecessary requests
- [ ] Requests cached appropriately
- [ ] Images optimized and compressed

---

## 🔒 Security

### HTTPS
- [ ] Site loads over HTTPS
- [ ] No mixed content warnings
- [ ] SSL certificate valid
- [ ] HSTS header present

### Authentication Security
- [ ] Passwords hashed (handled by Supabase)
- [ ] Session tokens secure
- [ ] CSRF protection enabled
- [ ] XSS protection enabled

### API Security
- [ ] API routes check authentication
- [ ] Admin routes check admin role
- [ ] Rate limiting implemented (if applicable)
- [ ] Input validation on all forms
- [ ] SQL injection protection (Supabase handles this)

### Environment Variables
- [ ] No secrets in client-side code
- [ ] All sensitive keys in environment variables
- [ ] .env files not committed to git
- [ ] Production keys different from development

---

## 📱 Accessibility

### Keyboard Navigation
- [ ] All interactive elements accessible via keyboard
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] No keyboard traps

### Screen Readers
- [ ] All images have alt text
- [ ] Form labels properly associated
- [ ] ARIA labels used where appropriate
- [ ] Semantic HTML used (header, nav, main, footer)
- [ ] Skip to content link present (if applicable)

### Color Contrast
- [ ] Text meets WCAG AA standards (4.5:1 for normal text)
- [ ] Interactive elements meet contrast requirements
- [ ] Color not sole indicator of information

---

## 🐛 Error Handling

### Form Errors
- [ ] Required field validation works
- [ ] Email format validation works
- [ ] URL format validation works
- [ ] Error messages clear and helpful
- [ ] Error messages styled correctly

### API Errors
- [ ] Network errors handled gracefully
- [ ] 404 errors show custom 404 page
- [ ] 500 errors show error message
- [ ] Timeout errors handled
- [ ] User-friendly error messages

### Edge Cases
- [ ] Empty states display correctly (no links, no users, etc.)
- [ ] Loading states display (spinners, skeletons)
- [ ] Long text truncates or wraps appropriately
- [ ] Large numbers format correctly
- [ ] Dates format correctly

---

## ✅ Final Checks

### Pre-Launch
- [ ] All SQL scripts run on production database
- [ ] Admin user created and verified
- [ ] All environment variables set correctly
- [ ] Stripe in live mode (not test mode)
- [ ] Resend domain verified
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Cron job configured

### Post-Launch
- [ ] Site accessible at https://llmo.abvx.xyz
- [ ] All pages load without errors
- [ ] Registration and login work
- [ ] Payment flow works end-to-end
- [ ] Emails send successfully
- [ ] Admin panel accessible
- [ ] No console errors
- [ ] Lighthouse scores acceptable
- [ ] Analytics tracking (if implemented)

### Documentation
- [ ] README.md updated
- [ ] Deployment guide complete
- [ ] Testing checklist complete
- [ ] API documentation (if applicable)
- [ ] User guide (if applicable)

---

## 📊 Success Metrics

After launch, monitor these metrics:

**Week 1:**
- [ ] User registrations
- [ ] Pro upgrades
- [ ] Email delivery rate
- [ ] Error rate < 1%
- [ ] Uptime > 99%

**Month 1:**
- [ ] Active users
- [ ] Conversion rate (free to pro)
- [ ] Average session duration
- [ ] Bounce rate
- [ ] Page load times

---

**Testing Complete?** 

If all items are checked, you're ready to launch! 🚀

If any items fail, document the issue and fix before deploying to production.
