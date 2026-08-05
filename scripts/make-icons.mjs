/**
 * Generates simple placeholder icon/splash for VK admin upload.
 * Run: node scripts/make-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { deflateSync } = require('node:zlib');

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '..', 'public');
mkdirSync(outDir, { recursive: true });

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paintIcon(x, y, size) {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const dist = Math.hypot(x - cx, y - cy);
  let r = 10,
    g = 14,
    b = 20;
  const moonR = size * 0.28;
  const mx = cx + size * 0.08;
  const my = cy - size * 0.18;
  if (Math.hypot(x - mx, y - my) < moonR) {
    r = 212;
    g = 228;
    b = 255;
  }
  if (Math.hypot(x - (mx + moonR * 0.35), y - (my - moonR * 0.1)) < moonR * 0.85) {
    r = 10;
    g = 14;
    b = 20;
  }
  if (dist < size * 0.22 && y > cy - size * 0.05) {
    r = 90;
    g = 60;
    b = 30;
  }
  if (Math.hypot(x - (cx - size * 0.12), y - (cy - size * 0.18)) < size * 0.07) {
    r = 90;
    g = 60;
    b = 30;
  }
  if (Math.hypot(x - (cx + size * 0.12), y - (cy - size * 0.18)) < size * 0.07) {
    r = 90;
    g = 60;
    b = 30;
  }
  if (Math.hypot(x - (cx - size * 0.06), y - cy) < size * 0.025) {
    r = 255;
    g = 160;
    b = 40;
  }
  if (Math.hypot(x - (cx + size * 0.06), y - cy) < size * 0.025) {
    r = 255;
    g = 160;
    b = 40;
  }
  return [r, g, b, 255];
}

function writePng(name, size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [pr, pg, pb, pa = 255] = paint(x, y, size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = pr;
      raw[i + 1] = pg;
      raw[i + 2] = pb;
      raw[i + 3] = pa;
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const buf = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log('wrote', path, `${size}x${size}`);
}

writePng('icon-278.png', 278, paintIcon);
writePng('icon-192.png', 192, paintIcon);
writePng('splash.png', 512, paintIcon);
console.log('Upload public/icon-278.png in VK Mini Apps admin.');
