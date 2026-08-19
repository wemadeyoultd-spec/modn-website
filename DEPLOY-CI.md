# Deploy via GitHub Actions (one-click, no terminal)

This repo ships a **manual** GitHub Actions pipeline that deploys the whole stack
end-to-end from GitHub's runners (which have open network access):

- **Backend + PostgreSQL** (Medusa) → **Railway**
- **Storefront** (Next.js) → **Vercel**
- **DNS** for `kr.respectathletic.com` → **Cloudflare**

Workflow file: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
It is **idempotent** — safe to run again; it reuses the same project/services and
only regenerates secrets the first time.

---

## 1. Add the 3 GitHub Actions secrets

Go to the repo on GitHub → **Settings → Secrets and variables → Actions →
New repository secret**, and add each of these (names must match exactly):

| Secret name | Where to get it |
|---|---|
| `RAILWAY_API_TOKEN` | Railway → **Account Settings → Tokens** (an **account** or **team** token, not a project token). |
| `VERCEL_TOKEN` | Vercel → **Account Settings → Tokens → Create**. |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → **My Profile → API Tokens → Create Token**. Give it **Zone → DNS → Edit** (and **Zone → Read**) on `respectathletic.com`. |

Optional (not a secret): **Settings → Secrets and variables → Actions → Variables**
→ add `DEPLOY_DOMAIN` if you ever want a different host than the default
`kr.respectathletic.com`.

> Never paste real token values into this file or any committed file.

---

## 2. Trigger the deploy

1. GitHub → **Actions** tab.
2. Select the **"Deploy"** workflow in the left sidebar.
3. Click **Run workflow**.
4. Set **Use workflow from** = branch **`claude/slack-session-mx5svx`**.
5. Inputs:
   - `run_seed` = **true** for the very first deploy (seeds the store + creates the
     publishable key). Set it to **false** on every later run.
   - `deploy_domain` = leave blank (defaults to `kr.respectathletic.com`).
6. Click the green **Run workflow** button and watch the logs.

---

## 3. What each job does

**Job 1 — deploy-backend (Railway)**
- Installs the Railway CLI, authenticates with `RAILWAY_API_TOKEN`.
- Ensures a project **`modn-website`**, a **Postgres** service, and a **backend**
  service exist (creates any that are missing, via the Railway GraphQL API).
- Sets backend variables idempotently: `DATABASE_URL` (references Postgres),
  `JWT_SECRET`/`COOKIE_SECRET` (generated once, then kept stable),
  `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` = `https://kr.respectathletic.com,https://*.vercel.app`,
  placeholder Stripe keys, `NODE_ENV=production`, and `RUN_SEED` (from the input).
- Builds the Docker image (`backend/` context, `apps/backend/Dockerfile`) and
  deploys with `railway up`.
- Generates a public domain, waits for `/health` to return 200, then runs
  `print-pubkey.ts` to read the store publishable key (`pk_...`).
- **Outputs:** `backend_url`, `publishable_key`.

**Job 2 — deploy-frontend (Vercel)** — needs Job 1
- Installs the Vercel CLI, links/creates the project **`modn-storefront`** rooted
  at `backend/apps/storefront`.
- Sets production env vars from Job 1: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`,
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DEFAULT_REGION=us`,
  `NEXT_PUBLIC_BASE_URL=https://kr.respectathletic.com`,
  `NEXT_PUBLIC_STRIPE_KEY=pk_test_placeholder`.
- `vercel build --prod` then `vercel deploy --prebuilt --prod`, and adds the
  custom domain.
- **Outputs:** `frontend_url`, `vercel_cname_target` (defaults to `cname.vercel-dns.com`).

**Job 3 — dns (Cloudflare)** — needs Job 2
- Finds the `respectathletic.com` zone and upserts a **CNAME** `kr` →
  `cname.vercel-dns.com` with **proxied = false** (DNS only, so Vercel can issue SSL).
- Prints a final summary (backend URL, admin URL, storefront URL, public site).

Every external-API step echoes its status; tokens are never printed. The whole
run also produces a **Job Summary** with all the URLs.

---

## 4. After the first deploy

- **Flip `RUN_SEED` to false.** Simply re-run the workflow with `run_seed=false`
  (the store data is non-idempotent, so it must only seed once). This updates the
  Railway `RUN_SEED` variable so the next backend deploy skips seeding.
- **Swap in the real domain later.** When ready to serve `respectathletic.com`
  (or `www`), add it in Vercel, add the DNS records Vercel shows, set
  `deploy_domain` accordingly (or update the `DEPLOY_DOMAIN` variable) and re-run.
  See the "Later: switch to the real domain" section in [`DEPLOY.md`](DEPLOY.md).

---

## 어사이드에 이렇게 적어주세요:

> GitHub에서 `wemadeyoultd-spec/modn-website` 저장소를 열어줘.
>
> 1) **Settings → Secrets and variables → Actions → New repository secret** 로 가서
> 아래 3개의 시크릿을 정확히 이 이름으로 추가해줘 (값은 내가 따로 알려줄게):
>    - `RAILWAY_API_TOKEN` — Railway 계정 설정(Account → Tokens)에서 만든 토큰
>    - `VERCEL_TOKEN` — Vercel 계정 설정(Tokens)에서 만든 토큰
>    - `CLOUDFLARE_API_TOKEN` — Cloudflare에서 respectathletic.com 존에 대해
>      "Zone → DNS → Edit" 권한으로 만든 토큰
>
> 2) 그 다음 **Actions** 탭으로 가서 왼쪽에서 **"Deploy"** 워크플로우를 선택하고
> **Run workflow** 를 눌러줘. 브랜치는 **`claude/slack-session-mx5svx`** 를 선택하고,
> `run_seed` 는 **true** 로 (처음 배포니까), `deploy_domain` 은 비워둔 채로 실행해줘.
>
> 3) 실행이 끝나면 로그 맨 아래 요약(Summary)에 나오는 백엔드 URL, 관리자 URL(/app),
> 스토어프론트 URL, 그리고 https://kr.respectathletic.com 주소를 나에게 알려줘.
> (DNS/SSL 적용에는 몇 분 걸릴 수 있어.)
>
> 4) 첫 배포가 성공하면, 같은 워크플로우를 이번엔 `run_seed` 를 **false** 로 해서
> 한 번 더 실행해줘 (시드가 두 번 돌지 않게).
