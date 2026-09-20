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

  return false;
});

console.log("Board API Bridge: content script loaded on", window.location.origin);
