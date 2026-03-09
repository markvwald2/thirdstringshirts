#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--apply') args.apply = true;
    else if (t === '--inventory') args.inventory = argv[++i];
    else if (t === '--report') args.report = argv[++i];
    else if (t === '--shop-id') args.shopId = argv[++i];
    else if (t === '--shop-url') args.shopUrl = argv[++i];
    else if (t === '--api-key') args.apiKey = argv[++i];
    else if (t === '--api-secret') args.apiSecret = argv[++i];
    else if (t === '--help' || t === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/sync-spreadshirt-inventory.js [--apply] [--inventory data/shirt_inventory.json] [--report tools/api_sync_report.json]',
    '',
    'Required env/args:',
    '  SPREADSHOP_API_KEY, SPREADSHOP_API_SECRET, SPREADSHOP_SHOP_ID, SPREADSHOP_SHOP_URL',
    '',
    'Behavior:',
    '  - Default: read-only audit + report output',
    '  - --apply: writes normalized id/url updates into inventory JSON',
  ].join('\n'));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractIdeaId(url) {
  const m = String(url || '').match(/[?&]idea=([^&#]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

function extractDesignId(url) {
  const m = String(url || '').match(/D(\d{6,})/);
  return m ? m[1] : '';
}

function authHeader(url, apiKey, apiSecret) {
  const now = Date.now();
  const data = `GET ${url} ${now}`;
  const sig = crypto
    .createHash('sha1')
    .update(`${data} ${apiSecret}`)
    .digest('hex');
  return `SprdAuth apiKey="${apiKey}", data="${data}", sig="${sig}"`;
}

async function fetchSellablesPage(shopId, page, apiKey, apiSecret) {
  const url = `https://api.spreadshirt.com/api/v1/shops/${shopId}/sellables?mediaType=json&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(url, apiKey, apiSecret),
      Accept: 'application/json',
      'User-Agent': 'shirtclawd-api-sync/1.0',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} page=${page} ${body.slice(0, 200)}`);
  }
  const payload = await res.json();
  return payload.sellables || [];
}

async function fetchAllSellables(shopId, apiKey, apiSecret) {
  const rows = [];
  for (let page = 1; page <= 500; page += 1) {
    const part = await fetchSellablesPage(shopId, page, apiKey, apiSecret);
    if (!part.length) break;
    rows.push(...part);
  }
  return rows;
}

function buildApiMaps(rows) {
  const byIdea = new Map();
  const byDesign = new Map();
  const byNormName = new Map();

  for (const s of rows) {
    const ideaId = String(s.ideaId || '').trim();
    const designId = String(s.mainDesignId || '').trim();
    const name = String(s.name || '').trim();
    const previewImageUrl = String((s.previewImage && s.previewImage.url) || '').trim();
    if (!ideaId) continue;

    const rec = { ideaId, designId, name, previewImageUrl };
    if (!byIdea.has(ideaId)) byIdea.set(ideaId, rec);
    if (designId && !byDesign.has(designId)) byDesign.set(designId, rec);
    const key = normalize(name);
    if (key && !byNormName.has(key)) byNormName.set(key, rec);
  }

  return { byIdea, byDesign, byNormName };
}

function toProductUrl(shopUrl, shirtName, ideaId) {
  const base = String(shopUrl || '').replace(/\/+$/, '');
  return `${base}/${slugify(shirtName)}?idea=${ideaId}`;
}

function reconcileInventory(inventory, maps, shopUrl) {
  let applied = 0;
  const unresolvedLocal = [];

  const localIdeaSet = new Set();
  const apiMatchedSet = new Set();

  for (const row of inventory) {
    const platform = String(row.platform || '');
    if (platform !== 'Spreadshirt') continue;

    const shirtName = row.shirt_name || row.name || '';
    const imageUrl = row.image_url || row.URL || '';
    const currentIdea = row.shirt_id || row.idea_id || extractIdeaId(row.product_url);
    const designId = extractDesignId(imageUrl);

    let match = null;
    let matchType = '';

    if (currentIdea && maps.byIdea.has(String(currentIdea))) {
      match = maps.byIdea.get(String(currentIdea));
      matchType = 'idea_id';
    }

    if (!match && designId && maps.byDesign.has(designId)) {
      match = maps.byDesign.get(designId);
      matchType = 'design_id';
    }

    if (!match) {
      const key = normalize(shirtName);
      if (key && maps.byNormName.has(key)) {
        match = maps.byNormName.get(key);
        matchType = 'name';
      }
    }

    if (!match) {
      unresolvedLocal.push({
        shirt_name: shirtName,
        current_shirt_id: row.shirt_id || row.idea_id || '',
        current_product_url: row.product_url || '',
      });
      continue;
    }

    const nextIdea = match.ideaId;
    const nextUrl = row.product_url || toProductUrl(shopUrl, shirtName, nextIdea);

    localIdeaSet.add(nextIdea);
    apiMatchedSet.add(nextIdea);

    const changed =
      (row.shirt_id || '') !== nextIdea ||
      (row.idea_id || '') !== nextIdea ||
      (row.product_url || '') !== nextUrl ||
      (row.image_url || row.URL || '') !== (row.image_url || row.URL || '');

    if (changed) {
      applied += 1;
      row.shirt_id = nextIdea;
      row.idea_id = nextIdea;
      row.product_url = nextUrl;
      row.shirt_name = shirtName;
      row.name = shirtName;
      row.image_url = imageUrl;
      row.URL = imageUrl;
      row.source_of_truth = 'local';
      row.source_match = `api_${matchType}`;
    }
  }

  const apiOnly = [];
  for (const [ideaId, rec] of maps.byIdea.entries()) {
    if (!localIdeaSet.has(ideaId)) {
      apiOnly.push({ idea_id: ideaId, api_name: rec.name, api_design_id: rec.designId });
    }
  }

  return {
    applied,
    unresolvedLocal,
    apiOnly,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const apiKey = args.apiKey || process.env.SPREADSHOP_API_KEY;
  const apiSecret = args.apiSecret || process.env.SPREADSHOP_API_SECRET;
  const shopId = args.shopId || process.env.SPREADSHOP_SHOP_ID;
  const shopUrl = args.shopUrl || process.env.SPREADSHOP_SHOP_URL;

  if (!apiKey || !apiSecret || !shopId || !shopUrl) {
    usage();
    process.exit(1);
  }

  const inventoryPath = path.resolve(args.inventory || path.join(__dirname, '../data/shirt_inventory.json'));
  const reportPath = path.resolve(args.report || path.join(__dirname, 'api_sync_report.json'));

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const sellables = await fetchAllSellables(shopId, apiKey, apiSecret);
  const maps = buildApiMaps(sellables);
  const result = reconcileInventory(inventory, maps, shopUrl);

  const summary = {
    generatedAt: new Date().toISOString(),
    inventoryPath,
    reportPath,
    inventoryRows: inventory.length,
    spreadshirtRows: inventory.filter((x) => x.platform === 'Spreadshirt').length,
    etsyRows: inventory.filter((x) => x.platform === 'Etsy').length,
    apiSellables: sellables.length,
    apiUniqueIdeas: maps.byIdea.size,
    rowsUpdatedIfApply: result.applied,
    unresolvedLocalCount: result.unresolvedLocal.length,
    apiOnlyCount: result.apiOnly.length,
    applyMode: args.apply,
  };

  const report = {
    summary,
    unresolvedLocal: result.unresolvedLocal,
    apiOnly: result.apiOnly,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (args.apply) {
    fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
