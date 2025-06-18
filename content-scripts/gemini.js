let hasResponded = false;
let messageCountAtQuestion = 0;
let observationStartTime = 0;
let observationTimeout = null;
let checkIntervalId = null;
let observer = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "receiveQuestion") {
    resetObservation();

    const messages = document.querySelectorAll("model-response");
    messageCountAtQuestion = messages.length;
    hasResponded = false;

    insertQuestion(message.question)
      .then(() => {
        sendResponse({ received: true, status: "processing" });
      })
      .catch((error) => {
        sendResponse({ received: false, error: error.message });
      });

    return true;
  }
});

function resetObservation() {
  hasResponded = false;
  if (observationTimeout) {
    clearTimeout(observationTimeout);
    observationTimeout = null;
  }
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

async function insertQuestion(questionData) {
  const { type, question, options, previousCorrection } = questionData;
  let text = `Type: ${type}\nQuestion: ${question}`;

  if (
    previousCorrection &&
    previousCorrection.question &&
    previousCorrection.correctAnswer
  ) {
    text =
      `CORRECTION FROM PREVIOUS ANSWER: For the question "${
        previousCorrection.question
      }", your answer was incorrect. The correct answer was: ${JSON.stringify(
        previousCorrection.correctAnswer
      )}\n\nNow answer this new question:\n\n` + text;
  }

  if (type === "matching") {
    text +=
      "\nPrompts:\n" +
      options.prompts.map((prompt, i) => `${i + 1}. ${prompt}`).join("\n");
    text +=
      "\nChoices:\n" +
      options.choices.map((choice, i) => `${i + 1}. ${choice}`).join("\n");
    text +=
      "\n\nPlease match each prompt with the correct choice. Format your answer as an array where each element is 'Prompt -> Choice'.";
  } else if (type === "fill_in_the_blank") {
    text +=
      "\n\nThis is a fill in the blank question. If there are multiple blanks, provide answers as an array in order of appearance. For a single blank, you can provide a string.";
  } else if (options && options.length > 0) {
    text +=
      "\nOptions:\n" + options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");
    text +=
      "\n\nIMPORTANT: Your answer must EXACTLY match one of the above options. Do not include numbers in your answer. If there are periods, include them.";
  }

  text +=
    '\n\nYou MUST provide your answer in JSON format with keys "answer" and "explanation". Format your response as a valid JSON object. Explanations should be no more than one sentence. DO NOT acknowledge the correction in your response, only answer the new question. Use code block with JSON syntax highlighting for your response.';

  return new Promise((resolve, reject) => {
    const inputArea = document.querySelector(".ql-editor");
    if (inputArea) {
      setTimeout(() => {
        inputArea.focus();
        inputArea.innerHTML = `<p>${text}</p>`;
        inputArea.dispatchEvent(new Event("input", { bubbles: true }));

        setTimeout(() => {
          const sendButton = document.querySelector(".send-button");
          if (sendButton) {
            sendButton.click();
            startObserving();
            resolve();
          } else {
            reject(new Error("Send button not found"));
          }
        }, 300);
      }, 300);
    } else {
      reject(new Error("Input area not found"));
    }
  });
}

function processResponse(responseText) {
  const cleanedText = responseText
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\n\s*/g, " ")
    .trim();

  try {
    const parsed = JSON.parse(cleanedText);

    if (parsed && parsed.answer && !hasResponded) {
      hasResponded = true;
      chrome.runtime
        .sendMessage({
          type: "geminiResponse",
          response: cleanedText,
        })
        .then(() => {
          resetObservation();
          return true;
        })
        .catch((error) => {
          console.error("Error sending response:", error);
          return false;
        });

      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

function checkForResponse() {
  if (hasResponded) {
    return;
  }

  const messages = document.querySelectorAll("model-response");

  if (messages.length <= messageCountAtQuestion) {
    return;
  }

  const latestMessage = messages[messages.length - 1];

  // First check code blocks which are most likely to contain properly formatted JSON
  const codeBlocks = latestMessage.querySelectorAll("pre code, code");

  for (const block of codeBlocks) {
    if (
      block.className.includes("language-json") ||
      block.className.includes("hljs-") ||
      block.closest(".code-block")
    ) {
      const responseText = block.textContent.trim();
      if (processResponse(responseText)) return;
    } else {
      const responseText = block.textContent.trim();
      if (responseText.startsWith("{") && responseText.endsWith("}")) {
        if (processResponse(responseText)) return;
      }
    }
  }

  // Then check full message for JSON patterns
  const messageText = latestMessage.textContent.trim();
  const jsonMatch = messageText.match(/\{[\s\S]*?\}/g);
  if (jsonMatch) {
    for (const match of jsonMatch) {
      if (processResponse(match)) return;
    }
  }

  const isGenerating =
    latestMessage.querySelector(".cursor") ||
    latestMessage.classList.contains("generating");

  // After reasonable time has passed and output appears complete, try to extract JSON
  if (!isGenerating && Date.now() - observationStartTime > 10000) {
    try {
      const jsonPattern = /\{[\s\S]*?"answer"[\s\S]*?"explanation"[\s\S]*?\}/;
      const jsonMatch = messageText.match(jsonPattern);

      if (jsonMatch && !hasResponded) {
        hasResponded = true;
        chrome.runtime.sendMessage({
          type: "geminiResponse",
          response: jsonMatch[0],
        });
        resetObservation();
        return true;
      }
    } catch (e) {}
  }
}

function startObserving() {
  observationStartTime = Date.now();
  observationTimeout = setTimeout(() => {
    if (!hasResponded) {
      resetObservation();
    }
  }, 180000);

  observer = new MutationObserver(() => {
    checkForResponse();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  checkIntervalId = setInterval(checkForResponse, 1000);
}
