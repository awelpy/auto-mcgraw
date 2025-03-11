document.addEventListener("DOMContentLoaded", function () {
  const chatgptButton = document.getElementById("chatgpt");
  const geminiButton = document.getElementById("gemini");
  const statusMessage = document.getElementById("status-message");

  chrome.storage.sync.get("aiModel", function (data) {
    const currentModel = data.aiModel || "chatgpt";

    if (currentModel === "chatgpt") {
      chatgptButton.classList.add("active");
      geminiButton.classList.remove("active");
    } else {
      geminiButton.classList.add("active");
      chatgptButton.classList.remove("active");
    }

    checkModelAvailability(currentModel);
  });

  chatgptButton.addEventListener("click", function () {
    setActiveModel("chatgpt");
  });

  geminiButton.addEventListener("click", function () {
    setActiveModel("gemini");
  });

  function setActiveModel(model) {
    chrome.storage.sync.set({ aiModel: model }, function () {
      if (model === "chatgpt") {
        chatgptButton.classList.add("active");
        geminiButton.classList.remove("active");
      } else {
        geminiButton.classList.add("active");
        chatgptButton.classList.remove("active");
      }

      checkModelAvailability(model);
    });
  }

  function checkModelAvailability(currentModel) {
    statusMessage.textContent = "Checking assistant availability...";

    chrome.tabs.query({ url: "https://chatgpt.com/*" }, (chatgptTabs) => {
      const chatgptAvailable = chatgptTabs.length > 0;

      chrome.tabs.query(
        { url: "https://gemini.google.com/*" },
        (geminiTabs) => {
          const geminiAvailable = geminiTabs.length > 0;

          if (currentModel === "chatgpt") {
            if (chatgptAvailable) {
              statusMessage.textContent =
                "✓ ChatGPT tab is open and ready to use.";
              statusMessage.style.color = "#4caf50";
            } else {
              statusMessage.textContent =
                "✗ Please open ChatGPT in another tab to use this assistant.";
              statusMessage.style.color = "#f44336";
            }
          } else {
            if (geminiAvailable) {
              statusMessage.textContent =
                "✓ Gemini tab is open and ready to use.";
              statusMessage.style.color = "#4caf50";
            } else {
              statusMessage.textContent =
                "✗ Please open Gemini in another tab to use this assistant.";
              statusMessage.style.color = "#f44336";
            }
          }
        }
      );
    });
  }
});
