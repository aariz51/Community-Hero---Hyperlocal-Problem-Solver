import { expect, test } from '@playwright/test'

test('public landing, map, dashboard, and email/password auth entry render', async ({ page, baseURL }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Report. Verify. Resolve. Together.' })).toBeVisible()

  await page.goto('/report')
  await expect(page.getByRole('heading', { name: 'Report a civic issue' })).toBeVisible()
  await expect(page.getByLabel('Authentication mode').getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Authentication mode').getByRole('button', { name: 'Create ID' })).toBeVisible()
  await expect(page.getByPlaceholder('judge@civicpulse.app')).toBeVisible()

  await page.goto('/map')
  await expect(page.getByRole('heading', { name: 'Live issue map' })).toBeVisible()
  await expect(page.locator('.legend').getByText('Pothole')).toBeVisible()

  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Authority dashboard' })).toBeVisible()
  await expect(page.getByText('Triage queue')).toBeVisible()

  expect(baseURL).toBeTruthy()
})
