# Sponzy

Creators sell brand collabs from one shop-window post; brands pay up front; Sponzy holds the money until the work is approved. The full build spec is in `CLAUDE.md`.

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the values (step 1 below)
npm run dev                  # open http://localhost:3000
```

Without Supabase keys the page still works locally, but signups are only logged in the terminal, not saved.

## Layer 0: finish setup (about 15 minutes)

### 1. Supabase (database)
1. At supabase.com, create a free project called `sponzy`. Save the database password somewhere safe.
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order (0001, then 0002). This creates the `waitlist` table with Row Level Security turned on.
3. Open **Project Settings > API** and copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep it secret)
4. Restart `npm run dev`, sign up on the page, and check **Table Editor > waitlist** for your row.

### 2. GitHub (code storage)
Create an empty **private** repository called `sponzy` on github.com, then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/sponzy.git
```

```bash
git push -u origin main
```

### 3. Vercel (hosting)
1. At vercel.com, click **Add New > Project** and import the `sponzy` GitHub repo.
2. Under **Environment Variables**, add the same three values as `.env.local`.
3. Click **Deploy**. You get an address like `sponzy.vercel.app`. Every future push to `main` redeploys automatically.

## How the waitlist works
- `src/app/page.tsx`: the landing page (server-rendered; shows Founding Creator spots left).
- `src/components/WaitlistForm.tsx`: the signup form (creator or brand, email, optional handle).
- `src/app/api/waitlist/route.ts`: checks the email and saves it with the server-only key. Duplicate emails are quietly accepted, so nobody can test whether an email is on the list. A hidden "honeypot" field stops simple bots.
- RLS on `waitlist` has no policies, so the public key can't read or write emails. The `waitlist_count()` function only exposes the total.
