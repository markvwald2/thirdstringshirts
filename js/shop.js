(async function initShop() {
  const filters = document.querySelector("#shop-filters");
  const grid = document.querySelector("#shop-grid");
  const search = document.querySelector("#shop-search");
  const count = document.querySelector("#shop-count");
  if (!filters || !grid || !search || !count) return;

  let products = [];
  let activeTheme = "all";
  let query = "";
  let randomRanks = new Map();

  function randomValue() {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / 4294967295;
    }
    return Math.random();
  }

  function assignRandomRanks(list) {
    randomRanks = new Map();
    list.forEach((item) => {
      randomRanks.set(item.id, randomValue());
    });
  }

  function applyFilters() {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((item) => {
      const themeMatch = activeTheme === "all" || item.bucket === activeTheme;
      const searchMatch = !q || item.name.toLowerCase().includes(q) || item.subTheme.toLowerCase().includes(q);
      return themeMatch && searchMatch;
    });
    const displayList = [...filtered].sort((a, b) => {
      const aRank = randomRanks.get(a.id) ?? 0;
      const bRank = randomRanks.get(b.id) ?? 0;
      return aRank - bRank;
    });

    count.textContent = `${displayList.length} shirts`;

    if (!displayList.length) {
      grid.innerHTML = '<div class="empty">No matching shirts. Try another filter.</div>';
      return;
    }

    grid.innerHTML = displayList.map(cardMarkup).join("");
  }

  function onThemeSelect(theme) {
    activeTheme = theme;
    buildFilterControls(filters, activeTheme, onThemeSelect);
    applyFilters();
  }

  search.addEventListener("input", (event) => {
    query = event.target.value;
    applyFilters();
  });

  try {
    products = await loadProducts();
    assignRandomRanks(products);
    buildFilterControls(filters, activeTheme, onThemeSelect);
    applyFilters();
  } catch (error) {
    grid.innerHTML = '<div class="empty">Inventory could not be loaded.</div>';
    console.error(error);
  }
})();
