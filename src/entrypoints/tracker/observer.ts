import {
  countTokens,
  saveTokenUsage,
  TokenUsage,
  getChatGPTSessionId,
  loadTokenUsage,
} from "./tokeUsage";
import { updateWidgetUI } from "./ui";

function observeTitleChanges(callback: (title: string) => void) {
  const titleElement = document.querySelector("title");
  if (titleElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" &&
          mutation.target.nodeName === "TITLE"
        ) {
          callback(document.title);
        }
      });
    });
    observer.observe(titleElement, { childList: true });
  }
}

export function resetTokenCount(usage: TokenUsage): void {
  usage.inputTokens = 0;
  usage.outputTokens = 0;
  usage.totalTokens = 0;
}

// This function will be called when the chat has settled
function onChatSettled(usage: TokenUsage, widget: HTMLElement) {
  usage.inputTokens = 0;
  usage.outputTokens = 0;

  const allArticles = document.querySelectorAll("article");
  allArticles.forEach((article) => {
    const userBlock = article.querySelector(
      'div[data-message-author-role="user"]'
    );
    if (userBlock) {
      const userText = (userBlock as HTMLElement).innerText.trim();
      usage.inputTokens += countTokens(userText);
    }

    const assistantBlock = article.querySelector(
      'div[data-message-author-role="assistant"]'
    );
    if (assistantBlock) {
      const assistantText = (assistantBlock as HTMLElement).innerText.trim();
      usage.outputTokens += countTokens(assistantText);
    }
  });

  usage.totalTokens = usage.inputTokens + usage.outputTokens;
  updateWidgetUI(usage, widget);
}

export function setupObservers(initialUsage: TokenUsage, widget: HTMLElement) {
  let currentUsage = initialUsage;
  let settled = false;

  const log = console.log;
  let buffer = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_DELAY = 800;

  const handleAssistantUpdate = (text: string) => {
    buffer = text;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      let outPutToken = countTokens(buffer);
      currentUsage.outputTokens += outPutToken;
      currentUsage.totalTokens =
        currentUsage.inputTokens + currentUsage.outputTokens;
      updateWidgetUI(currentUsage, widget);
      buffer = "";
    }, DEBOUNCE_DELAY);
  };

  const mutationObserver = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const articles = (node as HTMLElement).querySelectorAll("article");
          articles.forEach(async (article) => {
            const aiBlock = article.querySelector(
              'div[data-message-author-role="assistant"]'
            );
            if (aiBlock) {
              const allText = article.innerText.trim();
              handleAssistantUpdate(allText);
            }
            const userBlock = article.querySelector(
              'div[data-message-author-role="user"]'
            );
            if (userBlock) {
              const userText = (userBlock as HTMLElement).innerText.trim();
              let inputToken = countTokens(userText);
              currentUsage.inputTokens += inputToken;
              currentUsage.totalTokens =
                currentUsage.inputTokens + currentUsage.outputTokens;
              updateWidgetUI(currentUsage, widget);
              await saveTokenUsage(currentUsage);
            }
          });
        }
      }
      if (mutation.type === "characterData") {
        const parent = (mutation.target as any).parentElement;
        const article = parent?.closest("article");
        if (article) {
          const aiBlock = article.querySelector(
            'div[data-message-author-role="assistant"]'
          );
          if (aiBlock) {
            const allText = article.innerText.trim();
            handleAssistantUpdate(allText);
          }
        }
      }
    }
  });

  const chatRoot = document.querySelector("main");
  if (chatRoot) {
    const settleObserver = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          onChatSettled(currentUsage, widget);
          // Start observing for new messages after the chat has settled
          mutationObserver.observe(chatRoot, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      }, 1000);
    });

    settleObserver.observe(chatRoot, {
      childList: true,
      subtree: true,
    });
  } else {
    log("[Observer] Chat root not found!");
  }

  const handleSessionChange = async () => {
    const sessionId = getChatGPTSessionId();
    if (sessionId && sessionId !== currentUsage.sessionId) {
      log(`[Observer] Session changed to ${sessionId}`);
      currentUsage = await loadTokenUsage(sessionId);
      updateWidgetUI(currentUsage, widget);
      settled = false; // Reset settled state for the new session
    }
  };

  observeTitleChanges(handleSessionChange);
}
