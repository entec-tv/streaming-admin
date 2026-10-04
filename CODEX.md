# 🛡️ Codex Instructions — Admin Dashboard Workspace (`c:\streaming-admin`)

This workspace contains the Web Management Dashboard for EN-TEC Streaming.

---

## ⚠️ Lovable Synchronization Rule (MANDATORY)

> **IMPORTANT**: This repository is directly connected to **[Lovable.dev](https://lovable.dev)**.
> - **DO NOT** rewrite published git history (`git push --force`, `git rebase -i`, or amend pushed commits).
> - Any history rewrite desynchronizes Lovable and destroys the user's project history.
> - Always make new, forward-only commits.

---

## 💻 Tech Stack & Architecture

- **Bundler**: Vite
- **UI Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Component Library**: shadcn/ui + Radix UI primitives
- **Backend Connection**: NestJS Backend API at `https://entecstreamingnestjs-production.up.railway.app/api`

---

## 🏃 Run & Development Commands

```powershell
# Start local development server (Vite)
npm run dev

# Run build verification
npm run build
```

---

## 📋 Key Pages & Business Logic

### 1. Customers (`src/routes/customers.tsx`)
- Displays all customer records retrieved from `GET /customers`.
- When a customer is created automatically via the Web Portal (`subscription.entec.store`), their default name is their **MAC Address** (e.g. `EB:EB:F6:F8:E1:E0`).
- Admins can edit names, change customer status (`ACTIVE`, `INACTIVE`, `BLOCKED`), and manage subscriptions.

### 2. Subscriptions & Host Picker (`src/routes/hosts.tsx`)
- Manages IPTV servers (Host URL, Name).
- **Custom Host Support**: When customers add a playlist with an unregistered custom domain, the host dropdown includes:
  `آخر: [domain:port]`
  This allows administrators to see and manage custom server domains entered by clients without needing database schema migrations.

### 3. Plans & In-App Store (`src/routes/plans.tsx`)
- CRUD interface for subscription packages (`Plan` schema).
- Defines title, duration, price, and feature bullet points shown in the app's in-screen subscription store.

### 4. Real-Time App Sync Trigger
- Whenever an admin saves, updates, or deletes a subscription for a customer, the admin panel calls:
  `POST /client/devices/:macAddress/refresh`
  This immediately broadcasts a Server-Sent Event (`SSE`) to the user's device, prompting an instant background refresh with zero app downtime.
