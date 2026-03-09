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
