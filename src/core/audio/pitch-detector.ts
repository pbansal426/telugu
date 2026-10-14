export interface PitchResult {
  frequency: number;  // in Hz (0 if unvoiced)
  probability: number; // 0.0 to 1.0 confidence
  isVoiced: boolean;
  chaoLevel: number;  // 1.0 to 5.0 normalized tone height
}

export class YinPitchDetector {
  private sampleRate: number;
  private bufferSize: number;
  private halfBuffer: number;
  private threshold: number;
  private yinBuffer: Float32Array;

  constructor(sampleRate: number, bufferSize: number, threshold = 0.15) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.halfBuffer = Math.floor(bufferSize / 2);
    this.threshold = threshold;
    this.yinBuffer = new Float32Array(this.halfBuffer);
  }

  public getPitch(buffer: Float32Array): PitchResult {
    // Check for silence (RMS energy)
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.01) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    // Step 1: Difference Function
    this.yinBuffer.fill(0);
    for (let tau = 0; tau < this.halfBuffer; tau++) {
      for (let i = 0; i < this.halfBuffer; i++) {
        const delta = buffer[i] - buffer[i + tau];
        this.yinBuffer[tau] += delta * delta;
      }
    }

    // Step 2: Cumulative Mean Normalized Difference
    this.yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < this.halfBuffer; tau++) {
      runningSum += this.yinBuffer[tau];
      this.yinBuffer[tau] = runningSum > 0 ? (this.yinBuffer[tau] * tau) / runningSum : 1;
    }

    // Step 3: Absolute Thresholding
    let tauEstimate = -1;
    for (let tau = 2; tau < this.halfBuffer; tau++) {
      if (this.yinBuffer[tau] < this.threshold) {
        while (tau + 1 < this.halfBuffer && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    // Step 4: Parabolic Interpolation
    let betterTau: number;
    const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
    const x2 = tauEstimate + 1 < this.halfBuffer ? tauEstimate + 1 : tauEstimate;
    if (x0 === tauEstimate) {
      betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x2] ? tauEstimate : x2;
    } else if (x2 === tauEstimate) {
      betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x0] ? tauEstimate : x0;
    } else {
      const s0 = this.yinBuffer[x0];
      const s1 = this.yinBuffer[tauEstimate];
      const s2 = this.yinBuffer[x2];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    const frequency = this.sampleRate / betterTau;
    const probability = 1 - this.yinBuffer[tauEstimate];

    // Filter to human vocal fundamental frequency [75 Hz, 450 Hz]
    if (frequency < 75 || frequency > 450) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    return {
      frequency,
      probability,
      isVoiced: true,
      chaoLevel: this.hzToChaoLevel(frequency)
    };
  }

  public hzToChaoLevel(hz: number, baselineHz = 200): number {
    // Relative semitone calculation converted to Chao 1-5 scale
    if (hz <= 0) return 1.0;
    const semitones = 12 * Math.log2(hz / baselineHz);
    // Map -8 semitones to level 1, +8 semitones to level 5
    const level = 3.0 + (semitones / 8) * 2.0;
    return Math.max(1.0, Math.min(5.0, level));
  }
}
