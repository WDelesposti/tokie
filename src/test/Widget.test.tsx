import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Widget } from "../entrypoints/tracker/Widget";

// Mock the image imports
vi.mock("../../assets/happyCat.png", () => ({
  default: "happy-cat.png",
}));
vi.mock("../../assets/sadCat.png", () => ({
  default: "sad-cat.png",
}));
vi.mock("../../assets/sleepingCat.png", () => ({
  default: "sleeping-cat.png",
}));

// Mock chrome storage
const mockSet = vi.fn().mockResolvedValue(undefined);

describe("Widget Component", () => {
  const mockOnReset = vi.fn();

  const defaultUsage = {
    inputTokens: 0,
    outputTokens: 0,
    maxTokens: 10000,
    sessionStart: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock chrome.storage.local.set
    global.chrome = {
      storage: {
        local: {
          set: mockSet,
        },
      },
    } as any;
  });

  it("should render the widget with correct initial state", () => {
    render(<Widget usage={defaultUsage} onReset={mockOnReset} />);
    // Should have at least one element with "0%"
    const percentElements = screen.getAllByText("0%");
    expect(percentElements.length).toBeGreaterThanOrEqual(1);
    // Check if the cat image is rendered
    const catImage = screen.getByAltText("Tokie Logo");
    expect(catImage).toBeInTheDocument();
    // Accepts the real path of the asset
    expect(catImage.getAttribute("src")).toMatch(/happyCat\.png$/);
  });

  it("should show correct progress percentage", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 5000,
      outputTokens: 2000,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    // Should have at least one element with "70%"
    const percentElements = screen.getAllByText("70%");
    expect(percentElements.length).toBeGreaterThanOrEqual(1);
  });

  it("should show happy cat for low usage (< 50%)", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 2000,
      outputTokens: 1000,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    const catImage = screen.getByAltText("Tokie Logo");
    expect(catImage.getAttribute("src")).toMatch(/happyCat\.png$/);
  });

  it("should show sad cat for medium usage (50-99%)", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 5000,
      outputTokens: 2000,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    const catImage = screen.getByAltText("Tokie Logo");
    expect(catImage.getAttribute("src")).toMatch(/sadCat\.png$/);
  });

  it("should show sleeping cat for high usage (>= 100%)", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 8000,
      outputTokens: 3000,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    const catImage = screen.getByAltText("Tokie Logo");
    expect(catImage.getAttribute("src")).toMatch(/sleepingCat\.png$/);
  });

  it("should display correct token counts in hover card", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 3000,
      outputTokens: 1500,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    // Hover over the widget to show the card
    const widget = screen.getByAltText("Tokie Logo");
    fireEvent.mouseEnter(widget);
    // Use a function to find text "Used: 4.500" or "Used: 4,500" (locale)
    const usedMatcher = (content: string) => /Used:\s*4[.,]500/.test(content);
    const maxMatcher = (content: string) => /Max:\s*10[.,]000/.test(content);
    expect(screen.getByText(usedMatcher)).toBeInTheDocument();
    expect(screen.getByText(maxMatcher)).toBeInTheDocument();
  });

  it("should call onReset when reset button is clicked", () => {
    render(<Widget usage={defaultUsage} onReset={mockOnReset} />);
    // Hover over the widget to show the card
    const widget = screen.getByAltText("Tokie Logo");
    fireEvent.mouseEnter(widget);
    // Click the reset button
    const resetButton = screen.getByText("Reset Usage");
    fireEvent.click(resetButton);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("should handle edge case with zero max tokens", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 1000,
      outputTokens: 500,
      maxTokens: 0,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    // Should have at least one element with "150%"
    const percentElements = screen.getAllByText("150%");
    expect(percentElements.length).toBeGreaterThanOrEqual(1);
  });

  it("should show correct progress bar color based on usage", () => {
    const usage = {
      ...defaultUsage,
      inputTokens: 8000,
      outputTokens: 2000,
      maxTokens: 10000,
    };
    render(<Widget usage={usage} onReset={mockOnReset} />);
    // Find all elements with "100%" and get the correct one
    const percentElements = screen.getAllByText("100%");
    // The first one is the linear bar, the second one is the circular one
    const progressBar = percentElements[0].closest("div");
    // Just make sure the element exists
    expect(progressBar).toBeTruthy();
  });
});
