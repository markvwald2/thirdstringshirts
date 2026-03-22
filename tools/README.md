# Tools

This folder contains utility pages for managing and previewing storefront data/styles.

## 1) Tagline Editor

- File: `tagline-editor.html`
- Purpose: Edit shirt taglines and export an updated `taglines.json`.
- Notes:
  - Self-contained for `file://` use (open directly from Finder).
  - Includes search and theme toggles (`Funny`, `Geography`, `CTA`, etc.).

## 2) Shirt Inventory Viewer

- File: `shirt-inventory-viewer.html`
- Purpose: Browse/edit inventory metadata (`shirt_name`, `theme`, `sub_theme`, `tags`, `product_url`) and export updated JSON.
- Data source order:
  1. `../data/shirt_inventory.json` (canonical project file)
  2. `./shirt_inventory.json` (local fallback, if present)
- Direct Finder use:
  - Open `shirt-inventory-viewer.html`.
  - If opened via `file://`, it will prompt you to pick `data/shirt_inventory.json`.
- Run (optional):

```bash
cd tools
python3 -m http.server 8000
```

Open: `http://localhost:8000/shirt-inventory-viewer.html`

## 3) Carousel Background Preview

- File: `carousel-bg-preview.html`
- Purpose: Visual preview of carousel sport background treatments.
- Notes:
  - Can be opened directly from Finder.

## 4) Spreadshirt API Inventory Sync

- File: `sync-spreadshirt-inventory.js`
- Purpose: Compare live Spreadshirt sellables to local inventory and optionally normalize local Spreadshirt IDs/URLs.
- Canonical local inventory:
  - `../data/shirt_inventory.json`
- Required environment variables:
  - `SPREADSHOP_API_KEY`
  - `SPREADSHOP_API_SECRET`
  - `SPREADSHOP_SHOP_ID`
  - `SPREADSHOP_SHOP_URL`
- Read-only audit:

```bash
node tools/sync-spreadshirt-inventory.js
```

- Apply matched normalization updates:

```bash
node tools/sync-spreadshirt-inventory.js --apply
```

- Optional overrides:
  - `--inventory data/shirt_inventory.json`
  - `--report tools/api_sync_report.json`

## 5) Artwork Ratio Report

- File: `report-artwork-ratios.js`
- Purpose: Fetch Spreadshirt design dimensions and bucket each artwork into a reusable placement template ratio such as `3:1`, `2:1`, `4:3`, or `1:1`.
- Canonical local inventory:
  - `../data/shirt_inventory.json`
- Output:
  - `tools/artwork_ratio_report.json`
- Run:

```bash
node tools/report-artwork-ratios.js
```

- Optional overrides:
  - `--inventory data/shirt_inventory.json`
  - `--output tools/artwork_ratio_report.json`
  - `--limit 25`

## 6) Flag Catalog Validator

- File: `validate-flag-catalog.js`
- Purpose: Check that the inventory contains all 50 state flags plus the Washington DC city flag, and confirm their current metadata grouping.
- Canonical local inventory:
  - `../data/shirt_inventory.json`
- Run:

```bash
node tools/validate-flag-catalog.js
```

- Optional overrides:
  - `--inventory data/shirt_inventory.json`
