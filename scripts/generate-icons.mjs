// Generates icon-192.png and icon-512.png — a dark square with a white "D"
// and an amber accent bar — without any image library, by writing raw PNG
// chunks (RGBA, zlib-deflated scanlines).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- CRC32 (PNG chunk checksums) ----
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelFn) {
  // Raw image: each scanline prefixed with filter byte 0, RGBA pixels.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x / size, y / size);
      const o = row + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Draw: dark (#111) rounded square, white "D" (vertical stem + half annulus),
// amber bar along the bottom.
function pixel(u, v) {
  // rounded corners
  const r = 0.12;
  const cx = Math.min(Math.max(u, r), 1 - r);
  const cy = Math.min(Math.max(v, r), 1 - r);
  if (Math.hypot(u - cx, v - cy) > r) return [0, 0, 0, 0];

  // amber accent bar
  if (v > 0.86 && v < 0.92 && u > 0.2 && u < 0.8) return [245, 158, 11, 255];

  // letter "D"
  const stem = u >= 0.3 && u <= 0.42 && v >= 0.22 && v <= 0.74;
  const dx = u - 0.42;
  const dy = (v - 0.48) / 1.0;
  const dist = Math.hypot(dx, dy);
  const bowl = u >= 0.42 && dist <= 0.26 && dist >= 0.14;
  const caps = u >= 0.3 && u <= 0.46 && ((v >= 0.22 && v <= 0.34) || (v >= 0.62 && v <= 0.74));
  if (stem || bowl || caps) return [255, 255, 255, 255];

  return [17, 17, 17, 255];
}

for (const size of [192, 512]) {
  writeFileSync(join(root, "public", `icon-${size}.png`), encodePng(size, pixel));
  console.log(`wrote icon-${size}.png`);
}
