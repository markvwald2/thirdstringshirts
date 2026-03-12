#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const inventoryPath = path.join(repoRoot, "data", "shirt_inventory.json");
const taglinePath = path.join(repoRoot, "data", "taglines.json");
const outputRoot = path.join(repoRoot, "shirt");

function slugSegment(value, fallback = "shirt") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function routeFromProductUrl(productUrl, fallbackName) {
  try {
    const parsed = new URL(productUrl);
    const hash = parsed.hash || "";
    if (hash.startsWith("#!/")) {
      return hash.slice(3);
    }
    const pathname = parsed.pathname.replace(/^\/+/, "");
    const search = parsed.search || "";
    if (pathname) return `${pathname}${search}`;
  } catch (error) {
    // Ignore parse errors and use fallback.
  }
  return String(fallbackName || "shirt")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "+")
    .replace(/^\+|\+$/g, "");
}

function cleanProduct(item, tagline = "") {
  const imageCandidates = Array.isArray(item.image_urls)
    ? item.image_urls.filter((url) => String(url || "").trim())
    : [];
  const imageUrl =
    (imageCandidates.length
      ? imageCandidates[Math.floor(Math.random() * imageCandidates.length)]
      : "") || item.image_url || item.URL || "";

  return {
    id: item.shirt_id || item.idea_id || item.product_url,
    ideaId: item.idea_id || item.shirt_id || "",
    name: item.shirt_name || item.name || "Untitled shirt",
    imageUrl,
    productUrl: item.product_url || "https://thirdstringshirts.myspreadshop.com/",
    tagline: String(tagline || ""),
    subTheme: item.sub_theme || "",
    theme: item.theme || "",
    platform: String(item.platform || "").trim().toLowerCase()
  };
}

function shareDirName(product) {
  const base = routeFromProductUrl(product.productUrl, product.name).split("?")[0];
  const routeSlug = slugSegment(base.replace(/\+/g, "-"), slugSegment(product.name, "shirt"));
  const ideaSlug = slugSegment(product.ideaId || product.id, "product");
  return `${routeSlug}-${ideaSlug}`;
}

function sharePath(product) {
  return `/shirt/${shareDirName(product)}/`;
}

function shopPath(product) {
  const route = routeFromProductUrl(product.productUrl, product.name);
  return `/shop.html#!/${route}`;
}

function pageTitle(product) {
  return `${product.name} | Third String Shirts`;
}

function pageDescription(product) {
  if (product.tagline) return product.tagline;
  if (product.subTheme) return `${product.name} from Third String Shirts. Sub-theme: ${product.subTheme}.`;
  if (product.theme) return `${product.name} from Third String Shirts. Theme: ${product.theme}.`;
  return `${product.name} from Third String Shirts.`;
}

function buildHtml(product) {
  const title = escapeHtml(pageTitle(product));
  const description = escapeHtml(pageDescription(product));
  const imageUrl = escapeHtml(product.imageUrl);
  const shareUrl = `https://www.thirdstringshirts.com${sharePath(product)}`;
  const escapedShareUrl = escapeHtml(shareUrl);
  const escapedShopUrl = escapeHtml(shopPath(product));
  const escapedName = escapeHtml(product.name);
  const escapedTagline = escapeHtml(product.tagline || "Bench energy. Premium fabric. Shirt artwork first.");
  const escapedMetaTheme = escapeHtml(product.theme || "Third String Shirts");
  const escapedMetaSubTheme = escapeHtml(product.subTheme || "Spreadshirt");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapedShareUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Third String Shirts">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapedShareUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${escapedName} shirt artwork">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${escapedName} shirt artwork">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Bungee&family=Graduate&family=Space+Grotesk:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/site.css">
  <style>
    body.share-page {
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(255, 214, 102, 0.28), transparent 36%),
        linear-gradient(180deg, #fbf4de 0%, #f8ecd2 48%, #f2dfb7 100%);
    }

    .share-wrap {
      display: grid;
      gap: 2rem;
      align-items: center;
      grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
      padding: calc(3rem - 50px) 0 4rem;
    }

    .share-art {
      background: rgba(255, 255, 255, 0.75);
      border: 4px solid #111;
      border-radius: 28px;
      box-shadow: 14px 14px 0 rgba(17, 17, 17, 0.13);
      overflow: hidden;
      padding: 1rem;
    }

    .share-art img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 18px;
      object-fit: cover;
      background: #fff;
    }

    .share-copy {
      display: grid;
      gap: 1rem;
    }

    .share-kicker {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #b24c2a;
    }

    .share-copy h1 {
      margin: 0;
      color: #111;
    }

    .share-copy p {
      margin: 0;
    }

    .share-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .share-pill {
      border: 2px solid #111;
      border-radius: 999px;
      background: #fff8e8;
      color: #111;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.45rem 0.8rem;
      text-transform: uppercase;
    }

    .share-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      margin-top: 0.5rem;
    }

    @media (max-width: 860px) {
      .share-wrap {
        grid-template-columns: 1fr;
        padding-top: 2rem;
      }
    }
  </style>
</head>
<body data-page="shop" class="share-page">
  <header class="site-header">
    <div class="container header-row">
      <a class="brand" href="../../index.html" aria-label="Third String Shirts home">
        <img class="brand-mark" src="../../assets/logo.png" alt="Third String Shirts logo">
        <span>
          <p class="brand-title">Third String Shirts</p>
          <p class="brand-tagline">Shirts for Third Stringers</p>
        </span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="../../index.html">Home</a>
        <a aria-current="page" href="../../all-shirts.html">Shop</a>
        <a href="../../about.html">About</a>
        <a href="../../faq.html">FAQ</a>
        <a href="../../contact.html">Contact</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="container share-wrap">
      <figure class="share-art">
        <img src="${imageUrl}" alt="${escapedName} shirt artwork">
      </figure>
      <section class="share-copy">
        <p class="share-kicker">Share Preview</p>
        <h1>${escapedName}</h1>
        <p>${escapedTagline}</p>
        <div class="share-meta">
          <span class="share-pill">${escapedMetaTheme}</span>
          <span class="share-pill">${escapedMetaSubTheme}</span>
        </div>
        <div class="share-actions">
          <a class="button" href="../../${escapedShopUrl.replace(/^\//, "")}">Shop This Shirt</a>
          <a class="button alt" href="../../all-shirts.html">Browse More Shirts</a>
        </div>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-row">
      <p><strong>Third String Shirts</strong> | Bench energy, premium fabric.</p>
      <p>
        Follow on <a href="https://x.com/3rdstringshirts" target="_blank" rel="noopener noreferrer">X</a>
      </p>
    </div>
  </footer>
</body>
</html>
`;
}

function main() {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const taglines = fs.existsSync(taglinePath)
    ? JSON.parse(fs.readFileSync(taglinePath, "utf8"))
    : {};

  const products = inventory
    .map((item) => {
      const id = item.idea_id || item.shirt_id || "";
      return cleanProduct(item, taglines[id]);
    })
    .filter((product) => product.imageUrl && product.productUrl && product.platform !== "etsy");

  fs.mkdirSync(outputRoot, { recursive: true });

  for (const product of products) {
    const dir = path.join(outputRoot, shareDirName(product));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), buildHtml(product));
  }

  console.log(`Generated ${products.length} product share pages in ${path.relative(repoRoot, outputRoot)}.`);
}

main();
