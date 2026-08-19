# 배포 가이드 · Deploy Guide — respectathletic.com

This guide deploys the shop to a **temporary subdomain `kr.respectathletic.com`**
(you can swap it for the real `respectathletic.com` later, see the last section).

**Architecture**
- **Storefront** (the public shop, Next.js) → **Vercel**
- **Backend + Admin + Database** (Medusa + PostgreSQL) → **Railway** (Render alternative included)

Everything is GitHub-connected: you deploy by importing this repo, no computer/terminal required.

> **How to use the "Aside" blocks**
> Each browser step has a Korean block titled **"어사이드에 이렇게 적어주세요:"**.
> Copy that text and paste it to your browser agent (Aside) to have it do the step for you.
> Fill in the ALL-CAPS placeholders (e.g. `여기에_백엔드_URL`) with your real values first.

---

## 0. 준비물 · Prerequisites

1. This repo is pushed to GitHub: `wemadeyoultd-spec/modn-website`.
2. Free accounts: **Railway** (railway.app), **Vercel** (vercel.com) — sign in with GitHub.
3. Access to the DNS settings for **respectathletic.com** (your domain registrar).
4. (Optional, for card payments later) a **Stripe** account.

**Key paths in this repo (you'll need these):**
- Backend service root directory: `backend`
- Backend Dockerfile: `apps/backend/Dockerfile` (relative to the `backend` root dir)
- Storefront root directory: `backend/apps/storefront`

---

## Part A — 백엔드를 Railway에 배포 · Deploy the backend to Railway

### A1. Create the project from GitHub

1. Go to **railway.app → New Project → Deploy from GitHub repo**.
2. Choose **`wemadeyoultd-spec/modn-website`**.
3. Open the created service → **Settings**:
   - **Root Directory** = `backend`
   - **Builder** = Dockerfile (it auto-detects `railway.json` → `apps/backend/Dockerfile`).

> 어사이드에 이렇게 적어주세요:
> Railway(railway.app)에 로그인해줘. "New Project" → "Deploy from GitHub repo"를 눌러서
> `wemadeyoultd-spec/modn-website` 저장소를 선택해줘. 서비스가 만들어지면 그 서비스의
> Settings로 들어가서 "Root Directory"를 `backend` 로 설정하고, 빌더가 Dockerfile을
> 쓰도록 되어 있는지 확인해줘. 아직 배포(Deploy)는 누르지 말고 여기까지만 하고 알려줘.

### A2. Add a PostgreSQL database

1. In the same project: **New → Database → Add PostgreSQL**.
2. Railway provisions Postgres and exposes `DATABASE_URL` as a reference variable.

> 어사이드에 이렇게 적어주세요:
> 지금 이 Railway 프로젝트 안에서 "New" → "Database" → "Add PostgreSQL"을 눌러
> PostgreSQL 데이터베이스를 추가해줘. 다 되면 알려줘.

### A3. Set the backend environment variables

Open the **backend service → Variables** and add these
(the full reference is in `backend/apps/backend/.env.example`):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres service) |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | a long random string |
| `COOKIE_SECRET` | a different long random string |
| `STORE_CORS` | `https://kr.respectathletic.com` (add your Vercel URL later) |
| `ADMIN_CORS` | your Railway backend URL (set after A4) |
| `AUTH_CORS` | `https://kr.respectathletic.com` + Railway backend URL |
| `MEDUSA_BACKEND_URL` | your Railway backend URL (set after A4) |
| `RUN_SEED` | `true` **(only for the first deploy — remove it afterwards)** |
| `ADMIN_EMAIL` | `wemadeyoultd@gmail.com` |
| `ADMIN_PASSWORD` | a strong password you choose |

Stripe is optional — leave `STRIPE_API_KEY` unset for now and the server still boots.

> 어사이드에 이렇게 적어주세요:
> Railway의 백엔드 서비스 → "Variables" 탭으로 가서 아래 환경변수를 추가해줘.
> NODE_ENV=production
> DATABASE_URL 은 Postgres 서비스를 참조하도록 `${{Postgres.DATABASE_URL}}` 로 넣어줘.
> DATABASE_SSL=true
> JWT_SECRET 은 길고 무작위인 문자열로, COOKIE_SECRET 도 그와 다른 무작위 문자열로 넣어줘.
> STORE_CORS=https://kr.respectathletic.com
> AUTH_CORS=https://kr.respectathletic.com
> RUN_SEED=true
> ADMIN_EMAIL=wemadeyoultd@gmail.com
> ADMIN_PASSWORD=여기에_원하는_강력한_비밀번호
> 다 넣었으면 저장하고 알려줘. (ADMIN_CORS, MEDUSA_BACKEND_URL 은 다음 단계에서 넣을 거야.)

### A4. Deploy and get the public backend URL

1. Trigger a **Deploy**. Wait for it to finish and go healthy (`/health`).
2. In **Settings → Networking → Generate Domain** to get a public URL like
   `https://modn-website-production.up.railway.app`.
3. Come back to **Variables** and set:
   - `MEDUSA_BACKEND_URL` = that URL
   - `ADMIN_CORS` = that URL
   - append that URL to `AUTH_CORS` (comma-separated)
4. Redeploy so the new CORS/URL values take effect.

> 어사이드에 이렇게 적어주세요:
> Railway 백엔드 서비스를 Deploy 해줘. 배포가 끝나면 Settings → Networking에서
> "Generate Domain"을 눌러 공개 URL을 만들어줘. 그 URL을 나에게 알려주고,
> Variables로 돌아가서 MEDUSA_BACKEND_URL 과 ADMIN_CORS 를 그 URL로 설정하고,
> AUTH_CORS 끝에 콤마(,)로 그 URL을 추가한 다음 다시 Deploy 해줘.

---

## Part B — DB 마이그레이션 + 관리자 + 시드 · Migrate, admin, seed (automatic)

Because you set `RUN_SEED=true` and `ADMIN_EMAIL`/`ADMIN_PASSWORD` in A3, the first
deploy **automatically** ran:
- database migrations,
- the store seed (Sorinex catalog, US region, inventory fix so products are in stock),
- created your admin user.

**Now do two things:**
1. Log into the admin at **`https://YOUR-BACKEND-URL/app`** with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Go to **Settings → Publishable API Keys**, open the default key, and **copy its token**
   (starts with `pk_...`). You need it for Vercel in Part C.
3. Then go back to Railway **Variables and DELETE `RUN_SEED`** (and optionally `ADMIN_PASSWORD`),
   so the seed never runs again. Redeploy.

> 어사이드에 이렇게 적어주세요:
> 브라우저에서 `https://여기에_백엔드_URL/app` 을 열고 ADMIN_EMAIL 과 ADMIN_PASSWORD 로
> 로그인해줘. 로그인되면 Settings → "Publishable API Keys"로 가서 기본 키를 열고
> 토큰(pk_ 로 시작)을 복사해서 나에게 알려줘. 그 다음 Railway의 Variables에서
> RUN_SEED 변수를 삭제하고 다시 Deploy 해줘.

---

## Part C — 스토어프론트를 Vercel에 배포 · Deploy the storefront to Vercel

1. **vercel.com → Add New → Project → Import** `wemadeyoultd-spec/modn-website`.
2. **Root Directory** = `backend/apps/storefront` (click Edit, select that folder).
   Vercel auto-detects Next.js; leave build/install commands on default
   (it installs the npm workspace automatically).
3. **Environment Variables** (see `backend/apps/storefront/.env.example`):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | your Railway backend URL |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | the `pk_...` token you copied in Part B |
| `NEXT_PUBLIC_BASE_URL` | `https://kr.respectathletic.com` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `us` |
| `NEXT_PUBLIC_STRIPE_KEY` | (optional) your Stripe publishable key |

4. Click **Deploy**. When done, you get a `*.vercel.app` URL — open it to confirm the shop loads.

> 어사이드에 이렇게 적어주세요:
> Vercel(vercel.com)에 로그인해서 "Add New" → "Project" → Import 로
> `wemadeyoultd-spec/modn-website` 저장소를 가져와줘. Root Directory 를
> `backend/apps/storefront` 로 설정해줘 (Edit 눌러서 그 폴더 선택).
> Environment Variables 에 아래를 추가해줘:
> NEXT_PUBLIC_MEDUSA_BACKEND_URL=여기에_레일웨이_백엔드_URL
> NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=여기에_pk_로_시작하는_토큰
> NEXT_PUBLIC_BASE_URL=https://kr.respectathletic.com
> NEXT_PUBLIC_DEFAULT_REGION=us
> 그 다음 Deploy 를 눌러줘. 배포가 끝나면 생성된 *.vercel.app 주소를 나에게 알려줘.

### C2. Allow the Vercel URL in the backend CORS

Copy your new `*.vercel.app` URL and add it to the Railway backend `STORE_CORS`
and `AUTH_CORS` (comma-separated), then redeploy the backend.

> 어사이드에 이렇게 적어주세요:
> Railway 백엔드 → Variables 로 가서 STORE_CORS 와 AUTH_CORS 값 끝에 콤마(,)로
> `https://여기에_vercel_주소.vercel.app` 를 추가하고 다시 Deploy 해줘.

---

## Part D — 도메인 연결 · Point kr.respectathletic.com to Vercel

### D1. Add the custom domain in Vercel

1. Vercel project → **Settings → Domains → Add** `kr.respectathletic.com`.
2. Vercel shows a **CNAME target** (usually `cname.vercel-dns.com`). Note it.

> 어사이드에 이렇게 적어주세요:
> Vercel 프로젝트 → Settings → Domains 로 가서 `kr.respectathletic.com` 을 추가해줘.
> Vercel 이 보여주는 CNAME 대상 값(보통 cname.vercel-dns.com)을 나에게 알려줘.

### D2. Create the DNS CNAME at your registrar

In the DNS settings for **respectathletic.com**, add a record:
- **Type**: `CNAME`
- **Name/Host**: `kr`
- **Value/Target**: the Vercel CNAME target from D1 (e.g. `cname.vercel-dns.com`)
- **TTL**: automatic/default

Wait a few minutes; Vercel will verify and issue HTTPS automatically.

> 어사이드에 이렇게 적어주세요:
> respectathletic.com 도메인의 DNS 설정 화면으로 가서 아래 CNAME 레코드를 추가해줘:
> 타입=CNAME, 호스트/이름=kr, 값/대상=여기에_Vercel_CNAME_대상,
> TTL=자동. 저장한 다음 알려줘.

---

## Part E — kr 도메인 CORS 확정 · Finalize backend CORS for the kr domain

`https://kr.respectathletic.com` is already in `STORE_CORS`/`AUTH_CORS` from A3.
Double-check the Railway backend variables contain **all** of:
- `https://kr.respectathletic.com`
- your `*.vercel.app` production URL (and preview URL if you use previews)

in both `STORE_CORS` and `AUTH_CORS`, then redeploy the backend once more.
Open `https://kr.respectathletic.com`, add a product to the cart — it should work.

> 어사이드에 이렇게 적어주세요:
> Railway 백엔드 → Variables 에서 STORE_CORS 와 AUTH_CORS 에
> `https://kr.respectathletic.com` 과 Vercel 주소가 모두 들어있는지 확인하고,
> 없으면 콤마로 추가한 뒤 다시 Deploy 해줘. 그 다음 `https://kr.respectathletic.com`
> 을 열어서 상품을 장바구니에 담아보고 잘 되는지 확인해줘.

---

## 나중에: 실제 도메인으로 교체 · Later: switch to the real domain

When ready to serve the real `respectathletic.com` (or `www`):
1. Vercel → Domains → add `respectathletic.com` (and `www.`), set it as the primary domain.
2. DNS: add the records Vercel shows (an `A`/`ALIAS` for the apex, `CNAME` for `www`).
3. Update env vars everywhere the kr domain appears:
   - Vercel: `NEXT_PUBLIC_BASE_URL=https://respectathletic.com`
   - Railway: add `https://respectathletic.com` (and `www`) to `STORE_CORS` and `AUTH_CORS`.
4. Redeploy both.

---

## 채워야 할 값 / TODO · Values you must fill in

- **DNS CNAME target** — from Vercel (D1), entered at your registrar (D2).
- **Publishable key (`pk_...`)** — generated on Railway seed, copied from the admin (Part B).
- **Railway backend URL** — generated in A4; used in several env vars.
- **JWT_SECRET / COOKIE_SECRET / ADMIN_PASSWORD** — pick strong random values.
- **Stripe keys (optional)** — `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` (backend) and
  `NEXT_PUBLIC_STRIPE_KEY` (storefront) when you enable card payments. Then create a
  Stripe webhook pointing at `https://YOUR-BACKEND-URL/hooks/payment/stripe`.
- **Product images** — currently local placeholder SVGs; replace with real images later.
- **Prices** — most catalog prices are placeholders; only the XL Half Rack (~$1,999) is confirmed.

## Alternative: Render instead of Railway

`backend/render.yaml` is a ready Blueprint. In Render: **New → Blueprint**, point at this
repo. It provisions Postgres + the backend web service. Then set the same env vars
(`MEDUSA_BACKEND_URL`, CORS, `RUN_SEED=true` once, `ADMIN_EMAIL`/`ADMIN_PASSWORD`) in the
Render dashboard and deploy. The rest (Vercel, DNS, CORS) is identical.
