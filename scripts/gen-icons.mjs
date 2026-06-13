// Generates app icons (PNG + Windows ICO) and a README banner from build/icon.svg.
// Run with: npm run icons
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))

mkdirSync(join(root, 'build'), { recursive: true })
mkdirSync(join(root, 'docs'), { recursive: true })

// Master PNG (512) for electron-builder (Linux/mac) and general use
await sharp(svg).resize(512, 512).png().toFile(join(root, 'build', 'icon.png'))

// Windows .ico with multiple sizes
const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer()))
writeFileSync(join(root, 'build', 'icon.ico'), await pngToIco(pngBuffers))

// README logo (256)
await sharp(svg).resize(256, 256).png().toFile(join(root, 'docs', 'logo.png'))

console.log('Icons generated: build/icon.png, build/icon.ico, docs/logo.png')
