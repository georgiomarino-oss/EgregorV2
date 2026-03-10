import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, '..');
const generatedRoot = resolve(mobileRoot, 'assets', 'generated');
const promptManifestPath = resolve(generatedRoot, 'asset-prompts.json');
const outputManifestPath = resolve(generatedRoot, 'asset-manifest.json');
const openAiEndpoint = 'https://api.openai.com/v1/images/generations';

function parseArgs(argv) {
  const options = {
    dryRun: false,
    fallbackOnly: false,
    strictOpenAi: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--fallback-only') {
      options.fallbackOnly = true;
      continue;
    }
    if (arg === '--strict-openai') {
      options.strictOpenAi = true;
    }
  }

  return options;
}

function parseHexColor(value) {
  const normalized = value.trim().replace('#', '');
  if (normalized.length !== 6) {
    throw new Error(`Invalid color "${value}". Expected #RRGGBB format.`);
  }

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    r: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixColor(left, right, ratio) {
  return {
    b: left.b + (right.b - left.b) * ratio,
    g: left.g + (right.g - left.g) * ratio,
    r: left.r + (right.r - left.r) * ratio,
  };
}

function mulberry32(seedInput) {
  let seed = seedInput >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToSeed(value) {
  const digest = createHash('sha256').update(value).digest();
  return digest.readUInt32BE(0);
}

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      if ((c & 1) === 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgbaBuffer) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rawIndex = y * (stride + 1);
    const pixelIndex = y * stride;
    raw[rawIndex] = 0;
    rgbaBuffer.copy(raw, rawIndex + 1, pixelIndex, pixelIndex + stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    pngSignature,
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', compressed),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseSize(sizeString) {
  const [widthRaw, heightRaw] = sizeString.split('x');
  const width = Number.parseInt(widthRaw, 10);
  const height = Number.parseInt(heightRaw, 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 32 || height < 32) {
    throw new Error(`Invalid size "${sizeString}". Expected WIDTHxHEIGHT.`);
  }

  return { height, width };
}

function createProceduralImageBuffer(asset, defaults) {
  const size = parseSize(asset.size ?? defaults.size ?? '1280x720');
  const paletteHex = asset.fallbackPalette;
  if (!Array.isArray(paletteHex) || paletteHex.length < 4) {
    throw new Error(
      `Asset "${asset.id}" is missing fallbackPalette with at least 4 colors in asset-prompts.json.`,
    );
  }

  const colors = paletteHex.map(parseHexColor);
  const seed = hashToSeed(`${asset.id}|${asset.section}|${asset.output}`);
  const rng = mulberry32(seed);
  const { width, height } = size;
  const rgba = Buffer.alloc(width * height * 4);

  const orbCount = 5;
  const orbs = Array.from({ length: orbCount }).map((_value, index) => ({
    color: index % 2 === 0 ? colors[2] : colors[3],
    cx: (0.1 + rng() * 0.8) * width,
    cy: (0.08 + rng() * 0.8) * height,
    radius: (0.16 + rng() * 0.36) * Math.max(width, height),
    strength: 0.12 + rng() * 0.22,
  }));

  const geometryCenterX = (0.3 + rng() * 0.4) * width;
  const geometryCenterY = (0.24 + rng() * 0.4) * height;
  const geometryRadius = (0.18 + rng() * 0.2) * Math.min(width, height);
  const sweepPhase = rng() * Math.PI * 2;

  for (let y = 0; y < height; y += 1) {
    const vertical = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const horizontal = x / Math.max(1, width - 1);
      const base = mixColor(colors[0], colors[1], Math.pow(vertical, 1.08));
      const sweep =
        0.5 +
        0.5 *
          Math.sin(
            horizontal * Math.PI * 2.1 + vertical * Math.PI * 1.55 + sweepPhase,
          );
      const accentBlend = 0.08 + sweep * 0.14;
      const accented = mixColor(base, colors[2], accentBlend);

      let red = accented.r;
      let green = accented.g;
      let blue = accented.b;

      for (const orb of orbs) {
        const dx = (x - orb.cx) / orb.radius;
        const dy = (y - orb.cy) / orb.radius;
        const d2 = dx * dx + dy * dy;
        const glow = Math.max(0, 1 - d2);
        red += orb.color.r * glow * orb.strength;
        green += orb.color.g * glow * orb.strength;
        blue += orb.color.b * glow * orb.strength;
      }

      const geometryDx = x - geometryCenterX;
      const geometryDy = y - geometryCenterY;
      const geometryDistance = Math.sqrt(geometryDx * geometryDx + geometryDy * geometryDy);
      const ringBand = Math.abs(geometryDistance - geometryRadius);
      if (ringBand < 2.8) {
        const ringStrength = (2.8 - ringBand) / 2.8;
        red += colors[3].r * ringStrength * 0.18;
        green += colors[3].g * ringStrength * 0.18;
        blue += colors[3].b * ringStrength * 0.18;
      }

      const grain = (rng() - 0.5) * 8.5;
      const starChance = rng();
      if (starChance > 0.9992) {
        red += 78;
        green += 82;
        blue += 98;
      }

      const index = (y * width + x) * 4;
      rgba[index] = clampByte(red + grain);
      rgba[index + 1] = clampByte(green + grain);
      rgba[index + 2] = clampByte(blue + grain);
      rgba[index + 3] = 255;
    }
  }

  return encodePng(width, height, rgba);
}

async function generateWithOpenAi({ apiKey, asset, defaults }) {
  const payload = {
    model: defaults.model ?? 'gpt-image-1',
    prompt: asset.prompt,
    quality: asset.quality ?? defaults.quality ?? 'medium',
    size: asset.size ?? defaults.size ?? '1280x720',
  };

  const response = await fetch(openAiEndpoint, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenAI image generation failed (${response.status}): ${raw}`);
  }

  const json = await response.json();
  const first = Array.isArray(json.data) ? json.data[0] : null;
  if (first?.b64_json) {
    return Buffer.from(first.b64_json, 'base64');
  }
  if (typeof first?.url === 'string' && first.url.length > 0) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) {
      throw new Error(
        `OpenAI image URL fetch failed (${imageResponse.status}): ${first.url}`,
      );
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error('OpenAI response did not contain image data.');
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
  const promptManifest = JSON.parse(readFileSync(promptManifestPath, 'utf8'));
  const assets = Array.isArray(promptManifest.assets) ? promptManifest.assets : [];
  const defaults = promptManifest.defaults ?? {};
  const generatedAt = new Date().toISOString();
  const scriptSource = 'mobile/scripts/generate-cinematic-assets.mjs';

  if (assets.length === 0) {
    throw new Error('asset-prompts.json contains no assets.');
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt,
    generator: {
      openAiModel: defaults.model ?? 'gpt-image-1',
      script: scriptSource,
      usedApiKey: Boolean(apiKey && !options.fallbackOnly),
    },
    assets: [],
  };

  for (const asset of assets) {
    if (!asset?.id || !asset?.output || !asset?.prompt || !asset?.section) {
      throw new Error('Each asset in asset-prompts.json must include id, section, output, and prompt.');
    }

    const outputPath = resolve(generatedRoot, asset.output);
    mkdirSync(dirname(outputPath), { recursive: true });

    let bytes = null;
    let provider = 'procedural';
    let generationError = null;

    if (!options.fallbackOnly && apiKey) {
      try {
        bytes = await generateWithOpenAi({
          apiKey,
          asset,
          defaults,
        });
        provider = 'openai';
      } catch (error) {
        generationError = error instanceof Error ? error.message : String(error);
        if (options.strictOpenAi) {
          throw error;
        }
      }
    }

    if (!bytes) {
      bytes = createProceduralImageBuffer(asset, defaults);
      provider = 'procedural';
    }

    if (!options.dryRun) {
      writeFileSync(outputPath, bytes);
    }

    const byteCount = options.dryRun ? bytes.length : statSync(outputPath).size;
    const checksum = sha256Hex(bytes);

    manifest.assets.push({
      bytes: byteCount,
      generatedAt,
      id: asset.id,
      output: asset.output,
      prompt: asset.prompt,
      provider,
      section: asset.section,
      sha256: checksum,
      size: asset.size ?? defaults.size ?? '1280x720',
      usage: asset.usage ?? [],
      ...(generationError ? { openAiError: generationError } : {}),
    });

    console.log(
      `[cinematic-assets] ${asset.id} -> ${asset.output} (${provider}, ${byteCount} bytes)`,
    );
  }

  if (!options.dryRun) {
    writeFileSync(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log(
    `[cinematic-assets] ${options.dryRun ? 'dry run complete' : 'generation complete'} for ${
      assets.length
    } assets.`,
  );
}

run().catch((error) => {
  console.error('[cinematic-assets] generation failed');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
