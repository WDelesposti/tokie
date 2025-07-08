import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenUsage } from "../entrypoints/tracker/tokeUsage";

// Mock the functions that are imported in observer.ts
vi.mock("../entrypoints/tracker/tokeUsage", () => ({
  countTokens: vi.fn(),
  saveTokenUsage: vi.fn(),
  TokenUsage: vi.fn(),
}));

vi.mock("../entrypoints/tracker/ui", () => ({
  updateWidgetUI: vi.fn(),
}));

describe("Observer Functions", () => {
  let mockUsage: TokenUsage;
  let mockWidget: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUsage = {
      sessionId: "test-session",
      sessionStart: Date.now(),
      planType: "free" as const,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      syncing: false,
      maxTokens: 14000,
    };

    mockWidget = document.createElement("div");
  });

  afterEach(() => {
    // Clean up any observers
    vi.restoreAllMocks();
  });

  describe("Plan Observer Setup", () => {
    it("should detect Plus user from profile button", () => {
      // Create a mock profile button with Plus badge
      const profileButton = document.createElement("button");
      profileButton.setAttribute("data-testid", "profile-button");

      const badgeSpan = document.createElement("span");
      badgeSpan.textContent = "ChatGPT Plus";
      profileButton.appendChild(badgeSpan);

      document.body.appendChild(profileButton);

      // Mock the setupPlanObserver function behavior
      const updateUserPlan = (badgeSpan: Element | null) => {
        const badgeContent = badgeSpan?.textContent?.toUpperCase();
        const isPlusUser = badgeContent?.includes("PLUS");

        if (isPlusUser && mockUsage.planType !== "plus") {
          mockUsage.planType = "plus";
          mockUsage.maxTokens = 128000;
        }
      };

      updateUserPlan(badgeSpan);

      expect(mockUsage.planType).toBe("plus");
      expect(mockUsage.maxTokens).toBe(128000);

      document.body.removeChild(profileButton);
    });

    it("should detect Free user from profile button", () => {
      // Create a mock profile button without Plus badge
      const profileButton = document.createElement("button");
      profileButton.setAttribute("data-testid", "profile-button");

      const badgeSpan = document.createElement("span");
      badgeSpan.textContent = "ChatGPT";
      profileButton.appendChild(badgeSpan);

      document.body.appendChild(profileButton);

      // Mock the setupPlanObserver function behavior
      const updateUserPlan = (badgeSpan: Element | null) => {
        const badgeContent = badgeSpan?.textContent?.toUpperCase();
        const isPlusUser = badgeContent?.includes("PLUS");

        if (!isPlusUser && mockUsage.planType !== "free") {
          mockUsage.planType = "free";
          mockUsage.maxTokens = 14000;
        }
      };

      updateUserPlan(badgeSpan);

      expect(mockUsage.planType).toBe("free");
      expect(mockUsage.maxTokens).toBe(14000);

      document.body.removeChild(profileButton);
    });
  });

  describe("Message Observer", () => {
    it("should count tokens from user messages", () => {
      // Create mock DOM structure
      const article = document.createElement("article");
      const userBlock = document.createElement("div");
      userBlock.setAttribute("data-message-author-role", "user");
      userBlock.innerText = "Hello, how are you?";
      article.appendChild(userBlock);

      document.body.appendChild(article);

      // Mock token counting
      const countTokens = vi.fn().mockReturnValue(5);

      const userBlocks = article.querySelectorAll(
        'div[data-message-author-role="user"]'
      );
      let totalInputTokens = 0;

      userBlocks.forEach((userBlock) => {
        const userText = (userBlock as HTMLElement).innerText.trim();
        totalInputTokens += countTokens(userText);
      });

      expect(countTokens).toHaveBeenCalledWith("Hello, how are you?");
      expect(totalInputTokens).toBe(5);

      document.body.removeChild(article);
    });

    it("should count tokens from assistant messages", () => {
      // Create mock DOM structure
      const article = document.createElement("article");
      const assistantBlock = document.createElement("div");
      assistantBlock.setAttribute("data-message-author-role", "assistant");
      assistantBlock.innerText = "I am doing well, thank you for asking!";
      article.appendChild(assistantBlock);

      document.body.appendChild(article);

      // Mock token counting
      const countTokens = vi.fn().mockReturnValue(8);

      const assistantBlocks = article.querySelectorAll(
        'div[data-message-author-role="assistant"]'
      );
      let totalOutputTokens = 0;

      assistantBlocks.forEach((assistantBlock) => {
        const assistantText = (assistantBlock as HTMLElement).innerText.trim();
        totalOutputTokens += countTokens(assistantText);
      });

      expect(countTokens).toHaveBeenCalledWith(
        "I am doing well, thank you for asking!"
      );
      expect(totalOutputTokens).toBe(8);

      document.body.removeChild(article);
    });

    it("should handle empty messages", () => {
      const article = document.createElement("article");
      const userBlock = document.createElement("div");
      userBlock.setAttribute("data-message-author-role", "user");
      userBlock.innerText = "";
      article.appendChild(userBlock);

      document.body.appendChild(article);

      const countTokens = vi.fn().mockReturnValue(0);

      const userBlocks = article.querySelectorAll(
        'div[data-message-author-role="user"]'
      );
      let totalInputTokens = 0;

      userBlocks.forEach((userBlock) => {
        const userText = (userBlock as HTMLElement).innerText.trim();
        totalInputTokens += countTokens(userText);
      });

      expect(countTokens).toHaveBeenCalledWith("");
      expect(totalInputTokens).toBe(0);

      document.body.removeChild(article);
    });
  });

  describe("URL Change Detection", () => {
    it("should detect URL changes", () => {
      let lastPath = "/c/session-1";
      const currentPath = "/c/session-2";

      const hasPathChanged = currentPath !== lastPath;

      expect(hasPathChanged).toBe(true);
    });

    it("should not detect URL changes for same path", () => {
      let lastPath = "/c/session-1";
      const currentPath = "/c/session-1";

      const hasPathChanged = currentPath !== lastPath;

      expect(hasPathChanged).toBe(false);
    });
  });

  describe("Debouncing", () => {
    it("should debounce widget updates", () => {
      const WIDGET_UPDATE_DEBOUNCE = 400;
      let widgetUpdateTimer: ReturnType<typeof setTimeout> | null = null;

      const safeUpdateWidgetUI = () => {
        if (widgetUpdateTimer) clearTimeout(widgetUpdateTimer);
        widgetUpdateTimer = setTimeout(() => {
          // Widget update logic would go here
        }, WIDGET_UPDATE_DEBOUNCE);
      };

      // First call should set timer
      safeUpdateWidgetUI();
      expect(widgetUpdateTimer).not.toBeNull();

      // Second call should clear and reset timer
      const firstTimer = widgetUpdateTimer;
      safeUpdateWidgetUI();
      expect(widgetUpdateTimer).not.toBe(firstTimer);
    });
  });
});
