import { loadTokenUsage, DEFAULT_USAGE } from "./tokeUsage";
import { createWidget } from "./ui";
import { getChatGPTSessionId } from "./tokeUsage";
import { setupObservers, resetTokenCount } from "./observer";

async function initTokenTracker() {
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
}

export default initTokenTracker;
