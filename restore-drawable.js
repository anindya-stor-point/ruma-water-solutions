import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const drawableDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'drawable');
const mipmapAnyDpiDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');

if (!fs.existsSync(drawableDir)) {
  fs.mkdirSync(drawableDir, { recursive: true });
}
if (!fs.existsSync(mipmapAnyDpiDir)) {
  fs.mkdirSync(mipmapAnyDpiDir, { recursive: true });
}

async function restoreDrawable() {
  try {
    // Create ic_launcher_adaptive_back.png (solid white)
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toFile(path.join(drawableDir, 'ic_launcher_adaptive_back.png'));

    // Create ic_launcher_adaptive_fore.png (logo with transparency)
    const svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="200" fill="#4F46E5" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white">RW</text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(drawableDir, 'ic_launcher_adaptive_fore.png'));

    // Create ic_launcher.xml in mipmap-anydpi-v26
    const icLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_adaptive_back"/>
    <foreground android:drawable="@drawable/ic_launcher_adaptive_fore"/>
</adaptive-icon>`;

    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher.xml'), icLauncherXml);
    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher_round.xml'), icLauncherXml);

    console.log('Restored drawable and mipmap-anydpi-v26 files successfully');
  } catch (error) {
    console.error('Error restoring files:', error);
  }
}

restoreDrawable();
