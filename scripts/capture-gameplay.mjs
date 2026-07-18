import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const media = path.join(root, 'media')
await mkdir(media, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

await page.screenshot({ path: path.join(media, '01-title-screen.png'), type: 'png' })

await page.click('#startBtn')
await page.waitForFunction(() => !!window.warpwing)
await page.evaluate(() => window.warpwing?.prepareCapture())
await page.waitForTimeout(700)
await page.screenshot({ path: path.join(media, '02-sortie-start.png'), type: 'png' })

for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Space')
  await page.keyboard.down(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft')
  await page.waitForTimeout(70)
  await page.keyboard.up('ArrowRight')
  await page.keyboard.up('ArrowLeft')
}
await page.waitForTimeout(250)
await page.screenshot({ path: path.join(media, '03-live-combat.png'), type: 'png' })

await page.keyboard.press('ShiftLeft')
await page.keyboard.down('ArrowUp')
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Space')
  await page.waitForTimeout(70)
}
await page.keyboard.up('ArrowUp')
await page.waitForTimeout(450)
await page.screenshot({ path: path.join(media, '04-barrel-roll-corridor.png'), type: 'png' })

await browser.close()
console.log('Saved live gameplay screenshots to media/')
