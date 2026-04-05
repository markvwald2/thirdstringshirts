const DATA_PATH = "./data/shirt_inventory.json";
const TAGLINES_PATH = "./data/taglines.json";

const THEME_CONFIG = [
  { id: "all", label: "All" },
  { id: "funny", label: "Funny" },
  { id: "fake band names", label: "Fake Band Names" },
  { id: "geography", label: "Geography" },
  { id: "cta", label: "CTA" },
  { id: "design", label: "Design" }
];

const THEME_LABELS = new Map(THEME_CONFIG.map((theme) => [theme.id, theme.label]));

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function determineBucket(item) {
  const theme = normalize(item.theme);
  const subTheme = normalize(item.sub_theme);
  const tags = (item.tags || []).map(normalize);

  if (theme === "fake band names" || tags.includes("fake band names")) return "fake band names";
  if (theme === "geography" || tags.includes("geography")) return "geography";
  if (subTheme.includes("cta")) {
    return "cta";
  }
  if (theme === "design" || tags.includes("design")) return "design";
  return "funny";
}

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
    theme: item.theme || "",
    subTheme: item.sub_theme || "",
    tagline: String(tagline || "")
  };
}

function routeFromProductUrl(productUrl, fallbackName) {
  function decodeRouteValue(value) {
    const raw = String(value || "");
    try {
      return decodeURIComponent(raw);
    } catch (error) {
      return raw;
    }
  }

  try {
    const parsed = new URL(productUrl);
    const hash = parsed.hash || "";
    if (hash.startsWith("#!/")) {
      const route = hash.slice(3);
      const [pathname = "", search = ""] = route.split("?");
      const decodedPathname = decodeRouteValue(pathname);
      return search ? `${decodedPathname}?${search}` : decodedPathname;
    }
    const pathname = decodeRouteValue(parsed.pathname.replace(/^\/+/, ""));
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

function slugSegment(value, fallback = "shirt") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function sharePagePath(product) {
  const base = routeFromProductUrl(product.productUrl, product.name).split("?")[0];
  const routeSlug = slugSegment(base.replace(/\+/g, "-"), slugSegment(product.name, "shirt"));
  const ideaSlug = slugSegment(product.ideaId || product.id, "product");
  return `./shirt/${routeSlug}-${ideaSlug}/`;
}

function productFromShopHash(hash) {
  function decodeRouteValue(value) {
    const raw = String(value || "").replace(/\+/g, " ");
    try {
      return decodeURIComponent(raw);
    } catch (error) {
      return raw;
    }
  }

  const value = String(hash || "").trim();
  if (!value.startsWith("#!/")) return null;

  const route = value.slice(3);
  const [pathname, search = ""] = route.split("?");
  if (!pathname) return null;

  const params = new URLSearchParams(search);
  const detailMatch = pathname.match(/^(.*)-A([a-z0-9]+)$/i);
  const routeName = detailMatch ? detailMatch[1] : pathname;
  const ideaId = params.get("idea") || (detailMatch ? detailMatch[2] : "");

  return {
    id: ideaId || routeName,
    ideaId,
    name: decodeRouteValue(routeName),
    productUrl: `https://www.thirdstringshirts.com/shop.html#!/${route}`
  };
}

function sharePageUrlFromHash(hash, origin) {
  const product = productFromShopHash(hash);
  if (!product || !product.ideaId) return "";
  const relativePath = sharePagePath(product).replace(/^\.\//, "/");
  return new URL(relativePath, origin || window.location.origin).toString();
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
