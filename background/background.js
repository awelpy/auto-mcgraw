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
    chrome.storage.sync.get("aiModel", function (data) {
      const aiModel = data.aiModel || "chatgpt";

      if (aiModel === "chatgpt") {
        chrome.tabs.query({ url: "https://chatgpt.com/*" }, (chatgptTabs) => {
          if (chatgptTabs.length > 0) {
            sendMessageWithRetry(chatgptTabs[0].id, {
              type: "receiveQuestion",
              question: message.question,
            });
          }
        });
      } else if (aiModel === "gemini") {
        chrome.tabs.query(
          { url: "https://gemini.google.com/*" },
          (geminiTabs) => {
            if (geminiTabs.length > 0) {
              sendMessageWithRetry(geminiTabs[0].id, {
                type: "receiveQuestion",
                question: message.question,
              });
            }
          }
        );
      } else if (aiModel === "deepseek") {
        chrome.tabs.query(
          { url: "https://chat.deepseek.com/*" }, 
          (deepseekTabs) => {
            if (deepseekTabs.length > 0) {
              sendMessageWithRetry(deepseekTabs[0].id, {
                type: "receiveQuestion",
                question: message.question,
              });
            }
          }
        );
      }
    });
    return true;
  }

  if (
    message.type === "chatGPTResponse" ||
    message.type === "geminiResponse" ||
    message.type === "deepseekResponse"
  ) {
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

  if (message.type === "openSettings") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/settings.html"),
      type: "popup",
      width: 500,
      height: 520,
    });
    return true;
  }
});
