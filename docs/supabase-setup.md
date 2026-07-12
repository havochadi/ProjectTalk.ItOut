# Supabase setup

This deployment uses GitHub Pages for the React frontend and Supabase for
authentication, PostgreSQL, Row Level Security, realtime events, and Edge
Functions. The legacy Express/MongoDB app under `apps/api` is no longer needed
by the web frontend.

## 1. Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Save the database password in a password manager.
3. Choose a region close to the application's users.
4. Open **Project Settings -> API** and copy:
   - Project URL
   - Publishable key (an older project might label this the `anon` key)

The publishable/anon key is designed to be used by the browser. Never put the
`service_role` key in the frontend, GitHub variables, or a `VITE_*` variable.

## 2. Create the database

The repository contains the complete schema and security policies in:

```text
supabase/migrations/20260712000000_initial_schema.sql
```

Choose one method.

### Dashboard method

1. Open **SQL Editor -> New query** in Supabase.
2. Copy the entire migration file into the editor.
3. Click **Run** once.

### CLI method

From the repository root:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
```

The project ref is the first part of the project URL:
`https://YOUR_PROJECT_REF.supabase.co`.

## 3. Configure authentication

In **Authentication -> URL Configuration**, set:

```text
Site URL: https://havochadi.github.io/ProjectTalk.ItOut/
Redirect URL: https://havochadi.github.io/ProjectTalk.ItOut/**
```

For the simplest classroom/demo setup, open **Authentication -> Providers ->
Email** and turn off **Confirm email**. If confirmation remains enabled, users
must confirm their email before a session is created.

All public registrations become students. A user cannot promote themselves in
the browser. To create a counselor:

1. Register the counselor through the website normally.
2. Run this in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'counselor'
where email = 'counselor@talkitout.sg';
```

Sign out and back in after changing the role.

## 4. Configure the local frontend

Replace the contents of `apps/web/.env` with real project values:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```powershell
npm run dev:web
```

## 5. Deploy the Edge Functions

Set the AI secret and deploy all functions:

```powershell
npx supabase@latest secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
npx supabase@latest secrets set GEMINI_MODEL=gemini-3.5-flash
npx supabase@latest functions deploy assistant
npx supabase@latest functions deploy voice
npx supabase@latest functions deploy account
```

Voice is optional. To enable it:

```powershell
npx supabase@latest secrets set ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
npx supabase@latest secrets set ELEVENLABS_VOICE_ID=YOUR_VOICE_ID
npx supabase@latest secrets set ELEVENLABS_STT_MODEL=scribe_v1
npx supabase@latest secrets set MAX_STT_SECONDS=60
npx supabase@latest functions deploy voice
```

Supabase automatically supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not set or expose them
manually.

## 6. Configure GitHub Pages

In the GitHub repository, open **Settings -> Secrets and variables -> Actions
-> Variables**. Create or replace these repository variables:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Delete the obsolete `VITE_API_URL` repository variable if it exists. Then open
**Actions -> Deploy web app to GitHub Pages -> Run workflow**.

## 7. Verify

1. Open <https://havochadi.github.io/ProjectTalk.ItOut/>.
2. Register a new student account.
3. Add a task and a mood check-in, then refresh the page.
4. Send a chat message after deploying the `assistant` function.
5. Confirm rows appear in **Table Editor** in Supabase.
6. Register and promote a counselor, then verify the counselor dashboard.

If login fails, check in this order:

1. The two `VITE_SUPABASE_*` GitHub variables exist.
2. The latest Pages workflow ran after the variables were added.
3. The `profiles` table contains a row for the Auth user.
4. Browser developer tools do not show an RLS policy error.
