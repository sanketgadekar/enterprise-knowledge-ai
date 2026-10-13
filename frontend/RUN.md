# Running Enterprise Knowledge AI (Windows PowerShell)

This guide starts the **FastAPI backend** and the **Next.js frontend** on your own computer.

## 1. What you need installed

| Software | Version | Check with |
|----------|---------|-----------|
| Node.js (LTS) | 18.18 or newer (20/22 recommended) | `node -v` |
| npm (comes with Node) | 9 or newer | `npm -v` |
| Python | the version your backend already uses | `python --version` |
| PostgreSQL and the backend's other services | as already set up for your backend | — |

Download Node.js from <https://nodejs.org> if `node -v` fails.

## 2. What runs where

| Part | What it does | Address |
|------|--------------|---------|
| **Backend** (FastAPI, in `backend/`) | Stores data, authenticates users, ingests documents, answers questions | `http://127.0.0.1:8000` (API docs at `/docs`) |
| **Frontend** (Next.js, in `frontend/`) | The web app you use in the browser. Its server forwards requests to the backend | `http://localhost:3000` |

The browser talks only to the frontend (port 3000); the frontend's server talks to the backend (port 8000).
That is why **no CORS settings are needed**.

## 3. One-time: put the new frontend in place

The new project replaces the old Streamlit `frontend/` folder. Keep the old one as a backup:

```powershell
cd C:\path\to\your-repo            # <-- change to where your repository lives
Rename-Item frontend frontend_streamlit_legacy
# Now unzip the new "frontend" folder into this repo root so you have:
#   your-repo\backend
#   your-repo\frontend            <-- new Next.js app
```

## 4. Configure the frontend environment file

```powershell
cd C:\path\to\your-repo\frontend
Copy-Item .env.example .env.local
notepad .env.local
```

It contains one line:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Change it only if your backend runs on a different address or port. Use `127.0.0.1` rather than `localhost`:
on some Windows setups `localhost` resolves to IPv6 (`::1`), where the backend isn't listening.
`.env.local` is ignored by Git. **Never** put passwords or API keys in it, and do not copy values from the root `.env`.

> Changes to `.env.local` need a restart of the frontend (Ctrl+C, then `npm run dev` again).

## 5. Install frontend dependencies

```powershell
cd C:\path\to\your-repo\frontend
npm install
```

## 6. Start the backend (Terminal 1)

Open PowerShell, activate **your existing** Python virtual environment, then start FastAPI from `backend/`:

```powershell
cd C:\path\to\your-repo\backend
.\.venv\Scripts\Activate.ps1        # your venv may be named "venv" instead of ".venv"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- If PowerShell blocks the activate script, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and retry.
- Use whatever start command you already use for the backend if it differs. The command above assumes
  `backend/app/main.py` defines `app`. Make sure PostgreSQL is running and migrations are applied as usual.
- Check it works: open <http://127.0.0.1:8000/docs>.

## 7. Start the frontend (Terminal 2, a separate window)

```powershell
cd C:\path\to\your-repo\frontend
npm run dev
```

Open <http://localhost:3000>. You will be sent to the sign-in page.

## 8. Check that everything works

1. **Register a company** — go to `/register`, fill in company name, admin email, password (8+ characters) and optionally a slug. Registration does **not** sign you in; continue to `/login`.
2. **Sign in** — company slug, email and password. You land on the dashboard.
3. **Users** — open *Users*: the list loads. Click *Add user*, enter email, password and a role (for example `admin`). The list refreshes.
4. **Documents** — open *Documents*, drop a PDF/TXT/DOCX/CSV file, click *Upload*. "Accepted by the server" means the upload succeeded; it does not prove indexing has finished.
5. **Chat** — open *AI Chat* and ask about your document. Past conversations appear under *History*; try *New chat* and deleting a conversation.
6. **Sign out** — bottom of the sidebar. You return to the sign-in page, and protected pages redirect there.

## 9. Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| "Cannot reach the backend…" / status 502 | Backend isn't running or the URL is wrong. Start it (step 6), open <http://127.0.0.1:8000/docs>, confirm `NEXT_PUBLIC_API_BASE_URL`, restart `npm run dev`. |
| The app still uses the wrong address | `.env.local` is missing or was edited without a restart. Re-check step 4. |
| "CORS" errors in the browser console | Shouldn't occur: the browser never calls the backend directly. If you see one, something is calling port 8000 from the browser — make sure you're on `http://localhost:3000`, not the old Streamlit app. |
| 401 / "session expired" | Token expired or invalid. Sign in again. |
| 403 / "no permission" | Your user's role isn't allowed to do that. Sign in as an administrator. |
| Login says credentials are incorrect | The **company slug** must match the one you registered; it is required at every sign-in. |
| Upload fails | Read the message under the file: 413 = too large, 415/422 = unsupported or invalid file, 5xx = server problem (check the backend terminal for the traceback). Click *Retry* after fixing. |
| Chat shows "unrecognised format" | The backend's chat response uses fields the frontend doesn't recognise. See `API_REFERENCE.md` and adjust `src/lib/normalize.ts`. |
| "Port 3000 is in use" | Run `npm run dev -- -p 3001`, or find the process: `Get-NetTCPConnection -LocalPort 3000 \| Select OwningProcess`. |
| `npm` is not recognised | Reinstall Node.js and reopen PowerShell. |

## 10. Quality checks (scripts defined in `package.json`)

```powershell
npm run lint        # ESLint
npm run typecheck   # TypeScript (strict)
npm run test        # unit tests (Vitest)
npm run build       # production build
npm run start       # serve the production build on port 3000 (run build first)
```

## 11. Stop and restart

- Stop either server with **Ctrl + C** in its terminal.
- Restart the backend with the same `uvicorn …` command, and the frontend with `npm run dev`.

## 12. What the current backend does and doesn't provide

**Implemented and used:** company registration, login, `GET /auth/me`, list and create users, document upload,
chat with sessions (list, open, delete).

**Not available (so not in the UI):** listing or deleting documents, knowing when indexing is done, editing or
deleting users, invitations, role management, a logout endpoint, dashboard metrics beyond counts derived from the
users and sessions lists, and streaming chat responses.

**Unverified response shapes** (the Swagger screenshots didn't show them): chat reply, sessions list, session
messages, upload, register and create-user responses. The UI reads them defensively — see `API_REFERENCE.md`.

## 13. Where things live

- API contract: `frontend/API_REFERENCE.md`
- Backend base URL: `frontend/.env.local` → `NEXT_PUBLIC_API_BASE_URL`
- API client: `src/lib/api-client.ts` · server proxy and session handling: `src/app/api/**` and `src/server/**`
