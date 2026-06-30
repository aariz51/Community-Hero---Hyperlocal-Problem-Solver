import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const reportImage = process.env.E2E_REPORT_IMAGE || path.resolve(__dirname, '../fixtures/pothole.jpg')
const email = process.env.E2E_DEMO_EMAIL || 'judge@civicpulse.app'
const password = process.env.E2E_DEMO_PASSWORD || 'CivicPulse@2026'

test.describe('authenticated civic report flow', () => {
  test.skip(process.env.E2E_FULL_FLOW !== '1', 'Set E2E_FULL_FLOW=1 to run the live AI/Firebase report flow.')

  test('report issue -> AI classify -> map -> dashboard -> verify fix evidence', async ({ page, context, baseURL }) => {
    test.setTimeout(180000)
    await context.grantPermissions(['geolocation'], { origin: baseURL })
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.209 })

    await page.goto('/report')
    await page.locator('.auth-form input[type="email"]').fill(email)
    await page.locator('.auth-form input[type="password"]').fill(password)
    await Promise.all([
      page.waitForSelector('.uploader', { timeout: 20000 }),
      page.locator('.auth-form').getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.locator('input[type="file"]:not([capture])').setInputFiles(reportImage)
    await expect(page.locator('.uploader img')).toBeVisible()
    await page.getByRole('button', { name: /Run CivicPulse Agent/ }).click()
    await expect(page.getByRole('button', { name: 'Submit report' })).toBeVisible({ timeout: 90000 })
    await page.getByRole('button', { name: 'Submit report' }).click()
    await page.waitForURL(/\/issue\/[^/]+$/, { timeout: 60000 })

    const reportId = new URL(page.url()).pathname.split('/').pop()
    expect(reportId).toBeTruthy()
    console.log(`E2E_REPORT_ID=${reportId}`)

    await expect(page.getByRole('heading', { name: 'Agent audit trail' })).toBeVisible()
    await expect(page.getByText('report_triage')).toBeVisible({ timeout: 30000 })

    await page.goto('/map')
    await expect(page.getByRole('heading', { name: 'Live issue map' })).toBeVisible()
    await expect(page.getByLabel('Map report index').locator(`a[href="/issue/${reportId}"]`)).toHaveCount(1, { timeout: 30000 })

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Authority dashboard' })).toBeVisible()
    await expect(page.getByLabel('Dashboard report index').locator(`a[href="/issue/${reportId}"]`)).toHaveCount(1, { timeout: 30000 })

    await page.goto(`/issue/${reportId}`)
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 10000 })
    await page.getByRole('button', { name: /Upload fix photo/ }).click()
    const chooser = await chooserPromise
    await chooser.setFiles(reportImage)

    await expect(page.getByText(/AI verified the fix|AI could not confirm the fix/)).toBeVisible({ timeout: 90000 })
    await expect(page.getByRole('heading', { name: 'Fix evidence' })).toBeVisible({ timeout: 30000 })
  })
})
