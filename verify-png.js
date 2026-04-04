import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'mipmap-mdpi', 'ic_launcher.png');
const buffer = fs.readFileSync(filePath);

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
let isPng = true;
for (let i = 0; i < pngSig.length; i++) {
  if (buffer[i] !== pngSig[i]) {
    isPng = false;
    break;
  }
}
console.log('Is valid PNG signature:', isPng);
console.log('Buffer length:', buffer.length);
