# QABot — Mock NGFT/Axon Batch Service

Mock backend simulating steps 4–5–6 of the back-office batch pipeline.  
Deployed on Netlify, used as a knowledge source + REST tool in Microsoft Copilot Studio.

## Local Development

```bash
npm install
npx netlify-cli dev
```

Server runs at `http://localhost:8888`.

## Run Tests

```bash
npm test
```

## Deploy to Netlify

### One-time setup
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git** → select this repo
2. Build settings: leave blank (we deploy via CLI in GitHub Actions)
3. After site is created, copy the **Site ID** from Site Settings → General
4. Go to [app.netlify.com/user/applications#personal-access-tokens](https://app.netlify.com/user/applications#personal-access-tokens) → create a **Personal Access Token**
5. In GitHub repo → **Settings → Secrets → Actions** → add:
   - `NETLIFY_SITE_ID` = your site ID
   - `NETLIFY_AUTH_TOKEN` = your personal access token
6. Push to `main` → GitHub Actions runs tests and deploys automatically

## Endpoints

### POST /upload
Upload an ISO file to mock NGFT.

```bash
curl -X POST https://<YOUR_NETLIFY_URL>/.netlify/functions/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"settlement.xml","contentHash":"abc123","isoType":"ISO20022"}'
```

**Responses:** 200 QUEUED, 400 INVALID_REQUEST/INVALID_ISO, 409 DUPLICATE, 500 (with `?force500=true`)

### GET /batch/:fileId/status
Check Axon batch job status.

```bash
curl https://<YOUR_NETLIFY_URL>/.netlify/functions/batchStatus/NGFT-1001-test0
```

**Deterministic:** fileId ending in 3 or 7, or containing "FAIL" → FAILED. Others → PROCESSED.  
**Override:** `?force=FAILED` or `?force=PROCESSED`

### GET /reconcile/:fileId
Get reconciliation outcome.

```bash
curl https://<YOUR_NETLIFY_URL>/.netlify/functions/reconcile/NGFT-1001-test0
```

**Deterministic:** fileId ending in 1 → RC_1, ending in 9 → RC_4, containing "EXC" → RC_2. Others → RECONCILED.  
**Override:** `?force=RECONCILED` or `?force=EXCEPTION`

## Smoke Tests (after deploy)

```bash
# 1. Upload → QUEUED
curl -X POST https://<YOUR_NETLIFY_URL>/.netlify/functions/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.xml","contentHash":"smoke001","isoType":"ISO20022"}'

# 2. Duplicate → 409
curl -X POST https://<YOUR_NETLIFY_URL>/.netlify/functions/upload \
  -H "Content-Type: application/json" \
  -d '{"filename":"test2.xml","contentHash":"smoke001","isoType":"ISO20022"}'

# 3. Batch status → PROCESSED
curl https://<YOUR_NETLIFY_URL>/.netlify/functions/batchStatus/NGFT-1001-test0

# 4. Reconcile → RECONCILED
curl https://<YOUR_NETLIFY_URL>/.netlify/functions/reconcile/NGFT-1001-test0

# 5. Reconcile → EXCEPTION
curl https://<YOUR_NETLIFY_URL>/.netlify/functions/reconcile/NGFT-1001-test1
```

## Contracts
- [Upload Contract](/contracts/ngft-upload-contract.json)
- [Batch State Transitions](/contracts/axon-batch-states.json)
- [Reconciliation Rules](/contracts/reconciliation-rules.md)
