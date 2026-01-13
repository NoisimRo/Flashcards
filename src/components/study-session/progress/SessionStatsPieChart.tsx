import React from 'react';
import { Check, X, SkipForward } from 'lucide-react';

interface SessionStatsPieChartProps {
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  size?: 'small' | 'medium' | 'large';
  showLegend?: boolean;
}

/**
 * SessionStatsPieChart - Visualizes session answer distribution
 * Displays a pie chart with correct/incorrect/skipped segments
 */
export const SessionStatsPieChart: React.FC<SessionStatsPieChartProps> = ({
  correctCount,
  incorrectCount,
  skippedCount,
  size = 'medium',
  showLegend = false,
}) => {
  const total = correctCount + incorrectCount + skippedCount;

  // If no answers yet, show empty state
  if (total === 0) {
    const radius = size === 'small' ? 30 : size === 'medium' ? 50 : 70;
    const svgSize = radius * 2;

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={radius - 4}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
        </svg>
        {showLegend && (
          <div className="text-xs text-gray-400 font-medium">Fără răspunsuri</div>
        )}
      </div>
    );
  }

  // Calculate percentages
  const correctPercent = (correctCount / total) * 100;
  const incorrectPercent = (incorrectCount / total) * 100;
  const skippedPercent = (skippedCount / total) * 100;

  // SVG circle parameters based on size
  const radius = size === 'small' ? 30 : size === 'medium' ? 50 : 70;
  const svgSize = radius * 2;
  const strokeWidth = size === 'small' ? 8 : size === 'medium' ? 12 : 16;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Calculate dash arrays for each segment
  const correctDash = (correctPercent / 100) * circumference;
  const incorrectDash = (incorrectPercent / 100) * circumference;
  const skippedDash = (skippedPercent / 100) * circumference;

  // Calculate offsets for stacking segments
  const correctOffset = 0;
  const incorrectOffset = -correctDash;
  const skippedOffset = -(correctDash + incorrectDash);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pie Chart */}
      <div className="relative">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={strokeWidth}
          />

          {/* Correct segment (green) */}
          {correctCount > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${correctDash} ${circumference - correctDash}`}
              strokeDashoffset={correctOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Incorrect segment (red) */}
          {incorrectCount > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke="#EF4444"
              strokeWidth={strokeWidth}
              strokeDasharray={`${incorrectDash} ${circumference - incorrectDash}`}
              strokeDashoffset={incorrectOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Skipped segment (yellow) */}
          {skippedCount > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeDasharray={`${skippedDash} ${circumference - skippedDash}`}
              strokeDashoffset={skippedOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}
        </svg>

        {/* Center label with total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`font-bold text-gray-900 ${
              size === 'small' ? 'text-sm' : size === 'medium' ? 'text-xl' : 'text-3xl'
            }`}
          >
            {total}
          </div>
          {size !== 'small' && (
            <div className="text-xs text-gray-500 font-medium">
              {total === 1 ? 'răspuns' : 'răspunsuri'}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2 w-full">
          {/* Correct */}
          {correctCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <Check size={14} />
                  <span>Corecte</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{correctCount}</span>
                <span className="text-xs text-gray-500">({correctPercent.toFixed(0)}%)</span>
              </div>
            </div>
          )}

          {/* Incorrect */}
          {incorrectCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <X size={14} />
                  <span>Greșite</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{incorrectCount}</span>
                <span className="text-xs text-gray-500">({incorrectPercent.toFixed(0)}%)</span>
              </div>
            </div>
          )}

          {/* Skipped */}
          {skippedCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <SkipForward size={14} />
                  <span>Sărite</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{skippedCount}</span>
                <span className="text-xs text-gray-500">({skippedPercent.toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
