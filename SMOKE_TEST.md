# OptionLens Lite — Thetanuts SDK smoke test

## Test record

- Final local verification (MYT): `2026-09-05 03:33:53–03:34:16 MYT`
- Node version: `v24.16.0`
- npm version: `11.13.0`
- Registry SDK version: `0.3.0`
- Installed SDK version: `0.3.0`
- Build result: `PASS` (`vite v8.2.2`, 222 modules transformed)
- `fetchOrders()` result: `PASS in browser through the same-origin rewrite`
- Total order count: `366`
- Active order count: `366`
- `getMarketData()` result: `PASS` (`ETH 2455.65`, `BTC 79697.42`)
- `previewFillOrder()` result: `PASS` in the browser with all eight typed
  result fields visible
- Known console errors in the final local run: `NONE`
- Deployment URL: `PENDING — to be filled after public deployment`
- Final decision: `PENDING — local checkpoint passed; public checkpoint not yet run`

Live data is time-sensitive. Counts and prices above are the exact values observed
during the recorded local run and may differ on a later retry.

## Checkpoint 1 — PASS

- Exact SDK `@thetanuts-finance/thetanuts-client@0.3.0` is installed.
- `npm run build` exited `0`.
- `npm run lint` exited `0` with no findings.
- `npm run typecheck` exited `0`.
- `npm audit` exited `0` and reported `found 0 vulnerabilities`.

Vite emitted two non-fatal browser-compatibility warnings because SDK `0.3.0`
contains imports of `fs/promises` and `crypto`. It externalized both modules. The
main bundle was `776.03 kB` and also produced Vite's non-fatal 500 kB chunk-size
warning.

## Checkpoint 2 — PASS locally

The final hidden-browser run loaded the Vite app through
`http://127.0.0.1:5176/` and visibly showed:

```text
Installed SDK version: 0.3.0
Total orders: 366
Active orders: 366
Fetch timestamp: 5 Sept 2026, 03:33:53 MYT
ETH: 2455.65
BTC: 79697.42
```

One active order with `rawApiData` was visible using only fields present in the
installed SDK types and runtime object. Bigint values were converted to display
strings. The Retry button completed a second successful request at `03:34:01
MYT`. No error or warning entry was present in the browser console after the
final run.

### CORS root cause and smallest fix

The initial direct browser request was reproducibly rejected by the official
API because its response did not include an `Access-Control-Allow-Origin`
header for the Vite origin. The exact captured error was:

```text
Access to XMLHttpRequest at
'https://round-snowflake-9c31.devops-118.workers.dev/' from origin
'http://127.0.0.1:5173' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

The selected fix reuses configuration already provided by the two hosting
tools: Vite's development proxy and a Vercel external rewrite. The app calls
the same-origin `/thetanuts-api` path. No custom server, database, environment
variable, secret, or paid service was added.

One first proxy run returned HTTP 502 because the local sandbox denied the Vite
process outbound network access with `AggregateError [EACCES]`. Rerunning the
same server with its required network permission produced the successful
browser result above; no code change was needed for that environment-only
failure.

## Checkpoint 3 — PASS locally

The browser called this read-only local calculation only for the selected order
with `rawApiData`:

```text
client.optionBook.previewFillOrder(order, 10_000000n)
```

It returned and visibly rendered all requested typed fields:

- `numContracts`
- `maxContracts`
- `collateralToken`
- `pricePerContract`
- `totalCollateral`
- `expiry`
- `isCall`
- `strikes`

The preview has its own error boundary, so an optional preview failure cannot
clear or crash the live-order page.

## Public-deployment checkpoint

`vercel.json` contains the production equivalent of the verified local rewrite.
The public deployment still needs to be created and checked in a real browser.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: none
- Root Directory: repository root (`.`)

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
