# 🔒 LLMO Directory — Security Policy

_Last updated: November 13, 2025_

This document outlines the **security guidelines and best practices** for maintaining and contributing to the **LLMO Directory** project.

---

## 🧩 1. Handling Environment Variables

All sensitive data (API keys, secrets, database URLs, etc.) must be stored in **`.env.local`** or **GitHub Secrets**, and **must never** be committed to the repository.

### Required environment files:

```
.env.local
.env.production
.env.test
```

### Sensitive keys include:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`

🛑 **Never share or expose these values** in:

- Commits / Pull requests  
- Screenshots or logs  
- Public demos or deployment previews  

---

## ⚙️ 2. GitHub Secrets

All API keys used by GitHub Actions must be stored under  
**Settings → Secrets → Actions**.

| Secret Name | Description |
|--------------|-------------|
| `OPENAI_API_KEY` | Used by the Auto-Translate workflow |
| `GITHUB_TOKEN` | Automatically provided by GitHub for workflow commits |
| `STRIPE_SECRET_KEY` | Used for payment processing via Stripe |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin access in Supabase backend |

⚠️ Only the **repository owner** (Anton Biletskiy-Volokh) can modify or view these secrets.

---

## 🧠 3. Safe Local Development

Developers must:

1. Copy `.env.example` → `.env.local`
2. Use **test API keys** (not production keys)
3. Avoid pushing `.env.local` or SQLite DBs to Git
4. Use `pnpm run check-env` before commits to verify environment configuration

### Git ignores sensitive files automatically:

```gitignore
# .gitignore

.env*
*.db
*.db-journal
```

---

## 💳 4. Stripe Payment Safety

Stripe webhooks and API keys are sensitive.

- Use test mode during local dev (`pk_test_`, `sk_test_`)
- Webhook secrets are **unique per environment**
- Validate incoming events server-side in `/api/stripe-webhook.ts`
- Never trust client-side payment data

🧾 Production webhook URL example:

```
https://llmo.abvx.xyz/api/stripe-webhook
```

---

## 🧱 5. Supabase Access Control

Supabase security relies on **Row Level Security (RLS)**.  
Ensure policies are enforced for:

- `profiles`
- `links`
- `subscriptions`
- `downloads`

✅ Realtime and admin APIs require service-role keys — **store them in environment variables only**, never expose them client-side.

---

## ✉️ 6. Resend Email Safety

Resend API keys can send emails on behalf of your verified domain.  
To avoid abuse:

- Use **verified sender addresses only**
- Limit Resend API key permissions to "Transactional emails"
- Rotate keys quarterly

---

## 🧍 7. Authentication (NextAuth.js)

The app uses **NextAuth.js** with:

- Google OAuth
- Email magic links (Resend)
- JWT-based sessions (secure cookies)

✅ HTTPS is required in production.  
🧠 Sessions are encrypted using `NEXTAUTH_SECRET`.

---

## 🪪 8. Reporting Security Issues

If you discover a vulnerability:

1. **Do not disclose it publicly.**
2. Email directly: **a.biletskiy@gmail.com**
3. Include:
   - Description of the issue  
   - Steps to reproduce  
   - Suggested fix (if possible)

A response will be provided within **48 hours**.

---

## 🛡️ 9. Contributor Security Checklist

Before submitting a PR:

- [ ] Run `pnpm run check-env`
- [ ] Verify `.env.local` not included in Git
- [ ] Use only test credentials in commits
- [ ] Avoid hardcoding URLs, tokens, or webhook secrets
- [ ] Use environment variables for all sensitive configs

---

## ✅ 10. Deployment Security

- Deployed only via **Vercel** (official deployment target)
- Vercel environment variables mirror `.env.production`
- Access limited to maintainers
- Automatic lock cleanup workflow prevents conflicts

---

**Maintainer:**  
Anton Biletskiy-Volokh  
📧 [a.biletskiy@gmail.com](mailto:a.biletskiy@gmail.com)  
🌐 [llmo.abvx.xyz](https://llmo.abvx.xyz)





