# Katwana Premier League (KPL) — Leaderboard App

A small React + Vite application where friends post weird/funny things, others comment and rate, and @mentioned people collect points.

## How scoring works

1. Create a post and mention friends using `@Name` (example: `Bro @Asha did that again`).
2. Other people rate the post from **1–5**.
3. For each post, we compute the **average rating**.
4. **Every mentioned person** in that post receives the post’s average rating added to their **total score**.
5. The **Leaderboard** page sorts players by total score.

Optional house rule: whoever is #1 at the end gives the party.

## Data storage

Data is stored in **MongoDB** via an Express backend (`server/` directory). User details, posts, comments, and ratings are all persisted in the database.

### MongoDB setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (or use a local MongoDB).
2. Get your connection string and add it to the `.env` file in the project root:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/kpl?retryWrites=true&w=majority
```

### Backend setup

```bash
# Install backend dependencies (one-time)
npm run server:install

# Start the API server (port 4000)
npm run dev:server

# Or start both frontend + backend together
npm run dev:all
```

The Vite dev server proxies `/api` requests to the backend automatically.

## Google (Gmail) authentication

This app uses **Firebase Authentication** (Google provider).

### Setup steps

1. Create a Firebase project: https://console.firebase.google.com/
2. Go to **Authentication → Sign-in method** and enable **Google**.
3. Create a **Web App** in **Project settings** and copy the config.
4. Create a `.env` file in the project root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...

# optional
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...

# MongoDB (used by server/)
MONGODB_URI=mongodb+srv://...
```

Then restart the dev server.

### Uniqueness rules

- Posts/comments are tied to the signed-in user via `authorId`.
- Ratings are unique per user per post via `raterId`.

## Scripts

- `npm run dev` — start Vite dev server (frontend)
- `npm run dev:server` — start Express API server (backend)
- `npm run dev:all` — start both frontend + backend together
- `npm run server:install` — install backend dependencies
- `npm run build` — production build (frontend)
- `npm run preview` — preview production build
- `npm run test` — run tests in watch mode
- `npm run test:run` — run tests once

## PWA & notifications

- Install on Android/iOS/desktop from the browser menu (manifest + icons + standalone display).
- Offline-first caching for shell/assets; API calls fall back online-first with cache backup.
- Service worker listens for **push** payloads shaped like `{ title, body, url }` and opens/focuses the app when tapped.
- Users can enable notifications via the **Enable alerts** button beside the bell; we also show a lightweight local notification on success.
- To wire real push delivery, send web-push messages to the service worker registration with the same payload shape (VAPID/server wiring not included here).
