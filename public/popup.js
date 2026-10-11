const statusDot = document.getElementById("statusDot");
const statusLine = document.getElementById("statusLine");
const output = document.getElementById("output");
const meta = document.getElementById("meta");
const modelLine = document.getElementById("modelLine");

document.getElementById("btnConnection").addEventListener("click", checkConnection);
document.getElementById("btnCapsuleScreens").addEventListener("click", () =>
  withSelectedCapsules(scanCapsuleScreens)
);
document.getElementById("btnCapsuleProcedures").addEventListener("click", () =>
  withSelectedCapsules(scanCapsuleProcedures)
);
document.getElementById("btnCubes").addEventListener("click", () => withSelectedDatabase(saveCubes));
document.getElementById("btnProcedures").addEventListener("click", () => withSelectedDatabase(saveProcedures));
document.getElementById("btnEdges").addEventListener("click", () => withSelectedDatabase(createAllEdges));
document.getElementById("btnCapsuleEdges").addEventListener("click", createCapsuleAndScreenEdges);
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

async function scanCapsuleScreens(capsules) {
  const scans = [];
  let screenCount = 0;
  let detailCount = 0;
  let drillCount = 0;
  const failures = [];

  for (const [index, capsule] of capsules.entries()) {
    modelLine.textContent = `Scanning ${index + 1}/${capsules.length}: ${capsule.name}`;
    let response;
    try {
      response = await sendToContentScript({
        type: "CALL",
        endpoint: "getSitemap",
        params: { path: capsule.path },
      });
      if (!response?.success) throw new Error(response?.error || "Request failed.");
    } catch (error) {
      failures.push(`${capsule.name || capsule.path}: sitemap: ${error.message}`);
      continue;
    }

    const sitemap = response.result.data;
    if (!sitemap || !Array.isArray(sitemap.items)) {
      failures.push(`${capsule.name || capsule.path}: invalid sitemap response`);
      continue;
    }

    const screens = sitemap.items.filter((screen) => screen.type === 1);
    const screenDetails = [];
    let capsuleDetailCount = 0;
    for (let index = 0; index < screens.length; index += SCREEN_DETAIL_BATCH_SIZE) {
      const batch = screens.slice(index, index + SCREEN_DETAIL_BATCH_SIZE);
      modelLine.textContent = `Loading screen details ${capsuleDetailCount + 1}/${screens.length}: ${capsule.name}`;
      const batchDetails = await Promise.all(batch.map(async (screen) => {
        const screenLabel = screen.text || screen.id;
        let detailResponse;
        try {
          detailResponse = await sendToContentScript({
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
          if (!detailResponse?.success) throw new Error(detailResponse?.error || "Request failed.");
        } catch (error) {
          failures.push(`${screenLabel}: screen details: ${error.message}`);
          return null;
        }

        let screenDrills = [];
        try {
          const validationResponse = await sendToContentScript({
            type: "CALL",
            endpoint: "validateScreenNavigation",
            params: { path: capsule.path, screenId: screen.id },
          });
          if (!validationResponse?.success) {
            throw new Error(validationResponse?.error || "Request failed.");
          }
          const validatedScreenId = getValidatedScreenId(validationResponse.result.data);
          if (validatedScreenId === screen.id) {
            const drillResponse = await sendToContentScript({
              type: "CALL",
              endpoint: "getScreenDrills",
              params: { path: capsule.path, screenId: screen.id },
            });
            if (!drillResponse?.success) throw new Error(drillResponse?.error || "Request failed.");
            screenDrills = drillResponse.result.data ?? [];
            drillCount += 1;
          }
        } catch (error) {
          failures.push(`${screenLabel}: drill discovery: ${error.message}`);
        }

        const screenData = detailResponse.result.data;
        const data = Array.isArray(screenData)
          ? screenData.map(item => item && typeof item === "object"
            ? { ...item, screenDrills }
            : item)
          : screenData && typeof screenData === "object"
            ? { ...screenData, screenDrills }
            : { data: screenData, screenDrills };
        return { screenId: screen.id, data };
      }));
      const successfulDetails = batchDetails.filter(Boolean);
      screenDetails.push(...successfulDetails);
      capsuleDetailCount += successfulDetails.length;
      detailCount += successfulDetails.length;
    }

    screenCount += screens.length;
    scans.push({ capsule, sitemap, screenDetails });
  }

  await window.BoardWorldModel.openScreenDatabase().saveScannedCapsules(scans);
  modelLine.textContent = `${capsules.length} capsules · ${screenCount} screens stored`;
  output.className = "";
  output.textContent = JSON.stringify(capsules, null, 2);
  meta.textContent = `${detailCount}/${screenCount} screen details saved · ${drillCount} drill payloads loaded · ${failures.length} scan errors`;
  if (failures.length > 0) {
    output.textContent += `\n\nScan errors (first 20):\n${failures.slice(0, 20).join("\n")}`;
  }
}

function getValidatedScreenId(data) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return undefined;
  if (Array.isArray(data)) {
    for (const item of data) {
      const id = getValidatedScreenId(item);
      if (id) return id;
    }
    return undefined;
  }
  for (const key of ["screenId", "id"]) {
    if (typeof data[key] === "string") return data[key];
  }
  for (const key of ["data", "result", "screen"]) {
    const id = getValidatedScreenId(data[key]);
    if (id) return id;
  }
  return undefined;
}

async function scanCapsuleProcedures(capsules) {
  const procedureScans = [];
  let procedureCount = 0;
  let procedureDetailCount = 0;

  for (const [index, capsule] of capsules.entries()) {
    modelLine.textContent = `Scanning capsule procedures ${index + 1}/${capsules.length}: ${capsule.name}`;

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
        type: "GET_CAPSULE_PROCEDURES_FULL",
        capsulePath: capsule.path,
        procedureNames: batch.map((procedure) => procedure.name),
      });
      if (!detailsResponse?.success) {
        throw new Error(
          detailsResponse?.error ||
          `Could not get capsule procedure details for ${capsule.path} (batch ${Math.floor(procedureIndex / CAPSULE_PROCEDURE_BATCH_SIZE) + 1}).`,
        );
      }

      const batchDetails = normalizeProcedureDetails(detailsResponse.data);
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

  await window.BoardWorldModel.openCapsuleProcedureDatabase()
    .saveScannedCapsules(procedureScans);
  modelLine.textContent = `${capsules.length} capsules · ${procedureCount} capsule procedures stored`;
  output.className = "";
  output.textContent = JSON.stringify(capsules, null, 2);
  meta.textContent = `${procedureDetailCount} capsule procedure details saved`;
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
    const capsuleProcedureDb = window.BoardWorldModel.openCapsuleProcedureDatabase();
    const capsuleProcedures = await capsuleProcedureDb.procedures.toArray();
    const screenDb = window.BoardWorldModel.openScreenDatabase();
    const storedCapsules = await screenDb.capsule.toArray();
    if (procedures.length === 0 && capsuleProcedures.length === 0 && storedCapsules.length === 0) {
      throw new Error("No saved procedures found. Scan and save procedures first.");
    }

    const cubeDb = window.BoardWorldModel.openCubeDatabase();
    const linkDb = window.BoardWorldModel.openLinkDatabase();
    await cubeDb.cubeEdges.where("fromModelId").equals(modelId).delete();
    await procedureDb.procedureEdges.where("fromDefaultDatabase").equals(modelId).delete();
    await linkDb.deleteLinksForOwner("database", modelId, "usesCube");
    const capsulePaths = [...new Set(capsuleProcedures.map((procedure) => procedure.capsulePath))];
    await Promise.all(capsulePaths.map(async (capsulePath) => {
      await linkDb.deleteLinksForOwner("capsule", capsulePath, "usesCube");
      await linkDb.deleteLinksForOwner("capsule", capsulePath, "calls");
      await capsuleProcedureDb.procedureEdges.where("fromCapsulePath").equals(capsulePath).delete();
    }));

    let cubeEdgeCount = 0;
    let procedureEdgeCount = 0;
    let procedureCubeUseCount = 0;
    let capsuleProcedureEdgeCount = 0;
    let capsuleProcedureCubeUseCount = 0;
    let screenProcedureLinkCount = 0;
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
    for (const procedure of capsuleProcedures) {
      capsuleProcedureEdgeCount += await window.BoardWorldModel.createCapsuleProcedureEdgesFromCallProcedureWrapper(
        procedure.name,
        procedure.capsulePath,
        modelId,
      );
      capsuleProcedureCubeUseCount += await window.BoardWorldModel.createCapsuleProcedureCubeUsesFromDataflowWrapper(
        procedure.name,
        procedure.capsulePath,
        modelId,
      );
    }
    for (const capsule of storedCapsules) {
      screenProcedureLinkCount += await window.BoardWorldModel.createScreenCapsuleProcedureLinksWrapper(
        capsule.path,
      );
    }

    modelLine.textContent = `${modelId} · ${procedures.length} procedures`;
    output.className = "";
    output.textContent = `Created ${cubeEdgeCount} cube edges, ${procedureEdgeCount} procedure edges, ${procedureCubeUseCount} procedure-cube links, ${capsuleProcedureEdgeCount} capsule-procedure edges, ${capsuleProcedureCubeUseCount} capsule-procedure-cube links, and ${screenProcedureLinkCount} screen-to-capsule-procedure links.`;
    meta.textContent = "Edges and links rebuilt from saved procedure and screen details";
  } catch (error) {
    renderError(error.message);
  }
}

async function createCapsuleAndScreenEdges() {
  try {
    const capsuleProcedureDb = window.BoardWorldModel.openCapsuleProcedureDatabase();
    const screenDb = window.BoardWorldModel.openScreenDatabase();
    const [capsuleProcedures, procedureMetadata, storedCapsules] = await Promise.all([
      capsuleProcedureDb.procedures.toArray(),
      capsuleProcedureDb.procedureMetadata.toArray(),
      screenDb.capsule.toArray(),
    ]);
    const metadataById = new Map(procedureMetadata.map(procedure => [procedure.id, procedure]));
    const capsulePaths = [...new Set([
      ...capsuleProcedures.map(procedure => procedure.capsulePath),
      ...procedureMetadata.map(procedure => procedure.capsulePath),
      ...storedCapsules.map(capsule => capsule.path),
    ])];
    if (capsulePaths.length === 0) {
      throw new Error("No saved capsule procedures or screens found. Scan capsules first.");
    }

    const linkDb = window.BoardWorldModel.openLinkDatabase();
    await Promise.all(capsulePaths.map(async capsulePath => {
      await linkDb.deleteLinksForOwner("capsule", capsulePath, "calls");
      await linkDb.deleteLinksForOwner("capsule", capsulePath, "usesCube");
      await capsuleProcedureDb.procedureEdges
        .where("fromCapsulePath").equals(capsulePath).delete();
    }));

    let capsuleProcedureEdgeCount = 0;
    let capsuleProcedureCubeUseCount = 0;
    let screenProcedureLinkCount = 0;
    let proceduresWithoutDatabase = 0;
    for (const procedure of capsuleProcedures) {
      const metadata = metadataById.get(procedure.id);
      const defaultDatabase = typeof procedure.defaultDatabase === "string" && procedure.defaultDatabase.length > 0
        ? procedure.defaultDatabase
        : typeof metadata?.defaultDatabase === "string" && metadata.defaultDatabase.length > 0
          ? metadata.defaultDatabase
          : typeof procedure.metadata?.defaultDatabase === "string"
            ? procedure.metadata.defaultDatabase
            : "";
      if (!defaultDatabase) proceduresWithoutDatabase += 1;

      capsuleProcedureEdgeCount += await window.BoardWorldModel.createCapsuleProcedureEdgesFromCallProcedureWrapper(
        procedure.name,
        procedure.capsulePath,
        defaultDatabase,
      );
      if (defaultDatabase) {
        capsuleProcedureCubeUseCount += await window.BoardWorldModel.createCapsuleProcedureCubeUsesFromDataflowWrapper(
          procedure.name,
          procedure.capsulePath,
          defaultDatabase,
        );
      }
    }
    for (const capsulePath of capsulePaths) {
      screenProcedureLinkCount += await window.BoardWorldModel.createScreenCapsuleProcedureLinksWrapper(capsulePath);
    }

    modelLine.textContent = `${capsuleProcedures.length} capsule procedures · ${storedCapsules.length} capsules`;
    output.className = "";
    output.textContent = `Created ${capsuleProcedureEdgeCount} capsule-procedure edges, ${capsuleProcedureCubeUseCount} capsule-procedure-cube links, and ${screenProcedureLinkCount} screen-to-capsule-procedure links.`;
    meta.textContent = proceduresWithoutDatabase > 0
      ? `${proceduresWithoutDatabase} capsule procedures had no saved database; cube-use links were skipped for them.`
      : "Edges and links rebuilt from saved capsule procedure and screen details";
  } catch (error) {
    renderError(error.message);
  }
}

function renderError(msg) {
  output.className = "error";
  output.textContent = "Error: " + msg;
}

refreshStatus();
