# Egregor

Clean rebuild scaffold for Egregor.

## Structure

- `mobile/`: Expo + React Native + TypeScript client
- `supabase/functions/`: Supabase Edge Functions for OpenAI and ElevenLabs

## Current Milestone 0 status

- Auth gate with Supabase email/password
- Cosmic design system baseline
- Solo prayer generation + audio playback session player
- Events screen with Expo Go fallback mode and dev-client Mapbox loader structure
- Startup env validation screen

## Local run

1. Copy env templates:

```bash
cp mobile/.env.example mobile/.env
cp supabase/functions/.env.example supabase/functions/.env
```

2. Fill env values.
3. Start mobile app:

```bash
cd mobile
npm install
npm run start
```

## Lottie premium sync

Use the built-in workflow in `mobile/docs/LOTTIE_SYNC.md` to pull premium/private Lottie assets with `mobile/.env` secrets and keep JSON files in sync.

## Supabase Edge Functions

Deploy after linking your project:

```bash
supabase functions deploy generate-prayer-script --project-ref <project-ref>
supabase functions deploy generate-prayer-audio --project-ref <project-ref>
supabase functions deploy dispatch-notification-queue --project-ref <project-ref>
```

Set secrets in Supabase (recommended):

```bash
supabase secrets set OPENAI_API_KEY=... ELEVENLABS_API_KEY=... NOTIFICATION_DISPATCH_SHARED_SECRET=... --project-ref <project-ref>
```

## Release hardening docs

Phase 6A release/operator docs live in:

- `mobile/docs/release/`

