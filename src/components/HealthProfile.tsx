import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, User, Activity, Ruler, Calendar, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { HealthProfile as HealthProfileType } from '../types';

export default function HealthProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(65);
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<string>('male');
  const [bmi, setBmi] = useState<number | null>(null);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'health_profiles', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as HealthProfileType;
        if (data.height) setHeight(data.height);
        if (data.weight) setWeight(data.weight);
        if (data.age) setAge(data.age);
        if (data.gender) setGender(data.gender);
        if (data.bmi) setBmi(data.bmi);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const calculatedBmi = weight / ((height / 100) ** 2);
      setBmi(calculatedBmi);
      
      const payload: HealthProfileType = {
        height,
        weight,
        age,
        gender,
        bmi: calculatedBmi,
        updatedAt: new Date().toISOString(),
      };
      
      const docRef = doc(db, 'health_profiles', auth.currentUser.uid);
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getBmiDetails = (val: number | null) => {
    if (!val) return { 
      label: 'Chưa có', 
      color: 'text-brand/40', 
      hex: '#E4E3E0', 
      bg: 'border-white/10 bg-white/[0.02]', 
      desc: 'Nhập chiều cao và cân nặng để tính chỉ số BMI và theo dõi tình trạng thể chất của bạn.' 
    };
    if (val < 18.5) return { 
      label: 'Thiếu cân', 
      color: 'text-sky-400', 
      hex: '#38BDF8', 
      bg: 'border-sky-500/20 bg-sky-500/5', 
      desc: 'Chỉ số BMI của bạn thấp hơn mức bình thường. Hãy bổ sung dinh dưỡng giàu protein và tăng cường tập kháng lực để xây dựng khối lượng cơ bắp.' 
    };
    if (val < 24.9) return { 
      label: 'Bình thường', 
      color: 'text-emerald-400', 
      hex: '#34D399', 
      bg: 'border-emerald-500/20 bg-emerald-500/5', 
      desc: 'Chỉ số lý tưởng tuyệt vời! Hãy duy trì thực đơn dinh dưỡng cân bằng và kết hợp rèn luyện sức bền để cơ thể luôn săn chắc, khỏe mạnh.' 
    };
    if (val < 29.9) return { 
      label: 'Thừa cân', 
      color: 'text-amber-500', 
      hex: '#F59E0B', 
      bg: 'border-amber-500/20 bg-amber-500/5', 
      desc: 'Bạn đang ở ngưỡng thừa cân nhẹ. Nên bổ sung thêm các buổi Cardio đốt mỡ và hạn chế thức ăn nhanh để đưa cơ thể về trạng thái cân đối hơn.' 
    };
    return { 
      label: 'Béo phì', 
      color: 'text-red-400', 
      hex: '#F87171', 
      bg: 'border-red-500/20 bg-red-500/5', 
      desc: 'Cảnh báo chỉ số mỡ cao. Bạn nên lập lộ trình giảm mỡ khoa học kết hợp thâm hụt calo lành mạnh để bảo vệ tim mạch và xương khớp nhé.' 
    };
  };

  const bmiDetails = getBmiDetails(bmi);

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sức khỏe cá nhân</h1>
        <p className="text-brand/60 uppercase font-mono text-sm tracking-widest mt-2">Theo dõi chỉ số cơ thể</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Form Input */}
        <div className="glass-panel p-6 space-y-6">
          <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            Nhập thông tin
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Chiều cao (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-ink border border-white/10 rounded-xl pl-10 pr-4 py-3 font-mono focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Cân nặng (kg)</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-ink border border-white/10 rounded-xl pl-10 pr-4 py-3 font-mono focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Tuổi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                <input 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-ink border border-white/10 rounded-xl pl-10 pr-4 py-3 font-mono focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-2">Giới tính</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setGender('male')}
                  className={`py-3 rounded-xl border font-mono text-sm uppercase tracking-widest transition-all ${gender === 'male' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-brand/40 hover:bg-white/5'}`}
                >Nam</button>
                <button 
                  onClick={() => setGender('female')}
                  className={`py-3 rounded-xl border font-mono text-sm uppercase tracking-widest transition-all ${gender === 'female' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-brand/40 hover:bg-white/5'}`}
                >Nữ</button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-accent text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-accent/90 transition-all mt-4 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Lưu & Tính BMI
          </button>
        </div>

        {/* Center/Right Col: Graphic & Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/5 rounded-2xl border border-white/10 p-8">
          
          {/* Graphic Area */}
          <div className="flex justify-center relative py-4">
            <div 
              style={{ filter: 'blur(60px)' }}
              className="absolute inset-0 bg-accent/10 rounded-full scale-75 opacity-30 animate-pulse"
            />
            
            {/* Vùng chứa hình ảnh - Glassmorphic Holographic Pod */}
            <div 
              style={{
                background: 'radial-gradient(circle at center, rgba(24,24,27,0.85) 0%, rgba(9,9,11,0.98) 100%)'
              }}
              className="relative z-10 w-56 h-[26rem] md:w-60 md:h-[28rem] border border-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center overflow-hidden shadow-2xl p-4 transition-all duration-300"
            >
              {/* Scanner Status LED */}
              <div className="absolute top-4 left-0 right-0 flex items-center justify-center gap-1.5 z-20">
                <span className={`w-1.5 h-1.5 rounded-full ${bmi ? 'bg-emerald-400 animate-pulse' : 'bg-white/20 animate-ping'} transition-colors`} />
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/30">SCANNER ACTIVE</span>
              </div>

              {/* Holographic scanner SVG */}
              <svg viewBox="0 0 100 240" className="w-full h-full transition-all duration-700 ease-in-out z-10" fill="none">
                <defs>
                  {/* Glowing shadow filter */}
                  <filter id="glow-light" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="scan-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={bmiDetails.hex} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={bmiDetails.hex} stopOpacity="0" />
                  </linearGradient>
                </defs>

                <style>{`
                  @keyframes scanRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .tech-ring-1 {
                    transform-origin: 50px 120px;
                    animation: scanRotate 15s linear infinite;
                  }
                  .tech-ring-2 {
                    transform-origin: 50px 120px;
                    animation: scanRotate 8s linear infinite reverse;
                  }
                `}</style>

                {(() => {
                  const getBmiScale = (b: number | null) => {
                    if (!b) return 1.0;
                    if (b < 18.5) {
                      const ratio = Math.max(0, Math.min(1, (b - 14) / 4.5));
                      return 0.78 + ratio * 0.17;
                    } else if (b < 25) {
                      const ratio = Math.max(0, Math.min(1, (b - 18.5) / 6.5));
                      return 0.95 + ratio * 0.1;
                    } else if (b < 30) {
                      const ratio = Math.max(0, Math.min(1, (b - 25) / 5));
                      return 1.05 + ratio * 0.17;
                    } else {
                      const ratio = Math.max(0, Math.min(1, (b - 30) / 10));
                      return 1.22 + ratio * 0.28;
                    }
                  };

                  const bmiScale = getBmiScale(bmi);

                  const getBodyPaths = (g: 'male' | 'female') => {
                    if (g === 'female') {
                      return [
                        "M50 20 C53 20 55.5 22.5 55.5 26 C55.5 29.5 53 32 50 32 C47 32 44.5 29.5 44.5 26 C44.5 22.5 47 20 50 20 Z M48 32 L52 32 L52.5 38 L47.5 38 Z", // Head & Neck
                        "M48 38 L52 38 C56 41 59 45 60 52 C61 60 61 75 57 88 C54 98 58 112 61 123 C61 125 39 125 39 123 C42 112 46 98 43 88 C39 75 39 60 40 52 C41 45 44 41 48 38 Z", // Torso
                        "M36 47 C31 53 27 70 25 105 C24 112 27 112 28 105 C30 78 34 54 37 49 Z", // Left Arm
                        "M63 47 C69 53 73 70 75 105 C76 112 73 112 72 105 C70 78 66 54 63 49 Z", // Right Arm
                        "M39 124 C37 130 36 165 36 185 C36 195 38 215 36 223 C36 225 41 225 43 225 C45 225 46 215 46 185 C46 165 47 135 48 125 Z", // Left Leg
                        "M61 124 C63 130 64 165 64 185 C64 195 62 215 64 223 C64 225 59 225 57 225 C55 225 54 215 54 185 C54 165 53 135 52 125 Z"  // Right Leg
                      ];
                    } else {
                      return [
                        "M50 20 C54 20 57 23 57 28 C57 33 54 36 50 36 C46 36 43 33 43 28 C43 23 46 20 50 20 Z M47.5 36 L52.5 36 L53 42 L47 42 Z", // Head & Neck
                        "M46 42 L54 42 C59 45 63 50 64 56 C66 65 65 90 62 105 C59 120 56 128 50 130 C44 128 41 120 38 105 C35 90 34 65 36 56 C37 50 41 45 46 42 Z", // Torso
                        "M34 49 C29 55 25 75 23 108 C22 115 26 115 27 108 C29 80 33 56 36 51 Z", // Left Arm
                        "M66 49 C71 55 75 75 77 108 C78 115 74 115 73 108 C71 80 67 56 64 51 Z", // Right Arm
                        "M37 127 C35 129 33 165 33 185 C33 195 35 215 33 223 C33 226 38 226 41 226 C43 226 44 215 44 185 C44 165 46 135 47 129 Z", // Left Leg
                        "M63 127 C65 129 67 165 67 185 C67 195 65 215 67 223 C67 226 62 226 59 226 C57 226 56 215 56 185 C56 165 54 135 53 129 Z"  // Right Leg
                      ];
                    }
                  };

                  const paths = getBodyPaths(gender);
                  return (
                    <>
                      {/* Concentric scan circles */}
                      <circle cx="50" cy="120" r="85" stroke="white" strokeOpacity="0.02" strokeWidth="1" fill="none" />
                      <circle cx="50" cy="120" r="60" stroke="white" strokeOpacity="0.04" strokeWidth="1" strokeDasharray="3 6" fill="none" />
                      <circle cx="50" cy="120" r="35" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none" />
                      
                      {/* Technical Rotating HUD Rings */}
                      <circle cx="50" cy="120" r="75" stroke={bmiDetails.hex} strokeOpacity="0.08" strokeWidth="0.8" strokeDasharray="5 15" className="tech-ring-1" />
                      <circle cx="50" cy="120" r="45" stroke={bmiDetails.hex} strokeOpacity="0.12" strokeWidth="0.8" strokeDasharray="25 10 5 10" className="tech-ring-2" />

                      {/* Tech radar crosshairs */}
                      <line x1="50" y1="15" x2="50" y2="225" stroke="white" strokeOpacity="0.03" strokeWidth="1" strokeDasharray="2 4" />
                      <line x1="10" y1="120" x2="90" y2="120" stroke="white" strokeOpacity="0.03" strokeWidth="1" strokeDasharray="2 4" />

                      {/* Scanning dynamic neon wave */}
                      <line x1="15" y1="25" x2="85" y2="25" stroke={bmiDetails.hex} strokeWidth="1.5" strokeOpacity="0.8" filter="url(#glow-light)">
                        <animate 
                          attributeName="y" 
                          values="25;220;25" 
                          dur="4s" 
                          repeatCount="indefinite" 
                        />
                      </line>
                      <polygon points="15,25 85,25 85,45 15,45" fill="url(#scan-grad)" opacity="0.12">
                        <animate 
                          attributeName="points" 
                          values="15,25 85,25 85,45 15,45; 15,200 85,200 85,220 15,220; 15,25 85,25 85,45 15,45" 
                          dur="4s" 
                          repeatCount="indefinite" 
                        />
                      </polygon>

                      {/* Floating HUD Telemetry Lines */}
                      <g stroke="white" strokeOpacity="0.12" strokeWidth="0.5">
                        <polyline points="20,30 38,30 43,30" />
                        <polyline points="80,60 62,60 53,60" />
                        <polyline points="20,105 34,105 40,105" />
                        <polyline points="80,140 66,140 58,140" />
                      </g>
                      
                      {/* Floating Telemetry Text Labels */}
                      <g fill="white" fillOpacity="0.4" fontSize="3" fontFamily="monospace" letterSpacing="0.08em">
                        <text x="4" y="27">CNS SCAN</text>
                        <text x="4" y="33" fill={bmiDetails.hex} fillOpacity="0.75" fontSize="2.8" fontWeight="bold">STABLE</text>
                        
                        <text x="96" y="57" textAnchor="end">SYS RATE</text>
                        <text x="96" y="63" textAnchor="end" fill={bmiDetails.hex} fillOpacity="0.75" fontSize="2.8" fontWeight="bold">72 BPM</text>
                        
                        <text x="4" y="102">CORE INDX</text>
                        <text x="4" y="108" fill={bmiDetails.hex} fillOpacity="0.75" fontSize="2.8" fontWeight="bold">SYS.OK</text>
                        
                        <text x="96" y="137" textAnchor="end">CELLULAR</text>
                        <text x="96" y="143" textAnchor="end" fill={bmiDetails.hex} fillOpacity="0.75" fontSize="2.8" fontWeight="bold">ACTIVE</text>
                      </g>

                      {/* Main Glowy Silhouette group centered at 50, 120 and dynamically scaled */}
                      <g 
                        transform={`translate(50, 0) scale(${bmiScale}, 1) translate(-50, 0)`}
                        className="transition-all duration-700 ease-out"
                      >
                        {/* Body Outline & Glass Panels */}
                        <g 
                          stroke={bmiDetails.hex} 
                          fill={bmiDetails.hex}
                          fillOpacity="0.1"
                          filter="url(#glow-light)" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          {/* Head & Neck */}
                          <path d={paths[0]} strokeWidth="1.6" />
                          {/* Torso Plate */}
                          <path d={paths[1]} strokeWidth="1.8" fillOpacity="0.18" />
                          {/* Left Arm */}
                          <path d={paths[2]} strokeWidth="1.5" />
                          {/* Right Arm */}
                          <path d={paths[3]} strokeWidth="1.5" />
                          {/* Left Leg */}
                          <path d={paths[4]} strokeWidth="1.6" fillOpacity="0.15" />
                          {/* Right Leg */}
                          <path d={paths[5]} strokeWidth="1.6" fillOpacity="0.15" />
                        </g>

                        {/* Internal Cyber Skeleton / Telemetry Wireframe inside the body */}
                        <g 
                          stroke="white" 
                          strokeOpacity="0.25" 
                          strokeWidth="0.6" 
                          strokeLinecap="round"
                        >
                          {/* Spine */}
                          <line x1="50" y1="36" x2="50" y2="120" strokeDasharray="1.5 1.5" />
                          
                          {/* Collarbone */}
                          <path d="M 42 40 Q 50 43 58 40" fill="none" />
                          
                          {/* Rib cage lines */}
                          <path d="M 43 52 Q 50 55 57 52" fill="none" />
                          <path d="M 42 66 Q 50 69 58 66" fill="none" />
                          <path d="M 41 80 Q 50 83 59 80" fill="none" />
                          <path d="M 40 94 Q 50 97 60 94" fill="none" />

                          {/* Pelvic Ring */}
                          <path d="M 42 116 Q 50 120 58 116" fill="none" />
                          <path d="M 41 123 Q 50 127 59 123" fill="none" />
                        </g>

                        {/* Beating Heart node */}
                        <circle cx="50" cy="60" r="3" fill={bmiDetails.hex} filter="url(#glow-light)">
                          <animate attributeName="r" values="3;4.5;3" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        
                        {/* Joint nodes dynamically scaled */}
                        <circle cx="36" cy="48" r="1" fill="white" fillOpacity="0.7" />
                        <circle cx="64" cy="48" r="1" fill="white" fillOpacity="0.7" />
                        <circle cx="38" cy="180" r="1" fill="white" fillOpacity="0.7" />
                        <circle cx="62" cy="180" r="1" fill="white" fillOpacity="0.7" />
                      </g>
                    </>
                  );
                })()}
              </svg>

              {/* Scanner grid indicators (bottom) */}
              <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[7px] font-mono text-white/20 z-20">
                <span>SYS.OK</span>
                <span>SEC.12</span>
              </div>
              
              {/* Futuristic Interactive Callout Lines */}
              <div 
                style={{
                  background: `linear-gradient(to right, ${bmiDetails.hex}77, transparent)`
                }}
                className="absolute top-[20%] -right-8 w-24 h-[1px] flex items-center justify-end z-20"
              >
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1.5 h-1.5 rounded-full animate-ping absolute" />
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1 h-1 rounded-full" />
              </div>
              <div 
                style={{
                  background: `linear-gradient(to left, ${bmiDetails.hex}77, transparent)`
                }}
                className="absolute top-[45%] -left-8 w-24 h-[1px] flex items-center justify-start z-20"
              >
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1.5 h-1.5 rounded-full animate-ping absolute" />
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1 h-1 rounded-full" />
              </div>
              <div 
                style={{
                  background: `linear-gradient(to right, ${bmiDetails.hex}77, transparent)`
                }}
                className="absolute bottom-[20%] -right-8 w-24 h-[1px] flex items-center justify-end z-20"
              >
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1.5 h-1.5 rounded-full animate-ping absolute" />
                <span style={{ backgroundColor: bmiDetails.hex }} className="w-1 h-1 rounded-full" />
              </div>
            </div>
          </div>

          {/* Stats Display */}
          <div className="space-y-6 relative z-20">
            <div className={`glass-panel p-6 border transition-all ${bmiDetails.bg}`}>
              <h3 className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Chỉ số BMI</h3>
              {bmi ? (
                <div>
                   <p className="text-5xl font-mono font-bold tracking-tighter text-accent mb-2">
                     {bmi.toFixed(1)}
                   </p>
                   <div className={`inline-flex px-3 py-1 bg-zinc-950/40 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest ${bmiDetails.color}`}>
                     {bmiDetails.label}
                   </div>
                </div>
              ) : (
                <p className="font-mono text-brand/40 text-sm mt-4">Chưa có dữ liệu</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Cân nặng</h4>
                <p className="text-2xl font-mono font-bold">{weight} <span className="text-sm opacity-50">KG</span></p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-brand/40 mb-1">Chiều cao</h4>
                <p className="text-2xl font-mono font-bold">{height} <span className="text-sm opacity-50">CM</span></p>
              </div>
            </div>
            
            <div className={`glass-panel p-4 text-center mt-4 border transition-all duration-500 ${bmiDetails.bg}`}>
                <p className="text-xs text-brand/80 font-mono tracking-tight leading-relaxed">
                  {bmiDetails.desc}
                </p>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}