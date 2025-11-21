# ⚙️ LLMO Project — GitHub Workflows & Automation

This document explains all **GitHub Actions** and automation tasks configured for the LLMO Directory project.

---

## 🌐 1. Auto-Translate Locales

**Workflow:** `.github/workflows/translate.yml`  
**Trigger:**  

- Automatically runs when `/locales/en.json` changes  
- Can also be run manually via **GitHub → Actions → Auto-Translate Locales**

**Purpose:**  

Automatically translates the English locale file into all supported languages (French, Spanish, Ukrainian, Russian, and Chinese) using the OpenAI API.

**Main Steps:**

1. Checks out repository  
2. Installs Node.js & PNPM  
3. Loads environment variables from GitHub Secrets (`OPENAI_API_KEY`)  
4. Runs `pnpm run translate` to update locale files  
5. Commits and pushes translated files automatically

**Environment variables:**

```
OPENAI_API_KEY=sk-xxxxxx
```

**Commit message template:**

```
🌐 Auto-translate locales via OpenAI
```

---

## 🧹 2. Cleanup Next.js Lock

**Workflow:** `.github/workflows/cleanup-lock.yml`  
**Trigger:**  

- Automatically runs on every push to `main`  
- Can also be triggered manually from the Actions tab

**Purpose:**  

Removes stale `.next/dev/lock` files that can block deployments on Vercel or local development.

**Command executed:**

```bash
rm -rf .next/dev/lock || true
```

**Output:**

```
✅ .next/dev/lock cleaned before deploy
```

---

## 🧠 3. Local Pre-Push Hook (Optional)

**File:** package.json

**Script added:**

```
"scripts": {
  "prepush": "pnpm run translate && rm -rf .next/dev/lock || true"
}
```

**Purpose:**

Ensures local environment matches CI/CD behavior — automatically updates translations and cleans lockfiles before every git push.

---

## 🔐 4. Required GitHub Secrets

|**Name**|**Description**|
|---|---|
|OPENAI_API_KEY|API key for automatic translations|
|GITHUB_TOKEN|Default token used for commits (auto-provided by GitHub)|

---

## 🚀 5. How to Trigger Manually

1. Go to **GitHub → Actions**
    
2. Choose workflow ("Auto-Translate Locales" or "Cleanup Next.js Lock")
    
3. Click **Run workflow**
    
4. Check logs and resulting commits
    
---

## 📘 Additional Notes

- All actions use **Ubuntu runners** (ubuntu-latest).
    
- Commits made by the automation use:

```
user.name: llmo-auto-translate
user.email: translate-bot@llmo.abvx.xyz
```

- Both workflows are safe to run concurrently and idempotent.
    
- The translate workflow checks for changes before committing, so it won't create empty commits.

---

### 👨‍💻 Maintainer

**Author:** Anton Biletskiy-Volokh

**Project:** [LLMO Directory](https://llmo.abvx.xyz)

**Contact:** a.biletskiy@gmail.com

_Last updated: November 13, 2025_




