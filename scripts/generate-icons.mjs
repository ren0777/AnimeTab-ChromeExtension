#!/usr/bin/env node
// One-time icon generator: renders the AnimeTab blossom logo as true PNGs in
// all manifest sizes using a dependency-free PNG encoder (zlib + CRC32).
// Draw is supersampled for anti-aliasing. Re-run to tweak the design:
//   node scripts/generate-icons.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- minimal PNG writer -----------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const writePng = (file, size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  writeFileSync(file, png);
};

// --- drawing helpers --------------------------------------------------------
const mix = (a, b, t) => ([
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
  Math.round(a[3] + (b[3] - a[3]) * t)
]);

const mixColor = (c1, c2, t) => (t >= 1 ? c2 : t <= 0 ? c1 : mix(c1, c2, t));

// Vertical page glow: deep indigo night at the top, warmer plum low.
const BG_TOP = [24, 16, 48, 255];
const BG_BOTTOM = [10, 10, 15, 255];

const PINK_IN = [255, 155, 176, 255];  // petal — sakura center
const PINK_OUT = [255, 107, 138, 255]; // petal — edge
const GOLD = [246, 201, 76, 255];

const draw = (size) => {
  const S = size / 128; // scalar so the design is resolution independent
  const cx = 64 * S, cy = 66 * S;
  const bloomR = 40 * S;   // overall blossom radius
  const petalLong = 30 * S, petalWide = 15 * S;
  const petalDist = 21 * S;
  const centerR = 9.5 * S;

  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // supersample grid per axis
  const off = (SS - 1) / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS - 0.5 + 0; // sample point in px space
          const y = py + (sy - off * 0) / 1 - 0.5;  // (kept simple, 1 sample/axis offset below)
          const yy = py + (sy + 0.5) / SS - 0.5;
          const xx = px + (sx + 0.5) / SS - 0.5;

          // background gradient by row
          let col = mixColor(BG_TOP, BG_BOTTOM, yy / size);

          // soft glow upper-left
          const gx = xx - 34 * S, gy = yy - 40 * S;
          const glow = Math.max(0, 1 - Math.hypot(gx, gy) / (70 * S));
          col = mixColor(col, [255, 107, 138, 255], glow * glow * 0.22);

          // five ellipse petals rotated around the center
          let coverage = 0;
          for (let i = 0; i < 5; i++) {
            const theta = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            const dx = xx - (cx + Math.cos(theta) * petalDist);
            const dy = yy - (cy + Math.sin(theta) * petalDist);
            const u = dx * Math.cos(theta) + dy * Math.sin(theta);
            const v = -dx * Math.sin(theta) + dy * Math.cos(theta);
            const inside = (u / petalLong) ** 2 + (v / petalWide) ** 2 <= 1;
            if (inside) { coverage = 1; break; }
          }
          if (!coverage) {
            const cdist = Math.hypot(xx - cx, yy - cy);
            if (cdist <= bloomR * 0.42) coverage = 1; // blossom core disc
          }

          if (coverage) {
            const d = Math.min(1, Math.hypot(xx - cx, yy - cy) / bloomR);
            let petal = mixColor(PINK_IN, PINK_OUT, d);
            // white bloom highlight away from the center keeps gold visible
            petal = mixColor(petal, [255, 255, 255, 255], Math.max(0, 1 - Math.abs(d - 0.5) / 0.5) * 0.5);
            col = petal;
          }
          if (Math.hypot(xx - cx, yy - cy) <= centerR) {
            // gold stamen disc painted last so it always reads
            col = GOLD;
          }

          r += col[0]; g += col[1]; b += col[2]; a += col[3];
        }
      }
      const n = SS * SS;
      const at = (py * size + px) * 4;
      rgba[at] = Math.round(r / n);
      rgba[at + 1] = Math.round(g / n);
      rgba[at + 2] = Math.round(b / n);
      rgba[at + 3] = Math.round(a / n);
    }
  }
  return rgba;
};

for (const size of [128, 48, 16]) {
  const file = path.join(ROOT, 'assets', `icon${size}.png`);
  writePng(file, size, draw(size));
  console.log(` ✓ assets/icon${size}.png`);
}
