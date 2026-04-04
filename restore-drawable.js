import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const resDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');
const drawableDir = path.join(resDir, 'drawable');
const mipmapAnyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');

const densities = [
  { name: 'mdpi', size: 48 },
  { name: 'hdpi', size: 72 },
  { name: 'xhdpi', size: 96 },
  { name: 'xxhdpi', size: 144 },
  { name: 'xxxhdpi', size: 192 }
];

async function restoreAllResources() {
  try {
    // 1. Ensure directories exist
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (!fs.existsSync(mipmapAnyDpiDir)) fs.mkdirSync(mipmapAnyDpiDir, { recursive: true });

    // 2. Restore drawable XMLs (the ones outside the green circle)
    const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M0,0h108v108h-108z" />
</vector>`;

    const fgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#4F46E5"
        android:pathData="M54,54m-40,0a40,40 0,1 1,80 0a40,40 0,1 1,-80 0" />
</vector>`;

    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), bgXml);
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), fgXml);

    // 3. Delete the ones inside the green circle (as requested)
    const backPng = path.join(drawableDir, 'ic_launcher_adaptive_back.png');
    const forePng = path.join(drawableDir, 'ic_launcher_adaptive_fore.png');
    if (fs.existsSync(backPng)) fs.unlinkSync(backPng);
    if (fs.existsSync(forePng)) fs.unlinkSync(forePng);

    // 4. Generate PNG icons for all densities
    const logoSvg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="240" fill="#4F46E5" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="160" font-weight="bold" fill="white">RW</text>
      </svg>
    `;

    for (const d of densities) {
      const dir = path.join(resDir, `mipmap-${d.name}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Regular icon
      await sharp(Buffer.from(logoSvg))
        .resize(d.size, d.size)
        .png()
        .toFile(path.join(dir, 'ic_launcher.png'));

      // Round icon (circular crop)
      const roundMask = Buffer.from(
        `<svg><circle cx="${d.size / 2}" cy="${d.size / 2}" r="${d.size / 2}" /></svg>`
      );
      await sharp(Buffer.from(logoSvg))
        .resize(d.size, d.size)
        .composite([{ input: roundMask, blend: 'dest-in' }])
        .png()
        .toFile(path.join(dir, 'ic_launcher_round.png'));
    }

    // 5. Restore anydpi XMLs
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher.xml'), adaptiveXml);
    fs.writeFileSync(path.join(mipmapAnyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);

    console.log('All resources restored successfully');
  } catch (error) {
    console.error('Error during restoration:', error);
  }
}

restoreAllResources();
