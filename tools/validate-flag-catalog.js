#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--inventory') args.inventory = argv[++i];
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log([
    'Usage:',
    '  node tools/validate-flag-catalog.js [--inventory data/shirt_inventory.json]',
    '',
    'Checks:',
    '  - 50 expected U.S. state flag products',
    '  - Washington DC city flag product',
    '  - current metadata grouping for state flags and city flags',
  ].join('\n'));
}

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/state flag/g, '')
    .replace(/\bflag\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const inventoryPath = path.resolve(args.inventory || path.join(__dirname, '../data/shirt_inventory.json'));
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const spreadshirtRows = inventory.filter((row) => row.platform === 'Spreadshirt');

  const stateFlagRows = spreadshirtRows.filter((row) => row.sub_theme === 'State flags');
  const cityFlagRows = spreadshirtRows.filter((row) => row.sub_theme === 'City flags' || (row.tags || []).includes('city-flags'));

  const stateFlagNameSet = new Set(
    stateFlagRows.map((row) => normalize(row.shirt_name || row.name || ''))
  );

  const missingStates = STATES.filter((state) => !stateFlagNameSet.has(normalize(state)));
  const dcRows = spreadshirtRows.filter((row) => /washington dc flag/i.test(row.shirt_name || row.name || ''));

  console.log(JSON.stringify({
    inventoryPath,
    totalSpreadshirtRows: spreadshirtRows.length,
    stateFlagCount: stateFlagRows.length,
    missingStates,
    cityFlagCount: cityFlagRows.length,
    washingtonDcRows: dcRows.map((row) => ({
      shirt_name: row.shirt_name || row.name || '',
      sub_theme: row.sub_theme || '',
      tags: row.tags || [],
      idea_id: row.idea_id || row.shirt_id || '',
    })),
    cityFlagNames: cityFlagRows.map((row) => row.shirt_name || row.name || '').sort(),
  }, null, 2));
}

main();
