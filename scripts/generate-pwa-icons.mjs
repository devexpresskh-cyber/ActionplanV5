import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#312e81" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  
  <!-- Base Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Subtle inner border -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#818cf8" stroke-opacity="0.25" stroke-width="4" />
  
  <!-- Calendar / Action Plan Clipboard Plate -->
  <rect x="106" y="96" width="300" height="340" rx="36" fill="#0f172a" fill-opacity="0.85" filter="url(#glow)" stroke="#6366f1" stroke-width="3" />
  
  <!-- Top Clipboard Header Clip -->
  <rect x="186" y="74" width="140" height="44" rx="14" fill="url(#accentGrad)" />
  <circle cx="256" cy="96" r="8" fill="#ffffff" />
  
  <!-- Content Lines / Tasks in Plan -->
  <rect x="146" y="160" width="130" height="18" rx="9" fill="#94a3b8" />
  <rect x="146" y="200" width="220" height="14" rx="7" fill="#475569" />
  
  <!-- Clock Circle Insignia (Attendance & Shift Tracking) -->
  <circle cx="216" cy="316" r="64" fill="#1e293b" stroke="#38bdf8" stroke-width="6" />
  <polyline points="216,276 216,316 244,332" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Verified Checkmark Badge for Check-in / Completion -->
  <circle cx="340" cy="336" r="54" fill="url(#checkGrad)" filter="url(#glow)" />
  <polyline points="318,336 334,352 366,320" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Function to generate raw RGBA PNG buffer
function generatePng(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);
    let crc = -1;
    for (let i = 0; i < crcBuf.length; i++) {
      crc = crc ^ crcBuf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc = (crc ^ -1) >>> 0;
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 512;
  const safeMargin = isMaskable ? 0.72 : 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    const ny = (y - cy) / (cy);

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = (x - cx) / (cx);
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Default background color: deep indigo gradient #1e1b4b -> #4338ca
      const gradRatio = Math.max(0, Math.min(1, (x + y) / (width + height)));
      let r = Math.round(30 + gradRatio * 37);
      let g = Math.round(27 + gradRatio * 29);
      let b = Math.round(75 + gradRatio * 127);
      let a = 255;

      // Inner card box
      const boxLeft = cx - 150 * scale * safeMargin;
      const boxRight = cx + 150 * scale * safeMargin;
      const boxTop = cy - 160 * scale * safeMargin;
      const boxBottom = cy + 180 * scale * safeMargin;

      if (x >= boxLeft && x <= boxRight && y >= boxTop && y <= boxBottom) {
        // Inner card dark slate
        r = 15; g = 23; b = 42;
      }

      // Checkmark circle badge
      const badgeCx = cx + 84 * scale * safeMargin;
      const badgeCy = cy + 80 * scale * safeMargin;
      const badgeR = 54 * scale * safeMargin;
      const dBadge = Math.sqrt((x - badgeCx)**2 + (y - badgeCy)**2);
      if (dBadge <= badgeR) {
        // Emerald green badge
        r = 16; g = 185; b = 129;
        // Checkmark drawing
        const localX = (x - badgeCx) / badgeR;
        const localY = (y - badgeCy) / badgeR;
        // checkmark lines
        const onLine1 = Math.abs(localX + 0.3 - localY) < 0.16 && localX >= -0.5 && localX <= 0;
        const onLine2 = Math.abs(localX - 0.2 + (localY - 0.1) * 0.9) < 0.16 && localX >= 0 && localX <= 0.6;
        if (onLine1 || onLine2) {
          r = 255; g = 255; b = 255;
        }
      }

      // Clock circle
      const clockCx = cx - 40 * scale * safeMargin;
      const clockCy = cy + 60 * scale * safeMargin;
      const clockR = 60 * scale * safeMargin;
      const dClock = Math.sqrt((x - clockCx)**2 + (y - clockCy)**2);
      if (dClock <= clockR && dClock >= clockR - 8 * scale) {
        // Cyan clock border
        r = 56; g = 189; b = 248;
      } else if (dClock < clockR - 8 * scale) {
        r = 30; g = 41; b = 59;
        // Hands
        const onHourHand = Math.abs(x - clockCx) < 3 * scale && y <= clockCy && y >= clockCy - clockR * 0.6;
        const onMinHand = Math.abs(y - clockCy) < 3 * scale && x >= clockCx && x <= clockCx + clockR * 0.7;
        if (onHourHand || onMinHand) {
          r = 56; g = 189; b = 248;
        }
      }

      // Rounded squircle mask for non-maskable icons
      if (!isMaskable) {
        // rounded corner radius
        const cornerR = 0.22;
        const qx = Math.max(0, Math.abs(nx) - (1 - cornerR));
        const qy = Math.max(0, Math.abs(ny) - (1 - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0; // transparent outside rounded app icon
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate the required PWA assets
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));

// Create a favicon.ico using a small 32x32 PNG embed
const icoHeader = Buffer.from([
  0, 0, // Reserved
  1, 0, // ICO type
  1, 0, // 1 image
  32,   // width 32
  32,   // height 32
  0,    // colors
  0,    // reserved
  1, 0, // color planes
  32, 0,// bits per pixel
]);
const png32 = generatePng(32, 32, false);
const icoDirEntrySize = Buffer.alloc(8);
icoDirEntrySize.writeUInt32LE(png32.length, 0); // size of image
icoDirEntrySize.writeUInt32LE(22, 4); // offset of image data (6 header + 16 entry = 22)
const faviconIco = Buffer.concat([icoHeader, icoDirEntrySize, png32]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco);

console.log('Successfully generated all PWA icons in /public!');
