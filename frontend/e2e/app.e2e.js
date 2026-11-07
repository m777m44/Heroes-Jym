// 13.0 — the app in a real browser (the demo build: example data, no server). What a person does:
// open the screens, search the food database, build an Indomie, pick a date-cake size, switch
// the notification colour, use the app in Arabic — and no errors in the console on the way.
// 14.0 — the Kitchen: its doors and sections, a real photo on a card, the meal builder (a burger
// without mayonnaise lands in the log by that name), a dish of my own, and the Kitchen in Arabic.
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
  for (const route of ['home', 'foods', 'food', 'kitchen', 'kitchen/s/street', 'kitchen/s/mine', 'kitchen/dish', 'tools', 'notifications', 'themes', 'plan', 'stats', 'settings']) await open(page, route)
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

test('the Kitchen: six doors, street food, a real photo and the meal builder', async ({ page }) => {
  const errors = watchErrors(page)
  await open(page, 'food')
  await page.locator('.fk-hero').click()                                         // the Kitchen's door on the food log
  await expect(page.getByRole('heading', { name: 'Kitchen' })).toBeVisible()
  const doors = page.locator('.kf')
  await expect(doors).toHaveCount(9)                                              // 15.0: + Iraq city by city, fish; 16.0: + Abu Janna
  await expect(doors.first()).toContainText('Street food')
  await doors.first().click()
  await expect(page.getByRole('heading', { name: 'Street food' })).toBeVisible()
  // every card shows its real photo once it is on screen
  await expect.poll(() => page.locator('.kc .ph.in img').count()).toBeGreaterThan(0)
  await page.getByRole('searchbox').fill('beef burger')
  await page.locator('.kc', { hasText: 'Beef burger' }).first().locator('.kc-t').click()   // 15.0: the name opens it, the photo opens the viewer
  const mb = page.locator('.mb')
  await expect(mb.getByRole('heading', { name: 'Beef burger' })).toBeVisible()
  await expect(mb.locator('.mb-row')).toHaveCount(9)                               // bun, patty, lettuce, tomato, onion, pickles, ketchup, mayo, salt
  const kcal = mb.locator('.mb-tot-k b')
  const before = await kcalOf(kcal)
  await mb.getByRole('button', { name: 'Take out Mayonnaise' }).click()
  await expect.poll(() => kcalOf(kcal)).toBeLessThan(before - 60)                  // 10 g of mayonnaise is about 68 kcal
  await expect(mb.locator('.mb-out')).toContainText('Mayonnaise')
  await mb.getByRole('group', { name: 'Beef burger patty' }).getByRole('button', { name: 'More' }).click()   // a second patty
  await expect.poll(() => kcalOf(kcal)).toBeGreaterThan(before + 150)
  await mb.getByRole('button', { name: /^Add to / }).click()
  await open(page, 'food')
  await expect(page.getByText('Beef burger (extra Beef burger patty · without Mayonnaise)').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the Kitchen: making Indomie, the drinks tab and a dish of my own', async ({ page }) => {
  const errors = watchErrors(page)
  await open(page, 'kitchen')
  await page.locator('.kf', { hasText: 'Make your Indomie' }).click()
  await page.getByRole('button', { name: /Build your Indomie/ }).click()
  const b = page.locator('.fdb-indo-b')
  await expect(b.locator('.fdb-pinfo')).toContainText('About this pack')
  await expect(b.locator('.fdb-pinfo')).toContainText('The whole pack')
  await page.locator('.sheet-x').last().click()
  await expect(b).toHaveCount(0)
  await open(page, 'kitchen')
  // 16.0: the Kitchen also has an "Abu Janna drinks" door
  await page.locator('.kf', { hasText: 'Drinks' }).filter({ hasNotText: 'Abu Janna' }).click()
  await expect(page.locator('.ks', { hasText: 'Hot drinks' })).toBeVisible()
  await open(page, 'kitchen/dish')
  await page.getByRole('textbox').first().fill('My test dish')
  expect(errors).toEqual([])
})

test('15.0: a photo opens big with every detail; the food lists close only with their ✕', async ({ page }) => {
  const errors = watchErrors(page)
  await open(page, 'kitchen/s/fish')
  await expect(page.getByRole('heading', { name: 'Fish & seafood' })).toBeVisible()
  await expect(page.locator('.kx-fish')).toContainText('Fish this week')
  await page.getByRole('searchbox').fill('zubaidi')
  await page.locator('.kc', { hasText: 'Grilled zubaidi' }).first().locator('.kc-ph').click()
  const spot = page.locator('.spot')
  await expect(spot.getByRole('heading', { name: 'Grilled zubaidi (pomfret)' })).toBeVisible()
  await expect(spot.locator('.spot-nut')).toContainText('Protein')
  await expect(spot.locator('.spot-rg')).toContainText('Basra')
  await expect(spot.locator('.spot-facts')).toContainText('Fish is good for the heart')
  await page.locator('.fullv .spot-whole').click()                                  // the whole photo, on black
  await expect(spot).toHaveClass(/whole/)
  await page.locator('.fullv .spot-whole').click()
  await page.locator('.fullv > .sheet-x').click()                                  // only the ✕ closes it
  await expect(page.locator('.fullv')).toHaveCount(0)
  // a food list: a tap outside doesn't close it, its ✕ does
  await open(page, 'food')
  await page.locator('.food-add-b').first().click()
  const sheet = page.locator('.sheet.pinned')
  await expect(sheet).toHaveCount(1)
  await page.mouse.click(200, 30)                                                  // the dimmed page above the sheet
  await page.waitForTimeout(400)
  await expect(sheet).toHaveCount(1)
  await sheet.locator('.sheet-x').click()
  await expect(page.locator('.sheet')).toHaveCount(0)
  // Iraq city by city
  await open(page, 'kitchen/s/cities')
  await expect(page.locator('.kcity-c')).toHaveCount(9)
  await page.locator('.kcity-c', { hasText: 'Tal Afar' }).click()
  await expect(page.getByRole('heading', { name: 'Tal Afar' })).toBeVisible()
  await expect(page.locator('.kc', { hasText: 'Zingil' }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('16.0: Abu Janna’s drinks, Made in Iraq, and caffeine in your body before and after a can', async ({ page }) => {
  const errors = watchErrors(page)
  // the Kitchen's door opens his page: 4U, Three Stars, his soft drink in six flavours and his restaurant's fish
  await open(page, 'kitchen')
  await page.locator('.kf', { hasText: 'Abu Janna drinks' }).click()
  await expect(page.locator('.sd-bhead h2')).toHaveText('Abu Janna')
  await expect(page.locator('.sd-grid .sd-card')).toHaveCount(8)
  await expect(page.locator('.sd-bfood').first()).toBeVisible()
  // Three Stars: what one can would do to today's caffeine and to bedtime, then log it
  await page.locator('.sd-card', { hasText: 'Three Stars' }).click()
  const view = page.locator('.sd-view')
  await expect(view.locator('.sd-after')).toContainText('mg of caffeine today')
  await expect(view.locator('.sd-brandtag')).toContainText('Abu Janna')
  await view.getByRole('button', { name: /^Add / }).click()
  // the card on the page now has caffeine in it, and its sheet the whole day
  const card = page.locator('.cf-card')
  await expect(card).toBeVisible()
  await expect(card.locator('.cf-today')).toContainText('mg')
  await card.click()
  const sheet = page.locator('.cf-sheet')
  await expect(sheet.locator('.cf-curve')).toBeVisible()
  // today's doses: the demo's breakfast tea and the can just logged
  await expect(sheet.locator('.cf-dose-r', { hasText: 'Three Stars' })).toHaveCount(1)
  await expect(sheet.locator('.cf-week .cf-wd')).toHaveCount(7)
  await expect(sheet.locator('.cf-streak')).toContainText('An energy drink today')
  await page.locator('.sheet-x').last().click()
  // the makers' row, the Made in Iraq filter, and a search written the way people write it
  await open(page, 'sodas')
  await expect(page.locator('.sd-brand').first()).toContainText('Abu Janna')
  // (every Iraqi drink's card carries a "Made in Iraq" badge too — so the filter chip by its row)
  const iraq = page.locator('.dk-filters .chip', { hasText: 'Made in Iraq' })
  await iraq.click()
  await expect(iraq).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => page.locator('.sd-grid .sd-card').count()).toBeGreaterThan(15)
  await iraq.click()
  await expect(iraq).toHaveAttribute('aria-pressed', 'false')
  await page.getByPlaceholder('Search soft drinks').fill('ابو جنه')
  await expect(page.locator('.sd-grid .sd-card')).toHaveCount(8)
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
  test('the Kitchen in Arabic: its doors, street food and the meal builder', async ({ page }) => {
    const errors = watchErrors(page)
    await open(page, 'kitchen')
    await expect(page.getByRole('heading', { name: 'المطبخ' })).toBeVisible()
    await expect(page.locator('.kf').first()).toContainText('أكلات الشوارع')
    await page.locator('.kf').first().click()
    await page.getByRole('searchbox').fill('شاورما')
    await page.locator('.kc', { hasText: 'شاورما' }).first().locator('.kc-t').click()
    await expect(page.locator('.mb')).toContainText('مكوّناتك')
    await expect(page.locator('.mb')).toContainText('ثومية')
    expect(errors).toEqual([])
  })
})
