# Requirements and Roadmap: Email Features

## Goal Description
Enhance the News Aggregator with a **Curator-Audience** model. Users (Curators) can create persistent "News Campaigns" (queries + parameters) and schedule them to be sent to specific audiences (lists of emails). This requires a robust Authentication system and a reliable Email Service.

## Feature 1: Authentication & User Management
**User Story**: As a user, I want to create an account, log in securely (password or social), and manage my profile so that I can save my campaigns.

### Requirements
*   **Strategy**: **Supabase Auth** (Recommended).
    *   Why? Native integration with the database, supports Email/Password, Magic Links, and OAuth (Google/GitHub) out of the box. Zero maintenance for user sessions.
*   **Frontend**:
    *   Sign Up / Login pages.
    *   Password reset flow.
    *   Protected routes (dashboard).
*   **Backend**:
    *   Middleware to protect API routes.
    *   Row Level Security (RLS) in Supabase to ensure users only see their own campaigns.

## Feature 2: News Campaigns (The "Persistent Query")
**User Story**: As a curator, I want to define a news query (e.g., "AI in Healthcare"), set filters, define an audience, and schedule it to run automatically.

### Requirements
*   **Data Model**:
    *   `Campaign`:
        *   `id`, `user_id` (owner)
        *   `name` (e.g., "Weekly AI Update")
        *   `query` (e.g., "artificial intelligence")
        *   `filters` (JSON: { sources, language, etc. })
        *   `frequency` (e.g., "Daily", "Weekly", "Real-time")
        *   `audience` (Array of Strings or relation to Audience table)
        *   `is_active` (Boolean)
*   **Frontend**:
    *   **Campaign Builder**: UI to test queries and see results before saving.
    *   **Audience Manager**: Input list of emails.
    *   **Dashboard**: View/Edit/Delete active campaigns.
*   **Backend**:
    *   `POST /api/campaigns`: Create/Update.
    *   `GET /api/campaigns`: List user's campaigns.
    *   **Scheduler**: Logic to iterate through active campaigns, execute the query, and send to the defined audience.

## Feature 3: Breaking News Logic
**User Story**: As a curator, I want my campaign to trigger immediately if "breaking news" matching my query is detected.

### Requirements
*   **Frontend**:
    *   Option in the subscription form to toggle "Breaking News Alerts".
*   **Backend**:
    *   Frequent polling job (e.g., every 15-30 minutes).
    *   Logic to identify "breaking" news.
        *   *Strategy*: Since standard APIs might not have a "breaking" flag, we can filter by "top headlines" and check for high-velocity keywords or simply alert on new "Top Headlines" that match user keywords.
        *   *Deduplication*: Ensure the same article isn't sent twice.
*   **Data**:
    *   Store sent article IDs to prevent duplicates.

## Feature 3: Edit Subscription
**User Story**: As a user, I want to be able to modify my subscription preferences (topics, frequency) or unsubscribe so that I can manage the emails I receive.

### Requirements
*   **Frontend**:
    *   "Manage Subscription" page or modal.
    *   Ability to load existing preferences based on email (magic link login or simple email verification).
    *   Form to update topics, frequency, and breaking news toggle.
    *   "Unsubscribe" button.
*   **Backend**:
    *   API endpoint to get current subscription (`GET /api/subscription?email=...`).
    *   API endpoint to update subscription (`PUT /api/subscription`).
    *   API endpoint to unsubscribe (`DELETE /api/subscription`).
    *   Secure access via a unique token sent to email (magic link) to prevent unauthorized edits.

## Technical Architecture & Strategy

### 1. Database & Auth: **Supabase**
*   **Why**: Unified platform for DB (Postgres) and Auth.
*   **Auth**: Handles secure password storage, session management, and email verification.
*   **DB**: Relational data is perfect for `Users` -> `Campaigns` -> `Logs`.

### 2. Email Service Strategy
We need a transactional email service to send the digests.
*   **Option A: Resend (Recommended)**
    *   **Pros**: Modern API, excellent React-based email templates (React Email), generous free tier (3,000 emails/mo).
    *   **Cons**: Newer player.
*   **Option B: SendGrid**
    *   **Pros**: Industry standard, very mature.
    *   **Cons**: Legacy API, free tier is limited (100/day).
*   **Option C: AWS SES**
    *   **Pros**: Cheapest at scale.
    *   **Cons**: Poor developer experience, requires "warming up" IP, strict sandbox.

**Decision**: We will use **Resend** for its ease of integration with Vercel/Next.js and superior developer experience.

### 3. Scheduling
*   **Vercel Cron**: Simple HTTP GET calls to our API at fixed intervals (e.g., every 10 mins).
*   **Logic**: The API endpoint (`/api/cron/process-campaigns`) will:
    1.  Check DB for campaigns due to run.
    2.  Fetch news for each campaign.
    3.  Send emails via Resend.
    4.  Update `last_run_at`.

## Branching & Deployment Strategy
To ensure the stability of the current "Version 1" app while developing "Version 2", we will use the following strategy:

### 1. Branches
*   **`main` (Protected)**: This branch contains the stable **Version 1** code currently in production. No V2 code will be pushed here until launch.
*   **`v2-dev` (Active Development)**: A new long-lived branch created from `main`. All V2 features (Auth, Campaigns, etc.) will be merged here.
*   **Feature Branches**: Individual features (e.g., `feat/supabase-setup`, `feat/campaign-ui`) will branch off `v2-dev` and merge back into `v2-dev`.

### 2. Environments
*   **Production (V1)**: Connected to `main`. URL: `briefly-news.vercel.app` (example).
*   **Preview/Staging (V2)**: Connected to `v2-dev`. We will set up a separate Vercel project (or preview deployment) to test V2 features live without affecting V1 users.

### 3. Workflow
1.  Create `v2-dev` from `main`.
2.  Develop features on branches -> merge to `v2-dev`.
3.  Test on V2 Preview URL.
4.  **Launch**: When V2 is complete and tested, merge `v2-dev` -> `main`.

## Roadmap

### Phase 1: Foundation (Auth & DB)
*   [ ] Set up Supabase project.
*   [ ] Implement Authentication (Sign Up, Login, Password Reset).
*   [ ] Create Database Schema (`profiles`, `campaigns`, `audiences`).

### Phase 2: Campaign Management (The "Persistent Object")
*   [ ] Build "Campaign Builder" UI (Query input, Preview results).
*   [ ] Implement CRUD endpoints for Campaigns.
*   [ ] Build Dashboard to manage saved campaigns.

### Phase 3: Email Engine & Scheduling
*   [ ] Set up Resend.
*   [ ] Design Email Templates (React Email).
*   [ ] Implement the "Processor" (`/api/cron/process-campaigns`).
    *   Logic to match campaigns -> fetch news -> send to audience.
*   [ ] Configure Vercel Cron.

