// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConversationalTutor } from "@/components/tutor/ConversationalTutor";
import { getChineseStarterPack } from "@/core/content/chinese-pack";

describe("ConversationalTutor Component", () => {
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

    // Mock AudioContext
    window.AudioContext = vi.fn().mockImplementation(() => ({
      createAnalyser: () => ({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getFloatTimeDomainData: vi.fn(),
        connect: vi.fn(),
      }),
      createMediaStreamSource: () => ({
        connect: vi.fn(),
      }),
      close: vi.fn().mockResolvedValue(undefined),
      sampleRate: 44100,
    })) as unknown as typeof AudioContext;

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Pinyin chunk drills and audio controls", () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);
    expect(screen.getByText(/Social & Daily Life/i)).toBeDefined();
    expect(screen.getByText(/Tap to Speak/i)).toBeDefined();
  });

  it("reveals Pinyin tone sandhi formatting and FSRS rating buttons upon reveal", () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);

    // Initially flashcard prompt is visible
    expect(screen.getByText(items[0].english)).toBeDefined();

    // Click reveal button
    const revealButton = screen.getByRole("button", { name: /Show Answer|Reveal Pinyin/i });
    fireEvent.click(revealButton);

    // FSRS rating buttons should now appear
    expect(screen.getByRole("button", { name: /Again/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Hard/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Good/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Easy/i })).toBeDefined();
  });

  it("switches to Tab 2: AI Conversational Tutor with streaming chat, pills and drawer", async () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);

    // Click AI Tutor tab
    const tutorTab = screen.getByRole("tab", { name: /AI Conversational Tutor|AI Sparring/i });
    fireEvent.click(tutorTab);

    // AI tutor features present
    expect(screen.getAllByText(/Gemma 26B/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Never-Freeze Suggestions/i)).toBeDefined();
    expect(screen.getByText(/Micro-Correction Drawer/i)).toBeDefined();
  });

  it("toggles audio recording state when 'Tap to Speak' is clicked", async () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);

    const speakButton = screen.getByRole("button", { name: /Tap to Speak/i });
    fireEvent.click(speakButton);

    await waitFor(() => {
      expect(screen.getByText(/Stop Recording \(Listening\.\.\.\)/i)).toBeDefined();
    });

    // Clicking again stops recording
    const stopButton = screen.getByRole("button", { name: /Stop Recording/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText(/Tap to Speak & Check Tone/i)).toBeDefined();
    });
  });

  it("advances to the next card when an FSRS rating button is pressed", () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);

    expect(screen.getByText(items[0].english)).toBeDefined();

    // Reveal Pinyin
    fireEvent.click(screen.getByRole("button", { name: /Reveal Pinyin & Answer/i }));

    // Rate Good
    const goodButton = screen.getByRole("button", { name: /Good \(3\)/i });
    fireEvent.click(goodButton);

    // Should now show item 1 (next item) and reset reveal state
    expect(screen.getByText(items[1].english)).toBeDefined();
    expect(screen.getByRole("button", { name: /Reveal Pinyin & Answer/i })).toBeDefined();
  });

  it("toggles the micro-correction drawer open and closed in AI tutor tab", () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);

    // Switch to AI tab
    fireEvent.click(screen.getByRole("tab", { name: /AI Conversational Tutor/i }));

    const drawerToggle = screen.getByRole("button", { name: /Micro-Correction Drawer/i });
    expect(screen.getByText(/Colloquial tip:/i)).toBeDefined();

    // Toggle closed
    fireEvent.click(drawerToggle);
    expect(screen.queryByText(/Colloquial tip:/i)).toBeNull();

    // Toggle open
    fireEvent.click(drawerToggle);
    expect(screen.getByText(/Colloquial tip:/i)).toBeDefined();
  });
});

