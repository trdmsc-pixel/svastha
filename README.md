# Svastha (`Swastha`) — AI Lab-Report–Driven Personal Health App

Svastha turns a person's lab report into a living health plan — meals, sleep, exercise, hydration, supplements to discuss, and doctor talking points — with daily meal scanning, reminders, device calendar sync, and a retest comparison loop.

## Quick Start (Antigravity / Local)

1. **Apply the patch (if starting from an empty repo)**:
   ```bash
   git init
   git apply swastha-full.patch
   ```
   Or unzip `swastha-project.zip` directly into your `Swastha` folder.

2. **Install dependencies & verify**:
   ```bash
   npm install --legacy-peer-deps
   npm run typecheck
   npm test
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your Supabase `ap-south-1` (Mumbai) URL and anon key.

4. **Deploy Supabase database & Edge Functions**:
   ```bash
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   supabase secrets set LLM_PROVIDER=gemini LLM_API_KEY=<KEY> LLM_VISION_MODEL=gemini-2.5-flash LLM_TEXT_MODEL=gemini-2.5-flash
   supabase functions deploy parse-report summarise-report generate-plan analyse-meal adapt-plan report-chat delete-account
   ```

5. **Run locally or deploy to Vercel**:
   - Mobile dev build: `npx eas build --profile development`
   - Web preview: `npm run web`
   - Vercel production deploy: push to `main` (uses `vercel.json` → `npx expo export --platform web`).

## Safety & Privacy Guarantees
- **Deterministic first, AI second**: Reference range parsing, High/Low/Borderline status, severity, red-flag banners, hepatotoxic supplement filtering, calorie floors, and retest windows are computed in deterministic TypeScript (`src/engine/`).
- **Zero-storage media**: Meal photos and lab reports are processed in memory and discarded; no image column exists in `meal_logs` or `reports`.
- **DPDP Act 2023 compliance**: 18+ age gate, itemised consent audit table, one-tap export, and full account deletion Edge Function.
