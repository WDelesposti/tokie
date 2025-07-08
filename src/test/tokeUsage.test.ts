import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  countTokens,
  getChatGPTSessionId,
  loadTokenUsage,
  saveTokenUsage,
  getCurrentSession,
  setCurrentSession,
  DEFAULT_USAGE,
  TokenUsage,
} from "../entrypoints/tracker/tokeUsage";

describe("Token Usage Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countTokens", () => {
    it("should count tokens correctly for simple text", () => {
      const text = "Hello world";
      const tokenCount = countTokens(text);
      expect(tokenCount).toBeGreaterThan(0);
    });

    it("should count tokens for longer text", () => {
      const text =
        "This is a longer text that should have more tokens than the previous one.";
      const tokenCount = countTokens(text);
      expect(tokenCount).toBeGreaterThan(0);
    });

    it("should return 0 for empty string", () => {
      const text = "";
      const tokenCount = countTokens(text);
      expect(tokenCount).toBe(0);
    });

    it("should handle special characters", () => {
      const text = "Hello! How are you? 😊";
      const tokenCount = countTokens(text);
      expect(tokenCount).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", () => {
      const invalidInput = null as any;
      const tokenCount = countTokens(invalidInput);
      expect(tokenCount).toBe(0);
    });
  });

  describe("getChatGPTSessionId", () => {
    it("should extract session ID from ChatGPT URL", () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/c/abc123-def456",
        },
        writable: true,
      });

      const sessionId = getChatGPTSessionId();
      expect(sessionId).toBe("abc123-def456");
    });

    it("should return null for non-ChatGPT URLs", () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/some-other-path",
        },
        writable: true,
      });

      const sessionId = getChatGPTSessionId();
      expect(sessionId).toBeNull();
    });

    it("should handle URLs without session ID", () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/c/",
        },
        writable: true,
      });

      const sessionId = getChatGPTSessionId();
      expect(sessionId).toBeNull();
    });
  });

  describe("loadTokenUsage", () => {
    it("should create new usage for new session", async () => {
      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockResolvedValue({ tokenUsage: {} } as any);

      const sessionId = "new-session";
      const usage = await loadTokenUsage(sessionId);

      expect(usage.sessionId).toBe(sessionId);
      expect(usage.sessionStart).toBeGreaterThan(0);
      expect(usage.planType).toBe("free");
      expect(usage.maxTokens).toBe(14000);
    });

    it("should load existing usage for existing session", async () => {
      const existingUsage: TokenUsage = {
        sessionId: "existing-session",
        sessionStart: Date.now() - 1000,
        planType: "plus",
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        syncing: false,
        maxTokens: 128000,
      };

      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockResolvedValue({
        tokenUsage: { "existing-session": existingUsage },
      } as any);

      const usage = await loadTokenUsage("existing-session");
      expect(usage).toEqual(existingUsage);
    });

    it("should save usage to storage", async () => {
      const mockGet = vi.mocked(chrome.storage.local.get);
      const mockSet = vi.mocked(chrome.storage.local.set);
      mockGet.mockResolvedValue({ tokenUsage: {} } as any);

      const sessionId = "test-session";
      await loadTokenUsage(sessionId);

      expect(mockSet).toHaveBeenCalledWith({
        tokenUsage: expect.any(Object),
        currentSession: expect.any(Object),
      });
    });
  });

  describe("saveTokenUsage", () => {
    it("should save usage to storage", async () => {
      const mockGet = vi.mocked(chrome.storage.local.get);
      const mockSet = vi.mocked(chrome.storage.local.set);
      mockGet.mockResolvedValue({ tokenUsage: {} } as any);

      const usage: TokenUsage = {
        sessionId: "test-session",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        syncing: false,
        maxTokens: 14000,
      };

      await saveTokenUsage(usage);

      expect(mockSet).toHaveBeenCalledWith({
        tokenUsage: { "test-session": usage },
        currentSession: usage,
      });
    });

    it("should not save if sessionId is empty", async () => {
      const mockSet = vi.mocked(chrome.storage.local.set);

      const usage: TokenUsage = {
        ...DEFAULT_USAGE,
        sessionId: "",
      };

      await saveTokenUsage(usage);

      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentSession", () => {
    it("should return current session from storage", async () => {
      const expectedUsage: TokenUsage = {
        sessionId: "current-session",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        syncing: false,
        maxTokens: 14000,
      };

      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockResolvedValue({ currentSession: expectedUsage } as any);

      const usage = await getCurrentSession();
      expect(usage).toEqual(expectedUsage);
    });

    it("should return null if no current session", async () => {
      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockResolvedValue({} as any);

      const usage = await getCurrentSession();
      expect(usage).toBeNull();
    });
  });

  describe("setCurrentSession", () => {
    it("should save current session to storage", async () => {
      const mockSet = vi.mocked(chrome.storage.local.set);

      const usage: TokenUsage = {
        sessionId: "test-session",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        syncing: false,
        maxTokens: 14000,
      };

      await setCurrentSession(usage);

      expect(mockSet).toHaveBeenCalledWith({ currentSession: usage });
    });
  });
});
