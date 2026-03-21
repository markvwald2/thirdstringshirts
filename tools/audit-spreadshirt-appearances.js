#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--inventory') args.inventory = argv[++i];
    else if (token === '--shop-url') args.shopUrl = argv[++i];
    else if (token === '--reference') args.reference = argv[++i];
    else if (token === '--audit') args.audit = argv[++i];
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/audit-spreadshirt-appearances.js [--inventory data/shirt_inventory.json] [--shop-url https://thirdstringshirts.myspreadshop.com/]',
    '',
    'Outputs:',
    '  - tools/spreadshirt_appearance_reference.json',
    '  - tools/spreadshirt_appearance_audit.json',
  ].join('\n'));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '+')
    .replace(/^\++|\++$/g, '');
}

function decodeEscapes(value) {
  return String(value || '')
    .replace(/\\u0027/g, "'")
    .replace(/\\u0026/g, '&')
    .replace(/\\u2019/g, "'")
    .replace(/\\u00e9/g, 'e');
}

function extractTrailingAppearanceId(url) {
  const match = String(url || '').match(/appearanceId=(\d+)/);
  return match ? match[1] : '';
}

function extractEmbeddedAppearanceId(url) {
  const match = String(url || '').match(/\/compositions\/T\d+A(\d+)P/i);
  return match ? match[1] : '';
}

function extractIdeaId(row) {
  return String(row.idea_id || row.shirt_id || '').trim();
}

function buildStorefrontUrl(shopUrl, shirtName, ideaId) {
  const base = String(shopUrl || '').replace(/\/+$/, '');
  return `${base}/${slugify(shirtName)}?idea=${encodeURIComponent(ideaId)}`;
}

function collectAppearanceStats(rows) {
  const counts = new Map();
  for (const row of rows) {
    const imageUrl = row.image_url || row.URL || '';
    const appearanceId = extractTrailingAppearanceId(imageUrl);
    if (!appearanceId) continue;
    counts.set(appearanceId, (counts.get(appearanceId) || 0) + 1);
  }
  return counts;
}

function buildAudit(rows) {
  const mismatches = [];
  for (const row of rows) {
    const imageUrl = row.image_url || row.URL || '';
    const embeddedAppearanceId = extractEmbeddedAppearanceId(imageUrl);
    const trailingAppearanceId = extractTrailingAppearanceId(imageUrl);
    if (!embeddedAppearanceId || !trailingAppearanceId) continue;
    if (embeddedAppearanceId === trailingAppearanceId) continue;
    mismatches.push({
      shirt_name: row.shirt_name || row.name || '',
      idea_id: extractIdeaId(row),
      embedded_appearance_id: embeddedAppearanceId,
      trailing_appearance_id: trailingAppearanceId,
      image_url: imageUrl,
    });
  }
  return mismatches;
}

function parseAppearanceNamesFromHtml(html, targetIds) {
  const matches = new Map();
  const regex = /"id":\s*"?(?<id>\d+)"?[^"\n]{0,80}?"name":\s*"(?<name>[^"]+)"/g;
  for (const result of html.matchAll(regex)) {
    const id = result.groups && result.groups.id;
    const name = result.groups && result.groups.name;
    if (!id || !targetIds.has(id)) continue;
    if (matches.has(id)) continue;
    matches.set(id, decodeEscapes(name));
  }
  return matches;
}

async function buildReference(rows, shopUrl) {
  const counts = collectAppearanceStats(rows);
  const targetIds = new Set([...counts.keys()]);
  const names = new Map();
  const sampleProducts = new Map();
  let pagesFetched = 0;
  let pagesWithoutNewMatches = 0;

  for (const row of rows) {
    if (names.size === targetIds.size) break;
    if (pagesFetched >= 80) break;
    if (pagesWithoutNewMatches >= 20) break;

    const shirtName = row.shirt_name || row.name || '';
    const ideaId = extractIdeaId(row);
    if (!shirtName || !ideaId) continue;

    const storefrontUrl = buildStorefrontUrl(shopUrl, shirtName, ideaId);
    try {
      const res = await fetch(storefrontUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'shirtclawd-appearance-audit/1.0',
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      pagesFetched += 1;
      const pageMatches = parseAppearanceNamesFromHtml(html, targetIds);
      let foundNewMatch = false;
      for (const [id, name] of pageMatches.entries()) {
        if (!names.has(id)) {
          names.set(id, name);
          sampleProducts.set(id, shirtName);
          foundNewMatch = true;
        }
      }
      pagesWithoutNewMatches = foundNewMatch ? 0 : pagesWithoutNewMatches + 1;
    } catch (error) {
      // Ignore individual fetch failures and keep collecting.
    }
  }

  const reference = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([appearanceId, count]) => ({
      appearance_id: appearanceId,
      count,
      name: names.get(appearanceId) || null,
      sample_product: sampleProducts.get(appearanceId) || null,
    }));

  return {
    generatedAt: new Date().toISOString(),
    pagesFetched,
    totalUniqueAppearanceIds: counts.size,
    resolvedAppearanceNames: names.size,
    appearances: reference,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const inventoryPath = path.resolve(args.inventory || path.join(__dirname, '../data/shirt_inventory.json'));
  const shopUrl = args.shopUrl || process.env.SPREADSHOP_SHOP_URL || 'https://thirdstringshirts.myspreadshop.com/';
  const referencePath = path.resolve(args.reference || path.join(__dirname, 'spreadshirt_appearance_reference.json'));
  const auditPath = path.resolve(args.audit || path.join(__dirname, 'spreadshirt_appearance_audit.json'));

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const spreadshirtRows = inventory.filter((row) => row.platform === 'Spreadshirt');

  const reference = await buildReference(spreadshirtRows, shopUrl);
  const mismatches = buildAudit(spreadshirtRows);
  const audit = {
    generatedAt: new Date().toISOString(),
    inventoryPath,
    totalSpreadshirtRows: spreadshirtRows.length,
    mismatchCount: mismatches.length,
    mismatches,
  };

  fs.writeFileSync(referencePath, `${JSON.stringify(reference, null, 2)}\n`, 'utf8');
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    referencePath,
    auditPath,
    resolvedAppearanceNames: reference.resolvedAppearanceNames,
    totalUniqueAppearanceIds: reference.totalUniqueAppearanceIds,
    mismatchCount: mismatches.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
