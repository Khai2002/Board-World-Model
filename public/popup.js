const statusDot = document.getElementById("statusDot");
const statusLine = document.getElementById("statusLine");
const output = document.getElementById("output");
const meta = document.getElementById("meta");
const modelLine = document.getElementById("modelLine");

document.getElementById("btnConnection").addEventListener("click", checkConnection);
document.getElementById("btnCubes").addEventListener("click", saveCubes);
document.getElementById("btnProcedures").addEventListener("click", saveProcedures);
document.getElementById("btnDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

const PROCEDURE_BATCH_SIZE = 10;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getModelId() {
  const tab = await getActiveTab();
  const match = tab?.url?.match(/\/data-models\/([^/]+)(?:\/|$)/);
  if (!match) throw new Error("Open a Board data model page first.");
  return decodeURIComponent(match[1]);
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

async function saveCubes() {
  try {
    const modelId = await getModelId();
    const response = await sendToContentScript({
      type: "CALL",
      endpoint: "getAllCubes",
      params: { dbname: modelId },
    });
    if (!response?.success) throw new Error(response?.error || "Could not get cubes.");

    const cubes = normalizeCubeList(response.result.data);
    const db = window.BoardWorldModel.openCubeDatabase();
    const cubeRows = cubes.map((cube) => ({
      id: `${modelId}:${cube.idx}`,
      modelId,
      cubeId: cube.idx,
      name: cube.extended,
      data: cube,
    }));
    await db.transaction("rw", db.cubes, async () => {
      await db.cubes.where("modelId").equals(modelId).delete();
      await db.cubes.bulkPut(cubeRows);
    });
    modelLine.textContent = `${modelId} · ${cubes.length} cubes stored`;
    output.className = "";
    output.textContent = JSON.stringify(cubes, null, 2);
    meta.textContent = `${response.result.method} ${response.result.url}`;
  } catch (error) {
    renderError(error.message);
  }
}

async function saveProcedures() {
  try {
    const modelId = await getModelId();
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
    const metadataRows = metadata.map((procedure) => ({
      ...procedure,
      id: `${procedure.defaultDatabase}:${procedure.name}`,
    }));

    let detailCount = 0;
    const detailRows = [];
    for (let index = 0; index < metadataRows.length; index += PROCEDURE_BATCH_SIZE) {
      const batch = metadataRows.slice(index, index + PROCEDURE_BATCH_SIZE);
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
      detailRows.push(...details.map((procedure) => ({
        ...procedure,
        id: `${procedure.defaultDatabase}:${procedure.name}`,
      })));
      detailCount += details.length;
      modelLine.textContent = `${modelId} · ${detailCount}/${metadataRows.length} procedures stored`;
    }

    await db.transaction("rw", db.procedureMetadata, db.procedures, async () => {
      await db.procedureMetadata.clear();
      await db.procedures.clear();
      await db.procedureMetadata.bulkPut(metadataRows);
      await db.procedures.bulkPut(detailRows);
    });

    const mismatchedProcedure = detailRows.find(
      (procedure) => procedure.defaultDatabase !== modelId,
    );
    if (mismatchedProcedure) {
      throw new Error(
        `Procedure database ${mismatchedProcedure.defaultDatabase} does not match model ${modelId}.`,
      );
    }

    const edgeCount = await Promise.all(detailRows.map((procedure) =>
      window.BoardWorldModel.createCubeEdgesFromDataflowWrapper(
        procedure.name,
        procedure.defaultDatabase,
      )
    )).then((counts) => counts.reduce((total, count) => total + count, 0));

    modelLine.textContent = `${modelId} · ${metadataRows.length} procedures stored`;
    output.className = "";
    output.textContent = JSON.stringify(metadataRows, null, 2);
    meta.textContent = `${metadataRows.length} metadata records, ${detailCount} detailed records, ${edgeCount} cube edges`;
  } catch (error) {
    renderError(error.message);
  }
}

function renderError(msg) {
  output.className = "error";
  output.textContent = "Error: " + msg;
}

refreshStatus();
