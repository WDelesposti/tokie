import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Widget } from "../entrypoints/tracker/Widget";
import {
  countTokens,
  getChatGPTSessionId,
  loadTokenUsage,
  saveTokenUsage,
  TokenUsage,
} from "../entrypoints/tracker/tokeUsage";

// Mock the image imports
vi.mock("../../assets/happyCat.png", () => ({ default: "happy-cat.png" }));
vi.mock("../../assets/sadCat.png", () => ({ default: "sad-cat.png" }));
vi.mock("../../assets/sleepingCat.png", () => ({
  default: "sleeping-cat.png",
}));

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Complete Token Tracking Flow", () => {
    it("should handle complete user interaction flow", async () => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/c/test-session-123" },
        writable: true,
      });
      const sessionId = getChatGPTSessionId();
      expect(sessionId).toBe("test-session-123");
      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockResolvedValueOnce({ tokenUsage: {} } as any);
      const usage = await loadTokenUsage(sessionId as string);
      expect(usage.sessionId).toBe("test-session-123");
      expect(usage.planType).toBe("free");
      expect(usage.maxTokens).toBe(14000);
      const userInput = "Hello, I need help with a programming problem.";
      const inputTokens = countTokens(userInput);
      expect(inputTokens).toBeGreaterThan(0);
      usage.inputTokens = inputTokens;
      usage.totalTokens = usage.inputTokens + usage.outputTokens;
      const mockSet = vi.mocked(chrome.storage.local.set);
      await saveTokenUsage(usage);
      expect(mockSet).toHaveBeenCalledWith({
        tokenUsage: { "test-session-123": usage },
        currentSession: usage,
      });
      const mockOnReset = vi.fn();
      render(<Widget usage={usage} onReset={mockOnReset} />);
      const progressMatches = screen.getAllByText(
        `${Math.round((usage.totalTokens / usage.maxTokens) * 100)}%`
      );
      expect(progressMatches.length).toBeGreaterThan(0);
      const widget = screen.getByAltText("Tokie Logo");
      fireEvent.mouseEnter(widget);
      const resetButton = screen.getByText("Reset Usage");
      fireEvent.click(resetButton);
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("should handle Plus user upgrade flow", async () => {
      const usage: TokenUsage = {
        sessionId: "plus-session",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 5000,
        outputTokens: 2000,
        totalTokens: 7000,
        syncing: false,
        maxTokens: 14000,
      };
      const badgeContent = "ChatGPT Plus";
      const isPlusUser = badgeContent.toUpperCase().includes("PLUS");
      if (isPlusUser && usage.planType !== "plus") {
        usage.planType = "plus";
        usage.maxTokens = 128000;
      }
      expect(usage.planType).toBe("plus");
      expect(usage.maxTokens).toBe(128000);
      const mockOnReset = vi.fn();
      render(<Widget usage={usage} onReset={mockOnReset} />);
      const expectedPercentage = Math.round(
        (usage.totalTokens / usage.maxTokens) * 100
      );
      const plusMatches = screen.getAllByText(`${expectedPercentage}%`);
      expect(plusMatches.length).toBeGreaterThan(0);
    });

    it("should handle high token usage scenario", async () => {
      const usage: TokenUsage = {
        sessionId: "high-usage-session",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 12000,
        outputTokens: 3000,
        totalTokens: 15000,
        syncing: false,
        maxTokens: 14000,
      };
      const percentage = Math.round(
        (usage.totalTokens / usage.maxTokens) * 100
      );
      expect(percentage).toBe(107);
      const mockOnReset = vi.fn();
      render(<Widget usage={usage} onReset={mockOnReset} />);
      const catImage = screen.getByAltText("Tokie Logo");
      expect(catImage.getAttribute("src")).toMatch(/sleepingCat\.png$/);
      fireEvent.mouseEnter(catImage);
      // Use regex to accept both 15.000 and 15,000
      const usedMatcher = (content: string) =>
        /Used:\s*15[.,]000/.test(content);
      const maxMatcher = (content: string) => /Max:\s*14[.,]000/.test(content);
      expect(screen.getByText(usedMatcher)).toBeInTheDocument();
      expect(screen.getByText(maxMatcher)).toBeInTheDocument();
      expect(screen.getAllByText("107%").length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      const mockGet = vi.mocked(chrome.storage.local.get);
      mockGet.mockRejectedValue(new Error("Storage error"));
      await expect(loadTokenUsage("test-session")).rejects.toThrow(
        "Storage error"
      );
    });
    it("should handle invalid session ID", () => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/invalid-path" },
        writable: true,
      });
      const sessionId = getChatGPTSessionId();
      expect(sessionId).toBeNull();
    });
    it("should handle empty token counting gracefully", () => {
      const tokenCount = countTokens("");
      expect(tokenCount).toBe(0);
    });
  });

  describe("Performance Tests", () => {
    it("should handle large text efficiently", () => {
      const largeText = "Lorem ipsum ".repeat(1000);
      const startTime = performance.now();
      const tokenCount = countTokens(largeText);
      const endTime = performance.now();
      expect(tokenCount).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100);
    });
    it("should handle rapid widget updates", () => {
      const usage: TokenUsage = {
        sessionId: "performance-test",
        sessionStart: Date.now(),
        planType: "free",
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        syncing: false,
        maxTokens: 14000,
      };
      const mockOnReset = vi.fn();
      const { rerender } = render(
        <Widget usage={usage} onReset={mockOnReset} />
      );
      for (let i = 0; i < 10; i++) {
        const updatedUsage = {
          ...usage,
          inputTokens: usage.inputTokens + i * 100,
          totalTokens: usage.totalTokens + i * 100,
        };
        rerender(<Widget usage={updatedUsage} onReset={mockOnReset} />);
      }
      // The displayed value is 17%
      expect(screen.getAllByText("17%").length).toBeGreaterThan(0);
    });
  });
});
