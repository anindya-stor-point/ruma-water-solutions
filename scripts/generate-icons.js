import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';

const imageUrl = 'https://i.ibb.co/VcnzfWys/ic-launcher.png';
const resDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

const densities = [
  { name: 'mdpi', size: 48 },
  { name: 'hdpi', size: 72 },
  { name: 'xhdpi', size: 96 },
  { name: 'xxhdpi', size: 144 },
  { name: 'xxxhdpi', size: 192 }
];

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image, status code: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function generateIcons() {
  try {
    console.log('Downloading image for build-time generation...');
    const imageBuffer = await downloadImage(imageUrl);

    for (const d of densities) {
      const dir = path.join(resDir, `mipmap-${d.name}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filePath = path.join(dir, 'ic_launcher.png');
      
      await sharp(imageBuffer)
        .resize(d.size, d.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(filePath);
        
      console.log(`Generated ${filePath}`);
    }
    
    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
