// ============================================================================
// Board API Bridge — content script
// Runs in the page's context on matched Board domains. Reuses the session
// that's already there (OIDC access token in sessionStorage + auth cookies)
// instead of creating any auth of its own.
// ============================================================================

// --- Version detection -----------------------------------------------------
// Same idea as the coworker's script: guess the Board version from hostname,
// since API paths/casing differ slightly across versions.
const KNOWN_VERSIONS = [
  { pattern: /epm-silicones-dev\.elkem\.com/, version: "14.5" },
  { pattern: /epm-silicones-test\.elkem\.com/, version: "14.5" },
  { pattern: /\.elkem\.com/, version: "14.5" },
  { pattern: /localhost/, version: "14.2" },
  { pattern: /\.toot\.board\.com/, version: "14.3" },
  { pattern: /([a-z])-northeu\.board\.com/, version: "14.4" },
];
const DEFAULT_VERSION = "14.3";

function detectVersion() {
  const origin = window.location.origin;
  for (const { pattern, version } of KNOWN_VERSIONS) {
    if (pattern.test(origin)) return version;
  }
  return DEFAULT_VERSION;
}

// --- Auth: read the token Board's own frontend already has -----------------
// oidc-client stores the logged-in user's token in sessionStorage. Key format
// varies by Board version, so try the known patterns, then fall back to
// scanning for anything that looks right.
function getAccessToken() {
  const v12Key = `oidc.user:${window.location.origin}/:boardwebapplication`;
  let raw = sessionStorage.getItem(v12Key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.access_token) return parsed.access_token;
    } catch (e) { /* fall through */ }
  }

  raw = sessionStorage.getItem("board-oidc-config-id");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.authnResult?.access_token) return parsed.authnResult.access_token;
    } catch (e) { /* fall through */ }
  }

  // Fallback: scan every sessionStorage key for an oidc-client user object.
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith("oidc.user:")) {
      try {
        const parsed = JSON.parse(sessionStorage.getItem(key));
        if (parsed.access_token) return parsed.access_token;
      } catch (e) { /* keep scanning */ }
    }
  }

  return null;
}

// --- Connection ID (Board wants this header on procedure-related calls) ---
let connectionId = null;
let connectionInitialized = false;

async function ensureConnection(version) {
  if (!connectionId) connectionId = crypto.randomUUID();
  if (connectionInitialized) return;

  try {
    const resource = resolveEndpoint("startConnectionId", version);
    const url = window.location.origin + buildUrl(resource.url, { connectionId });
    await fetch(url, {
      method: resource.method || "GET",
      headers: { Accept: "application/json", "Board-Connection-Id": connectionId },
      credentials: "include",
    });
    connectionInitialized = true;
  } catch (e) {
    // Not fatal for read-only calls on some versions — just log it.
    console.warn("Board API Bridge: startConnectionId failed", e);
  }
}

// --- The actual call --------------------------------------------------------
async function callBoardAPI(endpointName, params = {}, bodyOverride = undefined) {
  const version = detectVersion();
  const resource = resolveEndpoint(endpointName, version);
  const url = window.location.origin + buildUrl(resource.url, params);
  const token = getAccessToken();

  if (endpointName !== "getClientInfo") {
    await ensureConnection(version);
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (connectionId) headers["Board-Connection-Id"] = connectionId;
  if (token) headers["Authorization"] = "Bearer " + token;

  const method = resource.method || "GET";
  const body =
    method === "POST"
      ? JSON.stringify(bodyOverride !== undefined ? bodyOverride : resource.data ?? null)
      : undefined;

  const res = await fetch(url, { method, headers, credentials: "include", body });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text; // not JSON — return raw text so the popup can still show it
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return { url, method, version, tokenFound: !!token, data };
}

// --- Message bridge to the popup -------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "STATUS") {
    const version = detectVersion();
    const token = getAccessToken();
    sendResponse({
      success: true,
      origin: window.location.origin,
      version,
      tokenFound: !!token,
    });
    return true;
  }

  if (message?.type === "CALL") {
    callBoardAPI(message.endpoint, message.params, message.body)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) =>
        sendResponse({
          success: false,
          error: err.message,
          status: err.status,
          body: err.body,
        })
      );
    return true; // keep the message channel open for the async response
  }

  return false;
});

console.log("Board API Bridge: content script loaded on", window.location.origin);
