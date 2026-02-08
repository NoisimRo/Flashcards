import React, { useState, useEffect } from 'react';
import { Check, X, SkipForward } from 'lucide-react';

interface SessionStatsPieChartProps {
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalCards?: number; // For calculating unanswered and percentage
  size?: 'small' | 'medium' | 'large';
  showLegend?: boolean;
}

type SegmentType = 'correct' | 'incorrect' | 'skipped' | 'unanswered' | null;

/**
 * SessionStatsPieChart - Visualizes session answer distribution
 * Displays an interactive pie chart with 4 segments and individual tooltips
 */
export const SessionStatsPieChart: React.FC<SessionStatsPieChartProps> = ({
  correctCount,
  incorrectCount,
  skippedCount,
  totalCards,
  size = 'medium',
  showLegend = false,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<SegmentType>(null);
  const answered = correctCount + incorrectCount + skippedCount;
  const total = totalCards || answered;
  const unansweredCount = total - answered;

  // Auto-dismiss tooltip after 3 seconds
  useEffect(() => {
    if (activeTooltip) {
      const timer = setTimeout(() => setActiveTooltip(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTooltip]);

  // Handle segment click/tap
  const handleSegmentClick = (segment: SegmentType) => {
    if (activeTooltip === segment) {
      setActiveTooltip(null); // Second tap dismisses
    } else {
      setActiveTooltip(segment);
    }
  };

  // Helper: Create SVG path for pie segment
  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(radius, radius, radius - 4, endAngle);
    const end = polarToCartesian(radius, radius, radius - 4, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M',
      start.x,
      start.y,
      'A',
      radius - 4,
      radius - 4,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      'L',
      radius,
      radius,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

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
            stroke="var(--border-secondary)"
            strokeWidth="8"
          />
        </svg>
        {showLegend && (
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Fără răspunsuri
          </div>
        )}
      </div>
    );
  }

  // SVG parameters based on size
  const radius = size === 'small' ? 30 : size === 'medium' ? 50 : 70;
  const svgSize = radius * 2;

  // Calculate angles for each segment (360 degrees total)
  const correctAngle = (correctCount / total) * 360;
  const incorrectAngle = (incorrectCount / total) * 360;
  const skippedAngle = (skippedCount / total) * 360;
  const unansweredAngle = (unansweredCount / total) * 360;

  // Calculate cumulative angles for positioning
  let currentAngle = 0;
  const correctStart = currentAngle;
  const correctEnd = (currentAngle += correctAngle);
  const incorrectStart = currentAngle;
  const incorrectEnd = (currentAngle += incorrectAngle);
  const skippedStart = currentAngle;
  const skippedEnd = (currentAngle += skippedAngle);
  const unansweredStart = currentAngle;
  const unansweredEnd = (currentAngle += unansweredAngle);

  // Calculate percentage for center display
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Calculate percentages for legend
  const correctPercent = total > 0 ? (correctCount / total) * 100 : 0;
  const incorrectPercent = total > 0 ? (incorrectCount / total) * 100 : 0;
  const skippedPercent = total > 0 ? (skippedCount / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pie Chart */}
      <div className="relative">
        <svg width={svgSize} height={svgSize}>
          {/* Correct segment (green) */}
          {correctCount > 0 && (
            <path
              d={createArc(correctStart, correctEnd, radius)}
              fill="#10B981"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleSegmentClick('correct')}
            />
          )}

          {/* Incorrect segment (red) */}
          {incorrectCount > 0 && (
            <path
              d={createArc(incorrectStart, incorrectEnd, radius)}
              fill="#EF4444"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleSegmentClick('incorrect')}
            />
          )}

          {/* Skipped segment (yellow) */}
          {skippedCount > 0 && (
            <path
              d={createArc(skippedStart, skippedEnd, radius)}
              fill="#F59E0B"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleSegmentClick('skipped')}
            />
          )}

          {/* Unanswered segment (grey) */}
          {unansweredCount > 0 && (
            <path
              d={createArc(unansweredStart, unansweredEnd, radius)}
              fill="var(--border-secondary)"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleSegmentClick('unanswered')}
            />
          )}
        </svg>

        {/* Center label with percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`font-bold ${
              size === 'small' ? 'text-sm' : size === 'medium' ? 'text-xl' : 'text-3xl'
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            {percentage}%
          </div>
          {size !== 'small' && (
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              corect
            </div>
          )}
        </div>

        {/* Tooltips */}
        {activeTooltip === 'correct' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-3 whitespace-nowrap shadow-lg z-50">
            ✓ {correctCount}
          </div>
        )}
        {activeTooltip === 'incorrect' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-3 whitespace-nowrap shadow-lg z-50">
            ✗ {incorrectCount}
          </div>
        )}
        {activeTooltip === 'skipped' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-3 whitespace-nowrap shadow-lg z-50">
            ⏭ {skippedCount}
          </div>
        )}
        {activeTooltip === 'unanswered' && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-3 whitespace-nowrap shadow-lg z-50">
            - {unansweredCount}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2 w-full">
          {/* Correct */}
          {correctCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Check size={14} />
                  <span>Corecte</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {correctCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({correctPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}

          {/* Incorrect */}
          {incorrectCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X size={14} />
                  <span>Greșite</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {incorrectCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({incorrectPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}

          {/* Skipped */}
          {skippedCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <SkipForward size={14} />
                  <span>Sărite</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {skippedCount}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({skippedPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
