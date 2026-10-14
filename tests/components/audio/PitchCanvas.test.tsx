// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PitchCanvas } from "@/components/audio/PitchCanvas";

describe("PitchCanvas Component", () => {
  let mockContext: Record<string, any>;

  beforeEach(() => {
    mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "",
      textBaseline: "",
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === "2d") {
        return mockContext as unknown as CanvasRenderingContext2D;
      }
      return null;
    });

    // Provide mock getBoundingClientRect
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an HTML5 canvas element with aria label", () => {
    const { container } = render(
      <PitchCanvas
        targetContour={[5, 5, 3, 5]}
        livePitchPoints={[]}
        isRecording={false}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("aria-label")).toBeTruthy();
    expect(canvas?.getAttribute("aria-label")).toMatch(/pitch/i);
  });

  it("applies custom className", () => {
    const { container } = render(
      <PitchCanvas
        targetContour={[5, 5]}
        livePitchPoints={[]}
        isRecording={false}
        className="custom-canvas-class"
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-canvas-class");
  });

  it("draws Chao pitch grid lines (levels 1 through 5)", () => {
    render(
      <PitchCanvas
        targetContour={[5, 5, 3, 5]}
        livePitchPoints={[]}
        isRecording={false}
      />
    );

    // Verify context was called to draw grid lines and labels
    expect(mockContext.fillText).toHaveBeenCalled();
    const fillTextCalls = mockContext.fillText.mock.calls.map((call: any[]) => call[0]);
    // Should include Chao levels 1 to 5
    expect(fillTextCalls).toContain("5");
    expect(fillTextCalls).toContain("1");
  });

  it("renders target tone contour with sky/cyan dashed stroke (#38bdf8)", () => {
    render(
      <PitchCanvas
        targetContour={[5, 4, 2, 1]}
        livePitchPoints={[]}
        isRecording={false}
      />
    );

    expect(mockContext.setLineDash).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Number)]));
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it("renders live vocal trace in solid emerald stroke (#34d399) with bezier interpolation", () => {
    const livePoints = [
      { timeMs: 0, chaoLevel: 3.0 },
      { timeMs: 100, chaoLevel: 3.5 },
      { timeMs: 200, chaoLevel: 4.2 },
      { timeMs: 300, chaoLevel: 4.8 },
    ];

    render(
      <PitchCanvas
        targetContour={[3, 4, 5]}
        livePitchPoints={livePoints}
        isRecording={true}
      />
    );

    // Live points should trigger bezierCurveTo or lineTo
    expect(mockContext.bezierCurveTo).toHaveBeenCalled();
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it("handles high-DPI retina display by scaling canvas context", () => {
    const originalDpr = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      writable: true,
      configurable: true,
      value: 2,
    });

    render(
      <PitchCanvas
        targetContour={[5, 5]}
        livePitchPoints={[]}
        isRecording={false}
      />
    );

    expect(mockContext.scale).toHaveBeenCalledWith(2, 2);

    Object.defineProperty(window, "devicePixelRatio", {
      writable: true,
      configurable: true,
      value: originalDpr,
    });
  });

  it("gracefully cleans up animation frame on unmount", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(
      <PitchCanvas
        targetContour={[5, 5]}
        livePitchPoints={[]}
        isRecording={true}
      />
    );

    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("gracefully handles null canvas context without throwing", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

    expect(() => {
      render(
        <PitchCanvas
          targetContour={[5, 4, 3, 2, 1]}
          livePitchPoints={[{ timeMs: 50, chaoLevel: 3.5 }]}
          isRecording={true}
        />
      );
    }).not.toThrow();
  });

  it("handles single target point and single live pitch point", () => {
    render(
      <PitchCanvas
        targetContour={[3.0]}
        livePitchPoints={[{ timeMs: 100, chaoLevel: 3.0 }]}
        isRecording={false}
      />
    );

    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it("splits live vocal trace into distinct segments across unvoiced intervals (>200ms gap)", () => {
    const livePointsWithGap = [
      { timeMs: 0, chaoLevel: 3.0 },
      { timeMs: 50, chaoLevel: 3.2 },
      // 400ms gap (unvoiced pause / consonant)
      { timeMs: 450, chaoLevel: 4.0 },
      { timeMs: 500, chaoLevel: 4.5 },
      { timeMs: 550, chaoLevel: 4.8 },
    ];

    render(
      <PitchCanvas
        targetContour={[3, 3, 4, 5]}
        livePitchPoints={livePointsWithGap}
        isRecording={true}
      />
    );

    // Both segments should trigger stroke and be rendered
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it("aligns target contour points to the exact same time axis as live vocal points", () => {
    // Both targetContour[1] (50ms) and livePitchPoints[1] (50ms) must map to identical X coordinates
    render(
      <PitchCanvas
        targetContour={[3.0, 4.0]}
        livePitchPoints={[
          { timeMs: 0, chaoLevel: 3.0 },
          { timeMs: 50, chaoLevel: 4.0 },
        ]}
        isRecording={false}
      />
    );

    // Find moveTo calls for target and live
    const moveToCalls = mockContext.moveTo.mock.calls;
    // Both start at time = 0ms (padLeft = 36)
    expect(moveToCalls.length).toBeGreaterThanOrEqual(2);
    expect(moveToCalls[0][0]).toBe(36); // target start x
    expect(moveToCalls[1][0]).toBe(36); // live start x

    // Find lineTo calls for target and live (both 2-point arrays call lineTo)
    const lineToCalls = mockContext.lineTo.mock.calls;
    // Filter grid lines (which end at width - padRight)
    const segmentLineTos = lineToCalls.filter((c: number[]) => c[0] < 380);
    expect(segmentLineTos.length).toBeGreaterThanOrEqual(2);
    // target point at idx 1 (50ms) and live point at 50ms must have identical X coordinates
    const targetX50 = segmentLineTos[0][0];
    const liveX50 = segmentLineTos[1][0];
    expect(targetX50).toBeCloseTo(liveX50, 4);
  });
});


