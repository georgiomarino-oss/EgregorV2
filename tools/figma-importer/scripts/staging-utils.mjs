import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
export const STAGING_ROOT = path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-handoff', 'staging');
export const STAGING_DATA_DIR = path.join(STAGING_ROOT, 'data');
export const STAGING_PAGE_SPECS_DIR = path.join(STAGING_ROOT, 'page-specs');

export const REQUIRED_PAGE_NAMES = [
  'Design system',
  'Components',
  'Home / Solo',
  'Circles',
  'Live',
  'Profile / Settings',
  'States',
  'Prayer content library',
  'Event/live content library',
  'Motion/background references',
];

export const REQUIRED_CANONICAL_ROUTES = [
  'SoloHome',
  'PrayerLibrary',
  'SoloSetup',
  'SoloLive',
  'CommunityHome',
  'CircleDetails',
  'CircleInviteComposer',
  'InviteDecision',
  'EventsHome',
  'EventsHome#GlobalPulseInline',
  'EventsHome#GlobalPulseFullscreen',
  'EventDetails',
  'EventRoom',
  'ProfileHome',
  'ProfileSettings',
  'ProfileSettings#Notifications',
  'ProfileSettings#PrivacyPresence',
  'ProfileSettings#SafetySupport',
  'ProfileSettings#AccountDeletion',
  'ProfileHome#JournalTrustProgress',
];

export const LEGACY_ROUTE_BLOCKLIST = [
  'PrayerCircle',
  'EventsCircle',
  'events/room',
  'community/events-circle',
  'community/prayer-circle',
];

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function assertExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = src[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).filter((r) => r.some((c) => c !== '')).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });
}

export function readCsv(filePath) {
  return parseCsv(readText(filePath));
}

export function listPageSpecs() {
  assertExists(STAGING_PAGE_SPECS_DIR);
  const files = fs.readdirSync(STAGING_PAGE_SPECS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
  return files.map((fileName) => {
    const fullPath = path.join(STAGING_PAGE_SPECS_DIR, fileName);
    return {
      fileName,
      fullPath,
      content: readText(fullPath),
    };
  });
}

export function loadStagingData() {
  const required = [
    path.join(STAGING_ROOT, 'figma-staging-manifest.json'),
    path.join(STAGING_ROOT, 'README.md'),
    path.join(STAGING_DATA_DIR, 'active-screen-blueprints.json'),
    path.join(STAGING_DATA_DIR, 'screen-frame-index.csv'),
    path.join(STAGING_DATA_DIR, 'component-index.csv'),
    path.join(STAGING_DATA_DIR, 'asset-placement-index.csv'),
    path.join(STAGING_DATA_DIR, 'motion-layer-index.csv'),
    path.join(STAGING_DATA_DIR, 'state-copy-bindings.json'),
    path.join(STAGING_DATA_DIR, 'prayer-content-library.json'),
    path.join(STAGING_DATA_DIR, 'event-content-library.json'),
    path.join(STAGING_DATA_DIR, 'canonical-event-series.json'),
    path.join(STAGING_DATA_DIR, 'copy-state-library.json'),
    path.join(STAGING_DATA_DIR, 'component-families.json'),
    path.join(STAGING_DATA_DIR, 'state-library.json'),
    path.join(STAGING_DATA_DIR, 'asset-mapping.json'),
    path.join(STAGING_DATA_DIR, 'motion-surfaces.json'),
  ];
  required.forEach(assertExists);

  const docs = {
    figmaExportInventory: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-export-inventory.md')),
    figmaContentMapping: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-content-mapping.md')),
    figmaAssetMapping: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-asset-mapping.md')),
    figmaExportHandoff: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-export-handoff.md')),
    figmaHandoffReadme: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-handoff', 'README.md')),
    stagingReadme: readText(path.join(STAGING_ROOT, 'README.md')),
    designTokenReference: readText(path.join(REPO_ROOT, 'mobile', 'docs', 'redesign', 'figma-handoff', 'design', 'design-token-reference.md')),
  };

  return {
    paths: {
      repoRoot: REPO_ROOT,
      stagingRoot: STAGING_ROOT,
      stagingDataDir: STAGING_DATA_DIR,
      stagingPageSpecsDir: STAGING_PAGE_SPECS_DIR,
    },
    manifest: readJson(path.join(STAGING_ROOT, 'figma-staging-manifest.json')),
    pageSpecs: listPageSpecs(),
    data: {
      activeScreenBlueprints: readJson(path.join(STAGING_DATA_DIR, 'active-screen-blueprints.json')),
      screenFrameIndex: readCsv(path.join(STAGING_DATA_DIR, 'screen-frame-index.csv')),
      componentIndex: readCsv(path.join(STAGING_DATA_DIR, 'component-index.csv')),
      assetPlacementIndex: readCsv(path.join(STAGING_DATA_DIR, 'asset-placement-index.csv')),
      motionLayerIndex: readCsv(path.join(STAGING_DATA_DIR, 'motion-layer-index.csv')),
      stateCopyBindings: readJson(path.join(STAGING_DATA_DIR, 'state-copy-bindings.json')),
      prayerContent: readJson(path.join(STAGING_DATA_DIR, 'prayer-content-library.json')),
      eventContent: readJson(path.join(STAGING_DATA_DIR, 'event-content-library.json')),
      canonicalSeries: readJson(path.join(STAGING_DATA_DIR, 'canonical-event-series.json')),
      copyStateLibrary: readJson(path.join(STAGING_DATA_DIR, 'copy-state-library.json')),
      componentFamilies: readJson(path.join(STAGING_DATA_DIR, 'component-families.json')),
      stateLibrary: readJson(path.join(STAGING_DATA_DIR, 'state-library.json')),
      assetMapping: readJson(path.join(STAGING_DATA_DIR, 'asset-mapping.json')),
      motionSurfaces: readJson(path.join(STAGING_DATA_DIR, 'motion-surfaces.json')),
    },
    docs,
  };
}

function containsBlockedLegacyValue(value) {
  const lower = value.toLowerCase();
  return LEGACY_ROUTE_BLOCKLIST.some((blocked) => lower.includes(blocked.toLowerCase()));
}

export function validateStagingBundleShape(bundleLike) {
  const errors = [];
  const warnings = [];

  const pageOrder = bundleLike?.manifest?.figmaPageOrder ?? [];
  if (pageOrder.length !== REQUIRED_PAGE_NAMES.length) {
    errors.push(`Expected ${REQUIRED_PAGE_NAMES.length} pages in figmaPageOrder, found ${pageOrder.length}.`);
  }

  for (const required of REQUIRED_PAGE_NAMES) {
    if (!pageOrder.includes(required)) {
      errors.push(`Missing required page in figmaPageOrder: ${required}`);
    }
  }

  const screens = bundleLike?.data?.activeScreenBlueprints ?? [];
  if (screens.length !== REQUIRED_CANONICAL_ROUTES.length) {
    errors.push(`Expected ${REQUIRED_CANONICAL_ROUTES.length} canonical screens, found ${screens.length}.`);
  }

  const actualRoutes = screens.map((s) => s.route);
  for (const route of REQUIRED_CANONICAL_ROUTES) {
    if (!actualRoutes.includes(route)) {
      errors.push(`Missing canonical route: ${route}`);
    }
  }

  for (const route of actualRoutes) {
    if (containsBlockedLegacyValue(route)) {
      errors.push(`Legacy route present in active screen blueprint set: ${route}`);
    }
  }

  const frameRows = bundleLike?.data?.screenFrameIndex ?? [];
  for (const row of frameRows) {
    if (containsBlockedLegacyValue(String(row.route || ''))) {
      errors.push(`Legacy route present in screen-frame-index.csv: ${row.route}`);
      break;
    }
  }

  const pageSpecs = bundleLike?.pageSpecs ?? [];
  if (pageSpecs.length < REQUIRED_PAGE_NAMES.length) {
    errors.push(`Expected at least ${REQUIRED_PAGE_NAMES.length} page specs, found ${pageSpecs.length}.`);
  }

  const prayerCount = (bundleLike?.data?.prayerContent ?? []).length;
  const eventCount = (bundleLike?.data?.eventContent ?? []).length;
  const seriesCount = (bundleLike?.data?.canonicalSeries ?? []).length;

  if (prayerCount !== 62) errors.push(`Expected 62 prayer items, found ${prayerCount}.`);
  if (eventCount !== 61) errors.push(`Expected 61 event template items, found ${eventCount}.`);
  if (seriesCount !== 6) errors.push(`Expected 6 canonical series items, found ${seriesCount}.`);

  const motionRows = bundleLike?.data?.motionLayerIndex ?? [];
  if (motionRows.length === 0) {
    errors.push('motion-layer-index.csv parsed with zero rows.');
  }

  const summary = {
    pageCount: pageOrder.length,
    screenCount: screens.length,
    frameRowCount: frameRows.length,
    prayerCount,
    eventCount,
    canonicalSeriesCount: seriesCount,
    motionLayerRowCount: motionRows.length,
    pageSpecCount: pageSpecs.length,
  };

  return { errors, warnings, summary };
}
