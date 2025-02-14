function sendMessageWithRetry(tabId, message, maxAttempts = 3, delay = 1000) {
  let attempts = 0;

  function attemptSend() {
    attempts++;
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        if (attempts < maxAttempts) {
          setTimeout(attemptSend, delay);
        }
      }
    });
  }

  attemptSend();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "sendQuestionToChatGPT") {
    chrome.tabs.query({ url: "https://chatgpt.com/*" }, (chatgptTabs) => {
      if (chatgptTabs.length > 0) {
        sendMessageWithRetry(chatgptTabs[0].id, {
          type: "receiveQuestion",
          question: message.question,
        });
      }
    });
    return true;
  }

  if (message.type === "chatGPTResponse") {
    chrome.tabs.query(
      { url: "https://learning.mheducation.com/*" },
      (mheTabs) => {
        if (mheTabs.length === 1) {
          sendMessageWithRetry(mheTabs[0].id, {
            type: "processChatGPTResponse",
            response: message.response,
          });
        }
      }
    );
    return true;
  }
});
