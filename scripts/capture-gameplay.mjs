/**
 * Capture live 5s gameplay loops for the WarpWing GitHub README.
 */
import { chromium } from 'playwright'
import { mkdir, readdir, unlink, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { renameSync, copyFileSync, statSync } from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const media = path.join(root, 'media')
const tmp = path.join(media, '_raw')

const SCENES = [
  { id: '01-title-screen', label: 'Title screen', action: 'title' },
  { id: '02-sortie-start', label: 'Sortie start', action: 'sortie' },
  { id: '03-live-combat', label: 'Live combat', action: 'combat' },
  { id: '04-barrel-roll-corridor', label: 'Barrel roll corridor', action: 'barrel' },
]

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

async function toGifAndMp4(webmPath, outBase, seekSec = 0) {
  const mp4 = `${outBase}.mp4`
  const gif = `${outBase}.gif`
  const args = ['-y']
  if (seekSec > 0) args.push('-ss', String(seekSec))
  args.push(
    '-i', webmPath,
    '-t', '5',
    '-vf', 'fps=20,scale=960:-2:flags=lanczos',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
    '-movflags', '+faststart',
    mp4,
  )
  await run('ffmpeg', args)
  const palette = path.join(tmp, 'palette.png')
  await run('ffmpeg', [
    '-y', '-i', mp4,
    '-vf', 'fps=16,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff',
    palette,
  ])
  await run('ffmpeg', [
    '-y', '-i', mp4, '-i', palette,
    '-lavfi', 'fps=16,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5',
    '-loop', '0',
    gif,
  ])
}

async function mashKeys(page, action, ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (action === 'title') {
      await page.waitForTimeout(500)
    } else if (action === 'barrel') {
      await page.keyboard.press('ShiftLeft')
      await page.keyboard.down('ArrowUp')
      await page.keyboard.down('Space')
      await page.waitForTimeout(280)
      await page.keyboard.up('ArrowUp')
      await page.keyboard.down(Math.random() > 0.5 ? 'ArrowLeft' : 'ArrowRight')
      await page.waitForTimeout(220)
      await page.keyboard.up('ArrowLeft')
      await page.keyboard.up('ArrowRight')
      await page.keyboard.up('Space')
    } else {
      // sortie / combat
      await page.keyboard.down('Space')
      await page.keyboard.down(Math.random() > 0.5 ? 'ArrowRight' : 'ArrowLeft')
      await page.waitForTimeout(180)
      await page.keyboard.up('ArrowRight')
      await page.keyboard.up('ArrowLeft')
      if (Math.random() > 0.6) {
        await page.keyboard.down('ArrowUp')
        await page.waitForTimeout(150)
        await page.keyboard.up('ArrowUp')
      }
      if (Math.random() > 0.7) await page.keyboard.press('KeyE')
      await page.waitForTimeout(120)
    }
  }
  for (const k of ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'KeyE', 'KeyQ']) {
    await page.keyboard.up(k)
  }
}

async function main() {
  await mkdir(media, { recursive: true })
  await rm(tmp, { recursive: true, force: true })
  await mkdir(tmp, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
  })

  for (const clip of SCENES) {
    console.log(`\n▶ Capturing ${clip.id} — ${clip.label}`)

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: tmp, size: { width: 1280, height: 720 } },
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(700)

    await page.waitForFunction(() => !!window.warpwing)

    if (clip.action === 'title') {
      await page.screenshot({ path: path.join(media, `${clip.id}.png`), type: 'png' })
      await mashKeys(page, 'title', 5200)
    } else {
      await page.evaluate(() => {
        window.warpwing.prepareCapture()
      })
      await page.waitForTimeout(500)
      await page.keyboard.down('Space')
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(media, `${clip.id}.png`), type: 'png' })
      await mashKeys(page, clip.action, 5200)
    }

    await page.close()
    await context.close()
    await new Promise((r) => setTimeout(r, 300))

    const files = (await readdir(tmp)).filter((f) => f.endsWith('.webm'))
    if (!files.length) throw new Error(`No webm for ${clip.id}`)
    const webms = files.map((f) => {
      const p = path.join(tmp, f)
      return { p, m: statSync(p).mtimeMs }
    })
    webms.sort((a, b) => b.m - a.m)
    const staged = path.join(tmp, `${clip.id}.webm`)
    try {
      renameSync(webms[0].p, staged)
    } catch {
      copyFileSync(webms[0].p, staged)
    }
    // Skip boot/title lead-in for gameplay scenes (recording starts at page load)
    await toGifAndMp4(staged, path.join(media, clip.id), clip.action === 'title' ? 0 : 2.2)
    console.log(`✓ Saved media/${clip.id}.{gif,mp4,png}`)

    for (const f of await readdir(tmp)) {
      if (f.endsWith('.webm') || f === 'palette.png') await unlink(path.join(tmp, f)).catch(() => {})
    }
  }

  await browser.close()
  await rm(tmp, { recursive: true, force: true })
  console.log('\nAll WarpWing live gameplay loops ready in media/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
