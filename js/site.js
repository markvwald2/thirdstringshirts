const DATA_PATH = "./data/shirt_inventory.json";
const TAGLINES_PATH = "./data/taglines.json";
const {
  cleanProduct,
  normalize,
  productFromShopHash,
  productHref,
  productLinkLabel,
  productLinkTargetAttrs,
  sharePagePath
} = window.ProductUtils;

const THEME_CONFIG = [
  { id: "all", label: "All" },
  { id: "funny", label: "Funny" },
  { id: "fake band names", label: "Fake Band Names" },
  { id: "geography", label: "Geography" },
  { id: "cta", label: "CTA" },
  { id: "design", label: "Design" }
];

const THEME_LABELS = new Map(THEME_CONFIG.map((theme) => [theme.id, theme.label]));

function themeLabel(theme, bucket) {
  const normalizedTheme = normalize(theme);
  if (THEME_LABELS.has(normalizedTheme)) {
    return THEME_LABELS.get(normalizedTheme);
  }
  if (THEME_LABELS.has(bucket)) {
    return THEME_LABELS.get(bucket);
  }
  return String(theme || "").trim();
}

function subThemeLabel(subTheme) {
  const raw = String(subTheme || "").trim();
  const normalized = normalize(raw);
  if (
    normalized === "state flags" ||
    normalized === "state capitals" ||
    normalized === "state nicknames"
  ) {
    return normalized;
  }
  return raw;
}

function cardPills(product) {
  const normalizedTheme = normalize(product.theme);
  const subTheme = subThemeLabel(product.subTheme);
  const escapedSubTheme = subTheme.replace(/</g, "&lt;");

  if ((normalizedTheme === "geography" || normalizedTheme === "transportation") && subTheme) {
    return [`<span class="badge badge-subtheme">${escapedSubTheme}</span>`];
  }

  const escapedTheme = themeLabel(product.theme, product.bucket).replace(/</g, "&lt;");
  const pills = [`<span class="badge">${escapedTheme}</span>`];

  if (subTheme) {
    pills.push(`<span class="badge badge-subtheme">${escapedSubTheme}</span>`);
  }

  return pills;
}

function sharePageUrlFromHash(hash, origin) {
  const product = productFromShopHash(hash);
  if (!product || !product.ideaId) return "";
  const relativePath = sharePagePath(product).replace(/^\.\//, "/");
  return new URL(relativePath, origin || window.location.origin).toString();
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
  const pills = cardPills(product);
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
          <div class="badge-row">${pills.join("")}</div>
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
