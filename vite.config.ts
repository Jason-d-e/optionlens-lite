import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'

const require = createRequire(import.meta.url)
const sdkEntry = require.resolve('@thetanuts-finance/thetanuts-client')
const sdkPackagePath = resolve(dirname(sdkEntry), '..', 'package.json')
const sdkPackage = JSON.parse(readFileSync(sdkPackagePath, 'utf8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __THETANUTS_SDK_VERSION__: JSON.stringify(sdkPackage.version),
  },
  plugins: [react()],
  server: {
    proxy: {
      '/thetanuts-api': {
        target: 'https://round-snowflake-9c31.devops-118.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/thetanuts-api/, ''),
      },
    },
  },
})
