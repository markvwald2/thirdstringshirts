(async function initHome() {
  const ETSY_SHOP_URL = "https://www.etsy.com/shop/ThirdStringShirts";
  const featuredTrack = document.querySelector("#featured-track");
  const miniGrid = document.querySelector("#home-grid");
  const prevButton = document.querySelector("#carousel-prev");
  const nextButton = document.querySelector("#carousel-next");
  if (!featuredTrack || !miniGrid || !prevButton || !nextButton) return;

  let products = [];
  let slideIndex = 0;
  let timer = null;

  function pickRandom(source, count) {
    const copy = [...source];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  function renderMiniGrid() {
    const selected = pickRandom(products, 8);
    if (!selected.length) {
      miniGrid.innerHTML = '<div class="empty">No shirts in this bucket yet.</div>';
      return;
    }
    miniGrid.innerHTML = selected.map(cardMarkup).join("");
  }

  function renderCarousel() {
    const etsyProducts = products.filter((item) => item.isEtsy);
    const nonEtsyProducts = products.filter((item) => !item.isEtsy);
    const slides = pickRandom(nonEtsyProducts.length ? nonEtsyProducts : products, 4);
    if (etsyProducts.length) {
      slides.push({
        isPromo: true,
        isEtsy: true,
        name: "Coloradans Against",
        productUrl: ETSY_SHOP_URL
      });
    }
    if (timer) clearInterval(timer);

    if (!slides.length) {
      featuredTrack.innerHTML = '<div class="empty">No featured shirts available yet.</div>';
      prevButton.onclick = null;
      nextButton.onclick = null;
      return;
    }

    featuredTrack.innerHTML = slides
      .map(
        (shirt, index) => {
          if (shirt.isPromo) {
            const promoTiles = pickRandom(etsyProducts, 4)
              .map((item) => {
                const safeName = item.name.replace(/</g, "&lt;");
                return `
                  <figure class="etsy-promo-art__tile">
                    <img src="${item.imageUrl}" alt="${safeName}" loading="lazy">
                  </figure>`;
              })
              .join("");
            return `
      <article class="carousel-slide carousel-slide--etsy">
        <div class="etsy-promo-art">
          <div class="etsy-promo-art__badge">ETSY DROP</div>
          <div class="etsy-promo-art__grid">
            ${promoTiles}
          </div>
        </div>
        <div class="carousel-info">
          <span class="badge">SPECIAL</span>
          <h3>Check out our Coloradans Against page on Etsy.</h3>
          <p>Craft beer, hiking, fourteeners, triathlons. Four Colorado takes for people who enjoy bad ideas loudly.</p>
          <a class="button" href="${shirt.productUrl}" target="_blank" rel="noopener noreferrer">Shop On Etsy</a>
        </div>
      </article>`;
          }
          const href = productHref(shirt);
          const targetAttrs = productLinkTargetAttrs(shirt);
          const ctaLabel = shirt.isEtsy ? "Shop On Etsy" : "Shop This Shirt";
          const sportClasses = [
            "bg-basketball",
            "bg-football",
            "bg-baseball",
            "bg-soccer",
            "bg-hockey"
          ];
          const sportClass = sportClasses[index % sportClasses.length];
          return `
      <article class="carousel-slide ${sportClass}">
        <img src="${shirt.imageUrl}" alt="${shirt.name.replace(/</g, "&lt;")}" loading="lazy">
        <div class="carousel-info">
          <span class="badge">${shirt.bucket.toUpperCase()}</span>
          <h3>${shirt.name.replace(/</g, "&lt;")}</h3>
          <p>${(shirt.tagline || "A premium tribute to backups, benchwarmers, and the occasional legend.").replace(/</g, "&lt;")}</p>
          <a class="button" href="${href}"${targetAttrs}>${ctaLabel}</a>
        </div>
      </article>`;
        }
      )
      .join("");

    slideIndex = 0;
    const updatePosition = () => {
      featuredTrack.style.transform = `translateX(-${slideIndex * 100}%)`;
    };

    const next = () => {
      slideIndex = (slideIndex + 1) % slides.length;
      updatePosition();
    };

    const prev = () => {
      slideIndex = (slideIndex - 1 + slides.length) % slides.length;
      updatePosition();
    };

    const restartTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 4500);
    };

    prevButton.onclick = () => {
      prev();
      restartTimer();
    };

    nextButton.onclick = () => {
      next();
      restartTimer();
    };

    restartTimer();
  }

  try {
    products = await loadProducts();
    renderCarousel();
    renderMiniGrid();
  } catch (error) {
    miniGrid.innerHTML = '<div class="empty">Inventory could not be loaded.</div>';
    featuredTrack.innerHTML = '<div class="empty">Featured carousel is temporarily out.</div>';
    console.error(error);
  }
})();
