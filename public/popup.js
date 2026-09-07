const statusDot = document.getElementById("statusDot");
const statusLine = document.getElementById("statusLine");
const output = document.getElementById("output");
const meta = document.getElementById("meta");
const dbnameInput = document.getElementById("dbname");

const buttons = {
  btnClientInfo: () => call("getClientInfo", {}),
  btnDatabases: () => call("getDatabasesDefinitions", {}),
  btnEntities: () => call("getAllEntities", { dbname: requireDb() }),
  btnCubes: () => call("getAllCubes", { dbname: requireDb() }),
  btnProcedures: () => call("getCoreProcedures", { dbname: requireDb() }),
};

for (const [id, handler] of Object.entries(buttons)) {
  document.getElementById(id).addEventListener("click", async () => {
    try {
      await handler();
    } catch (e) {
      renderError(e.message);
    }
  });
}

function requireDb() {
  const v = dbnameInput.value.trim();
  if (!v) {
    throw new Error("Enter a dbName first.");
  }
  return v;
}

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

function renderError(msg) {
  output.className = "error";
  output.textContent = "Error: " + msg;
}

refreshStatus();
