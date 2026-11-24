# Update 1.0 — beta asset checklist

The beta branch currently contains these video assets under `public/videos`:
- `trap.mp4` (existing asset; used as a temporary background fallback in the new Daily and trap catalogue screens)
- `ender-bg.mp4`
- `oferta.mp4`

The following requested assets were not present when this branch was inspected:
- `daily.mp4`
- `traps.mp4`
- `liblary.mp4` (the requested filename spelling)

Do not create blank files or rename another video to pretend these assets exist. Replace the temporary fallback references after the real files are added.

Other external/configuration inputs still needed before a faithful final preview:
- Discord admin webhook URL, configured only as the Supabase Edge Function secret `DISCORD_ADMIN_WEBHOOK_URL`
- Edge Function worker secret `TM_DISCORD_WORKER_SECRET`
- A confirmed image file for the Owner profile (the earlier `capi.jpg` idea was not verified)
- The Opinions-tab background video URL/file
- A dedicated beta Supabase project and beta-only environment variables
- A separate Vercel beta project linked to `feature/trapmasters-update-1.0`

Never put webhook URLs, service-role keys, passwords, or other secrets in client code or Git.
