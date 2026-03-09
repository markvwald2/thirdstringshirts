# Spreadshirt API Sync Process

This process keeps `data/shirt_inventory.json` aligned with active Spreadshirt inventory while preserving local metadata as source of truth.

## Source of Truth

- Local metadata source of truth: `theme`, `sub_theme`, `tags`, `tone`, `priority`, `evergreen`, and final `shirt_name`.
- Spreadshirt source of truth: active idea IDs and sellable availability.

## Required Environment Variables

- `SPREADSHOP_API_KEY`
- `SPREADSHOP_API_SECRET`
- `SPREADSHOP_SHOP_ID`
- `SPREADSHOP_SHOP_URL`

Example:

```bash
export SPREADSHOP_API_KEY='...'
export SPREADSHOP_API_SECRET='...'
export SPREADSHOP_SHOP_ID='237952'
export SPREADSHOP_SHOP_URL='https://thirdstringshirts.myspreadshop.com/'
```

## 1) Audit (No Writes)

```bash
node tools/sync-spreadshirt-inventory.js
```

This writes `tools/api_sync_report.json` with:
- `unresolvedLocal`: local Spreadshirt rows not matched to API ideas.
- `apiOnly`: active API ideas missing from local inventory.

## 2) Apply Normalization Updates

```bash
node tools/sync-spreadshirt-inventory.js --apply
```

This updates `data/shirt_inventory.json` for matched Spreadshirt rows:
- `shirt_id`
- `idea_id`
- `product_url` (if missing)
- compatibility fields: `name`, `URL`
- tracking fields: `source_of_truth`, `source_match`

## 3) Review and Curate

- Open `shirt-inventory-viewer.html`
- Resolve anything from `tools/api_sync_report.json`
- Curate metadata fields as needed

## 4) Commit

Commit both files when applicable:
- `data/shirt_inventory.json`
- `tools/api_sync_report.json`
