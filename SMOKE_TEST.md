# OptionLens Lite — Thetanuts SDK smoke test

## Final test record

- Initial local verification (MYT): `2026-09-05 03:33:53–03:34:16 MYT`
- Public browser verification (MYT): `2026-09-05 17:25:44–17:25:57 MYT`
- Latest local recheck (MYT): `2026-09-05 17:27:40–17:27:48 MYT`
- Node version: `v24.16.0`
- npm version: `11.13.0`
- Registry SDK version: `0.3.0`
- Installed SDK version: `0.3.0`
- Build result: `PASS` (`vite v8.2.2`, 222 modules transformed)
- `fetchOrders()` result: `PASS locally and in the public browser`
- Public total order count: `308`
- Public active order count: `308`
- `getMarketData()` result: `PASS` (`ETH 2457.935`, `BTC 79699.783`)
- `previewFillOrder()` result: `PASS` with all eight requested fields visible
- Known console errors in the final public and local runs: `NONE`
- Verified temporary deployment:
  `https://temporary-brisk-nickel-ctykpyw.vercel.app/`
- Temporary deployment ID: `dpl_3mtgxQctn3iJbK8rzQnCXk5sBiLP`
- Temporary deployment expiry: `2026-09-05 18:16:04 MYT`
  (`2026-09-05T10:16:04.222Z`)
- GitHub repository: [Jason-d-e/optionlens-lite](https://github.com/Jason-d-e/optionlens-lite)
- Initial tested source base commit:
  [`4b3189279988b77c6a149d95116c6ef89d13b629`](https://github.com/Jason-d-e/optionlens-lite/commit/4b3189279988b77c6a149d95116c6ef89d13b629)
- Final decision: `PASS — technical feasibility and the public-deployment smoke
  checkpoint passed; a lasting user-owned contest URL is still pending`

Live orders and prices are time-sensitive. Values in this document are the
exact observations at the recorded timestamps and may change on Retry.

## Checkpoint 1 — PASS

- Exact SDK `@thetanuts-finance/thetanuts-client@0.3.0` is installed.
- `npm run build` exited `0`.
- `npm run lint` exited `0` with no findings.
- `npm run typecheck` exited `0`.
- `npm audit` exited `0` and reported `found 0 vulnerabilities`.
- Fresh explicit runs of build, lint, and typecheck all exited `0` at about
  `17:29 MYT`, after the routing fix and public verification.
- `node --test tests\vercel-routing.test.mjs` exited `0` after rebuilding the
  Vercel output: `1` test passed, `0` failed.
- The successful temporary deployment performed a fresh implicit production
  build and reached Vercel state `READY`.

Vite emitted two non-fatal browser-compatibility warnings because SDK `0.3.0`
contains imports of `fs/promises` and `crypto`. It externalized both modules.
The main bundle was `776.03 kB` and also produced Vite's non-fatal 500 kB
chunk-size warning.

## Checkpoint 2 — PASS locally and publicly

### Browser evidence

The initial hidden local browser run at `03:33:53 MYT` showed SDK `0.3.0`, `366`
total orders, `366` active orders, ETH `2455.65`, and BTC `79697.42`. Its Retry
completed successfully at `03:34:01 MYT`.

The public browser run at `17:25:44 MYT` showed:

```text
Installed SDK version: 0.3.0
Total orders: 308
Active orders: 308
ETH: 2457.935
BTC: 79699.783
```

The selected active order had `rawApiData` and expiry `1788681600`
(`2026-09-06T08:00:00.000Z`). Public Retry completed at `17:25:57 MYT` and
again showed `308` total and `308` active orders, with ETH `2457.86` and BTC
`79701.92`.

A fresh local recheck at `17:27:40 MYT`, followed by Retry at `17:27:48 MYT`,
also showed `308` total and `308` active orders, ETH `2458.027`, BTC
`79701.918`, all eight preview fields, and zero browser warnings or errors.

Chrome DevTools Protocol recorded both public SDK API requests taking this
exact route:

```text
/thetanuts-api/  -> HTTP 308
/thetanuts-api   -> HTTP 200 application/json
```

The final public console contained no warning or error entries.

## Checkpoint 3 — PASS locally and publicly

The application calls this read-only local calculation only when the selected
active order contains `rawApiData`:

```text
client.optionBook.previewFillOrder(order, 10_000000n)
```

The first public run visibly rendered all eight requested result fields:

```text
numContracts: 4000000
maxContracts: 4000000
collateralToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC)
pricePerContract: 147360153
totalCollateral: 10000000
expiry: 1788681600
isCall: true
strikes: 250000000000
```

On public Retry, the live order price changed and `pricePerContract` became
`146269115`; the preview remained successful. All bigint values were converted
to display strings. The preview has its own error boundary, so an optional
preview failure cannot clear or crash the live-order page.

## Routing regression and root-cause fix

### Initial direct-browser CORS failure

The initial direct browser request was reproducibly rejected by the official
API because its response did not include an `Access-Control-Allow-Origin`
header for the Vite origin. The exact captured error was:

```text
Access to XMLHttpRequest at
'https://round-snowflake-9c31.devops-118.workers.dev/' from origin
'http://127.0.0.1:5173' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

The selected solution reuses Vite's development proxy and Vercel's external
rewrite, following Vercel's primary [rewrites documentation](https://vercel.com/docs/routing/rewrites)
and [`vercel.json` configuration reference](https://vercel.com/docs/project-configuration/vercel-json).
The application calls a same-origin path, so no custom server, secret, database,
environment variable, or paid proxy service was added.

### Initial public trailing-slash 404

SDK `0.3.0` calls both `fetchOrders()` and `getMarketData()` with endpoint `/`.
Axios therefore requested `/thetanuts-api/`. The first compiled Vercel wildcard
route excluded an empty trailing path, producing these exact controls:

```text
/thetanuts-api/  -> HTTP 404 text NOT_FOUND
/thetanuts-api   -> HTTP 200 JSON with keys data, metadata
official upstream / -> HTTP 200
```

Before changing the configuration, `tests/vercel-routing.test.mjs` was added.
It reads the actual `.vercel/output/config.json`, derives the SDK request path,
models redirects followed by rewrites, and asserts that routing reaches the
official upstream root. The RED run proved the old compiled behavior:

```text
node --test tests\vercel-routing.test.mjs
actual:   { kind: 'response', status: 404, destination: '/404.html' }
expected: { kind: 'external', url: 'https://round-snowflake-9c31.devops-118.workers.dev/' }
tests 1, pass 0, fail 1
```

The only routing fix was adding `"trailingSlash": false` to `vercel.json`.
After rebuilding Vercel output, the same test was GREEN:

```text
tests 1, pass 1, fail 0
```

The public CDP trace independently confirmed the resulting 308-to-200 behavior.
This one routing-configuration fix and its regression evidence are recorded in
the commit following the initial tested source base commit above; no
self-referential final commit hash is required here.

### Environment-only local proxy error

One local proxy run returned HTTP 502 because the sandbox denied the Vite
process outbound network access with `AggregateError [EACCES]`. Rerunning the
same server with its required network permission produced the successful local
browser result; no code change was needed for that environment-only failure.

## Public-deployment record and limitation

The successful temporary deployment was created with:

```powershell
npx.cmd --yes vercel@latest deploy --temporary --yes --json --no-color
```

It was `READY` and publicly accessible during verification. It is nevertheless
temporary, expires at the timestamp recorded above, is not user-owned, and is
not connected to automatic GitHub deployments. A lasting contest URL therefore
remains pending account claim or GitHub import.

Use these exact Vercel import settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: none
- Root Directory: repository root (`.`)

An ordinary authenticated local build attempt with
`npx vercel build --prod --yes` failed with this exact CLI error:

```text
Error: The specified token is not valid. Use vercel login to generate a new token.
```

The temporary-deployment flow created a local `.vercel/anonymous.json` file.
The entire `.vercel/` directory is ignored: its credentials are not tracked in
Git or included in uploaded deployment artifacts, and no credential or private
claim URL is copied into tracked documentation. This authentication error did
not block the temporary deployment, whose implicit build and public browser
verification both succeeded.

## Preflight command output

```text
> node -v
v24.16.0

> npm -v
11.13.0

> npm view @thetanuts-finance/thetanuts-client version
0.3.0

> npm view @thetanuts-finance/thetanuts-client versions --json
[
  "0.1.0",
  "0.1.1",
  "0.1.2",
  "0.1.3",
  "0.1.4",
  "0.1.5-beta.0",
  "0.1.5",
  "0.1.6",
  "0.1.7-beta.0",
  "0.2.1",
  "0.2.3",
  "0.2.4",
  "0.2.5",
  "0.3.0"
]
```

The first registry attempt was blocked by the local sandbox with an `EACCES`
fetch/cache error. The same required commands were rerun with network
permission and returned the successful registry output recorded above.

## Reuse decision (`dont-reinvent`)

- Reused the official Thetanuts SDK and official Vite React TypeScript scaffold.
- Reused Vite's proxy and Vercel's external rewrite instead of writing a custom
  backend or proxy service.
- Surveyed roughly 69 related GitHub repositories and closely checked about 15.
- No repository proved Vite 8, SDK `0.3.0`, direct cross-origin browser data,
  and a successful public deployment without a proxy or server route.
- Community projects that document success use the same server-side proxy
  boundary. Unlicensed project code was not copied.
- Free/open-source integration was selected; no paid service or custom SDK was
  needed.
- `npm audit` found no known vulnerabilities. A Socket scan was not available
  in this environment.

## Scope guardrails

- Base mainnet (`8453`) via `https://mainnet.base.org`
- Read-only provider; no signer or wallet
- No transaction, allowance, RFQ call, WebSocket, custom application backend,
  database, secret, or environment variable
- SDK `0.3.0` eagerly creates its RFQ key manager in browsers, so the client is
  given an ephemeral `MemoryStorageProvider`; no RFQ method is called and no key
  is generated, persisted, or transmitted
- Full order signatures and raw API payloads are not stored
