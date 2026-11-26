import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Flame, Droplets, Wheat, Utensils, AlertTriangle, Info } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  PROTEIN_FOODS,
  ActivityLevel,
  Gender,
  NutritionGoal,
  activityFromWeeklyGoal,
  calculatePlan,
  defaultGoal,
  gramsForProtein,
  splitMeals,
} from '../lib/nutrition';
import { DEFAULT_WEEKLY_GOAL, clampGoal } from '../lib/streak';
import { cn } from '../lib/utils';

interface Profile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  weeklyGoal: number;
}

interface Choices {
  activity: ActivityLevel;
  goal: NutritionGoal;
}

const choicesKey = (uid: string) => `flexpath:nutrition:${uid}`;
const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as ActivityLevel[];
const GOALS: NutritionGoal[] = ['lose', 'maintain', 'gain'];

function loadChoices(uid: string): Partial<Choices> {
  try {
    const raw = JSON.parse(localStorage.getItem(choicesKey(uid)) ?? 'null');
    const out: Partial<Choices> = {};
    if (raw && ACTIVITIES.includes(raw.activity)) out.activity = raw.activity;
    if (raw && GOALS.includes(raw.goal)) out.goal = raw.goal;
    return out;
  } catch {
    return {};
  }
}

const nf = (n: number) => n.toLocaleString('vi-VN');

export default function NutritionPlanner() {
  const uid = auth.currentUser?.uid ?? '';
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [activity, setActivity] = useState<ActivityLevel | null>(() => loadChoices(uid).activity ?? null);
  const [goal, setGoal] = useState<NutritionGoal | null>(() => loadChoices(uid).goal ?? null);

  useEffect(() => {
    (async () => {
      try {
        if (!auth.currentUser) return setProfile(null);
        const snap = await getDoc(doc(db, 'health_profiles', auth.currentUser.uid));
        if (!snap.exists()) return setProfile(null);
        const d = snap.data();
        if (![d.height, d.weight, d.age].every(v => typeof v === 'number')) return setProfile(null);
        setProfile({
          gender: d.gender === 'female' ? 'female' : 'male',
          age: d.age,
          heightCm: d.height,
          weightKg: d.weight,
          weeklyGoal: clampGoal(d.weeklyGoal ?? DEFAULT_WEEKLY_GOAL),
        });
      } catch (e) {
        console.error('Error loading profile for nutrition:', e);
        setProfile(null);
      }
    })();
  }, []);

  // Defaults come from the profile until the user picks something.
  const effective = useMemo(() => {
    if (!profile) return null;
    const bmi = profile.weightKg / (profile.heightCm / 100) ** 2;
    return {
      activity: activity ?? activityFromWeeklyGoal(profile.weeklyGoal),
      goal: goal ?? defaultGoal(bmi),
    };
  }, [profile, activity, goal]);

  const plan = useMemo(
    () => (profile && effective ? calculatePlan({ ...profile, ...effective }) : null),
    [profile, effective]
  );

  const choose = (next: Partial<Choices>) => {
    const merged = { activity: effective!.activity, goal: effective!.goal, ...next };
    if (next.activity) setActivity(next.activity);
    if (next.goal) setGoal(next.goal);
    localStorage.setItem(choicesKey(uid), JSON.stringify(merged));
  };

  if (profile === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!profile || !effective) {
    return (
      <div className="glass-panel p-10 text-center space-y-2">
        <Utensils className="w-8 h-8 mx-auto opacity-30" />
        <p className="font-bold">Cần thông tin cơ thể để tính dinh dưỡng</p>
        <p className="text-sm text-brand/40 max-w-sm mx-auto">
          Hãy nhập chiều cao, cân nặng, tuổi và giới tính trong tab Hồ sơ, sau đó quay lại đây.
        </p>
      </div>
    );
  }

  const meals = plan ? splitMeals(plan) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dinh dưỡng</h1>
        <p className="text-brand/60 uppercase font-mono text-sm tracking-widest mt-2">Mục tiêu calo và đạm theo cơ thể bạn</p>
      </header>

      <section className="glass-panel p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <Fact label="Giới tính" value={profile.gender === 'male' ? 'Nam' : 'Nữ'} />
        <Fact label="Tuổi" value={`${profile.age}`} />
        <Fact label="Chiều cao" value={`${profile.heightCm} cm`} />
        <Fact label="Cân nặng" value={`${profile.weightKg} kg`} />
        <Fact label="BMI" value={plan ? `${plan.bmi}` : '–'} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Mục tiêu</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button
                key={g}
                onClick={() => choose({ goal: g })}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider border transition-all',
                  effective.goal === g ? 'bg-accent border-accent text-white' : 'bg-white/5 border-white/10 text-brand/60 hover:border-white/20'
                )}
              >
                {GOAL_LABEL[g]}
              </button>
            ))}
          </div>
          {!goal && <p className="text-[11px] text-brand/40">Gợi ý theo BMI của bạn. Bạn có thể đổi.</p>}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Mức vận động</p>
          <div className="grid grid-cols-1 gap-1.5">
            {ACTIVITIES.map(a => (
              <button
                key={a}
                onClick={() => choose({ activity: a })}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-left transition-all',
                  effective.activity === a ? 'bg-accent/15 border-accent/50' : 'bg-white/5 border-white/10 hover:border-white/20'
                )}
              >
                <span className="text-sm font-bold">{ACTIVITY_LABEL[a].label}</span>
                <span className="text-[11px] text-brand/40 text-right">{ACTIVITY_LABEL[a].hint}</span>
              </button>
            ))}
          </div>
          {!activity && <p className="text-[11px] text-brand/40">Gợi ý theo mục tiêu {profile.weeklyGoal} buổi/tuần của bạn.</p>}
        </div>
      </section>

      {!plan && <p className="text-sm text-red-400">Thông tin trong hồ sơ nằm ngoài khoảng hợp lệ. Hãy kiểm tra lại tab Hồ sơ.</p>}

      {plan && (
        <>
          {plan.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{w}</p>
            </div>
          ))}

          <section className="glass-panel p-6 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand/40">
                  <Flame className="w-3.5 h-3.5 text-accent" /> Mục tiêu mỗi ngày
                </p>
                <p className="text-5xl font-black mt-1">
                  {nf(plan.targetKcal)} <span className="text-lg font-medium text-brand/40">kcal</span>
                </p>
                <p className="text-xs text-brand/50 mt-2">
                  {plan.deltaKcal === 0
                    ? 'Bằng mức tiêu hao hằng ngày, giữ cân.'
                    : `${plan.deltaKcal > 0 ? 'Thừa' : 'Thiếu'} ${nf(Math.abs(plan.deltaKcal))} kcal so với tiêu hao`}
                  {plan.weeklyChangeKg !== 0 &&
                    ` (khoảng ${plan.weeklyChangeKg > 0 ? '+' : '−'}${Math.abs(plan.weeklyChangeKg)} kg/tuần).`}
                </p>
              </div>
              <div className="text-right text-xs text-brand/50 font-mono space-y-1">
                <p>BMR {nf(plan.bmr)} kcal</p>
                <p>TDEE {nf(plan.tdee)} kcal</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex h-3 rounded-full overflow-hidden bg-white/5" role="img" aria-label="Tỷ lệ đạm, béo, tinh bột">
                <div className="bg-rose-400" style={{ width: `${plan.macros.proteinPct}%` }} />
                <div className="bg-amber-400" style={{ width: `${plan.macros.fatPct}%` }} />
                <div className="bg-sky-400" style={{ width: `${plan.macros.carbPct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Macro color="bg-rose-400" label="Đạm" grams={plan.macros.proteinG} pct={plan.macros.proteinPct} />
                <Macro color="bg-amber-400" label="Chất béo" grams={plan.macros.fatG} pct={plan.macros.fatPct} />
                <Macro color="bg-sky-400" label="Tinh bột" grams={plan.macros.carbG} pct={plan.macros.carbPct} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04]">
                <Droplets className="w-5 h-5 text-sky-400 shrink-0" />
                <span>
                  Nước khoảng <b>{(plan.waterMl / 1000).toLocaleString('vi-VN')} lít</b> mỗi ngày
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04]">
                <Wheat className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  Chất xơ khoảng <b>{plan.fiberG} g</b> mỗi ngày
                </span>
              </div>
            </div>

            <p className="text-xs text-brand/50">
              Cân nặng khỏe mạnh theo BMI với chiều cao của bạn: {plan.healthyWeightKg.min}–{plan.healthyWeightKg.max} kg.
            </p>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Gợi ý chia bữa</p>
            <ul className="glass-panel divide-y divide-white/5">
              {meals.map(m => (
                <li key={m.name} className="p-4 flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold">{m.name}</span>
                  <span className="font-mono text-xs text-brand/60">
                    {Math.round(m.share * 100)}% • {nf(m.kcal)} kcal • {m.proteinG} g đạm
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">
              Lượng thực phẩm để đủ {Math.round(plan.macros.proteinG / 4)} g đạm cho một bữa chính (ước tính)
            </p>
            <ul className="glass-panel divide-y divide-white/5">
              {PROTEIN_FOODS.map(f => (
                <li key={f.name} className="p-4 flex items-center justify-between gap-4 text-sm">
                  <span>{f.name}</span>
                  <span className="font-mono text-xs text-brand/60">
                    ~{gramsForProtein(f, plan.macros.proteinG / 4)} g • {f.proteinPer100g} g đạm/100 g
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-2 text-[11px] text-brand/40 leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Con số được tính bằng công thức Mifflin-St Jeor và chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ hoặc chuyên
            gia dinh dưỡng, đặc biệt nếu bạn có bệnh nền, đang mang thai hoặc cho con bú. Hãy điều chỉnh theo cách cơ thể phản ứng sau 2–3 tuần.
          </p>
        </>
      )}
    </motion.div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">{label}</p>
      <p className="font-bold mt-0.5">{value}</p>
    </div>
  );
}

function Macro({ color, label, grams, pct }: { color: string; label: string; grams: number; pct: number }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.04]">
      <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand/40">
        <span className={cn('w-2 h-2 rounded-full', color)} /> {label}
      </p>
      <p className="text-xl font-black mt-1">
        {grams} <span className="text-xs font-medium text-brand/40">g</span>
      </p>
      <p className="text-[11px] text-brand/40">{pct}% calo</p>
    </div>
  );
}
