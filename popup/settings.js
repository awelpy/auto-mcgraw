document.addEventListener("DOMContentLoaded", function () {
  const chatgptButton = document.getElementById("chatgpt");
  const geminiButton = document.getElementById("gemini");
  const deepseekButton = document.getElementById("deepseek");
  const statusMessage = document.getElementById("status-message");

  chrome.storage.sync.get("aiModel", function (data) {
    const currentModel = data.aiModel || "chatgpt";

    chatgptButton.classList.remove("active");
    geminiButton.classList.remove("active");
    deepseekButton.classList.remove("active");

    if (currentModel === "chatgpt") {
      chatgptButton.classList.add("active");
    } else if (currentModel === "gemini") {
      geminiButton.classList.add("active");
    } else if (currentModel === "deepseek") {
      deepseekButton.classList.add("active");
    }

    checkModelAvailability(currentModel);
  });

  chatgptButton.addEventListener("click", function () {
    setActiveModel("chatgpt");
  });

  geminiButton.addEventListener("click", function () {
    setActiveModel("gemini");
  });

  deepseekButton.addEventListener("click", function () {
    setActiveModel("deepseek");
  });

  function setActiveModel(model) {
    chrome.storage.sync.set({ aiModel: model }, function () {
      chatgptButton.classList.remove("active");
      geminiButton.classList.remove("active");
      deepseekButton.classList.remove("active");

      if (model === "chatgpt") {
        chatgptButton.classList.add("active");
      } else if (model === "gemini") {
        geminiButton.classList.add("active");
      } else if (model === "deepseek") {
        deepseekButton.classList.add("active");
      }

      checkModelAvailability(model);
    });
  }

  function checkModelAvailability(currentModel) {
    statusMessage.textContent = "Checking assistant availability...";
    statusMessage.className = "";

    chrome.tabs.query({ url: "https://chatgpt.com/*" }, (chatgptTabs) => {
      const chatgptAvailable = chatgptTabs.length > 0;

      chrome.tabs.query(
        { url: "https://gemini.google.com/*" },
        (geminiTabs) => {
          const geminiAvailable = geminiTabs.length > 0;

          chrome.tabs.query(
            { url: "https://chat.deepseek.com/*" },
            (deepseekTabs) => {
              const deepseekAvailable = deepseekTabs.length > 0;

              if (currentModel === "chatgpt") {
                if (chatgptAvailable) {
                  statusMessage.textContent =
                    "ChatGPT tab is open and ready to use.";
                  statusMessage.className = "success";
                } else {
                  statusMessage.textContent =
                    "Please open ChatGPT in another tab to use this assistant.";
                  statusMessage.className = "error";
                }
              } else if (currentModel === "gemini") {
                if (geminiAvailable) {
                  statusMessage.textContent =
                    "Gemini tab is open and ready to use.";
                  statusMessage.className = "success";
                } else {
                  statusMessage.textContent =
                    "Please open Gemini in another tab to use this assistant.";
                  statusMessage.className = "error";
                }
              } else if (currentModel === "deepseek") {
                if (deepseekAvailable) {
                  statusMessage.textContent =
                    "DeepSeek tab is open and ready to use.";
                  statusMessage.className = "success";
                } else {
                  statusMessage.textContent =
                    "Please open DeepSeek in another tab to use this assistant.";
                  statusMessage.className = "error";
                }
              }
            }
          );
        }
      );
    });
  }

  setInterval(() => {
    chrome.storage.sync.get("aiModel", function (data) {
      const currentModel = data.aiModel || "chatgpt";
      checkModelAvailability(currentModel);
    });
  }, 5000);
});
