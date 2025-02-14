let messageListener = null;
let isAutomating = false;

function setupMessageListener() {
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
  }

  messageListener = (message, sender, sendResponse) => {
    if (message.type === "processChatGPTResponse") {
      processChatGPTResponse(message.response);
      sendResponse({ received: true });
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);
}

function processChatGPTResponse(responseText) {
  try {
    const response = JSON.parse(responseText);
    const answer = Array.isArray(response.answer)
      ? response.answer.map((a) => a.trim())
      : response.answer.trim();

    const container = document.querySelector(".probe-container");
    if (!container) return;

    if (container.querySelector(".awd-probe-type-fill_in_the_blank")) {
      const input = container.querySelector("input.fitb-input");
      if (input) {
        input.value = answer;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else {
      const choices = container.querySelectorAll(
        'input[type="radio"], input[type="checkbox"]'
      );
      const answers = Array.isArray(answer) ? answer : [answer];

      choices.forEach((choice) => {
        const label = choice.closest("label");
        if (label) {
          const choiceText = label
            .querySelector(".choiceText")
            ?.textContent.trim();
          if (Array.isArray(answer)) {
            const shouldBeSelected = answer.some((ans) => choiceText === ans);
            if (shouldBeSelected) {
              choice.click();
            }
          } else {
            if (choiceText === answer) {
              choice.click();
            }
          }
        }
      });
    }

    if (isAutomating) {
      waitForElement(
        '[data-automation-id="confidence-buttons--high_confidence"]:not([disabled])',
        10000
      )
        .then((button) => {
          button.click();
          return waitForElement(".next-button", 10000);
        })
        .then((nextButton) => {
          nextButton.click();
          setTimeout(() => {
            const container = document.querySelector(".probe-container");
            if (container && isAutomating) {
              const qData = parseQuestion();
              if (qData) {
                chrome.runtime.sendMessage({
                  type: "sendQuestionToChatGPT",
                  question: qData,
                });
              }
            }
          }, 1000);
        })
        .catch((error) => {
          console.error("Automation error:", error);
          isAutomating = false;
        });
    }
  } catch (e) {
    console.error("Error processing response:", e);
  }
}

function addAssistantButton() {
  waitForElement("awd-header .header__navigation").then((headerNav) => {
    const btn = document.createElement("button");
    btn.textContent = "Ask ChatGPT";
    btn.style.marginLeft = "10px";
    btn.classList.add("btn", "btn-secondary");
    btn.addEventListener("click", () => {
      if (isAutomating) {
        isAutomating = false;
        btn.textContent = "Ask ChatGPT";
      } else {
        const proceed = confirm(
          "Start automated answering? Click OK to begin, or Cancel to stop."
        );
        if (proceed) {
          isAutomating = true;
          btn.textContent = "Stop Automation";
          const qData = parseQuestion();
          if (qData) {
            chrome.runtime.sendMessage({
              type: "sendQuestionToChatGPT",
              question: qData,
            });
          }
        }
      }
    });
    headerNav.appendChild(btn);
  });
}

function parseQuestion() {
  const container = document.querySelector(".probe-container");
  if (!container) {
    alert("No question found on the page.");
    return null;
  }

  let questionType = "";
  if (container.querySelector(".awd-probe-type-multiple_choice")) {
    questionType = "multiple_choice";
  } else if (container.querySelector(".awd-probe-type-true_false")) {
    questionType = "true_false";
  } else if (container.querySelector(".awd-probe-type-multiple_select")) {
    questionType = "multiple_select";
  } else if (container.querySelector(".awd-probe-type-fill_in_the_blank")) {
    questionType = "fill_in_the_blank";
  }

  const promptEl = container.querySelector(".prompt");
  const questionText = promptEl ? promptEl.textContent.trim() : "";

  let options = [];
  if (questionType !== "fill_in_the_blank") {
    container.querySelectorAll(".choiceText").forEach((el) => {
      options.push(el.textContent.trim());
    });
  }

  return { type: questionType, question: questionText, options: options };
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error("Element not found: " + selector));
      }
    }, 100);
  });
}

setupMessageListener();
addAssistantButton();
