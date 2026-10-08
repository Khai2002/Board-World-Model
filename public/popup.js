const statusDot = document.getElementById("statusDot");
const statusLine = document.getElementById("statusLine");
const output = document.getElementById("output");
const meta = document.getElementById("meta");
const modelLine = document.getElementById("modelLine");

document.getElementById("btnConnection").addEventListener("click", checkConnection);
document.getElementById("btnCapsules").addEventListener("click", () =>
  withSelectedCapsules(scanCapsules)
);
document.getElementById("btnCubes").addEventListener("click", () => withSelectedDatabase(saveCubes));
document.getElementById("btnProcedures").addEventListener("click", () => withSelectedDatabase(saveProcedures));
document.getElementById("btnEdges").addEventListener("click", () => withSelectedDatabase(createAllEdges));
document.getElementById("btnDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

const PROCEDURE_BATCH_SIZE = 10;
const SCREEN_DETAIL_BATCH_SIZE = 10;
const CAPSULE_PROCEDURE_BATCH_SIZE = 10;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sendToContentScript(message) {
  return new Promise(async (resolve, reject) => {
    const tab = await getActiveTab();
    if (!tab?.id) return reject(new Error("No active tab."));

    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(
          new Error(
            "No response from page — are you on a matched Board tab, and has it finished loading?"
          )
        );
        return;
      }
      resolve(response);
    });
  });
}

async function withSelectedCapsules(action) {
  try {
    const response = await sendToContentScript({
      type: "CALL",
      endpoint: "getCapsules",
      params: {},
    });
    if(!response?.success) throw new Error(response?.error || "Could not get capsules.");

    const definitions = response.result.data?.items;
    if (!Array.isArray(definitions)) throw new Error("The capsule response is not a list.");

    const capsules = collectCapsules(definitions);
    if (capsules.length === 0) throw new Error("No capsules are available to scan.");

    const selectedCapsules = await chooseCapsules(definitions, capsules);
    if (selectedCapsules) await action(selectedCapsules);
  } catch (error) {
    renderError(error.message);
  }
}

function collectCapsules(nodes) {
  return nodes.flatMap((node) => {
    if (typeof node?.path !== "string") return [];
    if (node.path.toLowerCase().endsWith(".bcps")) return [node];
    return Array.isArray(node.items) ? collectCapsules(node.items) : [];
  });
}

async function scanCapsules(capsules) {
  const scans = [];
  const procedureScans = [];
  let screenCount = 0;
  let detailCount = 0;
  let procedureCount = 0;
  let procedureDetailCount = 0;

  for (const [index, capsule] of capsules.entries()) {
    modelLine.textContent = `Scanning ${index + 1}/${capsules.length}: ${capsule.name}`;
    const response = await sendToContentScript({
      type: "CALL",
      endpoint: "getSitemap",
      params: { path: capsule.path },
    });
    if (!response?.success) {
      throw new Error(response?.error || `Could not get sitemap for ${capsule.path}.`);
    }

    const sitemap = response.result.data;
    if (!sitemap || !Array.isArray(sitemap.items)) {
      throw new Error(`The sitemap response for ${capsule.path} is not a valid list.`);
    }

    const screens = sitemap.items.filter((screen) => screen.type === 1);
    const screenDetails = [];
    let capsuleDetailCount = 0;
    for (let index = 0; index < screens.length; index += SCREEN_DETAIL_BATCH_SIZE) {
      const batch = screens.slice(index, index + SCREEN_DETAIL_BATCH_SIZE);
      modelLine.textContent = `Loading screen details ${capsuleDetailCount + 1}/${screens.length}: ${capsule.name}`;
      const batchDetails = await Promise.all(batch.map(async (screen) => {
        const detailResponse = await sendToContentScript({
          type: "CALL",
          endpoint: "getScreen",
          params: {},
          body: {
            disableRefreshOnOpen: false,
            capsulePathSource: capsule.path,
            screenArgs: {
              discriminator: "ScreenArgsDto",
              cpsPath: capsule.path,
              screenId: screen.id,
            },
            isFirstOpening: false,
            isInEdit: false,
          },
        });
        if (!detailResponse?.success) {
          throw new Error(
            detailResponse?.error || `Could not get screen details for ${screen.text || screen.id}.`,
          );
        }
        return { screenId: screen.id, data: detailResponse.result.data };
      }));
      screenDetails.push(...batchDetails);
      capsuleDetailCount += batchDetails.length;
      detailCount += batchDetails.length;
    }

    screenCount += screens.length;
    scans.push({ capsule, sitemap, screenDetails });

    const metadataResponse = await sendToContentScript({
      type: "CALL",
      endpoint: "getCapsuleCoreProcedures",
      params: { path: capsule.path },
    });
    if (!metadataResponse?.success) {
      throw new Error(
        metadataResponse?.error || `Could not get capsule procedures for ${capsule.path}.`,
      );
    }

    const metadata = normalizeProcedureList(metadataResponse.result.data);
    if (metadata.some((procedure) => typeof procedure?.name !== "string" || procedure.name.length === 0)) {
      throw new Error(`Capsule procedure metadata for ${capsule.path} contains an invalid name.`);
    }
    const procedures = [];
    for (let procedureIndex = 0; procedureIndex < metadata.length; procedureIndex += CAPSULE_PROCEDURE_BATCH_SIZE) {
      const batch = metadata.slice(procedureIndex, procedureIndex + CAPSULE_PROCEDURE_BATCH_SIZE);
      modelLine.textContent = `Loading capsule procedure details ${procedureDetailCount + 1}/${metadata.length}: ${capsule.name}`;
      const detailsResponse = await sendToContentScript({
        type: "CALL",
        endpoint: "getCapsuleProcedures",
        params: { path: capsule.path },
        body: batch.map((procedure) => procedure.name),
      });
      if (!detailsResponse?.success) {
        throw new Error(
          detailsResponse?.error ||
          `Could not get capsule procedure details for ${capsule.path} (batch ${Math.floor(procedureIndex / CAPSULE_PROCEDURE_BATCH_SIZE) + 1}).`,
        );
      }

      const batchDetails = normalizeProcedureDetails(detailsResponse.result.data);
      if (batchDetails.length !== batch.length) {
        throw new Error(
          `Capsule procedure details for ${capsule.path} returned ${batchDetails.length} records for ${batch.length} requested procedures.`,
        );
      }
      const requestedNames = new Set(batch.map((procedure) => procedure.name));
      const returnedNames = new Set(batchDetails.map((procedure) => procedure.name));
      if (
        batchDetails.some((procedure) => typeof procedure.name !== "string" || !requestedNames.has(procedure.name)) ||
        returnedNames.size !== requestedNames.size
      ) {
        throw new Error(`Capsule procedure details for ${capsule.path} did not match the requested procedure names.`);
      }
      procedures.push(...batchDetails);
      procedureDetailCount += batchDetails.length;
    }

    procedureCount += metadata.length;
    procedureScans.push({ capsulePath: capsule.path, metadata, procedures });
  }

  const database = window.BoardWorldModel.openScreenDatabase();
  await database.saveScannedCapsules(scans);
  await window.BoardWorldModel.openCapsuleProcedureDatabase()
    .saveScannedCapsules(procedureScans);
  modelLine.textContent = `${capsules.length} capsules · ${screenCount} screens · ${procedureCount} capsule procedures stored`;
  output.className = "";
  output.textContent = JSON.stringify(capsules, null, 2);
  meta.textContent = `${detailCount} screen details and ${procedureDetailCount} capsule procedure details saved`;
}

function chooseCapsules(tree, capsules) {
  const dialog = document.getElementById("capsuleDialog");
  const list = document.getElementById("capsuleTree");
  const count = document.getElementById("capsuleSelectionCount");
  const capsulesByPath = new Map(capsules.map((capsule) => [capsule.path, capsule]));
  list.replaceChildren(...tree.map((node) => createCapsuleTreeNode(node, capsulesByPath)));

  const updateSelection = () => {
    const selected = list.querySelectorAll("input[data-capsule-path]:checked").length;
    count.textContent = `${selected} of ${capsules.length} selected`;
  };

  const onChange = (event) => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement)) return;

    const item = checkbox.closest("li");
    const children = item.querySelector(":scope > ul");
    if (children) {
      children.querySelectorAll("input[type=checkbox]").forEach((childCheckbox) => {
        childCheckbox.checked = checkbox.checked;
        childCheckbox.indeterminate = false;
      });
    }

    let parentItem = item.parentElement.closest("li");
    while (parentItem) {
      const childList = parentItem.querySelector(":scope > ul");
      const childCheckboxes = [...childList.children]
        .map((child) => child.querySelector(":scope > label input"));
      const parentCheckbox = parentItem.querySelector(":scope > label input");
      const selectedCount = childCheckboxes.filter(
        (childCheckbox) => childCheckbox.checked || childCheckbox.indeterminate,
      ).length;
      parentCheckbox.checked = selectedCount === childCheckboxes.length;
      parentCheckbox.indeterminate = selectedCount > 0 && selectedCount < childCheckboxes.length;
      parentItem = parentItem.parentElement.closest("li");
    }

    updateSelection();
  };
  list.addEventListener("change", onChange);

  return new Promise((resolve) => {
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      list.removeEventListener("change", onChange);
      const selectedPaths = new Set(
        [...list.querySelectorAll("input[data-capsule-path]:checked")]
          .map((checkbox) => checkbox.dataset.capsulePath),
      );
      resolve(dialog.returnValue === "choose"
        ? [...selectedPaths].map((path) => capsulesByPath.get(path))
        : null);
    };
    dialog.addEventListener("close", onClose);
    updateSelection();
    dialog.showModal();
  });
}

function createCapsuleTreeNode(node, capsulesByPath) {
  const isCapsule = capsulesByPath.has(node.path);
  const item = document.createElement("li");
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.disabled = !isCapsule && (!Array.isArray(node.items) || node.items.length === 0);
  if (isCapsule) checkbox.dataset.capsulePath = node.path;

  const name = document.createElement("span");
  name.textContent = node.name || node.path;
  label.append(checkbox, name);
  item.append(label);

  if (!isCapsule && Array.isArray(node.items) && node.items.length > 0) {
    const children = document.createElement("ul");
    children.append(...node.items.map((child) => createCapsuleTreeNode(child, capsulesByPath)));
    item.append(children);
  }

  return item;
}

async function withSelectedDatabase(action) {
  try {
    const response = await sendToContentScript({
      type: "CALL",
      endpoint: "getDatabasesDefinitions",
      params: {},
    });
    if (!response?.success) throw new Error(response?.error || "Could not get databases.");

    const definitions = response.result.data;
    if (!Array.isArray(definitions)) throw new Error("The database definitions response is not a list.");
    const databases = definitions
      .map((database) => database?.name)
      .filter((name) => typeof name === "string" && name.length > 0);
    if (databases.length === 0) throw new Error("No databases are available to scan.");

    const databaseName = await chooseDatabase(databases);
    if (databaseName) await action(databaseName);
  } catch (error) {
    renderError(error.message);
  }
}

function chooseDatabase(databases) {
  const dialog = document.getElementById("databaseDialog");
  const select = document.getElementById("databaseSelect");
  select.replaceChildren(...databases.map((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  }));

  return new Promise((resolve) => {
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      resolve(dialog.returnValue === "choose" ? select.value : null);
    };
    dialog.addEventListener("close", onClose);
    dialog.showModal();
  });
}

async function refreshStatus() {
  try {
    const res = await sendToContentScript({ type: "STATUS" });
    if (!res?.success) throw new Error("Content script not responding.");

    statusDot.className = res.tokenFound ? "ok" : "bad";
    statusLine.innerHTML =
      `<b>${res.origin}</b><br>` +
      `version guess: ${res.version} · token: ${res.tokenFound ? "found" : "not found"}`;
  } catch (e) {
    statusDot.className = "bad";
    statusLine.textContent = e.message;
  }
}

async function checkConnection() {
  await refreshStatus();
  if (statusDot.className !== "ok") return;

  try {
    await call("getClientInfo", {});
  } catch (error) {
    renderError(error.message);
  }
}

async function call(endpoint, params) {
  output.className = "";
  output.textContent = "…";
  meta.textContent = "";

  const res = await sendToContentScript({ type: "CALL", endpoint, params });

  if (!res?.success) {
    renderError(`${res?.error || "Unknown error"}${res?.status ? " (HTTP " + res.status + ")" : ""}`);
    if (res?.body) output.textContent += "\n\n" + JSON.stringify(res.body, null, 2);
    return;
  }

  const { url, method, version, tokenFound, data } = res.result;
  output.className = "";
  output.textContent = JSON.stringify(data, null, 2);
  meta.textContent = `${method} ${url}  ·  v${version}  ·  auth: ${tokenFound ? "bearer token" : "cookies only"}`;
}

function normalizeCubeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cubes)) return data.cubes;
  return [];
}

function normalizeProcedureList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.procedures)) return data.procedures;
  if (Array.isArray(data?.procedure)) return data.procedure;
  return [];
}

function normalizeProcedureDetails(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.procedures)) return data.procedures;
  if (Array.isArray(data?.procedure)) return data.procedure;
  if (data?.procedure && typeof data.procedure === "object") return [data.procedure];
  return data && typeof data === "object" ? [data] : [];
}

async function saveCubes(modelId) {
  try {
    const response = await sendToContentScript({
      type: "CALL",
      endpoint: "getAllCubes",
      params: { dbname: modelId },
    });
    if (!response?.success) throw new Error(response?.error || "Could not get cubes.");

    const cubes = normalizeCubeList(response.result.data);
    const db = window.BoardWorldModel.openCubeDatabase();
    await db.saveCubes(modelId, cubes);
    modelLine.textContent = `${modelId} · ${cubes.length} cubes stored`;
    output.className = "";
    output.textContent = JSON.stringify(cubes, null, 2);
    meta.textContent = `${response.result.method} ${response.result.url}`;
  } catch (error) {
    renderError(error.message);
  }
}

async function saveProcedures(modelId) {
  try {
    const metadataResponse = await sendToContentScript({
      type: "CALL",
      endpoint: "getCoreProcedures",
      params: { dbname: modelId },
    });
    if (!metadataResponse?.success) {
      throw new Error(metadataResponse?.error || "Could not get procedures");
    }

    const metadata = normalizeProcedureList(metadataResponse.result.data);
    const db = window.BoardWorldModel.openProcedureDatabase();

    let detailCount = 0;
    const detailRows = [];
    for (let index = 0; index < metadata.length; index += PROCEDURE_BATCH_SIZE) {
      const batch = metadata.slice(index, index + PROCEDURE_BATCH_SIZE);
      const detailResponses = await Promise.all(batch.map((procedure) =>
        sendToContentScript({
          type: "GET_PROCEDURE_FULL",
          dbName: modelId,
          uniqueId: procedure.name,
        })
      ));
      const failedResponse = detailResponses.find((response) => !response?.success);
      if (failedResponse) {
        throw new Error(
          `Could not get procedure details for batch ${Math.floor(index / PROCEDURE_BATCH_SIZE) + 1}: ${failedResponse.error || "unknown error"}`,
        );
      }

      const details = detailResponses.flatMap((response) =>
        normalizeProcedureDetails(response.data)
      );
      detailRows.push(...details);
      detailCount += details.length;
      modelLine.textContent = `${modelId} · ${detailCount}/${metadata.length} procedures stored`;
    }

    await db.saveProcedures(modelId, metadata, detailRows);

    modelLine.textContent = `${modelId} · ${metadata.length} procedures stored`;
    output.className = "";
    output.textContent = JSON.stringify(metadata, null, 2);
    meta.textContent = `${metadata.length} metadata records, ${detailCount} detailed records`;
  } catch (error) {
    renderError(error.message);
  }
}

async function createAllEdges(modelId) {
  try {
    const procedureDb = window.BoardWorldModel.openProcedureDatabase();
    const procedures = (await procedureDb.procedures.toArray()).filter(
      (procedure) => procedure.defaultDatabase === modelId,
    );
    if (procedures.length === 0) {
      throw new Error("No saved procedures found for this data model. Save procedures first.");
    }

    const cubeDb = window.BoardWorldModel.openCubeDatabase();
    await cubeDb.cubeEdges.where("fromModelId").equals(modelId).delete();
    await procedureDb.procedureEdges.where("fromDefaultDatabase").equals(modelId).delete();
    await procedureDb.procedureCubeUses.where("procedureDefaultDatabase").equals(modelId).delete();

    let cubeEdgeCount = 0;
    let procedureEdgeCount = 0;
    let procedureCubeUseCount = 0;
    for (const procedure of procedures) {
      cubeEdgeCount += await window.BoardWorldModel.createCubeEdgesFromDataflowWrapper(
        procedure.name,
        procedure.defaultDatabase,
      );
      procedureEdgeCount += await window.BoardWorldModel.createProcedureEdgesFromCallProcedureWrapper(
        procedure.name,
        procedure.defaultDatabase,
      );
      procedureCubeUseCount += await window.BoardWorldModel.createProcedureCubeUsesFromDataflowWrapper(
        procedure.name,
        procedure.defaultDatabase,
      );
    }

    modelLine.textContent = `${modelId} · ${procedures.length} procedures`;
    output.className = "";
    output.textContent = `Created ${cubeEdgeCount} cube edges, ${procedureEdgeCount} procedure edges, and ${procedureCubeUseCount} procedure-cube relations.`;
    meta.textContent = "Edges and procedure-cube relations rebuilt from saved procedure details";
  } catch (error) {
    renderError(error.message);
  }
}

function renderError(msg) {
  output.className = "error";
  output.textContent = "Error: " + msg;
}

refreshStatus();
