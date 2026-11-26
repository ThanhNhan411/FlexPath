/**
 * Pure rep-counting logic for camera-based exercise tracking.
 * No browser or MediaPipe dependencies so it can be unit tested with synthetic data.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type RepPhase = 'up' | 'down';
export type TrackingStatus = 'no-pose' | 'tracking';

export interface RepUpdate {
  status: TrackingStatus;
  /** Smoothed joint angle in degrees, null when no pose. */
  angle: number | null;
  phase: RepPhase;
  reps: number;
  /** True only on the frame in which a new rep was completed. */
  repCompleted: boolean;
  feedback: string | null;
}

/** Angle at point b (degrees, 0–180) formed by a–b–c. Points must share the same scale on both axes. */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

// MediaPipe pose landmark indices
export const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export interface SquatOptions {
  /** Knee angle below which the athlete counts as "down". */
  downAngle: number;
  /** Knee angle above which the athlete counts as standing "up". */
  upAngle: number;
  /** Below this angle while descending we warn that depth is not enough once they come back up. */
  partialAngle: number;
  /** Minimum landmark visibility to trust a limb. */
  minVisibility: number;
  /** Minimum time between two counted reps (ms). */
  minRepMs: number;
  /** Exponential smoothing factor (0–1], higher reacts faster. */
  smoothing: number;
}

export const DEFAULT_SQUAT_OPTIONS: SquatOptions = {
  downAngle: 105,
  upAngle: 160,
  partialAngle: 140,
  minVisibility: 0.5,
  minRepMs: 600,
  smoothing: 0.4,
};

export class SquatCounter {
  private opts: SquatOptions;
  private smoothed: number | null = null;
  private phase: RepPhase = 'up';
  private reps = 0;
  private lastRepAt = -Infinity;
  private wentPartial = false;

  constructor(opts: Partial<SquatOptions> = {}) {
    this.opts = { ...DEFAULT_SQUAT_OPTIONS, ...opts };
  }

  reset() {
    this.smoothed = null;
    this.phase = 'up';
    this.reps = 0;
    this.lastRepAt = -Infinity;
    this.wentPartial = false;
  }

  getReps() {
    return this.reps;
  }

  /**
   * @param landmarks the 33 pose landmarks (normalized coordinates)
   * @param aspect video width / height, used to correct angle distortion on normalized coordinates
   * @param nowMs monotonic timestamp in ms
   */
  update(landmarks: Landmark[] | undefined, aspect: number, nowMs: number): RepUpdate {
    const noPose = (): RepUpdate => ({
      status: 'no-pose',
      angle: null,
      phase: this.phase,
      reps: this.reps,
      repCompleted: false,
      feedback: 'Đứng lùi lại để camera thấy toàn thân',
    });

    if (!landmarks || landmarks.length < 29) return noPose();

    const side = this.pickSide(landmarks);
    if (!side) return noPose();

    const scale = (p: Landmark): Landmark => ({ x: p.x * aspect, y: p.y });
    const raw = jointAngle(scale(landmarks[side.hip]), scale(landmarks[side.knee]), scale(landmarks[side.ankle]));

    this.smoothed = this.smoothed === null ? raw : this.smoothed + this.opts.smoothing * (raw - this.smoothed);
    const angle = this.smoothed;

    let repCompleted = false;
    let feedback: string | null = null;

    if (this.phase === 'up') {
      if (angle < this.opts.downAngle) {
        this.phase = 'down';
        this.wentPartial = false;
      } else if (angle < this.opts.partialAngle) {
        this.wentPartial = true;
      } else if (angle > this.opts.upAngle && this.wentPartial) {
        feedback = 'Xuống sâu hơn để tính rep';
        this.wentPartial = false;
      }
    } else if (angle > this.opts.upAngle) {
      this.phase = 'up';
      if (nowMs - this.lastRepAt >= this.opts.minRepMs) {
        this.reps += 1;
        this.lastRepAt = nowMs;
        repCompleted = true;
      }
    }

    return { status: 'tracking', angle, phase: this.phase, reps: this.reps, repCompleted, feedback };
  }

  private pickSide(l: Landmark[]) {
    const left = { hip: LM.LEFT_HIP, knee: LM.LEFT_KNEE, ankle: LM.LEFT_ANKLE };
    const right = { hip: LM.RIGHT_HIP, knee: LM.RIGHT_KNEE, ankle: LM.RIGHT_ANKLE };
    const vis = (s: { hip: number; knee: number; ankle: number }) => Math.min(l[s.hip].visibility ?? 1, l[s.knee].visibility ?? 1, l[s.ankle].visibility ?? 1);
    const lv = vis(left);
    const rv = vis(right);
    const best = lv >= rv ? left : right;
    return Math.max(lv, rv) >= this.opts.minVisibility ? best : null;
  }
}
