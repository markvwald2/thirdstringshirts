(async function initHome() {
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
    const slides = pickRandom(products, 5);
    if (timer) clearInterval(timer);

    if (!slides.length) {
      featuredTrack.innerHTML = '<div class="empty">No featured shirts available yet.</div>';
      prevButton.onclick = null;
      nextButton.onclick = null;
      return;
    }

    featuredTrack.innerHTML = slides
      .map(
        (shirt) => `
      <article class="carousel-slide">
        <img src="${shirt.imageUrl}" alt="${shirt.name.replace(/</g, "&lt;")}" loading="lazy">
        <div class="carousel-info">
          <span class="badge">${shirt.bucket.toUpperCase()}</span>
          <h3>${shirt.name.replace(/</g, "&lt;")}</h3>
          <p>${(shirt.tagline || "A premium tribute to backups, benchwarmers, and the occasional legend.").replace(/</g, "&lt;")}</p>
          <a class="button" href="${embeddedShopHref(shirt)}">Shop This Shirt</a>
        </div>
      </article>`
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
