import sharp from 'sharp'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = new URL('../docs/branding/streammuse-youtube-banner-vector.svg', import.meta.url)
const output = new URL('../docs/branding/streammuse-youtube-banner-sharp.png', import.meta.url)
const svg = await readFile(source)

await sharp(svg, { density: 144 })
  .resize(2560, 1440)
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(output))

const metadata = await sharp(fileURLToPath(output)).metadata()
const { size } = await stat(output)
if (metadata.width !== 2560 || metadata.height !== 1440 || size > 6 * 1024 * 1024) {
  throw new Error('Banner does not meet the export requirements')
}
console.log(`${fileURLToPath(output)}: ${metadata.width}x${metadata.height}, ${size} bytes`)
