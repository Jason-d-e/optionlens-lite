# OptionLens Lite

A deliberately small, read-only feasibility smoke test for the official
Thetanuts Finance SDK on Base mainnet. This repository is not the full hackathon
product.

## Run locally

Requirements: Node.js `22.12+` and npm.

```powershell
npm install
npm run dev
```

The browser calls `/thetanuts-api`; Vite forwards that same-origin path to the
official Thetanuts API. The production equivalent is declared in
`vercel.json`. No environment variables are required.

## Verify

```powershell
npm run build
npm run lint
npm run typecheck
npm audit
```

See [SMOKE_TEST.md](./SMOKE_TEST.md) for the timestamped evidence, limitations,
and public-deployment checkpoint.

## Safety boundary

The app creates only an `ethers.JsonRpcProvider`. It has no wallet or signer and
does not call transaction, approval, allowance, RFQ, or WebSocket methods.
