import React, { useState, useEffect } from "react";
import HappyCat from "../../assets/happyCat.png";
import SadCat from "../../assets/sadCat.png";
import SleepingCat from "../../assets/sleepingCat.png";
import "@/assets/tailwind.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  maxTokens: number;
  sessionStart: number;
}
interface WidgetProps {
  usage: TokenUsage;
  onReset: () => void;
}

const defaultUsage: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  maxTokens: 10000,
  sessionStart: Date.now(),
};

export const Widget: React.FC<WidgetProps> = ({ usage, onReset }) => {
  // const [currentUsage, setCurrentUsage] = useState<TokenUsage>(defaultUsage);
  const [hovered, setHovered] = useState(false);
  const [sessionAge, setSessionAge] = useState(
    formatDuration(Date.now() - usage.sessionStart)
  );

  // 🟡 Live update time display
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionAge(formatDuration(Date.now() - usage.sessionStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [usage.sessionStart]);

  const usedTokens = usage.inputTokens + usage.outputTokens;
  const progressPercentage = Math.min(
    (usedTokens / usage.maxTokens) * 100,
    150
  );

  const currentImage =
    progressPercentage >= 100
      ? SleepingCat
      : progressPercentage >= 50
      ? SadCat
      : HappyCat;

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return "#ef4444"; // Red
    if (percentage > 75) return "#f59e0b"; // Orange
    return "#10b981"; // Green
  };

  const resetUsage = () => {
    const newSession: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      maxTokens: usage.maxTokens,
      sessionStart: Date.now(),
    };
    chrome.storage.local.set({ currentSession: newSession });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionAge(formatDuration(Date.now() - usage.sessionStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [usage.sessionStart]);

  useEffect(() => {
    console.log("Widget usage updated:", usage);
  }, [usage.outputTokens]);

  return (
    <div className="group fixed right-5 bottom-5 z-[999999]">
      <div className="relative flex flex-col items-center">
        {/* Progress bar */}
        <div className="w-24 h-4 bg-gray-200 rounded-full mb-1 relative">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`,
              backgroundColor: getProgressColor(progressPercentage),
            }}
          ></div>

          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-[10px] font-medium text-gray-700">
            {Math.round(progressPercentage)}%
          </div>
        </div>

        {/* Trigger Image */}
        <img
          src={currentImage}
          alt="Tokie Logo"
          className="w-[90px] h-[90px] cursor-pointer"
        />

        {/* Hover Card */}
        <div className="absolute bottom-full mb-2 right-0 w-60 rounded-xl shadow-lg bg-white p-4 border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <span className="text-sm font-semibold text-gray-800 mb-2 block">
            Token Usage
          </span>

          <div className="w-20 h-20 mx-auto mb-2">
            <CircularProgressbar
              value={progressPercentage}
              maxValue={100}
              text={`${Math.round(progressPercentage)}%`}
              styles={buildStyles({
                pathColor: getProgressColor(progressPercentage),
                textColor: "#374151",
                trailColor: "#e5e7eb",
                textSize: "16px",
              })}
            />
          </div>

          <div className="text-xs text-center text-gray-600 mb-1">
            Used: {usedTokens.toLocaleString()}
          </div>
          <div className="text-xs text-center text-gray-600 mb-2">
            Max: {usage.maxTokens.toLocaleString()}
          </div>

          <button
            onClick={onReset}
            className="w-full px-3 py-1 text-xs rounded bg-amber-400 hover:bg-amber-500 text-white font-medium"
          >
            Reset Usage
          </button>
        </div>
      </div>
    </div>
  );
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
