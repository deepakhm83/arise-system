# ARISE: THE SYSTEM

A Solo Leveling inspired personal progression PWA. ARISE stores a hunter profile and progress locally in the browser; it does not require an account or backend.

## Run locally

Install Node.js and pnpm, then run:

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Deploy to GitHub Pages

The Vite production base path is `/arise-system/`. The included GitHub Actions workflow builds and deploys the `main` branch to GitHub Pages. Name the repository `arise-system`, push the project to `main`, then set **Settings → Pages → Build and deployment → GitHub Actions**.

## Install on iPhone

Open the deployed HTTPS site in Safari and choose **Share → Add to Home Screen**. After its first successful load, the service worker caches the app shell for offline use. Progress stays on that device. Use Archive → Export System Backup to preserve or move progress; Restore accepts an ARISE JSON backup.

## Current draft

The app includes a one-time hunter setup, Player progression dashboard, ranks and rank history, titles, achievements, daily and special quests, multi-stage dungeons, safe personalized fitness preferences, quest verification flows, Elite Mode, the Hunter's Shop, attributes, challenges, click and event sounds, and local backup and restore.

Quest verification records configured timers, checklists, quantities, or reflections. It cannot independently prove that a real-world task occurred. All hunter data remains on the current device; there are no real-money purchases or server accounts.
