const status = document.getElementById("status");
const cubesList = document.getElementById("cubes");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const importInput = document.getElementById("importInput");
const modelSelect = document.getElementById("modelSelect");
const deleteModelButton = document.getElementById("deleteModelButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const cubesTab = document.getElementById("cubesTab");
const proceduresTab = document.getElementById("proceduresTab");
const cubesPanel = document.getElementById("cubesPanel");
const proceduresPanel = document.getElementById("proceduresPanel");
const proceduresList = document.getElementById("procedures");
const cubeStorageSize = document.getElementById("cubeStorageSize");
const procedureStorageSize = document.getElementById("procedureStorageSize");

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
  cubesTab.setAttribute("aria-selected", String(!showProcedures));
  proceduresTab.setAttribute("aria-selected", String(showProcedures));
  cubesPanel.hidden = showProcedures;
  proceduresPanel.hidden = !showProcedures;
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
cubesTab.addEventListener("click", () => showTab("cubes"));
proceduresTab.addEventListener("click", () => showTab("procedures"));
loadCubes();