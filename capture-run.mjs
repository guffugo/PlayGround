import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Exit 75: temporary navigation/browser infrastructure failure (retryable).
// Exit 1: script usage error or rendering defect (needs a code fix).
const fail = (code, message) => {
  console.error(message instanceof Error ? message.message : message)
  process.exit(code)
}

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
if (!url) fail(1, 'CAPTURE_URL is not set.')
if (!output) fail(1, 'CAPTURE_DIR is not set.')
try {
  new URL(url)
} catch {
  fail(1, `CAPTURE_URL is not a valid URL: ${url}`)
}

const runtime = join(homedir(), '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'scope-dummy.js'))
const { chromium } = require('playwright')
const config = JSON.parse(
  readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8')
)
if (process.platform === 'linux') {
  try {
    process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
  } catch (error) {
    fail(75, `Could not read X display file: ${error.message}`)
  }
}

const transient = (error) => {
  const wrapped = error instanceof Error ? error : new Error(String(error))
  wrapped.exitCode = 75
  throw wrapped
}
const isRetryableStatus = (status) =>
  !status || status === 408 || status === 429 || (status >= 500 && status <= 504)

mkdirSync(output, { recursive: true })

let browser
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient)
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(transient)
    try {
      page.setDefaultTimeout(30000)
      page.on('pageerror', (error) => console.error(`pageerror (${name}): ${error.message}`))
      // Open the exact URL under test; never navigate anywhere else.
      const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(transient)
      if (!response?.ok()) {
        const status = response?.status()
        fail(
          isRetryableStatus(status) ? 75 : 1,
          `HTTP ${status ?? 'no-response'} loading preview (${name})`
        )
      }
      // Wait for rendered content: a visible body and settled fonts.
      await page.locator('body').waitFor({ state: 'visible', timeout: 30000 }).catch((error) => {
        throw Object.assign(error, { exitCode: 1 })
      })
      await page
        .waitForFunction(() => document.fonts.status === 'loaded', { timeout: 15000 })
        .catch(() => {})
      await page.waitForTimeout(1000)
      await page.screenshot({ path: join(output, `final-${name}.png`), timeout: 30000 }).catch((error) => {
        if (error.name === 'TimeoutError' || !browser.isConnected()) transient(error)
        throw error
      })
      console.log(`Captured final-${name}.png`)
    } finally {
      await page.close().catch(() => {})
    }
  }
} catch (error) {
  console.error(error?.message || error)
  process.exit(error?.exitCode || 1)
} finally {
  await browser?.close().catch((error) => {
    console.error(error?.message || error)
    process.exitCode ||= 75
  })
}
