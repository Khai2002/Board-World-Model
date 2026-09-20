// --- Message bridge to the popup -------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "STATUS") {
    const version = boardApi.detectVersion();
    const token = boardApi.getAccessToken();
    sendResponse({
      success: true,
      origin: window.location.origin,
      version,
      tokenFound: !!token,
    });
    return true;
  }

  if (message?.type === "CALL") {
    boardApi.request(message.endpoint, message.params, message.body)
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

  if (message?.type === "GET_PROCEDURE_FULL") {
    boardApi.getProcedureDetails(message.dbName, message.uniqueId)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) =>
        sendResponse({
          success: false,
          error: err.message,
          status: err.status,
          body: err.body,
        })
      );
    return true;
  }

  return false;
});

console.log("Board API Bridge: content script loaded on", window.location.origin);
