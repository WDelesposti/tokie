import { loadTokenUsage, DEFAULT_USAGE, TokenUsage } from "./tokeUsage";
import { createWidget } from "./ui";
import { getChatGPTSessionId } from "./tokeUsage";
import { startMessageObserver, setupSessionObserver } from "./observer";

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
  }

  console.log("[tracker] Token usage loaded:", usage);
  const widget = createWidget(usage);
  startMessageObserver(usage, widget);
  setupSessionObserver(usage, widget);
}

export default initTokenTracker;
