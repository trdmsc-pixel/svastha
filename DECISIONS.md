# Architectural & Product Decisions (DECISIONS.md)

## 1. Repository & Naming
- **Repo & folder name**: `Swastha` (isolated from Studio OS / `newbhakty`).
- **App display name**: `Svastha` (working name per Master Build Prompt; can be renamed globally via `app.json` and `src/theme/tokens.ts`).
- **Assets repo**: `trdmsc-pixel/svastha-assets` served via jsDelivr (`https://cdn.jsdelivr.net/gh/trdmsc-pixel/svastha-assets@v1/...`).

## 2. Expo SDK & Vercel Web Preview Compatibility
- The Master Build Prompt specifies React Native (Expo) + Expo Router for iOS and Android, while the deployment request also requires a Vercel project on a new domain.
- **Decision**: Configure Expo Router with `"web": { "bundler": "metro", "output": "single" }` and `vercel.json` (`npx expo export --platform web` → `dist/`) so the exact same codebase deploys cleanly to Vercel for web preview/testing while remaining a first-class EAS iOS + Android mobile app.
- **SDK version**: Pinned to Expo SDK 52 (`expo@~52.0.0`) with React 18.3.1 and React Native 0.76.3 (compatible with Node 18+ and Vercel build runners; upgradeable to SDK 53+ with `npx expo install --fix` once running on Node 20+).

## 3. Deterministic-First Clinical Safety Architecture
- All biomarker status calculations (`low`, `normal`, `high`, `borderline`), severity ratios (`×ULN`), unit conversions (`mg/dL` ↔ `mmol/L`), red-flag triggers, cross-marker pattern rules (e.g., raised ALT + low HDL → metabolic pattern), hepatotoxic supplement blocks, calorie floor enforcement (1,500 kcal men / 1,200 kcal women / no deficit when pregnant), and retest date calculations (longest flagged marker window, capped at 16 weeks) are implemented in pure TypeScript under `src/engine/` and mirrored in `supabase/functions/_shared/safety.ts`.
- The LLM never computes reference range status or nutritional macros; it only explains deterministic outputs and generates structured JSON validated with Zod.

## 4. Zero-Storage Privacy Architecture (DPDP Act 2023 + Rules 2025)
- Meal photos and lab report PDFs/photos are never persisted to Supabase Storage, Postgres, GitHub, or logs.
- Client-side `src/lib/imagePrivacy.ts` downscales to ≤1024px and strips EXIF before base64 upload; Edge Functions discard buffers immediately after inference and never log request bodies.
- Supabase region target: `ap-south-1` (Mumbai, India).

## 5. LLM Provider Abstraction
- All AI calls run exclusively inside Supabase Edge Functions via `supabase/functions/_shared/llm.ts`.
- Supports Gemini (`gemini-2.5-flash` default) and OpenAI-compatible endpoints via `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_VISION_MODEL`, and `LLM_TEXT_MODEL` secrets.

## 6. Guided Programmes (8-Week Reset) — 28 Nov 2026
- **What**: A data-driven programme layer (`src/programme/`) on top of the lab-report app: a timed daily routine with tick-offs, weekday menu, phased home workouts with a guided mode, weekly weigh-ins, a doctor checklist and a medicine switchboard. First programme: `reset-8` (vegetarian/satvic homemaker routine).
- **Deterministic**: day/week/phase, scores (80% = "winning day"), streaks, next-up, retest dates and the notification schedule live in `src/engine/programmeEngine.ts` (tested in `tests/programme.test.ts`). No LLM involvement.
- **Medicine safety**: medicine items and reminders appear only after the user switches a medicine on in the Doctor screen (i.e. it was prescribed). The app never suggests a dose.
- **Reminders**: when a programme is active it owns the daily rhythm; the generic water/meal/routine reminders are dropped to avoid duplicates, keeping the user's own medicine times and retest one-offs. `ScheduledReminder.weekday` adds weekly triggers (per-weekday workout copy, Sunday weigh-in, weekly Vitamin D). Total stays < 40 (iOS caps pending local notifications at 64).
- **Storage**: `useProgrammeStore` is persisted per account (`svastha-programme-v1:<userId>`), switched/wiped/exported alongside the main app data (DPDP export + deletion).

## 7. 8-Week Reset — native QA (Task 1)
- Scroll content bottom padding is computed by `useScrollBottomPad()` from the real tab-bar height (`BottomTabBarHeightContext`) plus the safe-area inset, replacing a fixed 130 px that let the floating tab bar cover the last timeline rows on phones with a home indicator. The tab bar itself floats `tabBarBottomGap(insets.bottom)` above the bottom edge.
- Emoji `Text` gets an explicit `lineHeight` + `includeFontPadding: false` and ignores font scaling (Android clips large emoji tops otherwise; layout boxes are sized for them).
- SVG gradient ids use `React.useId()` so two halos on one web page can't share a gradient.
- Android glass/glow cards use opaque surfaces: Android draws elevation shadows through translucent backgrounds as a grey halo. iOS keeps the real blur.

## 8. Actionable notifications (Task 2)
- Categories: `medicine_reminder` (Taken / Snooze 10 min / Skip) and `routine_done` (Done ✓), all with `opensAppToForeground: false`. Programme reminders carry `itemId` in `data`.
- `NotificationActions` (in `_layout.tsx`, mounted after the user's data namespace loads) maps actions through the deterministic `itemToTickFromAction` engine helper: only Done/Taken tick, only items that apply today and are tracked, "Taken" only for medicine items, and **never** if already ticked (so replays are idempotent). Snooze re-sends the same content in 10 min.
- Platform note: iOS delivers background action responses to JS when the app is resident; on a cold start the last response is replayed via `getLastNotificationResponseAsync()`. Android action responses while the app is killed are delivered on next launch (last one only) — a known expo-notifications limitation without a native background task.

## 9. Editable times (Task 3)
- `timeOverrides: Record<itemId, 'HH:mm'>` lives in the per-account programme store (persist v2 with a migration). The printed plan in `reset8.ts` is never modified; overrides are applied on top by `applyTimeOverrides` inside `itemsForDate` and `buildProgrammeReminders`, so the day re-sorts and reminders reschedule automatically. A window keeps its length; invalid strings are ignored. Setting an item back to its plan time removes the override.

## 10. Dynamic Sunday recap & comeback nudge (Tasks 4–5)
- Local notifications can't compute at fire time, so the content is computed when the schedule is rebuilt. `useProgrammeReminders` now depends on ticks and the day; `ReminderSync` debounces (2 s) so a burst of ticks reschedules once.
- The weekly 08:15 Sunday trigger is replaced (in the hook) by **dated** reminders: next Sunday carries last week's real numbers from `weekRecap` + `sundaySummaryCopy` ("Last week: 5/7 winning days, 🔥 5-day streak. Steady progress. Weigh in before tea."); the next 3 Sundays keep gentle static copy in case the app isn't opened. Zero-win weeks get encouraging copy, never a score.
- Comeback nudge (`buildComebackReminder`): one-off at 09:05 after a day under 50%, id `prog-comeback-<date>` (max one per day). Before 09:05 it judges yesterday; after 09:05 it judges today-so-far and queues tomorrow, so it's ready even if the app isn't opened in the morning, and disappears once more ticks lift the day over 50%. Skipped if she's already ticked 2+ items that morning.
- Total pending notifications stay ≈ 30, under iOS's 64 cap.

## 11. Steps auto-fill (Task 6) — abstraction shipped, native providers pending
- `src/lib/stepsSource.ts`: `StepsProvider` interface (read-only, steps only), a provider registry, feature flag `EXPO_PUBLIC_STEPS_AUTOFILL=1`, and deterministic `mergeSteps` (device count raises today's value, never lowers a manual entry). `StepsAutofill` in `_layout.tsx` runs on app focus; the manual stepper stays the fallback everywhere (web, Expo Go, flag off, permission denied).
- Native providers are NOT installed yet: they need a dev/EAS build that couldn't be compiled or verified from this environment, and a misconfigured plugin would break the preview APK. Remaining work:
  1. `npx expo install @kingstinct/react-native-healthkit react-native-health-connect expo-build-properties`
  2. `app.json` plugins: `["@kingstinct/react-native-healthkit", { "NSHealthShareUsageDescription": "Svastha reads your step count to fill in your daily steps. Nothing else is read or stored." }]`, `"react-native-health-connect"`, and `["expo-build-properties", { "android": { "minSdkVersion": 26 } }]`; Android permission `android.permission.health.READ_STEPS`; iOS entitlement `com.apple.developer.healthkit`.
  3. Create `src/lib/stepsProviders.native-health.ts` that calls `registerStepsProvider('ios', …)` (HealthKit `queryStatisticsForQuantity` for `HKQuantityTypeIdentifierStepCount`, today 00:00→now, cumulative sum) and `registerStepsProvider('android', …)` (Health Connect `initialize` → `requestPermission([{ accessType: 'read', recordType: 'Steps' }])` → `aggregateRecord` Steps COUNT_TOTAL), and import it once from `_layout.tsx`.
  4. Build a dev client (`eas build --profile development`), set `EXPO_PUBLIC_STEPS_AUTOFILL=1`, verify on device.
