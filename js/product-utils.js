(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.ProductUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createProductUtils() {
  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function determineBucket(item) {
    const theme = normalize(item.theme);
    const subTheme = normalize(item.sub_theme);
    const tags = (item.tags || []).map(normalize);

    if (theme === "fake band names" || tags.includes("fake band names")) return "fake band names";
    if (theme === "geography" || tags.includes("geography")) return "geography";
    if (subTheme.includes("cta")) return "cta";
    if (theme === "design" || tags.includes("design")) return "design";
    return "funny";
  }

  function decodeRouteValue(value) {
    const raw = String(value || "");
    try {
      return decodeURIComponent(raw);
    } catch (error) {
      return raw;
    }
  }

  function routeFromProductUrl(productUrl, fallbackName) {
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

  function slugSegment(value, fallback) {
    const slug = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || fallback;
  }

  function cleanProduct(item, tagline, options) {
    const config = options || {};
    const imageCandidates = Array.isArray(item.image_urls)
      ? item.image_urls.filter((url) => String(url || "").trim())
      : [];
    const imageIndex =
      config.imageStrategy === "first"
        ? 0
        : Math.floor(Math.random() * Math.max(imageCandidates.length, 1));
    const imageUrl = (imageCandidates.length ? imageCandidates[imageIndex] : "") || item.image_url || item.URL || "";
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
      tags: Array.isArray(item.tags) ? item.tags : [],
      theme: item.theme || "",
      subTheme: item.sub_theme || "",
      tagline: String(tagline || "")
    };
  }

  function sharePagePath(product) {
    const base = routeFromProductUrl(product.productUrl, product.name).split("?")[0];
    const routeSlug = slugSegment(base.replace(/\+/g, "-"), slugSegment(product.name, "shirt"));
    const ideaSlug = slugSegment(product.ideaId || product.id, "product");
    return `./shirt/${routeSlug}-${ideaSlug}/`;
  }

  function productFromShopHash(hash) {
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
      name: decodeRouteValue(routeName.replace(/\+/g, " ")),
      productUrl: `https://www.thirdstringshirts.com/shop.html#!/${route}`
    };
  }

  function sharePageUrlFromHash(hash, origin) {
    const product = productFromShopHash(hash);
    if (!product || !product.ideaId) return "";
    const relativePath = sharePagePath(product).replace(/^\.\//, "/");
    return new URL(relativePath, origin).toString();
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

  return {
    cleanProduct,
    determineBucket,
    embeddedShopHref,
    normalize,
    productFromShopHash,
    productHref,
    productLinkLabel,
    productLinkTargetAttrs,
    routeFromProductUrl,
    sharePagePath,
    sharePageUrlFromHash,
    slugSegment
  };
});
