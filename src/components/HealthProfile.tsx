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
                      return 0.60 + ratio * 0.30;
                    } else if (b < 25) {
                      const ratio = Math.max(0, Math.min(1, (b - 18.5) / 6.5));
                      return 0.90 + ratio * 0.20;
                    } else if (b < 30) {
                      const ratio = Math.max(0, Math.min(1, (b - 25) / 5));
                      return 1.15 + ratio * 0.25;
                    } else {
                      const ratio = Math.max(0, Math.min(1, (b - 30) / 10));
                      return 1.45 + ratio * 0.45;
                    }
                  };

                  const bmiScale = getBmiScale(bmi);

                  const getBodyPaths = (g: 'male' | 'female') => {
                    if (g === 'female') {
                      return [
                        "M 50 20 C 51.5 20, 52 18, 52 17 C 52 15, 48 15, 48 17 C 48 18, 48.5 20, 50 20 C 54 20, 55.5 22.5, 55.5 26.5 C 55.5 30.5, 53.5 33, 52.2 34 C 52.2 35, 52.8 36.5, 52.8 41 C 56.5 43, 60 45, 62.2 48.5 C 64.2 53.5, 66.5 73, 68 91.5 C 69.2 105.5, 70.2 116.5, 69.8 125 C 69.5 130.5, 68.5 132.5, 67.5 132.5 C 66.5 132.5, 66 130.5, 65.5 125 C 65 116.5, 64 105.5, 62.8 91.5 C 61.5 78, 59.5 68, 57.2 65 C 56 69, 54.5 82, 54.5 92.5 C 54.5 102.5, 57.5 114, 59.5 123 C 58.5 130, 60 155, 60.5 175 C 61 190, 61.2 205, 59.5 220 C 59.5 224, 61.2 225, 61.7 225 C 61.7 226, 56.8 226, 56.3 225.5 C 55.3 220, 54.5 205, 54 190 C 53.5 175, 53 155, 51.5 135 C 51.2 128, 50.4 127.5, 50 127 C 49.6 127.5, 48.8 128, 48.5 135 C 47 155, 46.5 175, 46 190 C 45.5 205, 44.7 220, 43.7 225.5 C 43.2 226, 38.3 226, 38.3 225 C 38.8 225, 40.5 224, 40.5 220 C 38.8 205, 39 190, 39.5 175 C 40 155, 41.5 130, 40.5 123 C 42.5 114, 45.5 102.5, 45.5 92.5 C 45.5 82, 44 69, 42.8 65 C 40.5 68, 38.5 78, 37.2 91.5 C 36 105.5, 35 116.5, 34.5 125 C 34 130.5, 33.5 132.5, 32.5 132.5 C 31.5 132.5, 30.5 130.5, 30.2 125 C 29.8 116.5, 30.8 105.5, 32 91.5 C 33.5 73, 35.8 53.5, 37.8 48.5 C 40 45, 43.5 43, 47.2 41 C 47.2 36.5, 47.8 35, 47.8 34 C 46.5 33, 44.5 30.5, 44.5 26.5 C 44.5 22.5, 46 20, 50 20 Z"
                      ];
                    } else {
                      return [
                        "M 50 20 C 54.5 20, 56.5 23, 56.5 27.5 C 56.5 32, 54 34.5, 52.5 35.5 C 52.5 36, 53.5 37, 53.5 41 C 59 43, 63.5 45.5, 65 49 C 67 54, 69.5 73, 71.5 91.5 C 73 105.5, 74 116.5, 73.5 125 C 73 131, 72 133, 71 133 C 70 133, 69.5 131, 69 125 C 68.5 116.5, 67.5 105.5, 66 91.5 C 64.5 78, 62 68, 59 66 C 58 72, 57 88, 57.5 98 C 58 107, 58.5 116, 58 123 C 57.5 130, 60.5 155, 61 175 C 61.5 190, 62 205, 60 220 C 60 224, 62 225, 62.5 225 C 62.5 226, 57.5 226, 57 225.5 C 56 220, 55 205, 54.5 190 C 54 175, 53.5 155, 52 135 C 51.5 128, 50.5 127.5, 50 127 C 49.5 127.5, 48.5 128, 48 135 C 46.5 155, 46 175, 45.5 190 C 45 205, 44 220, 43 225.5 C 42.5 226, 37.5 226, 37.5 225 C 38 225, 40 224, 40 220 C 38 205, 38.5 190, 39 175 C 39.5 155, 42.5 130, 42 123 C 41.5 116, 42 107, 42.5 98 C 43 88, 42 72, 41 66 C 38 68, 35.5 78, 34 91.5 C 32.5 105.5, 31.5 116.5, 31 125 C 30.5 131, 30 133, 29 133 C 28 133, 27 131, 26.5 125 C 26 116.5, 27 105.5, 28.5 91.5 C 30.5 73, 33 54, 35 49 C 36.5 45.5, 41 43, 46.5 41 C 46.5 37, 47.5 36, 47.5 35.5 C 46 34.5, 43.5 32, 43.5 27.5 C 43.5 23, 45.5 20, 50 20 Z"
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
                          {/* Real Body Silhouette */}
                          <path d={paths[0]} strokeWidth="1.8" fillOpacity="0.15" />
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