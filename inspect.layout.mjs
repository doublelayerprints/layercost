import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
page.on('console', (message) => console.log('console', message.type(), message.text()))
page.on('pageerror', (error) => console.log('pageerror', error.message))
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
console.log('title', await page.title())
console.log('buttons', await page.getByRole('button').allTextContents())
await page.locator('input[aria-label="Ore"]').first().fill('10')
await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
await page.getByRole('button', { name: 'Aggiungi riga' }).click()
await page.screenshot({ path: '/tmp/layercost-cards.png', fullPage: true })
await browser.close()
