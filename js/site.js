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
  const imageUrl = item.image_url || item.URL || "";
  return {
    id: item.shirt_id || item.idea_id || item.product_url,
    ideaId: item.idea_id || item.shirt_id || "",
    name: item.shirt_name || item.name || "Untitled shirt",
    imageUrl,
    productUrl: item.product_url || "https://thirdstringshirts.myspreadshop.com/",
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
  const localHref = embeddedShopHref(product);
  return `
    <article class="card">
      <a class="card-image" href="${localHref}" aria-label="Open ${escapedName} in Third String Shirts shop">
        <img loading="lazy" src="${product.imageUrl}" alt="${escapedName}">
      </a>
      <div class="card-body">
        <h3>${escapedName}</h3>
        <div class="meta">
          <span class="badge">${badgeLabel}</span>
          <a class="product-link" href="${localHref}">Shop This</a>
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
