import { describe, it, expect } from "vitest";
import { YinPitchDetector } from "@/core/audio/pitch-detector";

describe("YinPitchDetector", () => {
  const sampleRate = 44100;
  const bufferSize = 2048;
  const detector = new YinPitchDetector(sampleRate, bufferSize, 0.15);

  function generateSineWave(freq: number, numSamples: number): Float32Array {
    const buffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return buffer;
  }

  it("accurately detects a 220 Hz sine wave within ±2 Hz", () => {
    const buffer = generateSineWave(220, bufferSize);
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(true);
    expect(result.frequency).toBeGreaterThanOrEqual(218);
    expect(result.frequency).toBeLessThanOrEqual(222);
    expect(result.probability).toBeGreaterThan(0.85);
  });

  it("accurately detects a 130 Hz sine wave within ±2 Hz", () => {
    const buffer = generateSineWave(130, bufferSize);
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(true);
    expect(result.frequency).toBeGreaterThanOrEqual(128);
    expect(result.frequency).toBeLessThanOrEqual(132);
  });

  it("marks pure silence as unvoiced", () => {
    const buffer = new Float32Array(bufferSize); // all zeroes
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(false);
    expect(result.frequency).toBe(0);
  });

  it("correctly calculates Chao 5-level pitch semitones", () => {
    // 200 Hz baseline: lower pitch gives level ~1-2, higher gives level ~4-5
    const low = detector.hzToChaoLevel(120, 200);
    const mid = detector.hzToChaoLevel(200, 200);
    const high = detector.hzToChaoLevel(320, 200);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(mid).toBeCloseTo(3.0, 0.5);
  });
});
