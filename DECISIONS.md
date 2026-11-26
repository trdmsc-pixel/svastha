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
