// Renders the Mind Arcade brand mark into every icon the app ships.
// Run with: node scripts/make-icons.mjs   (uses sharp, bundled with Next.js)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BRAIN_LEFT = "M247 118C214 98 170 106 157 141C119 141 96 178 110 212C82 233 80 281 110 301C98 338 122 373 159 375C176 405 220 410 247 392Z";
const BRAIN_RIGHT = "M265 118C298 98 342 106 355 141C393 141 416 178 402 212C430 233 432 281 402 301C414 338 390 373 353 375C336 405 292 410 265 392Z";

/** rounded: rounded-corner tile with transparent corners; scale < 1 shrinks the artwork (maskable safe zone). */
function svg({ rounded = true, scale = 1 } = {}) {
  const rx = rounded ? 116 : 0;
  const t = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/><stop offset="0.55" stop-color="#c026d3"/><stop offset="1" stop-color="#f43f5e"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.25" cy="0.15" r="0.75">
      <stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f3e8ff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${rx}" fill="url(#shine)"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <g transform="translate(0 6)">
      <path d="${BRAIN_LEFT}" fill="#3b0764" opacity="0.28" transform="translate(0 14)"/>
      <path d="${BRAIN_RIGHT}" fill="#3b0764" opacity="0.28" transform="translate(0 14)"/>
      <path d="${BRAIN_LEFT}" fill="url(#brain)"/>
      <path d="${BRAIN_RIGHT}" fill="url(#brain)"/>
      <g fill="none" stroke="#a21caf" stroke-width="15" stroke-linecap="round">
        <path d="M168 176C198 172 214 196 202 222"/>
        <path d="M132 262C168 248 204 266 206 298"/>
        <path d="M174 336C196 318 226 328 230 350"/>
      </g>
      <circle cx="330" cy="196" r="28" fill="#22d3ee"/>
      <circle cx="372" cy="262" r="28" fill="#facc15"/>
      <circle cx="318" cy="314" r="28" fill="#4ade80"/>
      <g fill="#fff" opacity="0.7"><circle cx="321" cy="186" r="8"/><circle cx="363" cy="252" r="8"/><circle cx="309" cy="304" r="8"/></g>
    </g>
    <path d="M418 70l10 24 24 10-24 10-10 24-10-24-24-10 24-10z" fill="#fff" opacity="0.9"/>
  </g>
</svg>`;
}

const png = (s, size) => sharp(Buffer.from(s)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const out = (rel, data) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log("wrote", rel, `${data.length} bytes`);
};

/** Packs PNG images into a multi-resolution .ico (PNG-compressed entries). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const tile = svg();
out("app/icon.svg", Buffer.from(tile));
out("app/favicon.ico", ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tile, size) })))));
out("app/apple-icon.png", await png(svg({ rounded: false, scale: 0.86 }), 180));
out("public/icons/icon-192.png", await png(tile, 192));
out("public/icons/icon-512.png", await png(tile, 512));
out("public/icons/maskable-512.png", await png(svg({ rounded: false, scale: 0.74 }), 512));
