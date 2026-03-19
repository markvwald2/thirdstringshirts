#!/usr/bin/env node

const fs = require('fs');

const report = JSON.parse(fs.readFileSync('tools/api_sync_report.json', 'utf8'));

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '+')
    .replace(/^\++|\++$/g, '');
}

async function main() {
  const results = [];
  for (const row of report.unresolvedLocal) {
    const slug = slugify(row.shirt_name);
    const url = `https://thirdstringshirts.myspreadshop.com/${slug}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'shirtclawd-reconcile/1.0',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    const normalized = html.replace(/\s+/g, ' ');
    results.push({
      shirt_name: row.shirt_name,
      requested_url: url,
      final_url: res.url,
      title: (normalized.match(/<title>([^<]+)<\/title>/i) || [])[1] || '',
      headline: (normalized.match(/"headline":"([^"]+)"/) || [])[1] || '',
      idea_id: (normalized.match(/"ideaId":"([^"]+)"/) || [])[1] || '',
      image_url: (normalized.match(/"imageURLs":\["([^"]+)"/) || [])[1] || '',
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
