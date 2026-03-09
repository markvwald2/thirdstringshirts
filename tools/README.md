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
- Run:

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
