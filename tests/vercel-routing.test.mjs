import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const SDK_API_BASE_URL = '/thetanuts-api'
const OFFICIAL_UPSTREAM_ROOT =
  'https://round-snowflake-9c31.devops-118.workers.dev/'

function sdkRootRequestPath(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/`
}

function interpolateRouteValue(value, match) {
  return value.replace(/\$(\d+)/g, (_placeholder, index) => {
    return match[Number(index)] ?? ''
  })
}

function routeOnce(routes, pathname) {
  for (const route of routes) {
    if ('handle' in route || typeof route.src !== 'string') {
      continue
    }

    const match = new RegExp(route.src).exec(pathname)
    if (!match) {
      continue
    }

    const location = route.headers?.Location
    if (
      typeof route.status === 'number' &&
      route.status >= 300 &&
      route.status < 400 &&
      typeof location === 'string'
    ) {
      return {
        kind: 'redirect',
        location: interpolateRouteValue(location, match),
        status: route.status,
      }
    }

    if (typeof route.status === 'number') {
      return {
        kind: 'response',
        status: route.status,
        destination:
          typeof route.dest === 'string'
            ? interpolateRouteValue(route.dest, match)
            : undefined,
      }
    }

    if (typeof route.dest === 'string') {
      const destination = interpolateRouteValue(route.dest, match)
      return destination.startsWith('https://')
        ? { kind: 'external', url: destination }
        : { kind: 'internal', pathname: destination }
    }

    if (!route.continue) {
      return { kind: 'matched' }
    }
  }

  return { kind: 'response', status: 404 }
}

function resolveFollowingRedirects(routes, initialPathname) {
  let pathname = initialPathname

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    const result = routeOnce(routes, pathname)
    if (result.kind !== 'redirect') {
      return result
    }

    pathname = new URL(result.location, 'https://optionlens.test').pathname
  }

  throw new Error('Compiled Vercel routes exceeded the redirect limit')
}

test('SDK root request reaches the official upstream root', () => {
  const outputConfig = JSON.parse(
    readFileSync(new URL('../.vercel/output/config.json', import.meta.url), 'utf8'),
  )
  assert.equal(outputConfig.version, 3)
  assert.ok(Array.isArray(outputConfig.routes))

  const sdkRequestPath = sdkRootRequestPath(SDK_API_BASE_URL)
  assert.equal(sdkRequestPath, '/thetanuts-api/')

  const result = resolveFollowingRedirects(outputConfig.routes, sdkRequestPath)
  assert.deepEqual(result, {
    kind: 'external',
    url: OFFICIAL_UPSTREAM_ROOT,
  })
})
