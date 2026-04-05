#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    inventory: path.join(__dirname, '../data/shirt_inventory.json'),
    apply: false,
    limit: 0,
    shopUrl: process.env.SPREADSHOP_SHOP_URL || 'https://thirdstringshirts.myspreadshop.com/',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--apply') args.apply = true;
    else if (token === '--inventory') args.inventory = argv[++i];
    else if (token === '--limit') args.limit = Number(argv[++i] || '0') || 0;
    else if (token === '--shop-url') args.shopUrl = argv[++i];
    else if (token === '--help' || token === '-h') args.help = true;
  }

  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/backfill-share-preview-images.js [--apply] [--inventory data/shirt_inventory.json] [--limit N] [--shop-url https://thirdstringshirts.myspreadshop.com/]',
    '',
    'Behavior:',
    '  - Fetches each Spreadshirt product page from product_url',
    '  - Extracts the storefront preview image from the page payload',
    '  - Default: audit only',
    '  - --apply: writes share_image_url back into inventory JSON',
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

function extractPreviewImageUrl(html) {
  const normalized = String(html || '').replace(/\s+/g, ' ');
  const match = normalized.match(/"imageURLs":\["([^"]+)"/);
  return match ? match[1] : '';
}

async function fetchPreviewImage(storefrontUrl) {
  const res = await fetch(storefrontUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'thirdstringshirts-share-image-backfill/1.0',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      finalUrl: res.url || storefrontUrl,
      previewImageUrl: '',
    };
  }

  const html = await res.text();
  return {
    ok: true,
    status: res.status,
    finalUrl: res.url || storefrontUrl,
    previewImageUrl: extractPreviewImageUrl(html),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const inventoryPath = path.resolve(args.inventory);
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const report = [];
  let inspected = 0;
  let updated = 0;

  for (const row of inventory) {
    if (String(row.platform || '') !== 'Spreadshirt') continue;
    const ideaId = row.idea_id || row.shirt_id || '';
    const shirtName = row.shirt_name || row.name || '';
    if (!ideaId || !shirtName) continue;
    if (args.limit > 0 && inspected >= args.limit) break;

    inspected += 1;
    const storefrontUrl = buildStorefrontUrl(args.shopUrl, shirtName, ideaId);
    const result = await fetchPreviewImage(storefrontUrl);
    const nextShareImageUrl = result.previewImageUrl || '';
    const changed = nextShareImageUrl && row.share_image_url !== nextShareImageUrl;

    report.push({
      shirt_name: shirtName,
      product_url: row.product_url || '',
      storefront_url: storefrontUrl,
      final_url: result.finalUrl,
      ok: result.ok,
      status: result.status,
      share_image_url: nextShareImageUrl,
      changed,
    });

    if (!args.apply || !changed) continue;
    row.share_image_url = nextShareImageUrl;
    updated += 1;
  }

  if (args.apply) {
    fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  }

  const resolved = report.filter((entry) => entry.share_image_url).length;
  console.log(JSON.stringify({
    inspected,
    resolved,
    updated,
    apply: args.apply,
    sample: report.slice(0, 10),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
