# Email Reminder Setup

This document explains how to set up the email reminder system for LLMO Directory.

## Email Providers

The system supports two email providers:

1. **Resend** (Recommended for Vercel projects)
2. **Brevo** (formerly Sendinblue)

## Setup Instructions

### Option 1: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to your environment variables:
   \`\`\`
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   \`\`\`
4. Verify your domain (optional but recommended for production)

### Option 2: Brevo

1. Sign up at [brevo.com](https://www.brevo.com)
2. Get your API key from Settings > SMTP & API
3. Add to your environment variables:
   \`\`\`
   BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
   \`\`\`

## Cron Job Setup

The reminder system uses a cron job to check for expiring subscriptions daily.

### Vercel Cron (Automatic)

If deployed on Vercel, the cron job is automatically configured via `vercel.json`:
- Runs daily at 9:00 AM UTC
- Path: `/api/cron/send-reminders`

### Manual Cron Setup

For other hosting providers or manual testing:

1. Set a CRON_SECRET environment variable:
   \`\`\`
   CRON_SECRET=your-secret-key-here
   \`\`\`

2. Set up a cron job to call the endpoint:
   \`\`\`bash
   curl -X GET https://your-domain.com/api/cron/send-reminders \
     -H "Authorization: Bearer your-secret-key-here"
   \`\`\`

## Testing

To test the email system manually:

1. Ensure you have an email provider API key set
2. Create a test subscription expiring in 7 days
3. Call the cron endpoint with proper authorization
4. Check the logs for success/failure messages

## Email Template

The reminder email includes:
- User's name
- Days until expiry
- Expiry date
- Options to renew (backlink) or upgrade to Pro
- Pro plan benefits
- Terminal-inspired design matching the LLMO aesthetic

## Troubleshooting

- **No emails sent**: Check that your API key is correct and the provider is configured
- **Unauthorized error**: Verify CRON_SECRET matches in both environment and request
- **No subscriptions found**: Check that subscriptions exist and are expiring in 7 days
- **Email delivery issues**: Verify your domain with the email provider

## Environment Variables Summary

Required:
- `RESEND_API_KEY` or `BREVO_API_KEY` - Email provider API key
- `CRON_SECRET` - Secret for authenticating cron requests

Optional:
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations (falls back to anon key)
