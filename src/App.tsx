import { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import {
  MemoryStorageProvider,
  ThetanutsClient,
  type MarketDataResponse,
  type OrderWithSignature,
} from '@thetanuts-finance/thetanuts-client'
import './App.css'

const CHAIN_ID = 8453 as const
const RPC_URL = 'https://mainnet.base.org'
const API_BASE_URL = '/thetanuts-api'
const PREVIEW_USDC_AMOUNT = 10_000000n

type PreviewResult = ReturnType<
  ThetanutsClient['optionBook']['previewFillOrder']
>

interface ErrorInfo {
  name: string
  message: string
}

function errorInfo(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || String(error),
    }
  }

  return { name: 'UnknownError', message: String(error) }
}

function displayValue(
  value: string | number | boolean | bigint | readonly (string | bigint)[],
): string {
  if (Array.isArray(value)) {
    return value.map((item) => item.toString()).join(', ')
  }

  return typeof value === 'bigint' ? value.toString() : String(value)
}

function formatExpiry(expiry: bigint): string {
  return `${expiry.toString()} (${new Date(Number(expiry) * 1000).toISOString()})`
}

function formatFetchTime(date: Date): string {
  return `${date.toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: false,
    timeZone: 'Asia/Kuala_Lumpur',
  })} MYT`
}

function App() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithSignature[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderWithSignature[]>([])
  const [selectedOrder, setSelectedOrder] =
    useState<OrderWithSignature | null>(null)
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<ErrorInfo | null>(null)

  const loadLiveData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const client = new ThetanutsClient({
        chainId: CHAIN_ID,
        provider,
        // Keep browser requests same-origin. Vite proxies this path locally and
        // Vercel rewrites it in production to the SDK's official Base API.
        apiBaseUrl: API_BASE_URL,
        // SDK 0.3.0 eagerly creates its RFQ key manager in browsers. This
        // ephemeral adapter avoids persistent storage; no RFQ method is called.
        keyStorageProvider: new MemoryStorageProvider(),
      })

      const [fetchedOrders, fetchedMarketData] = await Promise.all([
        client.api.fetchOrders(),
        client.api.getMarketData(),
      ])

      const now = BigInt(Math.floor(Date.now() / 1000))
      const currentOrders = fetchedOrders.filter(
        (order) => order.order.expiry > now,
      )
      const chosenOrder =
        currentOrders.find((order) => order.rawApiData !== undefined) ??
        currentOrders[0] ??
        null

      setOrders(fetchedOrders)
      setActiveOrders(currentOrders)
      setSelectedOrder(chosenOrder)
      setMarketData(fetchedMarketData)
      setFetchedAt(new Date())

      if (chosenOrder?.rawApiData) {
        try {
          setPreview(
            client.optionBook.previewFillOrder(
              chosenOrder,
              PREVIEW_USDC_AMOUNT,
            ),
          )
        } catch (previewFailure) {
          setPreviewError(errorInfo(previewFailure))
        }
      }
    } catch (loadFailure) {
      setOrders([])
      setActiveOrders([])
      setSelectedOrder(null)
      setMarketData(null)
      setFetchedAt(null)
      setError(errorInfo(loadFailure))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- This effect starts an external API synchronization.
    void loadLiveData()
  }, [loadLiveData])

  function retry() {
    setLoading(true)
    setError(null)
    setPreview(null)
    setPreviewError(null)
    void loadLiveData()
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Base mainnet · read only</p>
        <h1>Thetanuts SDK Smoke Test</h1>
        <p>
          Installed SDK version: <strong>{__THETANUTS_SDK_VERSION__}</strong>
        </p>
      </header>

      <section aria-live="polite" className="panel status-panel">
        <div>
          <h2>Live request status</h2>
          <p>{loading ? 'Loading real Thetanuts data…' : 'Request finished.'}</p>
        </div>
        <button type="button" onClick={retry} disabled={loading}>
          {loading ? 'Loading…' : 'Retry'}
        </button>
      </section>

      {error && (
        <section className="panel error-panel" role="alert">
          <h2>Live data error</h2>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{error.name}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{error.message}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="metrics" aria-label="Live data summary">
        <article className="panel metric">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </article>
        <article className="panel metric">
          <span>Active orders</span>
          <strong>{activeOrders.length}</strong>
        </article>
        <article className="panel metric">
          <span>Fetch timestamp</span>
          <strong>{fetchedAt ? formatFetchTime(fetchedAt) : 'Not available'}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Reference prices</h2>
        {marketData ? (
          <dl>
            {marketData.prices.ETH > 0 && (
              <div>
                <dt>ETH</dt>
                <dd>${marketData.prices.ETH.toLocaleString()}</dd>
              </div>
            )}
            {marketData.prices.BTC > 0 && (
              <div>
                <dt>BTC</dt>
                <dd>${marketData.prices.BTC.toLocaleString()}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p>No market data returned.</p>
        )}
      </section>

      <section className="panel">
        <h2>Selected active order</h2>
        {selectedOrder ? (
          <dl>
            <div>
              <dt>makerAddress</dt>
              <dd>{selectedOrder.makerAddress}</dd>
            </div>
            <div>
              <dt>availableAmount</dt>
              <dd>{displayValue(selectedOrder.availableAmount)}</dd>
            </div>
            <div>
              <dt>order.isBuyer</dt>
              <dd>{displayValue(selectedOrder.order.isBuyer)}</dd>
            </div>
            <div>
              <dt>order.numContracts</dt>
              <dd>{displayValue(selectedOrder.order.numContracts)}</dd>
            </div>
            <div>
              <dt>order.price</dt>
              <dd>{displayValue(selectedOrder.order.price)}</dd>
            </div>
            <div>
              <dt>order.expiry</dt>
              <dd>{formatExpiry(selectedOrder.order.expiry)}</dd>
            </div>
            {selectedOrder.order.strikes && (
              <div>
                <dt>order.strikes</dt>
                <dd>{displayValue(selectedOrder.order.strikes)}</dd>
              </div>
            )}
            {selectedOrder.rawApiData && (
              <>
                <div>
                  <dt>rawApiData.isCall</dt>
                  <dd>{displayValue(selectedOrder.rawApiData.isCall)}</dd>
                </div>
                <div>
                  <dt>rawApiData.collateral</dt>
                  <dd>{selectedOrder.rawApiData.collateral}</dd>
                </div>
                <div>
                  <dt>rawApiData.strikes</dt>
                  <dd>{displayValue(selectedOrder.rawApiData.strikes)}</dd>
                </div>
              </>
            )}
          </dl>
        ) : (
          <p>No active order is available.</p>
        )}
      </section>

      <section className="panel">
        <h2>Optional 10 USDC preview</h2>
        {preview && (
          <dl>
            <div>
              <dt>numContracts</dt>
              <dd>{displayValue(preview.numContracts)}</dd>
            </div>
            <div>
              <dt>maxContracts</dt>
              <dd>{displayValue(preview.maxContracts)}</dd>
            </div>
            <div>
              <dt>collateralToken</dt>
              <dd>{preview.collateralToken}</dd>
            </div>
            <div>
              <dt>pricePerContract</dt>
              <dd>{displayValue(preview.pricePerContract)}</dd>
            </div>
            <div>
              <dt>totalCollateral</dt>
              <dd>{displayValue(preview.totalCollateral)}</dd>
            </div>
            <div>
              <dt>expiry</dt>
              <dd>{formatExpiry(preview.expiry)}</dd>
            </div>
            <div>
              <dt>isCall</dt>
              <dd>{displayValue(preview.isCall)}</dd>
            </div>
            <div>
              <dt>strikes</dt>
              <dd>{displayValue(preview.strikes)}</dd>
            </div>
          </dl>
        )}
        {previewError && (
          <div className="preview-error" role="status">
            Preview failed without stopping live orders: {previewError.name}:{' '}
            {previewError.message}
          </div>
        )}
        {!preview && !previewError && (
          <p>
            {selectedOrder?.rawApiData
              ? 'Preview is pending.'
              : 'Not attempted because no active order with rawApiData is available.'}
          </p>
        )}
      </section>

      <footer>No wallet · No signer · No transaction</footer>
    </main>
  )
}

export default App
