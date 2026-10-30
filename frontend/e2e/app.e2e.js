// 13.0 — the app in a real browser (the demo build: example data, no server). What a person does:
// open the screens, search the food database, build an Indomie, pick a date-cake size, switch
// the notification colour, use the app in Arabic — and no errors in the console on the way.
import { test, expect } from '@playwright/test'

// the demo loads exercise pictures from a CDN — a missing picture offline is not an app error
const NOISE = [/Failed to load resource/i, /net::ERR_/i, /favicon/i]
function watchErrors(page) {
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !NOISE.some(r => r.test(m.text()))) errors.push(m.text()) })
  return errors
}
const open = async (page, route) => {
  await page.goto('./#/' + route)
  await expect(page.locator('h1').first()).toBeVisible()
}
const kcalOf = async loc => Number((await loc.innerText()).replace(/[^\d]/g, ''))

test('the main screens open without errors in the console', async ({ page }) => {
  const errors = watchErrors(page)
  for (const route of ['home', 'foods', 'food', 'tools', 'notifications', 'themes', 'plan', 'stats', 'settings']) await open(page, route)
  expect(errors).toEqual([])
})

test('food database: search, a shelf and a food card with salt and sugar', async ({ page }) => {
  await open(page, 'foods')
  await expect(page.getByRole('heading', { name: 'Food database' })).toBeVisible()
  // 500+ foods draw 40 at a time, the next ones as the end of the list comes near
  const rows = page.locator('.fdb-row')
  await expect(rows).toHaveCount(40)
  await rows.last().scrollIntoViewIfNeeded()
  await expect.poll(() => rows.count()).toBeGreaterThan(40)
  // a shelf
  await page.getByRole('tab', { name: /^Cakes/ }).click()
  await expect(page.locator('.fdb-row').first()).toContainText('Date')
  // the search finds it by name
  await page.getByRole('searchbox', { name: 'Search foods' }).fill('snickers')
  const row = page.locator('.fdb-row').first()
  await expect(row).toContainText('Snickers')
  await row.click()
  const sheet = page.locator('.fdb-card')
  await expect(sheet).toContainText('Per 100 g')
  await expect(sheet).toContainText('Sodium')
  await expect(sheet).toContainText('Sugars')
})

test('date cake: the large size is three pieces', async ({ page }) => {
  await open(page, 'foods')
  await page.getByRole('searchbox', { name: 'Search foods' }).fill('date cake with lotus')
  await page.locator('.fdb-row').first().click()
  const card = page.locator('.fdb-card')
  const kcal = card.locator('.fdb-nut-k b')
  const small = await kcalOf(kcal)
  await card.getByRole('radio', { name: /Large/ }).click()
  await expect.poll(() => kcalOf(kcal)).toBe(small * 3)
})

test('Indomie builder: what goes in changes the calories, and it lands in the log', async ({ page }) => {
  await open(page, 'foods')
  await page.getByRole('button', { name: /Build your Indomie/ }).click()
  const b = page.locator('.fdb-indo-b')
  const kcal = b.locator('.fdb-total .fdb-nut-k b')
  const base = await kcalOf(kcal)
  // an egg adds about 70 kcal
  await b.getByRole('group', { name: 'Egg', exact: true }).getByRole('button', { name: 'More' }).click()
  await expect.poll(async () => (await kcalOf(kcal)) - base).toBeGreaterThan(60)
  const withEgg = await kcalOf(kcal)
  // fried is more than boiled
  await b.getByRole('button', { name: 'Fried in oil' }).click()
  await expect.poll(() => kcalOf(kcal)).toBeGreaterThan(withEgg)
  await expect(b.locator('.fdb-total-n')).toContainText('(fried)')
  await b.getByRole('button', { name: /^Add to / }).click()
  await open(page, 'food')
  await expect(page.locator('.food-list, .list').filter({ hasText: 'Indomie (fried)' }).first()).toBeVisible()
})

test('notification colour: follows the theme, classic green when off', async ({ page }) => {
  await open(page, 'notifications')
  const card = page.locator('.nf-color')
  const color = () => card.evaluate(el => getComputedStyle(el).getPropertyValue('--nc').trim().toLowerCase())
  const themed = await color()
  expect(themed).toMatch(/^#[0-9a-f]{6}$/)
  await card.getByRole('switch').click()
  await expect.poll(color).toBe('#30d158')
  await card.getByRole('switch').click()
  await expect.poll(color).toBe(themed)
})

test('shops & markets: the aisles, halqoum and canned mahshi', async ({ page }) => {
  const errors = watchErrors(page)
  await open(page, 'foods')
  await page.getByRole('button', { name: /Shops & markets/ }).click()
  const aisles = page.getByRole('tablist', { name: 'Aisles' })
  await expect(aisles.getByRole('tab')).toHaveCount(15)                       // all + 14 aisles
  await aisles.getByRole('tab', { name: /Halqoum & sweets/ }).click()
  await expect(page.locator('.fdb-row', { hasText: 'Halqoum with pistachio' })).toBeVisible()
  await aisles.getByRole('tab', { name: /Gum & candies/ }).click()
  await expect(page.locator('.fdb-row', { hasText: 'Mastic gum' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search foods' }).fill('mahshi')
  await expect(page.locator('.fdb-row', { hasText: 'Stuffed eggplant (canned mahshi)' })).toBeVisible()
  await page.locator('.fdb-row', { hasText: 'Stuffed eggplant (canned mahshi)' }).click()
  await expect(page.locator('.fdb-card')).toContainText('Sodium')
  expect(errors).toEqual([])
})

test('my schedule: the school & work week, a reminder at every step, the week at a glance', async ({ page }) => {
  const errors = watchErrors(page)
  await open(page, 'schedule')
  await page.getByRole('button', { name: /School & work week/ }).click()
  await page.getByRole('button', { name: 'Week at a glance' }).first().click()
  const sheet = page.locator('.wg')
  await expect(sheet.getByRole('button', { name: 'Sunday – Thursday' })).toHaveAttribute('aria-pressed', 'true')
  const rows = sheet.locator('.wg-row')
  await expect(rows).toHaveCount(18)
  await expect(rows.first()).toContainText('Drink water')
  await expect(rows.nth(3)).toContainText('Go to school')
  await expect(rows.last()).toContainText('Lock up & sleep')                     // the midnight bedtime closes the day
  await expect(sheet.locator('.wg-chip', { hasText: '18 reminders' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Friday & Saturday' }).click()
  await expect(rows).toHaveCount(19)
  await expect(sheet).toContainText('Study — session 1')
  await expect(sheet).not.toContainText('Go to work')
  expect(errors).toEqual([])
})

test.describe('in Arabic', () => {
  test.use({ locale: 'ar-IQ' })
  test('right to left, and the food database speaks Arabic', async ({ page }) => {
    const errors = watchErrors(page)
    await open(page, 'foods')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { name: 'قاعدة بيانات الأطعمة' })).toBeVisible()
    await page.getByRole('searchbox').fill('اندومي')
    await expect(page.locator('.fdb-row').first()).toContainText('إندومي')
    // the words people type: علچ finds the gum (علج), جبس the chips (شيبس)
    await page.getByRole('searchbox').fill('علچ')
    await expect(page.locator('.fdb-row', { hasText: 'علج عربي' })).toBeVisible()
    await page.getByRole('searchbox').fill('جبس')
    await expect(page.locator('.fdb-row', { hasText: 'رفلز' })).toBeVisible()
    expect(errors).toEqual([])
  })
})
