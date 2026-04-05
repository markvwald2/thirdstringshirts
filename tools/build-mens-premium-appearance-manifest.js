#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PRODUCT_TYPE_ID = '812';

function parseArgs(argv) {
  const args = {
    inventory: path.join(__dirname, '../data/shirt_inventory.json'),
    output: path.join(__dirname, 'mens-premium-appearance-manifest.json'),
    shopUrl: process.env.SPREADSHOP_SHOP_URL || 'https://thirdstringshirts.myspreadshop.com/',
    limit: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--inventory') args.inventory = argv[++i];
    else if (token === '--output') args.output = argv[++i];
    else if (token === '--shop-url') args.shopUrl = argv[++i];
    else if (token === '--limit') args.limit = Number(argv[++i] || '0') || 0;
    else if (token === '--help' || token === '-h') args.help = true;
  }

  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/build-mens-premium-appearance-manifest.js [--inventory data/shirt_inventory.json] [--output tools/mens-premium-appearance-manifest.json] [--shop-url https://thirdstringshirts.myspreadshop.com/] [--limit N]',
    '',
    'Behavior:',
    '  - Fetches each Spreadshirt design page',
    '  - Extracts Men\'s Premium T-shirt (productType 812) appearance options',
    '  - Writes a local manifest for tools/shirt-inventory-viewer.html',
  ].join('\n'));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '+')
    .replace(/^\++|\++$/g, '');
}

function buildStorefrontUrl(shopUrl, shirtName, ideaId) {
  const base = String(shopUrl || '').replace(/\/+$/, '');
  return `${base}/${slugify(shirtName)}?idea=${encodeURIComponent(ideaId)}`;
}

function rewriteAppearanceUrl(url, appearanceId) {
  const appearance = String(appearanceId || '').trim();
  if (!url || !appearance) return '';

  return String(url)
    .replace(/T\d+A\d+/i, `${'T'}${PRODUCT_TYPE_ID}A${appearance}`)
    .replace(/appearanceId=\d+/i, `appearanceId=${appearance}`);
}

function extractJsonObject(html, key, nextKey) {
  const source = String(html || '');
  const keyIndex = source.indexOf(`"${key}":`);
  if (keyIndex === -1) return null;
  const objectStart = source.indexOf('{', keyIndex);
  if (objectStart === -1) return null;
  const nextIndex = source.indexOf(`,"${nextKey}":`, objectStart);
  if (nextIndex === -1) return null;

  try {
    return JSON.parse(source.slice(objectStart, nextIndex));
  } catch (error) {
    return null;
  }
}

function extractOgImageTemplate(html) {
  const match = String(html || '').match(/"imageURLs":\["([^"]+)"/);
  return match ? match[1] : '';
}

async function fetchAppearanceRecord(storefrontUrl) {
  const res = await fetch(storefrontUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'thirdstringshirts-mens-premium-manifest/1.0',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      finalUrl: res.url || storefrontUrl,
      appearances: [],
    };
  }

  const html = await res.text();
  const normalized = html.replace(/\s+/g, ' ');
  const productTypes = extractJsonObject(normalized, 'productTypes', 'collections');
  const mensPremium = productTypes && productTypes[PRODUCT_TYPE_ID];
  const appearances = Array.isArray(mensPremium && mensPremium.appearances)
    ? mensPremium.appearances
    : [];
  const templateUrl = extractOgImageTemplate(normalized);

  return {
    ok: true,
    status: res.status,
    finalUrl: res.url || storefrontUrl,
    templateUrl,
    appearances: appearances.map((appearance) => ({
      id: String(appearance.id || ''),
      name: String(appearance.name || ''),
      in_stock: !!appearance.inStock,
      bright_color: !!appearance.brightColor,
      color_hex: Array.isArray(appearance.colors) && appearance.colors[0] ? appearance.colors[0] : '',
      preview_url: rewriteAppearanceUrl(templateUrl, appearance.id),
    })).filter((appearance) => appearance.id),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const inventoryPath = path.resolve(args.inventory);
  const outputPath = path.resolve(args.output);
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const manifest = {};
  let inspected = 0;

  for (const row of inventory) {
    if (String(row.platform || '') !== 'Spreadshirt') continue;
    const ideaId = String(row.idea_id || row.shirt_id || '').trim();
    const shirtName = String(row.shirt_name || row.name || '').trim();
    if (!ideaId || !shirtName) continue;
    if (args.limit > 0 && inspected >= args.limit) break;

    inspected += 1;
    const storefrontUrl = buildStorefrontUrl(args.shopUrl, shirtName, ideaId);
    const record = await fetchAppearanceRecord(storefrontUrl);

    manifest[ideaId] = {
      shirt_name: shirtName,
      storefront_url: storefrontUrl,
      final_url: record.finalUrl || storefrontUrl,
      ok: record.ok,
      status: record.status,
      product_type_id: PRODUCT_TYPE_ID,
      appearances: record.appearances || [],
    };
  }

  const output = {
    generatedAt: new Date().toISOString(),
    inventoryPath,
    outputPath,
    productTypeId: PRODUCT_TYPE_ID,
    totalRecords: Object.keys(manifest).length,
    manifest,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    inspected,
    totalRecords: output.totalRecords,
    outputPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
