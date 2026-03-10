const UI_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>EgregorV2 Staging Importer</title>
  <style>
    body { margin:0; padding:16px; font-family:Inter,system-ui,sans-serif; background:#f4f7fb; color:#12233d; }
    h1 { margin:0 0 8px 0; font-size:18px; }
    p { margin:4px 0 10px 0; font-size:12px; line-height:1.4; }
    .panel { background:#fff; border:1px solid #d5e1f0; border-radius:10px; padding:12px; margin-bottom:12px; }
    .row { display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; align-items:center; }
    button { border:1px solid #7ea0cb; background:#2f65a8; color:#fff; border-radius:8px; padding:8px 12px; font-size:12px; cursor:pointer; }
    button.secondary { background:#eff4fb; color:#213d62; border-color:#b8cae3; }
    button:disabled { opacity:.45; cursor:not-allowed; }
    #log { width:100%; height:220px; resize:none; border:1px solid #c7d7ec; border-radius:8px; padding:8px; font-size:11px; background:#fcfdff; color:#1d3559; }
    code { font-size:11px; background:#eef3fa; padding:1px 4px; border-radius:4px; }
    .small { font-size:11px; color:#436286; }
  </style>
</head>
<body>
  <h1>EgregorV2 Staging Importer</h1>
  <p>Load the generated bundle file and import canonical editable pages/frames/content.</p>
  <div class="panel">
    <div><strong>Bundle file</strong></div>
    <p class="small">Expected: <code>tools/figma-importer/dist/egregorv2-staging-bundle.json</code></p>
    <input id="bundleFile" type="file" accept=".json,application/json" />
    <div class="row">
      <label class="small"><input id="clearExisting" type="checkbox" checked /> Clear existing pages with same names</label>
    </div>
    <div class="row">
      <button id="validateBtn" class="secondary" disabled>Validate bundle</button>
      <button id="dryRunBtn" class="secondary" disabled>Dry run</button>
      <button id="buildBtn" disabled>Build Figma file</button>
      <button id="closeBtn" class="secondary">Close</button>
    </div>
  </div>
  <div class="panel">
    <div><strong>Log</strong></div>
    <textarea id="log" readonly></textarea>
  </div>
  <script>
    const fileInput = document.getElementById('bundleFile');
    const validateBtn = document.getElementById('validateBtn');
    const dryRunBtn = document.getElementById('dryRunBtn');
    const buildBtn = document.getElementById('buildBtn');
    const closeBtn = document.getElementById('closeBtn');
    const clearExisting = document.getElementById('clearExisting');
    const log = document.getElementById('log');
    let bundleText = '';
    function appendLog(text) { log.value += text + '\\n'; log.scrollTop = log.scrollHeight; }
    function setActionsEnabled(enabled) { validateBtn.disabled = !enabled; dryRunBtn.disabled = !enabled; buildBtn.disabled = !enabled; }
    function post(message) { parent.postMessage({ pluginMessage: message }, '*'); }
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) { bundleText = ''; setActionsEnabled(false); appendLog('No bundle selected.'); return; }
      bundleText = await file.text();
      setActionsEnabled(true);
      appendLog('Loaded bundle: ' + file.name);
    });
    validateBtn.addEventListener('click', () => post({ type: 'validate-bundle', bundleText: bundleText }));
    dryRunBtn.addEventListener('click', () => post({ type: 'import-bundle', bundleText: bundleText, dryRun: true, clearExisting: clearExisting.checked }));
    buildBtn.addEventListener('click', () => post({ type: 'import-bundle', bundleText: bundleText, dryRun: false, clearExisting: clearExisting.checked }));
    closeBtn.addEventListener('click', () => post({ type: 'close-plugin' }));
    onmessage = (event) => {
      const msg = (event.data && event.data.pluginMessage) || {};
      if (msg.type === 'validation-result') {
        appendLog('Validation summary: ' + JSON.stringify(msg.validation && msg.validation.summary || {}, null, 2));
        const errors = msg.validation && msg.validation.errors || [];
        const warnings = msg.validation && msg.validation.warnings || [];
        if (errors.length) { appendLog('Validation errors:'); errors.forEach((e) => appendLog('- ' + e)); } else { appendLog('Validation passed.'); }
        if (warnings.length) { appendLog('Warnings:'); warnings.forEach((w) => appendLog('- ' + w)); }
      }
      if (msg.type === 'dry-run-result') appendLog('Dry run complete: ' + JSON.stringify(msg.summary || {}, null, 2));
      if (msg.type === 'log') appendLog(msg.message || '');
      if (msg.type === 'import-complete') {
        appendLog('Import complete: ' + JSON.stringify(msg.stats || {}, null, 2));
        appendLog('Expected checks: ' + JSON.stringify(msg.expected || {}, null, 2));
      }
      if (msg.type === 'import-error') appendLog('ERROR: ' + (msg.message || 'Unknown plugin error.'));
    };
  </script>
</body>
</html>`;
figma.showUI(UI_HTML, { width: 460, height: 640 });
const REQUIRED_PAGE_NAMES = [
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

const REQUIRED_CANONICAL_ROUTES = [
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

const LEGACY_BLOCKLIST = ['prayercircle', 'eventscircle', 'events/room', 'community/events-circle', 'community/prayer-circle'];

const FONT_STACK = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Roboto', style: 'Regular' },
  { family: 'Roboto', style: 'Medium' },
  { family: 'Roboto', style: 'Bold' },
];

const LOADED_FONTS = new Set();
let BASE_FONT_REGULAR = null;
let BASE_FONT_SEMIBOLD = null;

function send(type, payload) {
  figma.ui.postMessage({ type, ...payload });
}

function containsLegacy(value) {
  if (!value) return false;
  const lower = String(value).toLowerCase();
  return LEGACY_BLOCKLIST.some((item) => lower.includes(item));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const value = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function paint(hex, opacity) {
  return {
    type: 'SOLID',
    color: hexToRgb(hex),
    opacity: opacity == null ? 1 : opacity,
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function unique(values) {
  return Array.from(new Set(values));
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function normalizeStateName(state) {
  return String(state || 'default')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function parseMaybeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureFontLoaded(fontName) {
  const key = `${fontName.family}:${fontName.style}`;
  if (LOADED_FONTS.has(key)) return fontName;
  await figma.loadFontAsync(fontName);
  LOADED_FONTS.add(key);
  return fontName;
}

async function ensureBaseFonts() {
  if (BASE_FONT_REGULAR && BASE_FONT_SEMIBOLD) return;
  for (const candidate of FONT_STACK) {
    try {
      await ensureFontLoaded(candidate);
      if (!BASE_FONT_REGULAR && (candidate.style === 'Regular' || candidate.style === 'Medium')) {
        BASE_FONT_REGULAR = candidate;
      }
      if (!BASE_FONT_SEMIBOLD && (candidate.style === 'Semi Bold' || candidate.style === 'Bold' || candidate.style === 'Medium')) {
        BASE_FONT_SEMIBOLD = candidate;
      }
      if (BASE_FONT_REGULAR && BASE_FONT_SEMIBOLD) return;
    } catch (_) {
      // ignore
    }
  }
  if (!BASE_FONT_REGULAR || !BASE_FONT_SEMIBOLD) {
    throw new Error('Unable to load required Figma fonts (Inter/Roboto).');
  }
}

async function createText(parent, text, options) {
  const opts = options || {};
  const textNode = figma.createText();
  const font = opts.bold ? BASE_FONT_SEMIBOLD : BASE_FONT_REGULAR;
  await ensureFontLoaded(font);
  textNode.fontName = font;
  textNode.characters = text || '';
  textNode.fontSize = opts.fontSize || 12;
  textNode.fills = [paint(opts.color || '#0F1728')];
  if (opts.textAutoResize) textNode.textAutoResize = opts.textAutoResize;
  if (opts.width != null) textNode.resize(opts.width, opts.height != null ? opts.height : textNode.height);
  if (opts.x != null) textNode.x = opts.x;
  if (opts.y != null) textNode.y = opts.y;
  if (opts.name) textNode.name = opts.name;
  parent.appendChild(textNode);
  return textNode;
}

function createRect(parent, options) {
  const opts = options || {};
  const rect = figma.createRectangle();
  rect.resize(opts.width || 100, opts.height || 100);
  rect.cornerRadius = opts.cornerRadius == null ? 10 : opts.cornerRadius;
  rect.fills = [paint(opts.fill || '#E8EEF8', opts.opacity == null ? 1 : opts.opacity)];
  if (opts.stroke) {
    rect.strokes = [paint(opts.stroke)];
    rect.strokeWeight = opts.strokeWeight || 1;
  }
  if (opts.dashed) {
    rect.dashPattern = [6, 4];
  }
  if (opts.name) rect.name = opts.name;
  rect.x = opts.x || 0;
  rect.y = opts.y || 0;
  parent.appendChild(rect);
  return rect;
}

function validateBundle(bundle) {
  const errors = [];
  const warnings = [];

  const pageOrder = safeArray(bundle?.manifest?.figmaPageOrder);
  if (pageOrder.length !== REQUIRED_PAGE_NAMES.length) {
    errors.push(`Expected ${REQUIRED_PAGE_NAMES.length} pages, found ${pageOrder.length}.`);
  }
  for (const required of REQUIRED_PAGE_NAMES) {
    if (!pageOrder.includes(required)) {
      errors.push(`Missing required page: ${required}`);
    }
  }

  const screens = safeArray(bundle?.data?.activeScreenBlueprints);
  if (screens.length !== REQUIRED_CANONICAL_ROUTES.length) {
    errors.push(`Expected ${REQUIRED_CANONICAL_ROUTES.length} active screens, found ${screens.length}.`);
  }

  const routes = screens.map((s) => safeString(s.route, ''));
  for (const route of REQUIRED_CANONICAL_ROUTES) {
    if (!routes.includes(route)) errors.push(`Missing canonical route: ${route}`);
  }

  for (const route of routes) {
    if (containsLegacy(route)) {
      errors.push(`Legacy route present: ${route}`);
    }
  }

  const frameRows = safeArray(bundle?.data?.screenFrameIndex);
  const hasPageColumn = frameRows.some((row) => safeString(row.page, '').length > 0);
  if (!hasPageColumn && frameRows.length > 0) {
    warnings.push('screenFrameIndex rows have no "page" column; importer will route rows by canonical route mapping fallback.');
  }
  for (const row of frameRows) {
    if (containsLegacy(row.route)) {
      errors.push(`Legacy route present in frame index: ${row.route}`);
      break;
    }
  }

  const prayerCount = safeArray(bundle?.data?.prayerContent).length;
  const eventCount = safeArray(bundle?.data?.eventContent).length;
  const seriesCount = safeArray(bundle?.data?.canonicalSeries).length;

  if (prayerCount !== 62) errors.push(`Expected 62 prayers, found ${prayerCount}.`);
  if (eventCount !== 61) errors.push(`Expected 61 event templates, found ${eventCount}.`);
  if (seriesCount !== 6) errors.push(`Expected 6 canonical series, found ${seriesCount}.`);

  const pageSpecs = safeArray(bundle?.pageSpecs);
  if (pageSpecs.length < 10) {
    errors.push(`Expected at least 10 page specs, found ${pageSpecs.length}.`);
  }

  const summary = {
    pages: pageOrder.length,
    screens: screens.length,
    screenFrameRows: frameRows.length,
    prayerCount,
    eventCount,
    canonicalSeriesCount: seriesCount,
    pageSpecCount: pageSpecs.length,
    motionLayerRows: safeArray(bundle?.data?.motionLayerIndex).length,
  };

  return { errors, warnings, summary };
}

function parseBundleText(bundleText) {
  if (!bundleText || !bundleText.trim()) {
    throw new Error('Bundle input is empty. Use dist/egregorv2-staging-bundle.json from tools/figma-importer.');
  }
  return JSON.parse(bundleText);
}

function findBlueprint(bundle, route) {
  const screens = safeArray(bundle?.data?.activeScreenBlueprints);
  return screens.find((s) => s.route === route) || null;
}

function getPageSpecText(bundle, pageName) {
  const specs = safeArray(bundle?.pageSpecs);
  const lower = pageName.toLowerCase();
  const hit = specs.find((s) => safeString(s.fileName, '').toLowerCase().includes(lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')));
  return hit ? safeString(hit.content, '') : '';
}

function canonicalPageForRoute(route) {
  const value = safeString(route, '');
  if (!value) return null;
  if (value.startsWith('Solo') || value === 'PrayerLibrary') return 'Home / Solo';
  if (value.startsWith('Community') || value.startsWith('Circle') || value.startsWith('InviteDecision')) return 'Circles';
  if (value.startsWith('Events') || value.startsWith('Event')) return 'Live';
  if (value.startsWith('Profile')) return 'Profile / Settings';
  return null;
}

function extractSpecSummary(specText, maxLines) {
  const lines = String(specText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('|') && !line.startsWith('#'));
  return lines.slice(0, maxLines || 8).join('\n');
}

async function addSpecReferenceNote(page, bundle, pageName, x, y, width) {
  const specText = getPageSpecText(bundle, pageName);
  if (!specText) return null;
  const summary = extractSpecSummary(specText, 10);
  if (!summary) return null;
  return createText(page, `Page spec reference:\n${summary}`, {
    x: x == null ? 40 : x,
    y: y == null ? 56 : y,
    width: width == null ? 1120 : width,
    textAutoResize: 'HEIGHT',
    fontSize: 11,
    color: '#3A577A',
  });
}

function pickSamplePrayerItems(bundle, count) {
  return safeArray(bundle?.data?.prayerContent).slice(0, count);
}

function pickSampleEventItems(bundle, count) {
  return safeArray(bundle?.data?.eventContent).slice(0, count);
}

function pickSampleSeriesItems(bundle, count) {
  return safeArray(bundle?.data?.canonicalSeries).slice(0, count);
}

function pickRouteMediaSlots(bundle, pageName, route) {
  const rows = safeArray(bundle?.data?.assetPlacementIndex).filter((row) => row.page === pageName);
  if (rows.length === 0) return [];
  const routeNeedle = String(route || '').toLowerCase().split('#')[0];
  const direct = rows.filter((row) => String(row.whereUsed || '').toLowerCase().includes(routeNeedle));
  const candidates = direct.length > 0 ? direct : rows;
  return unique(candidates.map((r) => r.slot)).slice(0, 4);
}

function sampleCardLines(bundle, pageName, route) {
  if (pageName === 'Home / Solo') {
    return pickSamplePrayerItems(bundle, 3).map((item) => `${item.title} • ${item.subtitle}`);
  }
  if (pageName === 'Live') {
    const a = pickSampleSeriesItems(bundle, 2).map((item) => `${item.title} • ${item.subtitle}`);
    const b = pickSampleEventItems(bundle, 2).map((item) => `${item.title} • ${item.subtitle}`);
    return unique([...a, ...b]).slice(0, 4);
  }
  if (pageName === 'Circles') {
    const statuses = safeArray(bundle?.data?.copyStateLibrary?.inviteStatuses).slice(0, 4).map((s) => `Invite status: ${s.label}`);
    return ['My Circles', 'Shared With Me', 'Pending Invites', ...statuses].slice(0, 4);
  }
  if (pageName === 'Profile / Settings') {
    const notifications = safeArray(bundle?.data?.copyStateLibrary?.notificationPermissionStates)
      .slice(0, 2)
      .map((s) => `Notifications: ${s.badgeLabel}`);
    const deletion = safeArray(bundle?.data?.copyStateLibrary?.deletionStatuses)
      .slice(0, 2)
      .map((s) => `Deletion: ${s.badgeLabel}`);
    return [...notifications, ...deletion].slice(0, 4);
  }
  return [`${route} content rail`, `${route} metadata`, `${route} status labels`];
}

async function createScreenScaffold(row, blueprint, bundle, pageName) {
  const frame = figma.createFrame();
  frame.name = row.frameName || `Screen/${row.route}/${row.stateOrVariant || 'default'}`;
  frame.resize(390, 844);
  frame.cornerRadius = 18;
  frame.fills = [paint('#0C1421')];
  frame.strokes = [paint('#2F4058', 0.8)];

  await createText(frame, row.route, { x: 16, y: 14, fontSize: 16, bold: true, color: '#F2F6FF' });
  await createText(frame, safeString(blueprint?.purpose, row.purpose || ''), {
    x: 16,
    y: 36,
    width: 358,
    textAutoResize: 'HEIGHT',
    fontSize: 11,
    color: '#B8C9E2',
  });

  createRect(frame, {
    x: 12,
    y: 70,
    width: 366,
    height: 54,
    name: 'Region/Header',
    fill: '#122034',
    stroke: '#2E4564',
    cornerRadius: 10,
  });
  await createText(frame, 'Header / navigation / status chips', { x: 24, y: 90, fontSize: 11, color: '#C8D6ED' });

  createRect(frame, {
    x: 12,
    y: 134,
    width: 366,
    height: 164,
    name: 'Region/Hero',
    fill: '#0F2337',
    stroke: '#315177',
    cornerRadius: 14,
  });
  await createText(frame, 'Hero region', { x: 24, y: 146, fontSize: 12, bold: true, color: '#E7F0FF' });

  const slots = pickRouteMediaSlots(bundle, pageName, row.route);
  const heroSlot = slots[0] || 'media.slot.default';
  createRect(frame, {
    x: 24,
    y: 170,
    width: 334,
    height: 110,
    name: `MediaSlot/${heroSlot}`,
    fill: '#102C45',
    stroke: '#4B6E92',
    cornerRadius: 10,
    dashed: true,
  });
  await createText(frame, `Media slot: ${heroSlot}`, { x: 32, y: 214, fontSize: 10, color: '#D7E8FF' });

  createRect(frame, {
    x: 12,
    y: 308,
    width: 366,
    height: 430,
    name: 'Region/Content',
    fill: '#101A2C',
    stroke: '#2B3F5B',
    cornerRadius: 14,
  });

  const keyComponents = String(row.keyChildComponents || '').split('|').map((x) => x.trim()).filter(Boolean);
  await createText(frame, `Key components: ${keyComponents.slice(0, 5).join(', ')}`, {
    x: 24,
    y: 320,
    width: 334,
    textAutoResize: 'HEIGHT',
    fontSize: 10,
    color: '#AFC3E2',
  });

  const lineItems = sampleCardLines(bundle, pageName, row.route);
  let y = 348;
  for (let i = 0; i < lineItems.length; i += 1) {
    createRect(frame, {
      x: 24,
      y,
      width: 334,
      height: 60,
      name: `Region/CardRow/${i + 1}`,
      fill: '#13233B',
      stroke: '#375274',
      cornerRadius: 10,
    });
    await createText(frame, lineItems[i], { x: 34, y: y + 12, width: 300, textAutoResize: 'HEIGHT', fontSize: 11, color: '#E2ECFA' });
    y += 70;
  }

  const stateText = row.frameType === 'state' ? row.stateOrVariant : 'default';
  createRect(frame, {
    x: 24,
    y: 638,
    width: 200,
    height: 30,
    name: `State/${normalizeStateName(stateText)}`,
    fill: row.frameType === 'state' ? '#1F3E63' : '#1B2A42',
    stroke: '#496B92',
    cornerRadius: 999,
  });
  await createText(frame, `State: ${stateText}`, { x: 36, y: 646, fontSize: 11, color: '#DDEBFF' });

  createRect(frame, {
    x: 24,
    y: 686,
    width: 334,
    height: 42,
    name: 'Region/PrimaryCTA',
    fill: '#2C61A2',
    stroke: '#5F9CE0',
    cornerRadius: 10,
  });

  let cta = 'Continue';
  if (pageName === 'Home / Solo') cta = 'Begin prayer';
  if (pageName === 'Live') cta = 'Join now';
  if (pageName === 'Circles') cta = 'Manage circle';
  if (pageName === 'Profile / Settings') cta = 'Save settings';
  await createText(frame, `CTA: ${cta}`, { x: 36, y: 699, fontSize: 12, bold: true, color: '#EEF6FF' });

  if (row.frameType === 'state' && String(row.stateOrVariant || '').trim().length > 0) {
    await createText(frame, `Variant notes: ${row.stateOrVariant}`, { x: 24, y: 742, width: 334, textAutoResize: 'HEIGHT', fontSize: 10, color: '#B8CBE6' });
  }

  return frame;
}

async function buildScreenCollectionPage(page, bundle, pageName) {
  const rows = safeArray(bundle?.data?.screenFrameIndex)
    .filter((row) => {
      const rowPage = safeString(row.page, '');
      if (rowPage.length > 0) return rowPage === pageName;
      return canonicalPageForRoute(row.route) === pageName;
    })
    .filter((row) => !containsLegacy(row.route));

  const grouped = groupBy(rows, (row) => row.route);
  const routes = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  await createText(page, `${pageName} (canonical screens)`, { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, pageName, 40, 60, 1120);

  let col = 0;
  let x = 40;
  let y = 120;
  const colGap = 470;
  const rowGap = 80;
  const maxCols = 2;

  for (const route of routes) {
    const routeRows = grouped.get(route).slice().sort((a, b) => {
      if (a.frameType === b.frameType) return String(a.frameName || '').localeCompare(String(b.frameName || ''));
      return a.frameType === 'default' ? -1 : 1;
    });

    const cluster = figma.createFrame();
    cluster.name = `Route/${route}`;
    cluster.fills = [paint('#F6FAFF')];
    cluster.strokes = [paint('#D9E5F4')];
    cluster.strokeWeight = 1;
    cluster.cornerRadius = 14;

    let clusterY = 16;
    const blueprint = findBlueprint(bundle, route);
    await createText(cluster, route, { x: 16, y: clusterY, fontSize: 16, bold: true, color: '#11213A' });
    clusterY += 24;

    await createText(cluster, safeString(blueprint?.purpose, ''), {
      x: 16,
      y: clusterY,
      width: 398,
      textAutoResize: 'HEIGHT',
      fontSize: 11,
      color: '#3A5578',
    });
    clusterY += 42;

    for (const row of routeRows) {
      const screenFrame = await createScreenScaffold(row, blueprint, bundle, pageName);
      screenFrame.x = 16;
      screenFrame.y = clusterY;
      cluster.appendChild(screenFrame);
      clusterY += screenFrame.height + 18;
    }

    cluster.resize(422, clusterY + 16);
    cluster.x = x;
    cluster.y = y;
    page.appendChild(cluster);

    if (col < maxCols - 1) {
      col += 1;
      x += colGap;
    } else {
      col = 0;
      x = 40;
      y += cluster.height + rowGap;
    }
  }

  return {
    routeCount: routes.length,
    frameCount: rows.length,
  };
}

async function buildDesignSystemPage(page, bundle) {
  await createText(page, 'Design system (canonical reference)', { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, 'Design system', 40, 60, 1120);

  const sectionFrames = [];
  const sectionThemes = ['solo', 'circles', 'live', 'profile'];
  const routeMappings = ['SoloTab -> solo', 'CommunityTab -> circles', 'EventsTab -> live', 'ProfileTab -> profile'];

  const cardFamily = safeArray(bundle?.data?.componentFamilies).find((f) => f.family === 'Card families');
  const cardMembers = cardFamily ? safeArray(cardFamily.members) : [];

  const liveLabels = safeArray(bundle?.data?.copyStateLibrary?.liveStatusLabels).map((x) => `${x.state}: ${x.label}`);
  const inviteLabels = safeArray(bundle?.data?.copyStateLibrary?.inviteStatuses).map((x) => `${x.status}: ${x.label}`);

  const blocks = [
    {
      title: 'Section themes',
      lines: [...sectionThemes.map((x) => `Theme: ${x}`), ...routeMappings],
    },
    {
      title: 'Typography hierarchy',
      lines: ['typography', 'typographyHierarchy', 'Readable body text and elevated hero labels'],
    },
    {
      title: 'Card families',
      lines: cardMembers.length > 0 ? cardMembers : ['PrayerCard', 'OccurrenceCard', 'CircleSummaryCard'],
    },
    {
      title: 'Chips/state labels',
      lines: [...liveLabels.slice(0, 4), ...inviteLabels.slice(0, 4)],
    },
    {
      title: 'Segmented controls and settings sections',
      lines: ['Circles segments: my/shared/invites', 'Settings: Notifications', 'Settings: Privacy & Presence', 'Settings: Safety & Support', 'Settings: Account/deletion'],
    },
    {
      title: 'Room atmosphere and spacing notes',
      lines: ['roomVisualFoundation', 'roomAtmosphere', 'spacing', 'radii', 'compositionRhythm'],
    },
  ];

  let x = 40;
  let y = 130;
  let col = 0;

  for (const block of blocks) {
    const frame = figma.createFrame();
    frame.name = `DS/${block.title.replace(/\s+/g, '')}`;
    frame.resize(520, 280);
    frame.fills = [paint('#F7FAFF')];
    frame.strokes = [paint('#D6E4F6')];
    frame.cornerRadius = 12;

    await createText(frame, block.title, { x: 16, y: 14, fontSize: 16, bold: true, color: '#102541' });
    let lineY = 44;
    for (const line of block.lines) {
      await createText(frame, `• ${line}`, { x: 18, y: lineY, width: 480, textAutoResize: 'HEIGHT', fontSize: 12, color: '#324D70' });
      lineY += 24;
    }

    frame.x = x;
    frame.y = y;
    page.appendChild(frame);
    sectionFrames.push(frame);

    if (col === 0) {
      col = 1;
      x = 600;
    } else {
      col = 0;
      x = 40;
      y += 320;
    }
  }

  return { sectionCount: sectionFrames.length };
}

async function createComponentToken(name) {
  const component = figma.createComponent();
  component.name = `Component/${name}`;
  component.resize(220, 72);
  component.fills = [paint('#EDF4FF')];
  component.strokes = [paint('#BDCFEA')];
  component.cornerRadius = 10;

  createRect(component, {
    x: 10,
    y: 10,
    width: 200,
    height: 52,
    name: 'ComponentBody',
    fill: '#DCE9FA',
    stroke: '#ADC4E4',
    cornerRadius: 8,
  });
  await createText(component, name, { x: 18, y: 28, width: 184, textAutoResize: 'HEIGHT', fontSize: 12, bold: true, color: '#15345A' });
  return component;
}

async function buildComponentsPage(page, bundle) {
  await createText(page, 'Components (canonical families)', { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, 'Components', 40, 60, 1120);
  const families = safeArray(bundle?.data?.componentFamilies);

  let y = 130;
  for (const family of families) {
    const frame = figma.createFrame();
    frame.name = `Components/${family.family.replace(/\s+/g, '')}`;
    frame.fills = [paint('#F8FBFF')];
    frame.strokes = [paint('#D7E4F4')];
    frame.cornerRadius = 12;

    let innerY = 16;
    await createText(frame, family.family, { x: 16, y: innerY, fontSize: 16, bold: true, color: '#0F2947' });
    innerY += 24;
    await createText(frame, `Used by: ${safeArray(family.usedBy).join(', ')}`, {
      x: 16,
      y: innerY,
      width: 1050,
      textAutoResize: 'HEIGHT',
      fontSize: 11,
      color: '#3C5779',
    });
    innerY += 32;

    let x = 16;
    let rowY = innerY;
    let col = 0;
    for (const member of safeArray(family.members)) {
      const token = await createComponentToken(member);
      token.x = x;
      token.y = rowY;
      frame.appendChild(token);

      col += 1;
      if (col >= 4) {
        col = 0;
        x = 16;
        rowY += 84;
      } else {
        x += 236;
      }
    }

    frame.resize(1110, rowY + 88);
    frame.x = 40;
    frame.y = y;
    page.appendChild(frame);
    y += frame.height + 24;
  }

  return { familyCount: families.length };
}

async function buildStatesPage(page, bundle) {
  await createText(page, 'States and edge cases (canonical)', { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, 'States', 40, 60, 1120);

  const stateLibrary = bundle?.data?.stateLibrary || {};
  const copyState = bundle?.data?.copyStateLibrary || {};

  const sections = [
    {
      name: 'States/SharedBase',
      rows: safeArray(stateLibrary?.sharedStates?.base).map((s) => `Base state: ${s}`),
    },
    {
      name: 'States/InviteLifecycle',
      rows: safeArray(copyState?.inviteStatuses).map((s) => `${s.status} • ${s.label} • tone=${s.tone}`),
    },
    {
      name: 'States/ReminderPermission',
      rows: [
        ...safeArray(copyState?.notificationPermissionStates).map((s) => `${s.state}: ${s.title}`),
        ...safeArray(copyState?.reminderStates).map((s) => `permission=${s.permissionState} reminder=${s.reminderEnabled} • ${s.detail}`),
      ],
    },
    {
      name: 'States/CirclesSegments',
      rows: [
        ...safeArray(stateLibrary?.circles?.segments).map((s) => `segment=${s}`),
        ...safeArray(stateLibrary?.circles?.emptyStates).map((s) => `empty copy: ${s}`),
      ],
    },
    {
      name: 'States/LiveOccurrence',
      rows: [
        ...safeArray(stateLibrary?.live?.occurrenceStates).map((s) => `occurrence=${s}`),
        ...safeArray(copyState?.liveStatusLabels).map((s) => `${s.state}: ${s.label}`),
      ],
    },
    {
      name: 'States/ProfileSettings',
      rows: [
        ...safeArray(stateLibrary?.profile?.notificationPermissionStates).map((s) => `notification permission=${s}`),
        ...safeArray(copyState?.deletionStatuses).map((s) => `${s.badgeLabel}: ${s.headline}`),
        ...safeArray(stateLibrary?.profile?.journalSaveStates).map((s) => `journal=${s}`),
      ],
    },
  ];

  let y = 130;
  for (const section of sections) {
    const frame = figma.createFrame();
    frame.name = section.name;
    frame.fills = [paint('#F8FBFF')];
    frame.strokes = [paint('#D6E4F6')];
    frame.cornerRadius = 12;

    await createText(frame, section.name, { x: 16, y: 12, fontSize: 15, bold: true, color: '#10213C' });

    let rowY = 40;
    for (const row of section.rows) {
      createRect(frame, { x: 14, y: rowY, width: 1060, height: 32, fill: '#EEF4FD', stroke: '#CBDBF0', cornerRadius: 8 });
      await createText(frame, row, { x: 24, y: rowY + 9, width: 1040, textAutoResize: 'HEIGHT', fontSize: 11, color: '#2F4A70' });
      rowY += 40;
    }

    frame.resize(1090, rowY + 14);
    frame.x = 40;
    frame.y = y;
    page.appendChild(frame);
    y += frame.height + 22;
  }

  return { stateSectionCount: sections.length };
}

async function buildPrayerLibraryPage(page, bundle) {
  const prayers = safeArray(bundle?.data?.prayerContent);
  await createText(page, `Prayer content library (${prayers.length} items)`, { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, 'Prayer content library', 40, 60, 1120);

  const byCategory = groupBy(prayers, (item) => safeString(item.categoryTheme, 'Uncategorized'));
  const categories = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b));

  let y = 118;
  for (const category of categories) {
    const items = byCategory.get(category);
    const section = figma.createFrame();
    section.name = `Library/Prayer/${category.replace(/\s+/g, '')}`;
    section.fills = [paint('#F9FBFF')];
    section.strokes = [paint('#D8E5F3')];
    section.cornerRadius = 12;

    await createText(section, `${category} (${items.length})`, { x: 16, y: 14, fontSize: 16, bold: true, color: '#122340' });

    let rowY = 42;
    for (const item of items) {
      const row = figma.createFrame();
      row.name = `PrayerRow/${item.stableKey}`;
      row.resize(1080, 170);
      row.fills = [paint('#EEF4FC')];
      row.strokes = [paint('#C6D8EE')];
      row.cornerRadius = 10;

      createRect(row, {
        x: 12,
        y: 12,
        width: 180,
        height: 146,
        name: `MediaSlot/${item.associatedImageSlot}`,
        fill: '#D9E8FB',
        stroke: '#9DB8DB',
        dashed: true,
        cornerRadius: 8,
      });
      await createText(row, `slot: ${item.associatedImageSlot}`, { x: 22, y: 72, width: 158, textAutoResize: 'HEIGHT', fontSize: 10, color: '#2C4D76' });

      await createText(row, item.title, { x: 208, y: 16, width: 844, textAutoResize: 'HEIGHT', fontSize: 14, bold: true, color: '#122945' });
      await createText(row, item.subtitle, { x: 208, y: 38, width: 844, textAutoResize: 'HEIGHT', fontSize: 11, color: '#375679' });
      await createText(row, item.description, { x: 208, y: 58, width: 844, textAutoResize: 'HEIGHT', fontSize: 11, color: '#21395A' });
      await createText(row, `category=${item.categoryTheme} • duration=${item.durationMinutes} min • treatment=${item.treatment} • cta=${item.appCtaLabel}`, {
        x: 208,
        y: 100,
        width: 844,
        textAutoResize: 'HEIGHT',
        fontSize: 10,
        color: '#35577D',
      });
      await createText(row, `art note: ${item.artDirectionNote} • tone: ${item.tone}`, {
        x: 208,
        y: 120,
        width: 844,
        textAutoResize: 'HEIGHT',
        fontSize: 10,
        color: '#456486',
      });

      row.x = 14;
      row.y = rowY;
      section.appendChild(row);
      rowY += row.height + 10;
    }

    section.resize(1110, rowY + 14);
    section.x = 40;
    section.y = y;
    page.appendChild(section);
    y += section.height + 20;
  }

  return { prayerRows: prayers.length, categoryCount: categories.length };
}

async function createEventRow(item, prefix) {
  const row = figma.createFrame();
  row.name = `${prefix}/${item.stableKey}`;
  row.resize(1080, 220);
  row.fills = [paint('#EEF4FC')];
  row.strokes = [paint('#C6D8EE')];
  row.cornerRadius = 10;

  createRect(row, {
    x: 12,
    y: 12,
    width: 180,
    height: 146,
    name: `MediaSlot/${item.associatedImageSlot}`,
    fill: '#D9E8FB',
    stroke: '#9DB8DB',
    dashed: true,
    cornerRadius: 8,
  });
  await createText(row, `slot: ${item.associatedImageSlot}`, { x: 22, y: 72, width: 158, textAutoResize: 'HEIGHT', fontSize: 10, color: '#2C4D76' });

  await createText(row, item.title, { x: 208, y: 16, width: 844, textAutoResize: 'HEIGHT', fontSize: 14, bold: true, color: '#122945' });
  await createText(row, item.subtitle, { x: 208, y: 38, width: 844, textAutoResize: 'HEIGHT', fontSize: 11, color: '#375679' });
  await createText(row, item.description, { x: 208, y: 58, width: 844, textAutoResize: 'HEIGHT', fontSize: 11, color: '#21395A' });

  const cta = item.appCtaLabelByState
    ? `cta[live=${item.appCtaLabelByState.live}; waiting_room=${item.appCtaLabelByState.waiting_room}; upcoming=${item.appCtaLabelByState.upcoming}; ended=${item.appCtaLabelByState.ended}]`
    : `cta[live=${item.ctaLive}; waiting_room=${item.ctaWaitingRoom}; upcoming=${item.ctaUpcoming}; ended=${item.ctaEnded}]`;
  await createText(row, `category=${item.categoryTheme} • duration=${item.durationMinutes} min • treatment=${item.treatment} • ${cta}`, {
    x: 208,
    y: 100,
    width: 844,
    textAutoResize: 'HEIGHT',
    fontSize: 10,
    color: '#35577D',
  });

  await createText(row, `metadata: ${item.stateMetadata || ''} ${item.scheduleType ? `• schedule=${item.scheduleType}` : ''}`, {
    x: 208,
    y: 120,
    width: 844,
    textAutoResize: 'HEIGHT',
    fontSize: 10,
    color: '#456486',
  });

  const script = safeString(item.script, '').trim();
  const scriptText = script.length > 0 ? script : 'No long-form script provided for this row.';
  const scriptNode = await createText(row, `script: ${scriptText}`, {
    x: 208,
    y: 142,
    width: 844,
    textAutoResize: 'HEIGHT',
    fontSize: 10,
    color: '#26466D',
  });

  const rowHeight = Math.max(220, scriptNode.y + scriptNode.height + 14);
  row.resize(1080, rowHeight);
  return row;
}

async function buildEventLibraryPage(page, bundle) {
  const events = safeArray(bundle?.data?.eventContent);
  const series = safeArray(bundle?.data?.canonicalSeries);

  await createText(page, `Event/live content library (${events.length + series.length} items)`, {
    x: 40,
    y: 24,
    fontSize: 28,
    bold: true,
    color: '#0F1B2D',
  });
  await addSpecReferenceNote(page, bundle, 'Event/live content library', 40, 60, 1120);

  let y = 118;
  const sections = [
    { title: `Event templates (${events.length})`, items: events, prefix: 'EventTemplateRow' },
    { title: `Canonical series (${series.length})`, items: series, prefix: 'CanonicalSeriesRow' },
  ];

  for (const sectionData of sections) {
    const section = figma.createFrame();
    section.name = `Library/Event/${sectionData.title.replace(/\s+/g, '')}`;
    section.fills = [paint('#F9FBFF')];
    section.strokes = [paint('#D8E5F3')];
    section.cornerRadius = 12;

    await createText(section, sectionData.title, { x: 16, y: 14, fontSize: 16, bold: true, color: '#122340' });

    let rowY = 42;
    for (const item of sectionData.items) {
      const row = await createEventRow(item, sectionData.prefix);
      row.x = 14;
      row.y = rowY;
      section.appendChild(row);
      rowY += row.height + 10;
    }

    section.resize(1110, rowY + 14);
    section.x = 40;
    section.y = y;
    page.appendChild(section);
    y += section.height + 20;
  }

  return { eventRows: events.length, canonicalSeriesRows: series.length };
}

async function buildMotionPage(page, bundle) {
  await createText(page, 'Motion/background references (canonical)', { x: 40, y: 24, fontSize: 28, bold: true, color: '#0F1B2D' });
  await addSpecReferenceNote(page, bundle, 'Motion/background references', 40, 60, 1120);

  const surfaceRows = safeArray(bundle?.data?.motionLayerIndex);
  const grouped = groupBy(surfaceRows, (row) => row.surface);

  const entries = [];
  for (const [surface, rows] of grouped.entries()) {
    if (surface === 'Global Pulse globe') {
      entries.push({ name: 'Global Pulse inline', source: surface, rows });
      entries.push({ name: 'Global Pulse fullscreen', source: surface, rows });
    } else {
      entries.push({ name: surface, source: surface, rows });
    }
  }

  let x = 40;
  let y = 118;
  let col = 0;
  for (const entry of entries) {
    const frame = figma.createFrame();
    frame.name = `Motion/${entry.name.replace(/\s+/g, '')}`;
    frame.resize(540, 420);
    frame.fills = [paint('#F7FAFF')];
    frame.strokes = [paint('#D8E5F6')];
    frame.cornerRadius = 12;

    await createText(frame, entry.name, { x: 16, y: 12, fontSize: 16, bold: true, color: '#11243F' });

    const firstRow = entry.rows[0] || {};
    await createText(frame, `Role: ${firstRow.intendedRole || ''}`, {
      x: 16,
      y: 36,
      width: 508,
      textAutoResize: 'HEIGHT',
      fontSize: 11,
      color: '#2D4C74',
    });
    await createText(frame, `Reduced motion: ${firstRow.reducedMotionExpectation || ''}`, {
      x: 16,
      y: 56,
      width: 508,
      textAutoResize: 'HEIGHT',
      fontSize: 10,
      color: '#3D5D83',
    });

    let layerY = 92;
    const sorted = entry.rows.slice().sort((a, b) => parseMaybeNumber(a.layerOrder, 0) - parseMaybeNumber(b.layerOrder, 0));
    for (const layer of sorted) {
      createRect(frame, {
        x: 16,
        y: layerY,
        width: 508,
        height: 42,
        name: `Layer/${layer.layerOrder}-${layer.layerName}`,
        fill: '#DEEAF9',
        stroke: '#AFC6E3',
        cornerRadius: 8,
      });
      await createText(frame, `${layer.layerOrder}. ${layer.layerName}`, {
        x: 24,
        y: layerY + 12,
        width: 496,
        textAutoResize: 'HEIGHT',
        fontSize: 11,
        color: '#1F4269',
      });
      layerY += 48;
    }

    frame.resize(540, Math.max(420, layerY + 16));
    frame.x = x;
    frame.y = y;
    page.appendChild(frame);

    if (col === 0) {
      col = 1;
      x = 620;
    } else {
      col = 0;
      x = 40;
      y += frame.height + 24;
    }
  }

  return { motionSurfaceCount: entries.length };
}

function createPage(name, clearExisting) {
  const existing = figma.root.children.filter((node) => node.type === 'PAGE' && node.name === name);
  if (clearExisting && existing.length > 0) {
    const page = existing[0];
    while (page.children.length > 0) {
      page.children[0].remove();
    }
    if (existing.length > 1) {
      for (const duplicate of existing.slice(1)) {
        duplicate.remove();
      }
    }
    return page;
  }

  if (!clearExisting && existing.length > 0) {
    const suffix = existing.length + 1;
    name = `${name} (${suffix})`;
  }

  const page = figma.createPage();
  page.name = name;
  return page;
}

async function buildFigmaFromBundle(bundle, options) {
  const clearExisting = !!options?.clearExisting;
  await ensureBaseFonts();

  const stats = {
    pagesCreated: 0,
    screenRoutesCovered: 0,
    screenFramesCreated: 0,
    prayerRowsCreated: 0,
    eventRowsCreated: 0,
    canonicalSeriesRowsCreated: 0,
  };
  const targetPageNames = safeArray(bundle?.manifest?.figmaPageOrder).slice();
  let lastBuiltPage = null;

  for (const pageName of targetPageNames) {
    const page = createPage(pageName, clearExisting);
    lastBuiltPage = page;
    stats.pagesCreated += 1;

    if (pageName === 'Design system') {
      await buildDesignSystemPage(page, bundle);
    } else if (pageName === 'Components') {
      await buildComponentsPage(page, bundle);
    } else if (pageName === 'Home / Solo' || pageName === 'Circles' || pageName === 'Live' || pageName === 'Profile / Settings') {
      const screenStats = await buildScreenCollectionPage(page, bundle, pageName);
      stats.screenRoutesCovered += screenStats.routeCount;
      stats.screenFramesCreated += screenStats.frameCount;
    } else if (pageName === 'States') {
      await buildStatesPage(page, bundle);
    } else if (pageName === 'Prayer content library') {
      const prayerStats = await buildPrayerLibraryPage(page, bundle);
      stats.prayerRowsCreated += prayerStats.prayerRows;
    } else if (pageName === 'Event/live content library') {
      const eventStats = await buildEventLibraryPage(page, bundle);
      stats.eventRowsCreated += eventStats.eventRows;
      stats.canonicalSeriesRowsCreated += eventStats.canonicalSeriesRows;
    } else if (pageName === 'Motion/background references') {
      await buildMotionPage(page, bundle);
    }
  }

  if (lastBuiltPage) {
    figma.currentPage = lastBuiltPage;
  }

  const existingPageNames = figma.root.children
    .filter((node) => node.type === 'PAGE')
    .map((node) => node.name);
  const canonicalFound = targetPageNames.filter((name) => existingPageNames.includes(name));
  const canonicalMissing = targetPageNames.filter((name) => !existingPageNames.includes(name));
  stats.canonicalPageNames = targetPageNames;
  stats.canonicalPagesFound = canonicalFound;
  stats.canonicalPagesMissing = canonicalMissing;
  stats.currentPageAfterImport = figma.currentPage ? figma.currentPage.name : null;

  return stats;
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'validate-bundle') {
      const bundle = parseBundleText(msg.bundleText);
      const validation = validateBundle(bundle);
      send('validation-result', { validation });
      return;
    }

    if (msg.type === 'import-bundle') {
      const bundle = parseBundleText(msg.bundleText);
      const validation = validateBundle(bundle);
      send('validation-result', { validation });

      if (validation.errors.length > 0) {
        send('import-error', { message: 'Bundle validation failed. Resolve errors before import.' });
        return;
      }

      if (msg.dryRun) {
        send('dry-run-result', { summary: validation.summary });
        return;
      }

      send('log', { message: 'Import started. Building canonical pages and editable structures...' });
      const stats = await buildFigmaFromBundle(bundle, { clearExisting: !!msg.clearExisting });

      send('import-complete', {
        stats,
        expected: {
          pageCount: 10,
          canonicalScreens: 20,
          prayers: 62,
          eventTemplates: 61,
          canonicalSeries: 6,
        },
      });
      return;
    }

    if (msg.type === 'close-plugin') {
      figma.closePlugin('EgregorV2 staging importer closed.');
    }
  } catch (error) {
    send('import-error', { message: error?.message || String(error) });
  }
};
