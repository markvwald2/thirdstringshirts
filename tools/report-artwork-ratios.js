#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--inventory') args.inventory = argv[++i];
    else if (token === '--output') args.output = argv[++i];
    else if (token === '--limit') args.limit = Number(argv[++i]);
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/report-artwork-ratios.js [--inventory data/shirt_inventory.json] [--output tools/artwork_ratio_report.json]',
    '',
    'Behavior:',
    '  - Reads Spreadshirt rows from inventory',
    '  - Fetches each design record from the Spreadshirt API',
    '  - Computes exact aspect ratio from design pixel dimensions',
    '  - Buckets each design into a medium-granularity ratio template',
  ].join('\n'));
}

function extractDesignId(url) {
  const match = String(url || '').match(/D(\d{6,})/);
  return match ? match[1] : '';
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const RATIO_BUCKETS = [
  { label: '5:1', width: 5, height: 1 },
  { label: '4:1', width: 4, height: 1 },
  { label: '3:1', width: 3, height: 1 },
  { label: '5:2', width: 5, height: 2 },
  { label: '2:1', width: 2, height: 1 },
  { label: '3:2', width: 3, height: 2 },
  { label: '4:3', width: 4, height: 3 },
  { label: '5:4', width: 5, height: 4 },
  { label: '1:1', width: 1, height: 1 },
  { label: '4:5', width: 4, height: 5 },
  { label: '3:4', width: 3, height: 4 },
  { label: '2:3', width: 2, height: 3 },
  { label: '1:2', width: 1, height: 2 },
  { label: '2:5', width: 2, height: 5 },
  { label: '1:3', width: 1, height: 3 },
  { label: '1:4', width: 1, height: 4 },
  { label: '1:5', width: 1, height: 5 },
];

function pickBucket(width, height) {
  const ratio = width / height;
  let best = null;

  for (const bucket of RATIO_BUCKETS) {
    const bucketRatio = bucket.width / bucket.height;
    const delta = Math.abs(Math.log(ratio / bucketRatio));
    if (!best || delta < best.delta) {
      best = {
        label: bucket.label,
        ratio: bucketRatio,
        delta,
      };
    }
  }

  return {
    bucket: best.label,
    exactAspectRatio: round(ratio, 3),
    percentOffBucket: round(Math.abs((ratio - best.ratio) / best.ratio) * 100, 1),
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'shirtclawd-artwork-ratio-report/1.0',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  return res.json();
}

async function fetchDesignRecord(designId) {
  const url = `https://api.spreadshirt.com/api/v1/designs/${designId}?mediaType=json`;
  const data = await fetchJson(url);
  return {
    designId,
    name: data.name || '',
    width: data.size && data.size.width,
    height: data.size && data.size.height,
    unit: data.size && data.size.unit,
    format: data.format || '',
    fileExtension: data.fileExtension || '',
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const inventoryPath = path.resolve(args.inventory || path.join(__dirname, '../data/shirt_inventory.json'));
  const outputPath = path.resolve(args.output || path.join(__dirname, 'artwork_ratio_report.json'));
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  const spreadshirtRows = inventory
    .filter((row) => row.platform === 'Spreadshirt')
    .map((row) => ({
      shirt_name: row.shirt_name || row.name || '',
      idea_id: row.idea_id || row.shirt_id || '',
      design_id: extractDesignId(row.image_url || row.URL || ''),
    }))
    .filter((row) => row.design_id);

  const targetRows = Number.isFinite(args.limit) ? spreadshirtRows.slice(0, args.limit) : spreadshirtRows;

  const enriched = await mapWithConcurrency(targetRows, 8, async (row) => {
    const design = await fetchDesignRecord(row.design_id);
    const bucketed = pickBucket(design.width, design.height);
    return {
      shirt_name: row.shirt_name,
      idea_id: row.idea_id,
      design_id: row.design_id,
      dimensions: `${design.width}x${design.height}`,
      exact_aspect_ratio: bucketed.exactAspectRatio,
      bucket: bucketed.bucket,
      width: design.width,
      height: design.height,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    inventoryPath,
    totalSpreadshirtRows: spreadshirtRows.length,
    totalReportedRows: enriched.length,
    designs: enriched.sort((a, b) => {
      return a.shirt_name.localeCompare(b.shirt_name);
    }),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    outputPath,
    totalReportedRows: report.totalReportedRows,
    sample: report.designs.slice(0, 8),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
