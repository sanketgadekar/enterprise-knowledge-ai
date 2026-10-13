# Backend API reference (verified from Swagger UI)

**Source of truth:** screenshots of the running FastAPI Swagger UI (`/docs`). The backend source code
was **not** available when this frontend was built, and the backend was **not** run. Everything below is
therefore limited to what those screenshots showed. Anything not visible is marked **Not shown**, and the
frontend handles it defensively instead of assuming a shape.

Legend: 🔒 = padlock shown in Swagger (bearer token required). No padlock = public.

> **Re-confirm** by opening `http://127.0.0.1:8000/docs` (or `/openapi.json`) and comparing.
> If a contract differs, change `src/types/api.ts`, `src/lib/api-client.ts` and (for proxied routes)
> `src/server/proxy-routes.ts`, then update this file.

## Summary

| # | Method | Path | Purpose | Auth | Used by frontend |
|---|--------|------|---------|------|------------------|
| 1 | POST | `/auth/register` | Register Company | public | `/register` |
| 2 | POST | `/auth/login` | Login | public | `/login` |
| 3 | GET | `/auth/me` | Get Me | 🔒 | session check (app shell) |
| 4 | GET | `/users/` | List Users | 🔒 | `/users`, dashboard |
| 5 | POST | `/users/` | Create User | 🔒 | `/users` |
| 6 | POST | `/ingest/upload` | Upload Document | 🔒 | `/documents` |
| 7 | POST | `/chat/` | Chat | 🔒 | `/chat` |
| 8 | GET | `/chat/test-retrieval` | Test Retrieval | 🔒 | **not used** (diagnostic) |
| 9 | GET | `/chat/sessions` | List Sessions | 🔒 | `/chat`, dashboard |
| 10 | GET | `/chat/sessions/{session_id}` | Get Session Messages | 🔒 | `/chat` |
| 11 | DELETE | `/chat/sessions/{session_id}` | Delete Session | 🔒 | `/chat` |

Authentication: `Authorization: Bearer <access_token>` (token from `/auth/login`). The browser never sees the
token — see *How the frontend calls the API* at the bottom.

**Typical errors (NOT shown in screenshots).** FastAPI conventionally returns `401` (missing/invalid token),
`403` (not permitted), `404`, and `422` with `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` for
validation errors. The frontend parses these shapes and also accepts `{"detail": "text"}`, but the exact
codes this backend uses (e.g. for a duplicate slug) were not verified.

---

## 1. `POST /auth/register` — Register Company
- **Auth:** public
- **Request** `application/json` (verified):
  ```json
  { "company_name": "string", "admin_email": "user@example.com", "admin_password": "string", "custom_slug": "string" }
  ```
- **Response:** **Not shown.** The frontend does *not* assume the admin is logged in; it sends the user to `/login`
  and pre-fills the slug (from `company_slug` / `slug` in the response if present, otherwise the slug the user typed).
- **Unverified:** whether `custom_slug` is optional (the form omits it when left blank), password rules, slug rules.

## 2. `POST /auth/login` — Login
- **Auth:** public
- **Request** `application/json` (verified): `{ "company_slug": "string", "email": "user@example.com", "password": "string" }`
- **Response 200** (verified):
  ```json
  { "company_id": "string", "company_slug": "string", "access_token": "string", "token_type": "bearer" }
  ```

## 3. `GET /auth/me` — Get Me
- **Auth:** 🔒 · **Parameters:** none
- **Response 200:** Swagger shows only an untyped `"string"` schema, so **the real body is not documented**.
  The frontend uses it to validate the session and displays `email` / `role` **only if** those string keys
  exist in the returned object.

## 4. `GET /users/` — List Users
- **Auth:** 🔒 · **Parameters:** none
- **Response 200** (verified) — array of:
  ```json
  { "id": "uuid-string", "email": "string", "role": "string", "is_active": true, "created_at": "2026-10-13T10:01:59.638Z" }
  ```
- Role/company restrictions: **not shown** (a `403` is handled with a clear message).

## 5. `POST /users/` — Create User
- **Auth:** 🔒
- **Request** `application/json` (verified): `{ "email": "user@example.com", "password": "string", "role": "admin" }`
- **Response:** **Not shown** (ignored; the list is re-fetched afterwards).
- **Unverified:** the set of valid `role` values — Swagger's example shows `"admin"` only. The form therefore
  uses a free-text field with suggestions built from roles seen in `GET /users/` plus `admin`.

## 6. `POST /ingest/upload` — Upload Document
- **Auth:** 🔒
- **Request** `multipart/form-data` (verified): one required binary field **`file`**.
- **Path note:** Swagger shows **no trailing slash** (`/ingest/upload`); the old Streamlit code used `/ingest/upload/`.
  The frontend uses the Swagger form.
- **Response:** **Not shown.** Whether ingestion/indexing is synchronous is unknown, so the UI says "accepted by
  the server" and never claims a document is indexed.
- **Unverified:** supported file types and size limit (PDF/TXT/DOCX/CSV come from the old app and are advisory only).

## 7. `POST /chat/` — Chat
- **Auth:** 🔒
- **Query parameters** (verified): `query` (string, **required**), `session_id` (string, optional). No body.
- **Response:** **Not shown.** `extractChatReply()` (`src/lib/normalize.ts`) accepts a plain string or an object and
  looks for the answer in `answer | response | reply | message | content | text | output | result`, a session id in
  `session_id`, and sources in `sources | citations | references | documents | context`. If no text key is found,
  the raw JSON is shown with a notice rather than fabricating content.
- **Unverified:** whether a new session id is returned for the first message (if not, each message starts a new
  session), citation format, streaming (none assumed).

## 8. `GET /chat/test-retrieval` — Test Retrieval
- **Auth:** 🔒 · **Query:** `query` (string, required) · **Response:** not shown.
- Looks like a developer/diagnostic route. **Not exposed** in the UI and **blocked** by the proxy allow-list.

## 9. `GET /chat/sessions` — List Sessions
- **Auth:** 🔒 · **Parameters:** none
- **Response 200:** untyped `"string"` schema in Swagger → real shape **not documented**.
  `normalizeSessions()` accepts an array (or `{sessions: [...]}`) of ids or objects with
  `session_id | id` and optional `title | name | summary | first_query …`, `updated_at | created_at …`.

## 10. `GET /chat/sessions/{session_id}` — Get Session Messages
- **Auth:** 🔒 · **Path:** `session_id` (string, required) · **Response:** not shown.
- `normalizeMessages()` accepts an array (or `{messages | history: [...]}`) of either
  `{role, content | message | text}` turns or `{query | question, answer | response}` rows. If nothing can be read,
  the UI says so and still lets the user continue the conversation.

## 11. `DELETE /chat/sessions/{session_id}` — Delete Session
- **Auth:** 🔒 · **Path:** `session_id` (string, required) · **Response:** not shown. Used behind a confirmation dialog.

---

## Not provided by the backend (as far as the screenshots show)
- No document-listing, document-delete or ingestion-status endpoint.
- No update/delete/deactivate-user endpoint, no invitations, no role-management endpoint.
- No logout endpoint (logout = clearing the frontend's session cookies).
- No dashboard-metrics endpoint (the dashboard shows only counts derived from `GET /users/` and `GET /chat/sessions`).
- No streaming protocol was visible.

## How the frontend calls the API
```
Browser ──(same origin, cookies)──▶ Next.js server ──(Bearer token)──▶ FastAPI
          /api/auth/login                          /auth/login
          /api/auth/register                       /auth/register
          /api/session                             /auth/me
          /api/backend/users                       /users/
          /api/backend/ingest/upload               /ingest/upload
          /api/backend/chat                        /chat/
          /api/backend/chat/sessions[/{id}]        /chat/sessions[/{id}]
```
- The token is stored in an **HttpOnly** cookie (`eka_session`), `SameSite=Lax`, `Secure` when served over HTTPS.
  JavaScript in the page cannot read it, which limits the impact of XSS compared with `localStorage`
  (it does not make the app immune to XSS — cookies are still sent with requests an attacker's script can trigger).
- Only the routes in `src/server/proxy-routes.ts` are forwarded (an allow-list), so the proxy is not an open relay.
- The backend URL comes from `NEXT_PUBLIC_API_BASE_URL` and is read **on the server only**; because requests are
  server-to-server, **no CORS configuration is required**.
- Authorization stays authoritative in the backend: the proxy adds no tenant IDs and cannot choose a tenant.
  `middleware.ts` only redirects users without a cookie to `/login` as a convenience.
