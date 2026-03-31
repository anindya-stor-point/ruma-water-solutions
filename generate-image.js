import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const safeStringify = (obj) => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    });
  } catch (err) {
    return '[Serialization Error]';
  }
};

const safeLog = (message, ...args) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.parse(safeStringify(arg));
      } catch (e) {
        return `[Unserializable: ${arg.constructor?.name || typeof arg}]`;
      }
    }
    return arg;
  });
  console.log(message, ...safeArgs);
};

const safeError = (message, ...args) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.parse(safeStringify(arg));
      } catch (e) {
        return `[Unserializable: ${arg.constructor?.name || typeof arg}]`;
      }
    }
    return arg;
  });
  console.error(message, ...safeArgs);
};

async function generateImage() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'Top-down view of calm sea waves, light blue water with white sea foam, sandy textures at the edge, clean and natural background for an app.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const buffer = Buffer.from(base64EncodeString, 'base64');
        const filePath = path.join(process.cwd(), 'public', 'sea-bg.jpg');
        fs.writeFileSync(filePath, buffer);
        safeLog('Image saved successfully to public/sea-bg.jpg');
        return;
      }
    }
    safeLog('No image found in response.');
  } catch (error) {
    safeError('Error generating image:', error);
  }
}

generateImage();
