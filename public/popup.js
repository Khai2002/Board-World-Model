const statusDot = document.getElementById("statusDot");
const statusLine = document.getElementById("statusLine");
const output = document.getElementById("output");
const meta = document.getElementById("meta");
const modelLine = document.getElementById("modelLine");

document.getElementById("btnConnection").addEventListener("click", checkConnection);
document.getElementById("btnCubes").addEventListener("click", saveCubes);
document.getElementById("btnDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

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
    await db.cubes.bulkPut(cubes.map((cube) => ({
      id: `${modelId}:${cube.idx}`,
      modelId,
      cubeId: cube.idx,
      name: cube.extended,
      data: cube,
    })));
    modelLine.textContent = `${modelId} · ${cubes.length} cubes stored`;
    output.className = "";
    output.textContent = JSON.stringify(cubes, null, 2);
    meta.textContent = `${response.result.method} ${response.result.url}`;
  } catch (error) {
    renderError(error.message);
  }
}

function renderError(msg) {
  output.className = "error";
  output.textContent = "Error: " + msg;
}

refreshStatus();
