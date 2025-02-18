let hasResponded = false;
let messageCountAtQuestion = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "receiveQuestion") {
    const messages = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    );
    messageCountAtQuestion = messages.length;
    hasResponded = false;
    insertQuestion(message.question);
    sendResponse({ received: true });
    return true;
  }
});

function insertQuestion(questionData) {
  const { type, question, options } = questionData;
  let text = `Type: ${type}\nQuestion: ${question}`;

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
    '\n\nPlease provide your answer in JSON format with keys "answer" and "explanation".';

  const inputArea = document.getElementById("prompt-textarea");
  if (inputArea) {
    inputArea.focus();
    inputArea.innerHTML = `<p>${text}</p>`;
    inputArea.dispatchEvent(new Event("input", { bubbles: true }));

    setTimeout(() => {
      const sendButton = document.querySelector('[data-testid="send-button"]');
      if (sendButton) {
        sendButton.click();
        startObserving();
      }
    }, 500);
  }
}

function startObserving() {
  const observer = new MutationObserver((mutations) => {
    if (hasResponded) return;

    const messages = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    );
    if (!messages.length) return;

    if (messages.length <= messageCountAtQuestion) return;

    const latestMessage = messages[messages.length - 1];
    const codeBlocks = latestMessage.querySelectorAll("pre code");
    let responseText = "";

    for (const block of codeBlocks) {
      if (block.className.includes("language-json")) {
        responseText = block.textContent.trim();
        break;
      }
    }

    if (!responseText) {
      responseText = latestMessage.textContent.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) responseText = jsonMatch[0];
    }

    responseText = responseText
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\n\s*/g, " ")
      .trim();

    try {
      const parsed = JSON.parse(responseText);
      if (parsed.answer && !hasResponded) {
        hasResponded = true;
        chrome.runtime.sendMessage({
          type: "chatGPTResponse",
          response: responseText,
        });
        observer.disconnect();
      }
    } catch (e) {}
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
