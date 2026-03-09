(async function initTaglineEditor() {
  const DATA_PATH = "./data/shirt_inventory.json";
  const TAGLINES_PATH = "./data/taglines.json";

  const statusEl = document.querySelector("#editor-status");
  const rowsEl = document.querySelector("#tagline-rows");
  const searchEl = document.querySelector("#tagline-search");
  const resetBtn = document.querySelector("#reset-btn");
  const downloadBtn = document.querySelector("#download-btn");

  if (!statusEl || !rowsEl || !searchEl || !resetBtn || !downloadBtn) return;

  let baseTaglines = {};
  let draftTaglines = {};
  let shirts = [];

  function shirtId(item) {
    return String(item.idea_id || item.shirt_id || "").trim();
  }

  function shirtName(item) {
    return String(item.shirt_name || item.name || "Untitled shirt").trim();
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function updateStatus() {
    const dirtyCount = shirts.reduce((count, shirt) => {
      const before = String(baseTaglines[shirt.id] || "");
      const current = String(draftTaglines[shirt.id] || "");
      return before === current ? count : count + 1;
    }, 0);

    statusEl.textContent = `${shirts.length} shirts loaded | ${dirtyCount} edited`;
  }

  function setDirtyState(row, id) {
    const before = String(baseTaglines[id] || "");
    const current = String(draftTaglines[id] || "");
    row.classList.toggle("dirty", before !== current);
  }

  function applySearch() {
    const query = normalize(searchEl.value);
    const rows = rowsEl.querySelectorAll("tr[data-search]");
    let visible = 0;

    rows.forEach((row) => {
      const haystack = row.dataset.search || "";
      const match = !query || haystack.includes(query);
      row.classList.toggle("hidden", !match);
      if (match) visible += 1;
    });

    const dirtyCount = shirts.reduce((count, shirt) => {
      const before = String(baseTaglines[shirt.id] || "");
      const current = String(draftTaglines[shirt.id] || "");
      return before === current ? count : count + 1;
    }, 0);

    statusEl.textContent = `${visible}/${shirts.length} showing | ${dirtyCount} edited`;
  }

  function buildRows() {
    rowsEl.innerHTML = "";

    if (!shirts.length) {
      rowsEl.innerHTML = '<tr><td colspan="3">No shirts found.</td></tr>';
      return;
    }

    const fragment = document.createDocumentFragment();

    shirts.forEach((shirt) => {
      const row = document.createElement("tr");
      row.dataset.id = shirt.id;

      const nameCell = document.createElement("td");
      nameCell.innerHTML = `<div class="shirt-name">${shirt.name.replace(/</g, "&lt;")}</div><div class="shirt-meta">${shirt.platform || "Unknown platform"}</div>`;

      const idCell = document.createElement("td");
      idCell.innerHTML = `<code>${shirt.id.replace(/</g, "&lt;")}</code>`;

      const taglineCell = document.createElement("td");
      const input = document.createElement("textarea");
      input.className = "tagline-input";
      input.value = String(draftTaglines[shirt.id] || "");
      input.placeholder = "No tagline yet";
      input.setAttribute("aria-label", `Tagline for ${shirt.name}`);

      input.addEventListener("input", () => {
        draftTaglines[shirt.id] = input.value;
        row.dataset.search = normalize(`${shirt.name} ${shirt.id} ${input.value}`);
        setDirtyState(row, shirt.id);
        updateStatus();
      });

      taglineCell.appendChild(input);

      row.appendChild(idCell);
      row.appendChild(nameCell);
      row.appendChild(taglineCell);
      row.dataset.search = normalize(`${shirt.name} ${shirt.id} ${input.value}`);
      setDirtyState(row, shirt.id);
      fragment.appendChild(row);
    });

    rowsEl.appendChild(fragment);
  }

  function dedupeAndSort(inventory) {
    const seen = new Set();
    const unique = [];

    inventory.forEach((item) => {
      const id = shirtId(item);
      if (!id || seen.has(id)) return;
      seen.add(id);
      unique.push({
        id,
        name: shirtName(item),
        platform: String(item.platform || "")
      });
    });

    unique.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return unique;
  }

  function downloadJson() {
    const cleaned = {};
    Object.keys(draftTaglines)
      .sort()
      .forEach((id) => {
        const value = String(draftTaglines[id] || "").trim();
        if (value) cleaned[id] = value;
      });

    const blob = new Blob([`${JSON.stringify(cleaned, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taglines.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function resetChanges() {
    draftTaglines = { ...baseTaglines };
    buildRows();
    applySearch();
  }

  async function readJsonFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  searchEl.addEventListener("input", applySearch);
  resetBtn.addEventListener("click", resetChanges);
  downloadBtn.addEventListener("click", downloadJson);

  try {
    const [inventoryResponse, taglinesResponse] = await Promise.all([
      fetch(DATA_PATH),
      fetch(TAGLINES_PATH).catch(() => null)
    ]);

    if (!inventoryResponse.ok) {
      throw new Error(`Could not load ${DATA_PATH}`);
    }

    const inventory = await inventoryResponse.json();
    const taglines = taglinesResponse && taglinesResponse.ok ? await taglinesResponse.json() : {};

    shirts = dedupeAndSort(inventory);
    baseTaglines = { ...taglines };
    draftTaglines = { ...taglines };

    buildRows();
    updateStatus();
  } catch (error) {
    const localHint = window.location.protocol === "file:"
      ? "Local file mode blocks automatic loading. Pick both JSON files below."
      : "Could not load editor data automatically. Pick both JSON files below.";

    rowsEl.innerHTML = `<tr><td colspan="3">
      <div>
        <p>${localHint}</p>
        <p>
          <label>Inventory JSON: <input id="inventory-file" type="file" accept=".json,application/json"></label>
          <label style="margin-left: 1rem;">Taglines JSON: <input id="taglines-file" type="file" accept=".json,application/json"></label>
          <button id="load-local-btn" type="button">Load Local Files</button>
        </p>
      </div>
    </td></tr>`;
    statusEl.textContent = "Failed auto-load. Use local file inputs.";

    const inventoryInput = document.querySelector("#inventory-file");
    const taglinesInput = document.querySelector("#taglines-file");
    const loadLocalBtn = document.querySelector("#load-local-btn");

    if (inventoryInput && taglinesInput && loadLocalBtn) {
      loadLocalBtn.addEventListener("click", async () => {
        try {
          const inventoryFile = inventoryInput.files && inventoryInput.files[0];
          const taglinesFile = taglinesInput.files && taglinesInput.files[0];
          if (!inventoryFile || !taglinesFile) {
            statusEl.textContent = "Choose both JSON files first.";
            return;
          }

          const [inventory, taglines] = await Promise.all([
            readJsonFile(inventoryFile),
            readJsonFile(taglinesFile)
          ]);

          shirts = dedupeAndSort(inventory);
          baseTaglines = { ...taglines };
          draftTaglines = { ...taglines };
          buildRows();
          updateStatus();
        } catch (localError) {
          statusEl.textContent = "Could not parse selected files. Confirm both are valid JSON.";
          console.error(localError);
        }
      });
    }

    console.error(error);
  }
})();
