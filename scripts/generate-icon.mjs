import sharp from "sharp";

const SIZE = 1024;
const PADDING = 180; // breathing room around the logo
const LOGO_WIDTH = 60;
const LOGO_HEIGHT = 60;
const CORNER_RADIUS = 220;

// Scale logo to fit within the padded area
const availableSize = SIZE - PADDING * 2;
const scale = Math.min(availableSize / LOGO_WIDTH, availableSize / LOGO_HEIGHT);
const logoW = Math.round(LOGO_WIDTH * scale);
const logoH = Math.round(LOGO_HEIGHT * scale);
const logoX = Math.round((SIZE - logoW) / 2);
const logoY = Math.round((SIZE - logoH) / 2);

// Glass background SVG — dark base with radial color orbs + subtle gradient overlay
const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="rounded">
      <rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}"/>
    </clipPath>
    <radialGradient id="orb1" cx="12%" cy="18%" r="50%">
      <stop offset="0%" stop-color="rgba(122,162,247,0.45)"/>
      <stop offset="60%" stop-color="rgba(122,162,247,0)"/>
    </radialGradient>
    <radialGradient id="orb2" cx="85%" cy="16%" r="45%">
      <stop offset="0%" stop-color="rgba(115,218,202,0.30)"/>
      <stop offset="60%" stop-color="rgba(115,218,202,0)"/>
    </radialGradient>
    <radialGradient id="orb3" cx="50%" cy="95%" r="50%">
      <stop offset="0%" stop-color="rgba(187,154,247,0.30)"/>
      <stop offset="60%" stop-color="rgba(187,154,247,0)"/>
    </radialGradient>
    <linearGradient id="glassOverlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.02)"/>
    </linearGradient>
    <linearGradient id="baseBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16161e"/>
      <stop offset="45%" stop-color="#1a1b26"/>
      <stop offset="100%" stop-color="#16161e"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#rounded)">
    <!-- Dark base -->
    <rect width="${SIZE}" height="${SIZE}" fill="url(#baseBg)"/>
    <!-- Color orbs -->
    <rect width="${SIZE}" height="${SIZE}" fill="url(#orb1)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#orb2)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#orb3)"/>
    <!-- Glass overlay -->
    <rect width="${SIZE}" height="${SIZE}" fill="url(#glassOverlay)"/>
    <!-- Subtle border -->
    <rect x="4" y="4" width="${SIZE - 8}" height="${SIZE - 8}" rx="${CORNER_RADIUS - 4}" ry="${CORNER_RADIUS - 4}"
          fill="none" stroke="rgba(169,177,214,0.15)" stroke-width="4"/>
  </g>

  <!-- White logo -->
  <g transform="translate(${logoX}, ${logoY}) scale(${scale})">
    <path d="M60 16.787V16.517C60 7.395 52.604 -0.000999899 43.482 1.01394e-07H16.848C7.543 1.01394e-07 0 7.544 0 16.849V17.152C0 26.457 7.543 34 16.849 34H28.065C28.026 33.67 28 33.338 28 33C28 31.959 28.197 30.955 28.543 30H16.849C9.753 30 4 24.247 4 17.151V16.848C4 9.753 9.752 4 16.848 4H43.481C50.395 3.999 56 9.604 56 16.518V16.788C56 19.417 55.225 21.914 53.825 24.006L53.817 24.019C52.247 24.115 51 25.406 51 27C51 27.016 51 27.031 51 27.047L51.032 27.087C48.833 25.199 45.606 24 42 24C35.373 24 30 28.029 30 33C30 37.583 34.572 41.358 40.48 41.92C41.811 41.64 42.859 40.596 42.985 39.306C43.031 38.833 42.95 38.378 42.792 37.955C42.528 37.971 42.27 38 42 38C37.582 38 34 35.761 34 33C34 30.239 37.582 28 42 28C46.418 28 50 30.239 50 33C50 33.403 49.899 33.789 49.755 34.165C50.55 35.671 50.983 37.316 50.992 38.959C52.864 37.372 54 35.285 54 33C54 31.895 53.722 30.841 53.236 29.863L53.274 29.911C53.507 29.969 53.75 30 54 30C55.657 30 57 28.657 57 27C57 26.833 56.977 26.672 56.951 26.513L56.96 26.51C58.915 23.715 60 20.343 60 16.787Z" fill="white" fill-opacity="0.9"/>
    <path d="M46.205 32.7092C44.772 31.2762 42.916 30.2892 40.923 30.0552C37.975 30.3352 36 31.7312 36 33.0002C36 33.3322 36.14 33.6732 36.392 34.0002H40C42.922 34.0002 45.266 36.5202 44.976 39.5002C44.722 42.0972 42.387 44.0002 39.777 44.0002H21C16.029 44.0002 12 48.0292 12 53.0002V58.0002C12 59.2142 13.086 60.1782 14.338 59.9722C15.321 59.8102 16 58.8852 16 57.8882V53.0002C16 50.2392 18.231 48.0002 20.993 48.0002C26.291 48.0002 34.589 48.0002 39.713 48.0002C44.401 48.0002 48.518 44.5372 48.959 39.8702C48.984 39.6082 48.997 39.3472 49 39.0892C49.023 36.7202 47.964 34.4682 46.289 32.7932L46.205 32.7092Z" fill="white" fill-opacity="0.9"/>
  </g>
</svg>`;

const outputPath = new URL("../assets/icon-1024.png", import.meta.url).pathname;

await sharp(Buffer.from(svg))
  .resize(SIZE, SIZE)
  .png()
  .toFile(outputPath);

console.log(`Icon generated: ${outputPath}`);
