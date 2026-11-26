# Svastha — Master Build Prompt & Agent Instructions

This repository implements the **Svastha** AI lab-report–driven personal health app (iOS + Android + Expo Web preview on Vercel) with a Supabase (`ap-south-1` Mumbai) backend.

## Core Non-Negotiable Rules
1. **Not a doctor**: Wellness & self-tracking tool only. Never diagnose or prescribe. Use "may suggest", "worth discussing with your doctor".
2. **Deterministic first, AI second**: Compute High/Low/Normal/Borderline status, severity (`×ULN`), red-flag rules, BMR/kcal floors, retest dates, and IFCT 2017 nutrition totals in code (`src/engine/` & `supabase/functions/_shared/safety.ts`), never via LLM.
3. **Zero-storage media**: Meal photos and lab reports are never persisted to Supabase Storage, Postgres, GitHub, or logs. Strip EXIF, downscale to ≤1024px, process in memory, discard buffer.
4. **WCAG 2.1 AA**: Use `tokens.color.accentText` (`#A3471F`) for peach text, `tokens.color.onAccent` (`#2B2B2B`) on peach fills, `tokens.color.inkMuted` (`#6B6B6B`) for secondary labels, `segmentEmptyStroke` (`#948B80`) on empty arc segments, and always pair status colour with icon + word.
5. **DPDP Act 2023 + Rules 2025**: 18+ age gate, itemised consent before first report upload, data export, full account deletion, Mumbai region hosting.
6. **Build & test checks**: Run `npm run typecheck` and `npm test` (including `tests/lalPathLabsFixture.test.ts`) after every change. Record architectural decisions in `DECISIONS.md`.
