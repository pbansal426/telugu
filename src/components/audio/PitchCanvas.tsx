"use client";

import React, { useEffect, useRef } from "react";

export interface PitchCanvasProps {
  targetContour: number[]; // Chao scale 1.0 - 5.0, sampled at 50ms intervals
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

  // Synchronously store latest props in ref during render to avoid 1-frame lag
  const propsRef = useRef({
    targetContour,
    livePitchPoints,
    isRecording,
  });
  propsRef.current = {
    targetContour,
    livePitchPoints,
    isRecording,
  };

  // Cache element dimensions to avoid layout reflows in the 60 FPS animation loop
  const sizeRef = useRef({ width: 400, height: 200 });

  // Monitor resize without layout thrashing inside RAF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        sizeRef.current = {
          width: rect.width,
          height: rect.height,
        };
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(canvas);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", updateSize);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else if (typeof window !== "undefined") {
        window.removeEventListener("resize", updateSize);
      }
    };
  }, []);

  // Single controlled 60 FPS animation frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const { width, height } = sizeRef.current;

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
        ctx.strokeStyle = level === 3 ? "rgba(113, 113, 122, 0.4)" : "rgba(63, 63, 70, 0.25)";
        ctx.lineWidth = 1;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.restore();

        // Level label
        ctx.fillStyle = level === 5 || level === 1 ? "#d4d4d8" : "#71717a";
        ctx.fillText(String(level), padLeft - 10, y);
      }

      // Chao scale title indicator
      ctx.save();
      ctx.textAlign = "left";
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#71717a";
      ctx.fillText("CHAO SCALE", padLeft, padTop - 12);
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

      // Real-time F0 telemetry readout in top right
      if (currentLive.length > 0) {
        const latestPoint = currentLive[currentLive.length - 1];
        const estF0 = Math.round(100 * Math.pow(2, ((latestPoint.chaoLevel - 1) / 4) * 1.68));
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = recordingActive ? "#34d399" : "#a1a1aa";
        ctx.fillText(`F0: ${estF0} Hz  [LEVEL ${latestPoint.chaoLevel.toFixed(1)}]`, width - padRight, padTop - 12);
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // 2. Target Tone Contour (Cyan / Sky: #38bdf8) with Phosphor Glow
      // Aligned with the exact same millisecond-to-pixel time axis (idx * 50ms)
      // -----------------------------------------------------------------------
      if (currentTarget && currentTarget.length > 0) {
        const targetPoints: Point[] = currentTarget.map((level, idx) => ({
          x: padLeft + Math.min(1, Math.max(0, (idx * 50) / maxDurationMs)) * usableW,
          y: chaoToY(level),
        }));

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
        ctx.shadowBlur = 4;
        drawSmoothCurve(ctx, targetPoints);
        ctx.stroke();
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // 3. User Live Vocal Trace (Emerald: #34d399) with Dual-Stroke Phosphor Bloom
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
        ctx.shadowColor = "rgba(52, 211, 153, 0.6)";
        ctx.shadowBlur = 8;

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
    };

    // Single controlled animation loop
    const renderLoop = () => {
      draw();
      animId = requestAnimationFrame(renderLoop);
    };

    // Immediate draw on mount
    draw();
    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-[#090a0f] border border-white/[0.08] p-3 shadow-2xl overflow-hidden select-none ${className}`}
    >
      {/* Console Machined Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 border-b border-white/[0.06] text-[11px] font-mono tracking-wider text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-300 tracking-widest uppercase">
            YIN-DSP OSCILLOSCOPE
          </span>
          <span className="text-zinc-600">/</span>
          {/* Tactile 12-Segment LED VU Meter */}
          <div className="flex items-center gap-0.5 bg-black/40 px-2 py-1 rounded-md border border-white/[0.04]">
            <span className="text-[9px] text-zinc-500 mr-1">VU</span>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((seg) => {
              const isActive = isRecording ? seg < 8 + (seg % 3) : seg < 2;
              let ledColor = "bg-zinc-800";
              if (isActive) {
                if (seg < 7) ledColor = "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]";
                else if (seg < 10) ledColor = "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]";
                else ledColor = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]";
              }
              return (
                <div
                  key={seg}
                  className={`w-1 h-2.5 rounded-[1px] transition-all duration-75 ${ledColor}`}
                />
              );
            })}
          </div>
        </div>

        {/* Legend Pills */}
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-[2px] bg-sky-400 border-dashed border-t border-sky-400" />
            <span className="text-sky-400 font-medium text-[10px]">Target Tone</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-[2.5px] bg-emerald-400 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
            <span className="text-emerald-400 font-medium text-[10px]">Your Voice</span>
          </span>

          {isRecording && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]" />
              <span>LISTENING</span>
            </div>
          )}
        </div>
      </div>

      {/* 60 FPS HTML5 Canvas Element */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Pitch contour visualizer (Chao Levels 1 to 5)"
        className="w-full h-36 md:h-44 block mt-1"
      />

      {/* Console Base Status Bar */}
      <div className="flex justify-between items-center px-1 pt-1.5 border-t border-white/[0.04] text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
        <span>TB: 50ms/SMP &bull; FFT: 2048</span>
        <span>RANGE: 75–450 Hz</span>
        <span>CHAO 1.0–5.0</span>
      </div>

      <span className="sr-only">
        Pitch visualizer canvas tracking fundamental vocal frequency against target Mandarin tone contour on Chao levels 1 to 5.
      </span>
    </div>
  );
}

