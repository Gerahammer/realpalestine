#!/usr/bin/env node
/* Generates raster icons (PNG + ICO) from a flat, on-brand mark — no native image
   libraries required. Navy (#0E1B2E) field, gold (#B8893B) square + underline bar,
   mirroring favicon.svg and the site wordmark. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY = [14, 27, 46];
const GOLD = [184, 137, 59];
const OUT = require('path').join(__dirname, 'public');

// --- CRC32 (PNG) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Draw the mark into an RGBA pixel buffer at the given size.
function render(size) {
  const px = Buffer.alloc(size * size * 4);
  // anti-aliased gold disc (the "On the Record" mark) on a navy field
  const SS = 4, cx = 0.5, cy = 0.5, rDisc = 0.336;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / size;
          const fy = (y + (sy + 0.5) / SS) / size;
          if (Math.hypot(fx - cx, fy - cy) <= rDisc) hits++;
        }
      }
      const f = hits / (SS * SS);
      const o = (y * size + x) * 4;
      px[o]     = Math.round(NAVY[0] * (1 - f) + GOLD[0] * f);
      px[o + 1] = Math.round(NAVY[1] * (1 - f) + GOLD[1] * f);
      px[o + 2] = Math.round(NAVY[2] * (1 - f) + GOLD[2] * f);
      px[o + 3] = 255;
    }
  }
  return px;
}

function encodePNG(size) {
  const px = render(size);
  // add filter byte (0) per scanline
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ICO wrapping PNG payloads (Vista+; all evergreen browsers accept PNG-in-ICO).
function encodeICO(sizes) {
  const pngs = sizes.map(encodePNG);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(sizes.length, 4);
  const entries = [];
  let offset = 6 + sizes.length * 16;
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;             // width  (0 => 256)
    e[1] = s >= 256 ? 0 : s;             // height
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);               // color planes
    e.writeUInt16LE(32, 6);              // bpp
    e.writeUInt32LE(pngs[i].length, 8);  // size
    e.writeUInt32LE(offset, 12);         // offset
    offset += pngs[i].length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

const targets = [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];
targets.forEach(([name, size]) => {
  fs.writeFileSync(path.join(OUT, name), encodePNG(size));
  console.log('wrote', name);
});
fs.writeFileSync(path.join(OUT, 'favicon.ico'), encodeICO([16, 32, 48]));
console.log('wrote favicon.ico');
