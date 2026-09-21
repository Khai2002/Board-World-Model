const status = document.getElementById("status");
const cubesList = document.getElementById("cubes");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const importInput = document.getElementById("importInput");
const modelSelect = document.getElementById("modelSelect");
const deleteModelButton = document.getElementById("deleteModelButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const testPrintButton = document.getElementById("testPrintButton");
const cubesTab = document.getElementById("cubesTab");
const proceduresTab = document.getElementById("proceduresTab");
const cubesPanel = document.getElementById("cubesPanel");
const proceduresPanel = document.getElementById("proceduresPanel");
const tabs = document.querySelector(".tabs");
const proceduresList = document.getElementById("procedures");
const cubeStorageSize = document.getElementById("cubeStorageSize");
const procedureStorageSize = document.getElementById("procedureStorageSize");

const detailsTab = document.createElement("button");
detailsTab.className = "tab";
detailsTab.id = "detailsTab";
detailsTab.type = "button";
detailsTab.setAttribute("role", "tab");
detailsTab.setAttribute("aria-selected", "false");
detailsTab.textContent = "Details";
detailsTab.hidden = true;
tabs.appendChild(detailsTab);

const detailsPanel = document.createElement("section");
detailsPanel.className = "tab-panel";
detailsPanel.id = "detailsPanel";
detailsPanel.setAttribute("role", "tabpanel");
detailsPanel.hidden = true;
const detailsHeading = document.createElement("h2");
const copyDetailsButton = document.createElement("button");
copyDetailsButton.type = "button";
copyDetailsButton.textContent = "Copy JSON";
copyDetailsButton.style.marginBottom = "8px";
const detailsOutput = document.createElement("pre");
Object.assign(detailsOutput.style, {
  margin: "0",
  padding: "12px",
  overflow: "auto",
  maxHeight: "65vh",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  background: "#f5f5f5",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "12px",
  lineHeight: "1.5",
});
detailsPanel.append(detailsHeading, copyDetailsButton, detailsOutput);
document.body.appendChild(detailsPanel);

function openCubeDatabase() {
  return window.BoardWorldModel.openCubeDatabase();
}

function openProcedureDatabase() {
  return window.BoardWorldModel.openProcedureDatabase();
}

function setModelOptions(modelIds) {
  modelSelect.replaceChildren(new Option("Select a model", ""));
  for (const modelId of modelIds) {
    modelSelect.appendChild(new Option(modelId, modelId));
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function estimateBytes(records) {
  return new Blob([JSON.stringify(records)]).size;
}

async function copyDetailsJson() {
  const json = detailsOutput.textContent || "";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = json;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    copyDetailsButton.textContent = "Copied";
    setTimeout(() => { copyDetailsButton.textContent = "Copy JSON"; }, 1500);
  } catch (error) {
    console.error("Could not copy dashboard JSON:", error);
    copyDetailsButton.textContent = "Copy failed";
    setTimeout(() => { copyDetailsButton.textContent = "Copy JSON"; }, 1500);
  }
}

function showDetails(title, data) {
  detailsHeading.textContent = title;
  detailsOutput.textContent = JSON.stringify(data, null, 2);
  detailsTab.hidden = false;
  detailsTab.classList.add("active");
  detailsTab.setAttribute("aria-selected", "true");
  cubesTab.classList.remove("active");
  proceduresTab.classList.remove("active");
  cubesTab.setAttribute("aria-selected", "false");
  proceduresTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = true;
  proceduresPanel.hidden = true;
  detailsPanel.hidden = false;
}

function makeClickableItem(item, onOpen) {
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.style.cursor = "pointer";
  item.addEventListener("click", onOpen);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  });
}

copyDetailsButton.addEventListener("click", copyDetailsJson);

async function getBackup() {
  const db = openCubeDatabase();
  return {
    cubes: await db.cubes.toArray(),
    cubeEdges: await db.cubeEdges.toArray(),
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseBackup(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.cubes) || !Array.isArray(value.cubeEdges)) {
    throw new Error("The file is not a cube-model backup.");
  }

  for (const cube of value.cubes) {
    if (!cube || typeof cube !== "object" || typeof cube.id !== "string" ||
        typeof cube.modelId !== "string" || cube.cubeId === undefined || !("data" in cube)) {
      throw new Error("The backup contains an invalid cube row.");
    }
  }

  for (const edge of value.cubeEdges) {
    if (!edge || typeof edge !== "object" ||
        typeof edge.fromModelId !== "string" || edge.fromCubeId === undefined ||
        typeof edge.toModelId !== "string" || edge.toCubeId === undefined) {
      throw new Error("The backup contains an invalid cube relationship.");
    }
  }

  return value;
}

async function loadCubes() {
  try {
    const db = openCubeDatabase();
    const [cubes, cubeEdges] = await Promise.all([
      db.cubes.toArray(),
      db.cubeEdges.toArray(),
    ]);
    const modelIds = [...new Set(cubes.map(cube => cube.modelId))].sort();

    cubesList.replaceChildren();
    setModelOptions(modelIds);
    cubeStorageSize.textContent = `Estimated stored data: ${formatBytes(estimateBytes([...cubes, ...cubeEdges]))}`;
    status.textContent = `${cubes.length} cube${cubes.length === 1 ? "" : "s"} stored`;
    for (const cube of cubes) {
      const item = document.createElement("li");
      item.textContent = `${cube.name || "Unnamed cube"} `;
      const id = document.createElement("code");
      id.textContent = `(${cube.modelId}:${cube.cubeId})`;
      item.appendChild(id);
      const relatedEdges = cubeEdges.filter(edge =>
        (edge.fromModelId === cube.modelId && edge.fromCubeId === cube.cubeId) ||
        (edge.toModelId === cube.modelId && edge.toCubeId === cube.cubeId)
      );
      makeClickableItem(item, () => showDetails(`Cube: ${cube.name || "Unnamed cube"}`, {
        cube,
        relatedEdges,
      }));
      cubesList.appendChild(item);
    }
  } catch (error) {
    status.textContent = `Could not read cube database: ${error.message}`;
  }
}

async function loadProcedures() {
  try {
    const db = openProcedureDatabase();
    const [metadata, details] = await Promise.all([
      db.procedureMetadata.toArray(),
      db.procedures.toArray(),
    ]);
    const detailIds = new Set(details.map(procedure => procedure.id));

    proceduresList.replaceChildren();
    procedureStorageSize.textContent = `Estimated stored data: ${formatBytes(estimateBytes([...metadata, ...details]))}`;
    status.textContent = `${metadata.length} procedure${metadata.length === 1 ? "" : "s"} stored · ${details.length} detailed`;
    for (const procedure of metadata.sort((left, right) => left.description.localeCompare(right.description))) {
      const item = document.createElement("li");
      item.textContent = `${procedure.description || "Unnamed procedure"} `;
      const id = document.createElement("code");
      id.textContent = `(${procedure.defaultDatabase}:${procedure.name})`;
      item.appendChild(id);
      const detailState = document.createElement("span");
      detailState.textContent = detailIds.has(procedure.id) ? " · details loaded" : " · metadata only";
      item.appendChild(detailState);
      const detail = details.find(candidate => candidate.id === procedure.id);
      makeClickableItem(item, () => showDetails(
        `Procedure: ${procedure.description || "Unnamed procedure"}`,
        { metadata: procedure, details: detail ?? null },
      ));
      proceduresList.appendChild(item);
    }
  } catch (error) {
    status.textContent = `Could not read procedure database: ${error.message}`;
  }
}

function showTab(tab) {
  const showProcedures = tab === "procedures";
  cubesTab.classList.toggle("active", !showProcedures);
  proceduresTab.classList.toggle("active", showProcedures);
  detailsTab.classList.remove("active");
  cubesTab.setAttribute("aria-selected", String(!showProcedures));
  proceduresTab.setAttribute("aria-selected", String(showProcedures));
  detailsTab.setAttribute("aria-selected", "false");
  cubesPanel.hidden = showProcedures;
  proceduresPanel.hidden = !showProcedures;
  detailsPanel.hidden = true;
  if (showProcedures) loadProcedures();
  else loadCubes();
}

async function exportData() {
  try {
    downloadJson(await getBackup(), "cube-model-backup.json");
  } catch (error) {
    status.textContent = `Could not export cube database: ${error.message}`;
  }
}

async function importData(file) {
  try {
    const backup = parseBackup(JSON.parse(await file.text()));
    if (!confirm("Replace all local cube data with this backup? This cannot be undone.")) return;

    const db = openCubeDatabase();
    await db.transaction("rw", db.cubes, db.cubeEdges, async () => {
      await db.cubes.clear();
      await db.cubeEdges.clear();
      await db.cubes.bulkPut(backup.cubes);
      await db.cubeEdges.bulkPut(backup.cubeEdges);
    });
    await loadCubes();
    status.textContent = `Imported ${backup.cubes.length} cube${backup.cubes.length === 1 ? "" : "s"}`;
  } catch (error) {
    status.textContent = `Could not import cube database: ${error.message}`;
  } finally {
    importInput.value = "";
  }
}

async function deleteSelectedModel() {
  const modelId = modelSelect.value;
  if (!modelId) return;
  if (!confirm(`Delete all local cubes and relationships for ${modelId}?`)) return;

  try {
    const db = openCubeDatabase();
    await db.transaction("rw", db.cubes, db.cubeEdges, async () => {
      await db.cubes.where("modelId").equals(modelId).delete();
      await db.cubeEdges
        .where("fromModelId").equals(modelId)
        .or("toModelId").equals(modelId)
        .delete();
    });
    await loadCubes();
  } catch (error) {
    status.textContent = `Could not delete model: ${error.message}`;
  }
}

async function deleteAllData() {
  if (!confirm("Delete all locally stored cubes, relationships, and procedures? This cannot be undone.")) return;

  try {
    await Promise.all([
      openCubeDatabase().delete(),
      openProcedureDatabase().delete(),
    ]);
    await Promise.all([loadCubes(), loadProcedures()]);
  } catch (error) {
    status.textContent = `Could not delete cube database: ${error.message}`;
  }
}

exportButton.addEventListener("click", exportData);
importButton.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  if (file) importData(file);
});
deleteModelButton.addEventListener("click", deleteSelectedModel);
deleteAllButton.addEventListener("click", deleteAllData);
testPrintButton.addEventListener("click", () => window.BoardWorldModel.printTest());
cubesTab.addEventListener("click", () => showTab("cubes"));
proceduresTab.addEventListener("click", () => showTab("procedures"));
detailsTab.addEventListener("click", () => {
  detailsTab.hidden = false;
  detailsPanel.hidden = false;
});
loadCubes();