# Deploying LocalHub (Docker, local server)

## Secrets and environment

All API secrets are read from the environment; **none are stored in code**.

1. **Copy the example env file** (do not commit real secrets):
   ```bash
   cp backend/.env.example backend/.env
   ```
2. **Edit `backend/.env`** and set at least:
   - `LOCALHUB_BASE_URL` – full URL where the app is served (e.g. `http://your-server:3000`)
   - `CORS_ORIGIN` – same as base URL when serving frontend from the same host
   - For **Google Calendar**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - For **Strava (Runner)**: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`

The `.env` file is gitignored. Use `.env.example` as the template.

## Docker (single container: API + frontend)

From the repo root:

```bash
# Create env file from example and set secrets
cp backend/.env.example backend/.env
# edit backend/.env as needed

# Build and run
docker compose up -d
```

Open `http://localhost:3000` (or your server’s host/port). Data is stored in a Docker volume `localhub-data`.

- **Build only:** `docker compose build`
- **Logs:** `docker compose logs -f`
- **Stop:** `docker compose down`

## Local (no Docker)

1. Create `backend/.env` from `backend/.env.example` and set secrets.
2. Run backend: `cd backend && npm run dev` (or `npm run build && npm start`).
3. Run frontend: `cd frontend && npm start` (dev server proxies `/api` to backend).

For production on a single host, build the frontend (`cd frontend && npm run build`), then set `PUBLIC_DIR` to the path of `frontend/dist/localhub/browser` and run the backend so it serves the SPA.
