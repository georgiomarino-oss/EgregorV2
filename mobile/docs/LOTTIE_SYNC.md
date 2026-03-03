# Lottie Sync Workflow

This project supports pulling premium Lottie JSON files into `mobile/assets/` without hardcoding account credentials.

## Canonical files

- Config: `mobile/lottie-assets.config.json`
- Script: `mobile/scripts/sync-lottie-assets.mjs`

## 1) Add environment values (local only)

In `mobile/.env` set:

```env
LOTTIE_API_TOKEN=your_lottie_token
LOTTIE_URL_COSMIC_AMBIENT=https://...
LOTTIE_URL_GLOBE_FALLBACK=https://...
LOTTIE_SYNC_TIMEOUT_MS=20000
```

Do not commit real tokens. `.env` is already gitignored.

## 2) Configure assets

Edit `mobile/lottie-assets.config.json` entries:

- `id`: stable asset key
- `output`: repo-relative output JSON file
- `sourceUrlEnv`: env variable containing the source URL
- `requiresAuth`: set `true` for premium/private URLs

## 3) Run sync

```bash
cd mobile
npm run lottie:sync
```

Optional:

- Dry run: `npm run lottie:sync -- --dry-run`
- Only one asset: `npm run lottie:sync -- --id=cosmic-ambient`
- CI drift check: `npm run lottie:sync:check`

## Notes

- The sync script sends `Authorization: Bearer <LOTTIE_API_TOKEN>` and `x-api-key` when `requiresAuth=true`.
- If a URL is missing, the asset is skipped with a warning.
- `--check` exits non-zero when files are out of date.
