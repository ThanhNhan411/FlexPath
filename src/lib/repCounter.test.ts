import { describe, it, expect } from 'vitest';
import { RepCounter, SquatCounter, getCameraExercise, jointAngle, LM, Landmark } from './repCounter';

type Pt = { x: number; y: number };

const blank = (): Landmark[] => Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
const place = (l: Landmark[], ids: number[], p: Pt, vis: number) => ids.forEach(i => (l[i] = { ...p, visibility: vis }));

/** Leg with the knee bent at `kneeDeg` (both sides identical). */
function squatPose(kneeDeg: number, vis = 1): Landmark[] {
  const l = blank();
  const knee = { x: 0.5, y: 0.6 };
  const ankle = { x: 0.5, y: 0.8 };
  const t = Math.PI - (kneeDeg * Math.PI) / 180;
  const hip = { x: knee.x + 0.2 * Math.sin(t), y: knee.y - 0.2 * Math.cos(t) };
  place(l, [LM.LEFT_HIP, LM.RIGHT_HIP], hip, vis);
  place(l, [LM.LEFT_KNEE, LM.RIGHT_KNEE], knee, vis);
  place(l, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE], ankle, vis);
  return l;
}

/** Push-up side view with the elbow bent at `elbowDeg`; `sag` drops the hips to break the body line. */
function pushPose(elbowDeg: number, sag = 0, vis = 1): Landmark[] {
  const l = blank();
  const elbow = { x: 0.5, y: 0.6 };
  const wrist = { x: 0.5, y: 0.8 };
  const t = Math.PI - (elbowDeg * Math.PI) / 180;
  const shoulder = { x: elbow.x + 0.2 * Math.sin(t), y: elbow.y - 0.2 * Math.cos(t) };
  place(l, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER], shoulder, vis);
  place(l, [LM.LEFT_ELBOW, LM.RIGHT_ELBOW], elbow, vis);
  place(l, [LM.LEFT_WRIST, LM.RIGHT_WRIST], wrist, vis);
  place(l, [LM.LEFT_HIP, LM.RIGHT_HIP], { x: shoulder.x + 0.15, y: shoulder.y + sag }, vis);
  place(l, [LM.LEFT_ANKLE, LM.RIGHT_ANKLE], { x: shoulder.x + 0.4, y: shoulder.y }, vis);
  place(l, [LM.LEFT_KNEE, LM.RIGHT_KNEE], { x: shoulder.x + 0.27, y: shoulder.y }, vis);
  return l;
}

/** Two legs with independent knee angles; visibility can differ per leg. */
function legPose(leftDeg: number, rightDeg: number, visL = 1, visR = 1): Landmark[] {
  const l = blank();
  const build = (deg: number, vis: number, ids: [number, number, number], dx: number) => {
    const knee = { x: 0.5 + dx, y: 0.6 };
    const ankle = { x: 0.5 + dx, y: 0.8 };
    const t = Math.PI - (deg * Math.PI) / 180;
    const hip = { x: knee.x + 0.2 * Math.sin(t), y: knee.y - 0.2 * Math.cos(t) };
    place(l, [ids[0]], hip, vis);
    place(l, [ids[1]], knee, vis);
    place(l, [ids[2]], ankle, vis);
  };
  build(leftDeg, visL, [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE], -0.05);
  build(rightDeg, visR, [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE], 0.05);
  return l;
}

/** Side view lying down; `value` is 180 - torso elevation (so 175 = flat, 105 = sat up 75 degrees). */
function situpPose(value: number, vis = 1): Landmark[] {
  const l = blank();
  const e = ((180 - value) * Math.PI) / 180;
  const hip = { x: 0.6, y: 0.7 };
  const shoulder = { x: hip.x - 0.3 * Math.cos(e), y: hip.y - 0.3 * Math.sin(e) };
  place(l, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER], shoulder, vis);
  place(l, [LM.LEFT_HIP, LM.RIGHT_HIP], hip, vis);
  place(l, [LM.LEFT_KNEE, LM.RIGHT_KNEE], { x: 0.75, y: 0.55 }, vis);
  return l;
}

// Deterministic pseudo-noise so the tests never flake.
let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647 - 0.5) * 4; // ±2 degrees
};

function simulate(counter: RepCounter, pose: (deg: number, ...a: any[]) => Landmark[], reps: number, depth: number, extra: any[] = []) {
  let t = 0;
  let completed = 0;
  let feedback: string | null = null;
  const frame = (deg: number) => {
    const u = counter.update(pose(deg + noise(), ...extra), 1, t);
    if (u.repCompleted) completed++;
    if (u.feedback) feedback = u.feedback;
    t += 33;
  };
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i <= 38; i++) frame(170 - (170 - depth) * Math.sin(Math.PI * (i / 38)));
  }
  for (let i = 0; i < 15; i++) frame(170); // stand still so the last ascent can finish
  return { completed, feedback };
}

describe('jointAngle', () => {
  it('is 180 for a straight line', () => {
    expect(jointAngle({ x: 0.5, y: 0.4 }, { x: 0.5, y: 0.6 }, { x: 0.5, y: 0.8 })).toBeCloseTo(180, 5);
  });
  it('is 90 for a right angle', () => {
    expect(jointAngle({ x: 0.7, y: 0.6 }, { x: 0.5, y: 0.6 }, { x: 0.5, y: 0.8 })).toBeCloseTo(90, 5);
  });
  it('does not blow up on coincident points', () => {
    expect(jointAngle({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.2, y: 0.9 })).toBe(180);
  });
});

describe('squat counting', () => {
  it('counts full squats', () => {
    expect(simulate(new RepCounter('squat'), squatPose, 5, 80).completed).toBe(5);
    expect(simulate(new SquatCounter(), squatPose, 10, 85).completed).toBe(10);
  });

  it('ignores shallow reps and gives depth feedback', () => {
    const r = simulate(new RepCounter('squat'), squatPose, 4, 125);
    expect(r.completed).toBe(0);
    expect(r.feedback).toContain('sâu');
  });

  it('counts nothing when the limb is barely visible', () => {
    expect(simulate(new RepCounter('squat'), squatPose, 5, 80, [0.2]).completed).toBe(0);
  });

  it('reports no-pose without landmarks', () => {
    const u = new RepCounter('squat').update(undefined, 1, 0);
    expect(u.status).toBe('no-pose');
    expect(u.angle).toBeNull();
  });

  it('does not double count jitter around the up threshold', () => {
    const c = new RepCounter('squat');
    let t = 0;
    for (let i = 0; i < 20; i++) c.update(squatPose(170), 1, (t += 33));
    for (let i = 0; i < 20; i++) c.update(squatPose(90), 1, (t += 33));
    let counted = 0;
    for (let i = 0; i < 100; i++) {
      if (c.update(squatPose(160 + (i % 2 ? 6 : -6)), 1, (t += 33)).repCompleted) counted++;
    }
    expect(counted).toBeLessThanOrEqual(1);
  });

  it('reset clears the count', () => {
    const c = new RepCounter('squat');
    simulate(c, squatPose, 3, 80);
    expect(c.getReps()).toBe(3);
    c.reset();
    expect(c.getReps()).toBe(0);
  });
});

describe('push-up counting', () => {
  it('counts full push-ups', () => {
    expect(simulate(new RepCounter('pushup'), pushPose, 8, 70).completed).toBe(8);
  });

  it('ignores shallow push-ups and gives depth feedback', () => {
    const r = simulate(new RepCounter('pushup'), pushPose, 4, 120);
    expect(r.completed).toBe(0);
    expect(r.feedback).toContain('thấp');
  });

  it('warns when the hips sag', () => {
    expect(simulate(new RepCounter('pushup'), pushPose, 3, 70, [0.08]).feedback).toContain('thẳng');
  });

  it('stays silent with a straight body', () => {
    expect(simulate(new RepCounter('pushup'), pushPose, 3, 70, [0]).feedback).toBeNull();
  });
});

describe('lunge counting', () => {
  it('counts lunges using the more flexed knee', () => {
    // Front (left) knee follows the movement, back (right) knee is a bit straighter.
    const pose = (deg: number) => legPose(deg, Math.min(175, deg + 12));
    expect(simulate(new RepCounter('lunge'), pose, 6, 85).completed).toBe(6);
  });

  it('still counts when one leg is hidden', () => {
    const pose = (deg: number) => legPose(deg, deg, 1, 0.1);
    expect(simulate(new RepCounter('lunge'), pose, 4, 85).completed).toBe(4);
  });

  it('ignores shallow lunges', () => {
    const pose = (deg: number) => legPose(deg, deg + 5);
    const r = simulate(new RepCounter('lunge'), pose, 4, 130);
    expect(r.completed).toBe(0);
    expect(r.feedback).toContain('Hạ thấp');
  });
});

describe('shoulder press counting', () => {
  it('counts a rep each time the arms lock out from the rack position', () => {
    const c = new RepCounter('shoulderpress');
    let t = 0;
    let done = 0;
    const frame = (deg: number) => {
      if (c.update(pushPose(deg + noise()), 1, (t += 33)).repCompleted) done++;
    };
    for (let i = 0; i < 15; i++) frame(85); // rack position
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i <= 20; i++) frame(85 + 85 * Math.sin((Math.PI / 2) * (i / 20))); // press up
      for (let i = 0; i <= 20; i++) frame(170 - 85 * Math.sin((Math.PI / 2) * (i / 20))); // lower back
    }
    expect(done).toBe(3);
  });
});

describe('curl counting', () => {
  it('counts full curls', () => {
    expect(simulate(new RepCounter('curl'), pushPose, 6, 40).completed).toBe(6);
  });

  it('asks for a higher curl when the range is short', () => {
    const r = simulate(new RepCounter('curl'), pushPose, 4, 100);
    expect(r.completed).toBe(0);
    expect(r.feedback).toContain('cao hơn');
  });
});

describe('sit-up counting', () => {
  it('counts full sit-ups', () => {
    const c = new RepCounter('situp');
    let t = 0;
    let done = 0;
    const frame = (v: number) => {
      if (c.update(situpPose(v + noise()), 1, (t += 33)).repCompleted) done++;
    };
    for (let i = 0; i < 10; i++) frame(175);
    for (let r = 0; r < 5; r++) {
      for (let i = 0; i <= 30; i++) frame(175 - 70 * Math.sin(Math.PI * (i / 30))); // up to 75 deg and back
    }
    for (let i = 0; i < 10; i++) frame(175);
    expect(done).toBe(5);
  });

  it('does not count a half crunch and asks to sit up higher', () => {
    const c = new RepCounter('situp');
    let t = 0;
    let done = 0;
    let feedback: string | null = null;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i <= 30; i++) {
        const u = c.update(situpPose(175 - 35 * Math.sin(Math.PI * (i / 30)) + noise()), 1, (t += 33));
        if (u.repCompleted) done++;
        if (u.feedback) feedback = u.feedback;
      }
    }
    for (let i = 0; i < 10; i++) c.update(situpPose(175), 1, (t += 33));
    expect(done).toBe(0);
    expect(feedback).toContain('Ngồi dậy');
  });

  it('reports no pose when the torso is hidden', () => {
    expect(new RepCounter('situp').update(situpPose(170, 0.1), 1, 0).status).toBe('no-pose');
  });
});

describe('getCameraExercise', () => {
  it.each([
    ['Barbell Squat', 'squat'],
    ['Goblet Squat', 'squat'],
    ['Pushups', 'pushup'],
    ['Push-Up Wide', 'pushup'],
    ['Incline Push-Up', 'pushup'],
    ['Push-Ups - Close Triceps Position', 'pushup'],
    ['Dumbbell Lunges', 'lunge'],
    ['Barbell Walking Lunge', 'lunge'],
    ['Dumbbell Rear Lunge', 'lunge'],
    ['Dumbbell Shoulder Press', 'shoulderpress'],
    ['Barbell Shoulder Press', 'shoulderpress'],
    ['Seated Cable Shoulder Press', 'shoulderpress'],
    ['Barbell Curl', 'curl'],
    ['Dumbbell Bicep Curl', 'curl'],
    ['Hammer Curls', 'curl'],
    ['EZ-Bar Curl', 'curl'],
    ['Sit-Up', 'situp'],
  ])('%s -> %s', (name, kind) => {
    expect(getCameraExercise(name)).toBe(kind);
  });

  it.each([
    'Freehand Jump Squat',
    'Kettlebell Pistol Squat',
    'Handstand Push-Ups',
    'Plyo Push-up',
    'Single-Arm Push-Up',
    'Push Press',
    'Push Up to Side Plank',
    'Barbell Bench Press - Medium Grip',
    'Lunge Sprint',
    'Kettlebell Turkish Get-Up (Lunge style)',
    'Arnold Dumbbell Press',
    'Dumbbell One-Arm Shoulder Press',
    'Alternating Cable Shoulder Press',
    'Lying Leg Curls',
    'Palms-Up Barbell Wrist Curl Over A Bench',
    'Concentration Curls',
    'Dumbbell Alternate Bicep Curl',
    'Jackknife Sit-Up',
    'Weighted Sit-Ups - With Bands',
    'Crunches',
  ])('%s is unsupported', name => {
    expect(getCameraExercise(name)).toBeNull();
  });
});
