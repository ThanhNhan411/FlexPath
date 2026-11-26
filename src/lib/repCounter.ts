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
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

/** Landmark indices of the three points forming a joint angle (the angle is measured at `mid`). */
export interface JointTriple {
  a: number;
  mid: number;
  c: number;
}

export interface RepConfig {
  /** Joint measured to count reps, per body side. */
  left: JointTriple;
  right: JointTriple;
  /** Angle below which the athlete counts as "down" (joint flexed). */
  downAngle: number;
  /** Angle above which the athlete counts as "up" (joint extended). */
  upAngle: number;
  /** Going below this and coming back without reaching downAngle gives depth feedback. */
  partialAngle: number;
  /** Minimum landmark visibility to trust a limb. */
  minVisibility: number;
  /** Minimum time between two counted reps (ms). */
  minRepMs: number;
  /** Exponential smoothing factor (0–1], higher reacts faster. */
  smoothing: number;
  depthMessage: string;
  noPoseMessage: string;
  /** Optional posture check run on every frame; only produces feedback, never blocks counting. */
  form?: {
    left: JointTriple;
    right: JointTriple;
    /** Feedback is shown while the angle is below this value. */
    minAngle: number;
    message: string;
  };
}

export type CameraExercise = 'squat' | 'pushup';

export const REP_CONFIGS: Record<CameraExercise, RepConfig> = {
  squat: {
    left: { a: LM.LEFT_HIP, mid: LM.LEFT_KNEE, c: LM.LEFT_ANKLE },
    right: { a: LM.RIGHT_HIP, mid: LM.RIGHT_KNEE, c: LM.RIGHT_ANKLE },
    downAngle: 105,
    upAngle: 160,
    partialAngle: 140,
    minVisibility: 0.5,
    minRepMs: 600,
    smoothing: 0.4,
    depthMessage: 'Xuống sâu hơn để tính rep',
    noPoseMessage: 'Đứng lùi lại để camera thấy toàn thân',
  },
  pushup: {
    // Elbow angle: shoulder–elbow–wrist.
    left: { a: LM.LEFT_SHOULDER, mid: LM.LEFT_ELBOW, c: LM.LEFT_WRIST },
    right: { a: LM.RIGHT_SHOULDER, mid: LM.RIGHT_ELBOW, c: LM.RIGHT_WRIST },
    downAngle: 95,
    upAngle: 155,
    partialAngle: 130,
    minVisibility: 0.5,
    minRepMs: 500,
    smoothing: 0.45,
    depthMessage: 'Hạ ngực thấp hơn để tính rep',
    noPoseMessage: 'Đặt camera ngang tầm sàn, quay nghiêng để thấy cả người',
    form: {
      // Body line: shoulder–hip–ankle should stay roughly straight.
      left: { a: LM.LEFT_SHOULDER, mid: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
      right: { a: LM.RIGHT_SHOULDER, mid: LM.RIGHT_HIP, c: LM.RIGHT_ANKLE },
      minAngle: 150,
      message: 'Giữ thân thẳng, đừng võng hông',
    },
  },
};

const NAME_RULES: { kind: CameraExercise; include: RegExp; exclude: RegExp }[] = [
  { kind: 'squat', include: /squat/i, exclude: /jump|pistol|split|overhead/i },
  {
    kind: 'pushup',
    include: /push[\s-]?ups?\b/i,
    exclude: /handstand|plyo|single|clock|side plank|depth|archer|suspended|one[\s-]arm/i,
  },
];

/** Which camera counter (if any) supports this exercise. */
export function getCameraExercise(name: string): CameraExercise | null {
  for (const r of NAME_RULES) {
    if (r.include.test(name) && !r.exclude.test(name)) return r.kind;
  }
  return null;
}

export class RepCounter {
  private cfg: RepConfig;
  private smoothed: number | null = null;
  private phase: RepPhase = 'up';
  private reps = 0;
  private lastRepAt = -Infinity;
  private wentPartial = false;

  constructor(kind: CameraExercise | RepConfig = 'squat', overrides: Partial<RepConfig> = {}) {
    const base = typeof kind === 'string' ? REP_CONFIGS[kind] : kind;
    this.cfg = { ...base, ...overrides };
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
      feedback: this.cfg.noPoseMessage,
    });

    if (!landmarks || landmarks.length < 29) return noPose();

    const side = this.pickSide(landmarks);
    if (!side) return noPose();

    const scale = (p: Landmark): Landmark => ({ x: p.x * aspect, y: p.y });
    const raw = jointAngle(scale(landmarks[side.joint.a]), scale(landmarks[side.joint.mid]), scale(landmarks[side.joint.c]));

    this.smoothed = this.smoothed === null ? raw : this.smoothed + this.cfg.smoothing * (raw - this.smoothed);
    const angle = this.smoothed;

    let repCompleted = false;
    let feedback: string | null = null;

    if (this.phase === 'up') {
      if (angle < this.cfg.downAngle) {
        this.phase = 'down';
        this.wentPartial = false;
      } else if (angle < this.cfg.partialAngle) {
        this.wentPartial = true;
      } else if (angle > this.cfg.upAngle && this.wentPartial) {
        feedback = this.cfg.depthMessage;
        this.wentPartial = false;
      }
    } else if (angle > this.cfg.upAngle) {
      this.phase = 'up';
      if (nowMs - this.lastRepAt >= this.cfg.minRepMs) {
        this.reps += 1;
        this.lastRepAt = nowMs;
        repCompleted = true;
      }
    }

    if (!feedback && this.cfg.form) {
      const f = side.isLeft ? this.cfg.form.left : this.cfg.form.right;
      const vis = Math.min(landmarks[f.a].visibility ?? 1, landmarks[f.mid].visibility ?? 1, landmarks[f.c].visibility ?? 1);
      if (vis >= this.cfg.minVisibility) {
        const body = jointAngle(scale(landmarks[f.a]), scale(landmarks[f.mid]), scale(landmarks[f.c]));
        if (body < this.cfg.form.minAngle) feedback = this.cfg.form.message;
      }
    }

    return { status: 'tracking', angle, phase: this.phase, reps: this.reps, repCompleted, feedback };
  }

  private pickSide(l: Landmark[]) {
    const vis = (j: JointTriple) => Math.min(l[j.a].visibility ?? 1, l[j.mid].visibility ?? 1, l[j.c].visibility ?? 1);
    const lv = vis(this.cfg.left);
    const rv = vis(this.cfg.right);
    if (Math.max(lv, rv) < this.cfg.minVisibility) return null;
    return lv >= rv ? { joint: this.cfg.left, isLeft: true } : { joint: this.cfg.right, isLeft: false };
  }
}

/** Backwards-compatible squat counter. */
export class SquatCounter extends RepCounter {
  constructor(overrides: Partial<RepConfig> = {}) {
    super('squat', overrides);
  }
}
