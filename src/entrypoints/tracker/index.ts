import { loadTokenUsage, DEFAULT_USAGE } from "./tokeUsage";
import { createWidget } from "./ui";
import { getChatGPTSessionId } from "./tokeUsage";
import { setupObservers, resetTokenCount } from "./observer";

// Function to wait for an element to be available in the DOM
function waitForElement(selector: string, callback: () => void) {
  const element = document.querySelector(selector);
  if (element) {
    callback();
  } else {
    const observer = new MutationObserver((mutations, me) => {
      const element = document.querySelector(selector);
      if (element) {
        me.disconnect();
        callback();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

async function initTokenTracker() {
  // Wait for the chat input text area to be available before initializing the tracker
  waitForElement("#prompt-textarea", async () => {
    const sessionId = getChatGPTSessionId() || `session-${Date.now()}`;
    sessionStorage.setItem("chatgpt-session-id", sessionId);

    let usage = await loadTokenUsage(sessionId);
    if (!usage) {
      usage = {
        ...DEFAULT_USAGE,
        sessionId,
        sessionStart: Date.now(),
      };
    } else {
      // Reset token count on session reload/refresh
      resetTokenCount(usage);
    }

    console.log("[tracker] Token usage loaded:", usage);
    const widget = createWidget(usage);
    setupObservers(usage, widget);
  });
}

export default initTokenTracker;
