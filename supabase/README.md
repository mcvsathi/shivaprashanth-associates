# Supabase Backend Setup for ShivaPrashanth & Associates

This directory contains the database schema, security policies, and edge function for the **"Consult Now"** backend.

---

## Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or sign up.
2. Click **"New Project"**.
3. Choose an organization, enter a name (e.g. `shivaprashanth-associates`), choose a strong database password, and pick a region near India (e.g., `South Asia (Mumbai)`).
4. Click **"Create new project"** and wait ~1-2 minutes for provisioning to finish.

---

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar.
2. Click **"New query"**.
3. Open [`supabase/schema.sql`](./schema.sql), copy all its contents, and paste them into the SQL editor.
4. Click **"Run"** (or press Ctrl + Enter).
5. You should see `Success. No rows returned`.
6. Click **Table Editor** in the left sidebar — you will now see the `consultations` table created with RLS enabled!

---

## Step 3: Get Your API Keys & Update Angular

1. In Supabase dashboard, go to **Project Settings** (gear icon) -> **API** (under Configuration).
2. Copy:
   - **Project URL** (e.g. `https://abcdefghijklm.supabase.co`)
   - **anon / public key** (under `Project API keys`)
3. Open `src/environments/environment.ts` and `src/environments/environment.development.ts` in this project:
   ```ts
   export const environment = {
     production: false,
     supabase: {
       url: 'https://abcdefghijklm.supabase.co', // Paste Project URL
       anonKey: 'eyJhbGciOi...',                 // Paste anon public key
     },
     adminEmail: 'contact@shivaprashanth.com',
   };
   ```

---

## Step 4: Configure Email Notifications

Whenever a visitor submits the "Consult Now" form, you can automatically receive an email alert with the client's name, email, phone number, and message.

### Recommended: Using Resend + Supabase Database Webhook

1. Create a free account at [https://resend.com](https://resend.com) (includes 3,000 free emails/month).
2. Generate an API Key in Resend (`re_...`).
3. Deploy the Edge Function:
   - Install Supabase CLI: `npm install -g supabase`
   - Link project: `supabase link --project-ref YOUR_PROJECT_REF`
   - Set secret: `supabase secrets set RESEND_API_KEY=re_your_api_key NOTIFICATION_EMAIL=contact@shivaprashanth.com`
   - Deploy: `supabase functions deploy send-consultation-email`
4. Attach Database Webhook:
   - In Supabase Dashboard -> **Database** -> **Webhooks** -> **Create a new hook**:
     - Name: `on_new_consultation`
     - Table: `consultations`
     - Events: check `Insert`
     - Type: `Supabase Edge Function`
     - Edge Function: select `send-consultation-email`
     - Method: `POST`
     - Click **Save**.

---

## How It Works
- **Form Submission**: Visitors on the website submit their consultation request.
- **Direct & Secure**: The request is securely inserted via Supabase's PostgreSQL Row Level Security (RLS) policies.
- **Notification**: The Supabase Database Webhook triggers the Edge Function to send an email to the firm's inbox.
- **Admin Review**: Partners and staff can view all consultation inquiries directly in the Supabase Table Editor or export them to CSV.
