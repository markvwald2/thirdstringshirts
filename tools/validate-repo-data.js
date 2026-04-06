#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { routeFromProductUrl, slugSegment } = require("../js/product-utils");

const repoRoot = path.resolve(__dirname, "..");
const inventoryPath = path.join(repoRoot, "data", "shirt_inventory.json");
const taglinePath = path.join(repoRoot, "data", "taglines.json");
const shareRoot = path.join(repoRoot, "shirt");

function shareDirName(item) {
  const base = routeFromProductUrl(
    item.product_url || item.URL || "",
    item.shirt_name || item.name || "shirt"
  ).split("?")[0];
  const routeSlug = slugSegment(
    base.replace(/\+/g, "-"),
    slugSegment(item.shirt_name || item.name || "shirt", "shirt")
  );
  const ideaSlug = slugSegment(item.idea_id || item.shirt_id || item.product_url, "product");
  return `${routeSlug}-${ideaSlug}`;
}

function main() {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const taglines = JSON.parse(fs.readFileSync(taglinePath, "utf8"));
  const issues = [];

  const idCounts = new Map();
  inventory.forEach((item, index) => {
    const id = item.idea_id || item.shirt_id || "";
    const label = item.shirt_name || item.name || `row ${index + 1}`;

    if (!id) {
      issues.push(`Missing idea/shirt ID for inventory row: ${label}`);
    } else {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }

    if (!String(item.product_url || "").trim()) {
      issues.push(`Missing product_url for inventory row: ${label}`);
    }

    const hasImage =
      String(item.image_url || "").trim() ||
      (Array.isArray(item.image_urls) && item.image_urls.some((url) => String(url || "").trim()));
    if (!hasImage) {
      issues.push(`Missing image_url/image_urls for inventory row: ${label}`);
    }
  });

  for (const [id, count] of idCounts.entries()) {
    if (count > 1) {
      issues.push(`Duplicate inventory ID ${id} appears ${count} times.`);
    }
  }

  const inventoryIds = new Set([...idCounts.keys()]);
  Object.keys(taglines)
    .sort()
    .forEach((id) => {
      if (!inventoryIds.has(id)) {
        issues.push(`Orphan tagline for missing inventory ID ${id}.`);
      }
    });

  const expectedSpreadshirtShareDirs = new Set(
    inventory
      .filter((item) => String(item.platform || "").trim().toLowerCase() !== "etsy")
      .map(shareDirName)
  );

  if (fs.existsSync(shareRoot)) {
    const actualShareDirs = fs
      .readdirSync(shareRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    actualShareDirs
      .filter((dir) => !expectedSpreadshirtShareDirs.has(dir))
      .sort()
      .forEach((dir) => issues.push(`Stale generated share page directory: shirt/${dir}`));

    [...expectedSpreadshirtShareDirs]
      .filter((dir) => !actualShareDirs.includes(dir))
      .sort()
      .forEach((dir) => issues.push(`Missing generated share page directory: shirt/${dir}`));
  } else {
    issues.push("Missing shirt/ directory for generated share pages.");
  }

  if (issues.length) {
    console.error("Repo data validation failed:");
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Repo data validation passed for ${inventory.length} inventory rows, ${Object.keys(taglines).length} taglines, and ${expectedSpreadshirtShareDirs.size} generated share pages.`
  );
}

main();
