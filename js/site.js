const DATA_PATH = "./data/shirt_inventory.json";
const TAGLINES_PATH = "./data/taglines.json";

const THEME_CONFIG = [
  { id: "all", label: "All" },
  { id: "funny", label: "Funny" },
  { id: "geography", label: "Geography" },
  { id: "cta", label: "CTA" },
  { id: "design", label: "Design" }
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function determineBucket(item) {
  const theme = normalize(item.theme);
  const subTheme = normalize(item.sub_theme);
  const tags = (item.tags || []).map(normalize);

  if (theme === "geography" || tags.includes("geography")) return "geography";
  if (
    theme === "transportation" ||
    tags.includes("cta") ||
    tags.includes("chicago") ||
    subTheme.includes("cta")
  ) {
    return "cta";
  }
  if (theme === "design" || tags.includes("design")) return "design";
  return "funny";
}

function cleanProduct(item, tagline = "") {
  const imageCandidates = Array.isArray(item.image_urls)
    ? item.image_urls.filter((url) => String(url || "").trim())
    : [];
  const imageUrl =
    (imageCandidates.length
      ? imageCandidates[Math.floor(Math.random() * imageCandidates.length)]
      : "") || item.image_url || item.URL || "";
  const platform = normalize(item.platform);
  return {
    id: item.shirt_id || item.idea_id || item.product_url,
    ideaId: item.idea_id || item.shirt_id || "",
    name: item.shirt_name || item.name || "Untitled shirt",
    imageUrl,
    imageUrls: imageCandidates,
    productUrl: item.product_url || "https://thirdstringshirts.myspreadshop.com/",
    platform,
    isEtsy: platform === "etsy",
    bucket: determineBucket(item),
    subTheme: item.sub_theme || "",
    tagline: String(tagline || "")
  };
}

function routeFromProductUrl(productUrl, fallbackName) {
  try {
    const parsed = new URL(productUrl);
    const pathname = parsed.pathname.replace(/^\/+/, "");
    const search = parsed.search || "";
    if (pathname) return `${pathname}${search}`;
  } catch (error) {
    // Ignore URL parse errors and use fallback.
  }
  return String(fallbackName || "shirt")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "+")
    .replace(/^\+|\+$/g, "");
}

function embeddedShopHref(product) {
  const route = routeFromProductUrl(product.productUrl, product.name);
  return `./shop.html#!/${route}`;
}

function productHref(product) {
  if (product.isEtsy && product.productUrl) return product.productUrl;
  return embeddedShopHref(product);
}

function productLinkLabel(product) {
  return product.isEtsy ? "Shop On Etsy" : "Shop This";
}

function productLinkTargetAttrs(product) {
  if (!product.isEtsy) return "";
  return ' target="_blank" rel="noopener noreferrer"';
}

async function loadProducts() {
  const [inventoryResponse, taglineResponse] = await Promise.all([
    fetch(DATA_PATH),
    fetch(TAGLINES_PATH).catch(() => null)
  ]);

  if (!inventoryResponse.ok) {
    throw new Error(`Could not load ${DATA_PATH}`);
  }

  const data = await inventoryResponse.json();

  let taglines = {};
  if (taglineResponse && taglineResponse.ok) {
    taglines = await taglineResponse.json();
  }

  return data
    .map((item) => {
      const id = item.idea_id || item.shirt_id || "";
      return cleanProduct(item, taglines[id]);
    })
    .filter((p) => p.imageUrl && p.productUrl);
}

function cardMarkup(product) {
  const escapedName = product.name.replace(/</g, "&lt;");
  const badgeLabel = product.bucket.toUpperCase();
  const localHref = productHref(product);
  const targetAttrs = productLinkTargetAttrs(product);
  const linkLabel = productLinkLabel(product);
  return `
    <article class="card">
      <a class="card-image" href="${localHref}"${targetAttrs} aria-label="Open ${escapedName}">
        <img loading="lazy" src="${product.imageUrl}" alt="${escapedName}">
      </a>
      <div class="card-body">
        <h3>${escapedName}</h3>
        <div class="meta">
          <span class="badge">${badgeLabel}</span>
          <a class="product-link" href="${localHref}"${targetAttrs}>${linkLabel}</a>
        </div>
      </div>
    </article>`;
}

function buildFilterControls(container, active, onSelect) {
  container.innerHTML = THEME_CONFIG.map(
    (theme) =>
      `<button type="button" class="filter-chip" data-theme="${theme.id}" aria-pressed="${String(
        active === theme.id
      )}">${theme.label}</button>`
  ).join("");

  container.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.theme));
  });
}

function setActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll(`.site-nav a[data-page="${page}"]`).forEach((link) => {
    link.setAttribute("aria-current", "page");
  });
}

document.addEventListener("DOMContentLoaded", setActiveNav);
