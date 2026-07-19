import { mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(root, '../generated-assets/doubao-staging/final')
const outputDir = resolve(root, 'static/demo')
const expectedNames = [
  'banner-living.png', 'banner-tech.png',
  'goods-shirt-main.png', 'goods-shirt-detail.png',
  'goods-earbuds-main.png', 'goods-earbuds-detail.png',
  'goods-cup-main.png', 'goods-cup-detail.png',
  'goods-towel-main.png', 'goods-towel-detail.png',
  'goods-lamp-main.png', 'goods-lamp-detail.png',
  'goods-tote-main.png', 'goods-tote-detail.png',
  'goods-charger-main.png', 'goods-charger-detail.png',
  'goods-keyboard-main.png', 'goods-keyboard-detail.png',
  'goods-bodywash-main.png', 'goods-bodywash-detail.png',
  'goods-handcream-main.png', 'goods-handcream-detail.png',
  'goods-granola-main.png', 'goods-granola-detail.png',
  'goods-tea-main.png', 'goods-tea-detail.png'
]

async function main() {
  const available = new Set(await readdir(sourceDir))
  const missing = expectedNames.filter(name => !available.has(name))
  if (missing.length) throw new Error(`Missing generated source images: ${missing.join(', ')}`)
  await mkdir(outputDir, { recursive: true })

  for (const name of expectedNames) {
    const banner = name.startsWith('banner-')
    await sharp(resolve(sourceDir, name))
      .resize(banner ? 1600 : 960, banner ? 900 : 960, { fit: 'cover' })
      .png({
        palette: true,
        quality: 90,
        colours: 256,
        dither: 0.5,
        compressionLevel: 9,
        effort: 10
      })
      .toFile(resolve(outputDir, name))
  }

  console.log(JSON.stringify({ installed: expectedNames.length, outputDir }))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
