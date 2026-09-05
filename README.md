# OptionLens Lite

A deliberately small, read-only feasibility smoke test for the official
Thetanuts Finance SDK on Base mainnet. This repository is not the full hackathon
product.

## Status

The technical smoke test passed locally and on a public Vercel temporary
deployment. The temporary URL was verified with live orders, market prices, and
the optional fill preview, but it expires and is not a lasting contest URL.
A permanent, user-owned Vercel deployment remains pending account claim or
GitHub import.

See [SMOKE_TEST.md](./SMOKE_TEST.md) for timestamped evidence, the routing
regression, limitations, and exact observed values.

## Run locally

Requirements: Node.js `22.12+` and npm.

```powershell
npm install
npm run dev
```

The browser calls `/thetanuts-api/`. Vite forwards that same-origin path to the
official Thetanuts API. In production, Vercel first removes the trailing slash
and then applies the external rewrite declared in `vercel.json`. No environment
variables are required.

## Verify

After signing in to Vercel and linking a user-owned project, produce Vercel's
local build output and run the routing regression together with the normal
project checks:

```powershell
npx.cmd vercel build --yes
node --test tests\vercel-routing.test.mjs
npm run build
npm run lint
npm run typecheck
npm audit
```

## Vercel import settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: none
- Root Directory: repository root (`.`)

The verified temporary deployment used Vercel's temporary-deployment flow. Its
URL is short-lived and is not connected to a user-owned project or automatic
GitHub deployments.

## Safety boundary

The app creates only an `ethers.JsonRpcProvider`. It has no wallet or signer and
does not call transaction, approval, allowance, RFQ, or WebSocket methods. It
contains no custom application backend, database, secret, or environment
variable.
