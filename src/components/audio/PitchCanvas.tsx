"use client";

import React, { useEffect, useRef } from "react";

export interface PitchCanvasProps {
  targetContour: number[]; // Chao scale 1.0 - 5.0
  livePitchPoints: Array<{ timeMs: number; chaoLevel: number }>;
  isRecording: boolean;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Draws a smooth cubic bezier curve through an array of 2D points.
 * Employs Catmull-Rom to Cubic Bezier spline conversion for C1 continuity.
 */
function drawSmoothCurve(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) return;

  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, 3, 0, Math.PI * 2);
    return;
  }

  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

export function PitchCanvas({
  targetContour,
  livePitchPoints,
  isRecording,
  className = "",
}: PitchCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep latest props in ref for 60 FPS animation frame loop
  const propsRef = useRef({
    targetContour,
    livePitchPoints,
    isRecording,
  });

  useEffect(() => {
    propsRef.current = {
      targetContour,
      livePitchPoints,
      isRecording,
    };
  }, [targetContour, livePitchPoints, isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 200;

      // Maintain high-DPI retina sharpness
      const targetCanvasWidth = Math.max(1, Math.round(width * dpr));
      const targetCanvasHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== targetCanvasWidth || canvas.height !== targetCanvasHeight) {
        canvas.width = targetCanvasWidth;
        canvas.height = targetCanvasHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Layout bounds with comfortable padding for Chao numerals
      const padLeft = 36;
      const padRight = 20;
      const padTop = 22;
      const padBottom = 22;
      const usableW = Math.max(10, width - padLeft - padRight);
      const usableH = Math.max(10, height - padTop - padBottom);

      // Function to map Chao level (1.0 - 5.0) to Y pixel coordinate
      const chaoToY = (level: number) => {
        const clamped = Math.max(1, Math.min(5, level));
        return padTop + (5 - clamped) * (usableH / 4);
      };

      // -----------------------------------------------------------------------
      // 1. Chao 5-Level Pitch Grid
      // -----------------------------------------------------------------------
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";

      for (let level = 1; level <= 5; level++) {
        const y = chaoToY(level);

        // Grid line
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = level === 3 ? "rgba(113, 113, 122, 0.35)" : "rgba(63, 63, 70, 0.3)";
        ctx.lineWidth = 1;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.restore();

        // Level label
        ctx.fillStyle = level === 5 || level === 1 ? "#a1a1aa" : "#71717a";
        ctx.fillText(String(level), padLeft - 10, y);
      }

      // Chao scale title indicator
      ctx.save();
      ctx.textAlign = "left";
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#52525b";
      ctx.fillText("CHAO LEVEL", padLeft, padTop - 12);
      ctx.restore();

      const {
        targetContour: currentTarget,
        livePitchPoints: currentLive,
        isRecording: recordingActive,
      } = propsRef.current;

      // Determine time duration for horizontal normalization (min 2.5s)
      const lastLiveMs = currentLive.length > 0 ? currentLive[currentLive.length - 1].timeMs : 0;
      const targetDurationMs = (currentTarget.length - 1) * 50;
      const maxDurationMs = Math.max(2500, targetDurationMs, lastLiveMs);

      // -----------------------------------------------------------------------
      // 2. Target Tone Contour (Cyan / Sky: #38bdf8)
      // -----------------------------------------------------------------------
      if (currentTarget && currentTarget.length > 0) {
        const targetPoints: Point[] = currentTarget.map((level, idx) => {
          const progress = currentTarget.length === 1 ? 0.5 : idx / (currentTarget.length - 1);
          // Scale target contour to occupy the phrase window
          const phraseSpan = Math.min(usableW, (Math.max(1200, targetDurationMs) / maxDurationMs) * usableW);
          return {
            x: padLeft + progress * phraseSpan,
            y: chaoToY(level),
          };
        });

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawSmoothCurve(ctx, targetPoints);
        ctx.stroke();
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // 3. User Live Vocal Trace (Emerald: #34d399)
      // -----------------------------------------------------------------------
      if (currentLive && currentLive.length > 0) {
        // Group points into continuous voiced segments (split if gap > 200ms)
        const segments: Point[][] = [];
        let currentSegment: Point[] = [];

        for (let i = 0; i < currentLive.length; i++) {
          const pt = currentLive[i];
          const x = padLeft + Math.min(1, Math.max(0, pt.timeMs / maxDurationMs)) * usableW;
          const y = chaoToY(pt.chaoLevel);

          if (i > 0 && pt.timeMs - currentLive[i - 1].timeMs > 200) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
            }
            currentSegment = [];
          }
          currentSegment.push({ x, y });
        }
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }

        ctx.save();
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw each continuous voiced segment
        for (const segment of segments) {
          ctx.beginPath();
          drawSmoothCurve(ctx, segment);
          ctx.stroke();
        }

        // Draw live leading pulse dot at the tip of the curve
        const latestPoint = currentLive[currentLive.length - 1];
        const tipX = padLeft + Math.min(1, Math.max(0, latestPoint.timeMs / maxDurationMs)) * usableW;
        const tipY = chaoToY(latestPoint.chaoLevel);

        ctx.beginPath();
        ctx.arc(tipX, tipY, recordingActive ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.fill();

        if (recordingActive) {
          ctx.beginPath();
          ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Schedule next 60 FPS frame
      animId = requestAnimationFrame(draw);
    };

    // Draw initial frame immediately, then maintain 60 FPS loop
    draw();

    const renderLoop = () => {
      draw();
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl bg-zinc-950/90 border border-zinc-800/80 p-2 shadow-inner overflow-hidden select-none ${className}`}
    >
      {/* Top Bar Indicators */}
      <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-mono tracking-wider text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-[2px] bg-sky-400 border-dashed border-t border-sky-400" />
            <span className="text-sky-400 font-medium">Target Tone</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-[2.5px] bg-emerald-400 rounded-full" />
            <span className="text-emerald-400 font-medium">Your Voice</span>
          </span>
        </div>

        {isRecording && (
          <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>LISTENING</span>
          </div>
        )}
      </div>

      {/* 60 FPS HTML5 Canvas Element */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Pitch contour visualizer (Chao Levels 1 to 5)"
        className="w-full h-36 md:h-44 block"
      />

      <span className="sr-only">
        Pitch visualizer canvas tracking fundamental vocal frequency against target Mandarin tone contour on Chao levels 1 to 5.
      </span>
    </div>
  );
}
