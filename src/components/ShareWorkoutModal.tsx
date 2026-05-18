import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Image as ImageIcon, 
  Sparkles, 
  Share2, 
  Dumbbell, 
  Calendar, 
  Clock, 
  Flame, 
  User, 
  Loader2,
  Check
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Workout, ExerciseLog } from '../types';
import { auth } from '../lib/firebase';

interface ShareWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout;
  logs: ExerciseLog[];
}

const PRESET_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Neon',
    previewBg: 'bg-zinc-950 border border-white/10',
    style: {
      background: 'linear-gradient(135deg, #09090b 0%, #1c1c1e 100%)',
    },
    hasDeco: true,
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    previewBg: 'bg-gradient-to-br from-orange-500 to-red-600',
    style: {
      background: 'linear-gradient(135deg, #ff5e00 0%, #c30000 100%)',
    },
    hasDeco: false,
  },
  {
    id: 'emerald',
    name: 'Emerald Steel',
    previewBg: 'bg-gradient-to-br from-emerald-800 to-teal-950',
    style: {
      background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
    },
    hasDeco: false,
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Sport',
    previewBg: 'bg-yellow-400',
    style: {
      background: '#facc15',
    },
    hasDeco: false,
  },
  {
    id: 'ocean',
    name: 'Deep Blue',
    previewBg: 'bg-gradient-to-br from-blue-600 to-indigo-900',
    style: {
      background: 'linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)',
    },
    hasDeco: false,
  }
];

interface AspectRatio {
  id: string;
  name: string;
  className: string;
  label: string;
}

const ASPECT_RATIOS: AspectRatio[] = [
  { id: '1:1', name: '1:1 Vuông', label: 'Instagram Feed', className: 'w-[360px] xs:w-[380px] h-auto min-h-[360px] xs:min-h-[380px]' },
  { id: '9:16', name: '9:16 Story', label: 'Stories / TikTok', className: 'w-[360px] h-auto min-h-[640px]' },
  { id: '3:4', name: '3:4 Dọc', label: 'Standard Portrait', className: 'w-[360px] xs:w-[380px] h-auto min-h-[480px] xs:min-h-[506px]' },
  { id: '16:9', name: '16:9 Ngang', label: 'Widescreen Banner', className: 'w-[560px] xs:w-[640px] h-auto min-h-[315px] xs:min-h-[360px]' },
];

export default function ShareWorkoutModal({ isOpen, onClose, workout, logs }: ShareWorkoutModalProps) {
  const [activeTheme, setActiveTheme] = useState(PRESET_THEMES[0]);
  const [activeRatio, setActiveRatio] = useState(ASPECT_RATIOS[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(60); // percentage for custom image overlay
  const [isExporting, setIsExporting] = useState(false);
  const [exportResultUrl, setExportResultUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const user = auth.currentUser;

  if (!isOpen) return null;

  // Calculate statistics
  const totalSets = logs.reduce((sum, log) => sum + log.sets.length, 0);
  const exerciseCount = logs.length;
  
  const formatDuration = (start: string, end?: string, durationSeconds?: number) => {
    if (durationSeconds !== undefined) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
    }
    if (!end) return 'N/A';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(durationMs / 60000);
    return `${mins}m`;
  };

  // Image Upload handler with Compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create an offscreen canvas to compress the image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          // Resize while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export as compressed JPEG to avoid Safari base64 size limits
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setCustomImage(compressedDataUrl);
          } else {
            setCustomImage(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Image Generation and Download using html2canvas
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    
    try {
      // Small timeout to allow DOM to settle and images to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 3, // Premium high-resolution 3x scale
        logging: false,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      setExportResultUrl(dataUrl);

      // Auto-trigger direct download for desktop users
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) {
        const link = document.createElement('a');
        const sanitizedName = workout.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        link.download = `flexpath_${sanitizedName}_${activeRatio.id.replace(':', '_')}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('Đã xảy ra lỗi khi tạo ảnh. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  // Determine styling classes based on selected mode
  const isCustomMode = !!customImage;
  const isCyberpunk = activeTheme.id === 'cyberpunk' && !isCustomMode;

  const textColor = isCyberpunk ? 'text-zinc-950' : 'text-white';
  const labelColor = isCyberpunk ? 'text-zinc-700 font-bold' : 'text-white/40';
  const subColor = isCyberpunk ? 'text-zinc-800' : 'text-white/60';
  const panelBg = isCyberpunk ? 'bg-black/[0.04] border border-black/10' : 'bg-white/5 border border-white/5';
  const badgeColor = isCyberpunk ? 'bg-zinc-950 text-yellow-400' : 'bg-accent text-white';
  const accentColor = isCyberpunk ? 'text-zinc-950 font-black' : 'text-accent';
  const logoColor = isCyberpunk ? 'text-zinc-950' : 'text-accent';
  const brandingColor = isCyberpunk ? 'text-zinc-600' : 'text-white/30';
  const dividerColor = isCyberpunk ? 'border-zinc-950/10' : 'border-white/5';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 font-sans">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/90 backdrop-blur-md"
      />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-4xl bg-zinc-900 md:border md:border-white/10 rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl overflow-y-auto md:overflow-hidden animate-fade-in"
      >
        
        {/* Left Side: Live Preview (Responsive Card container) */}
        <div className="w-full md:flex-1 bg-zinc-950/50 p-4 md:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 shrink-0 md:shrink md:overflow-auto relative">
          
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white md:hidden z-30 border border-white/10 active:scale-95 shadow-md"
          >
            <X className="w-4 h-4" />
          </button>

          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand/40 mb-4 mt-2 md:mt-0">Xem trước ảnh chia sẻ ({activeRatio.name})</p>
          
          {/* Card to export container with swipe horizontal capability on mobile */}
          <div className="w-full overflow-x-auto py-2 px-1 flex justify-start md:justify-center items-center scrollbar-none">
            <div 
              ref={cardRef}
              style={isCustomMode ? undefined : activeTheme.style}
              className={`${activeRatio.className} rounded-2xl p-6 flex flex-col justify-between shadow-2xl shrink-0 relative overflow-hidden select-none bg-zinc-950`}
            >
              {/* Custom image background rendering */}
              {isCustomMode && (
                <>
                  <img 
                    src={customImage || ''} 
                    alt="Workout custom background" 
                    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" 
                  />
                  <div 
                    className="absolute inset-0 bg-black z-0 transition-opacity pointer-events-none" 
                    style={{ opacity: overlayOpacity / 100 }}
                  />
                </>
              )}

              {/* Neon blur decorations for Midnight Theme */}
              {!isCustomMode && activeTheme.id === 'midnight' && (
                <>
                  <div className="absolute w-44 h-44 rounded-full bg-accent/15 blur-3xl -top-12 -left-12 z-0" />
                  <div className="absolute w-44 h-44 rounded-full bg-purple-500/15 blur-3xl -bottom-12 -right-12 z-0" />
                </>
              )}

              {/* Card Content - Z-index ensure overlays on background */}
              <div className="relative z-10 flex flex-col h-full justify-between gap-5 flex-1">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isCyberpunk ? 'bg-zinc-950 text-yellow-400' : 'bg-accent text-white'}`}>
                      <Dumbbell className="w-3.5 h-3.5" />
                    </div>
                    <span className={`font-black italic tracking-tighter text-sm ${textColor}`}>FlexPath</span>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${labelColor}`}>
                    {new Date(workout.startTime).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                {/* Dynamic layout based on 16:9 wide vs others */}
                {activeRatio.id === '16:9' ? (
                  /* Side-by-side landscape layout */
                  <div className="grid grid-cols-2 gap-5 flex-1 items-start my-auto">
                    {/* Left side: name and metrics */}
                    <div className="space-y-4">
                      <h3 className={`text-xl font-black italic tracking-tight uppercase leading-tight ${textColor}`}>
                        {workout.name}
                      </h3>
                      
                      {/* Stats Grid - Vertical list of stats for landscape */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2.5 rounded-xl ${panelBg}`}>
                          <p className={`text-[7px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>VOLUME</p>
                          <p className={`text-base font-bold font-mono tracking-tighter leading-none ${accentColor}`}>
                            {(workout.totalVolume || 0).toLocaleString()} <span className="text-[8px] font-normal opacity-50">KG</span>
                          </p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${panelBg}`}>
                          <p className={`text-[7px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>DURATION</p>
                          <p className={`text-base font-bold font-mono tracking-tighter leading-none ${textColor}`}>
                            {formatDuration(workout.startTime, workout.endTime, workout.duration)}
                          </p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${panelBg}`}>
                          <p className={`text-[7px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>TOTAL SETS</p>
                          <p className={`text-base font-bold font-mono tracking-tighter leading-none ${textColor}`}>
                            {totalSets} <span className="text-[8px] font-normal opacity-50">SETS</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right side: exercises logs list */}
                    <div className="space-y-1.5 h-full overflow-hidden">
                      <p className={`text-[8px] font-mono uppercase tracking-widest mb-1 ${labelColor}`}>DANH SÁCH BÀI TẬP</p>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                        {logs.map((log) => {
                          const maxWeight = Math.max(...log.sets.map(s => s.weight), 0);
                          return (
                            <div key={log.id} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs ${panelBg}`}>
                              <span className={`font-semibold truncate max-w-[120px] ${textColor}`}>{log.exerciseName}</span>
                              <span className={`font-mono text-[9px] ${subColor}`}>
                                {log.sets.length} sets • Max {maxWeight}kg
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard vertical flow for 1:1, 9:16, 3:4 */
                  <div className="flex flex-col gap-5 flex-1 justify-between">
                    {/* Workout Name & Metrics */}
                    <div>
                      <h3 className={`text-2xl font-black italic tracking-tight uppercase leading-tight mb-4 ${textColor}`}>
                        {workout.name}
                      </h3>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl ${panelBg}`}>
                          <p className={`text-[8px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>VOLUME</p>
                          <p className={`text-lg font-bold font-mono tracking-tighter leading-none ${accentColor}`}>
                            {(workout.totalVolume || 0).toLocaleString()} <span className="text-[9px] font-normal opacity-50">KG</span>
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl ${panelBg}`}>
                          <p className={`text-[8px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>DURATION</p>
                          <p className={`text-lg font-bold font-mono tracking-tighter leading-none ${textColor}`}>
                            {formatDuration(workout.startTime, workout.endTime, workout.duration)}
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl ${panelBg}`}>
                          <p className={`text-[8px] font-mono uppercase tracking-widest leading-none mb-1 ${labelColor}`}>TOTAL SETS</p>
                          <p className={`text-lg font-bold font-mono tracking-tighter leading-none ${textColor}`}>
                            {totalSets} <span className="text-[9px] font-normal opacity-50">SETS</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Logs highlight list */}
                    <div className="space-y-1.5">
                      <p className={`text-[8px] font-mono uppercase tracking-widest mb-1 ${labelColor}`}>DANH SÁCH BÀI TẬP</p>
                      <div className="space-y-1">
                        {logs.map((log) => {
                          const maxWeight = Math.max(...log.sets.map(s => s.weight), 0);
                          return (
                            <div key={log.id} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs ${panelBg}`}>
                              <span className={`font-semibold truncate max-w-[180px] ${textColor}`}>{log.exerciseName}</span>
                              <span className={`font-mono text-[10px] ${subColor}`}>
                                {log.sets.length} sets • Max {maxWeight}kg
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Footer (User info & Tagline) */}
                <div className={`flex justify-between items-center pt-3 border-t ${dividerColor} mt-auto`}>
                  <div className="flex items-center gap-2">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="" 
                        className={`w-6 h-6 rounded-full border ${isCyberpunk ? 'border-zinc-950/20' : 'border-white/10'}`} 
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCyberpunk ? 'bg-zinc-950 text-yellow-400' : 'bg-white/10 text-white'}`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className={`text-[10px] font-medium max-w-[120px] truncate ${textColor}`}>
                      {user?.displayName || 'Elite Athlete'}
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono uppercase tracking-[0.2em] font-bold ${brandingColor}`}>
                    MASTER YOUR PERFORMANCE
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Options & Customizer Panel */}
        <div className="w-full md:flex-1 p-5 md:p-6 flex flex-col justify-between shrink-0 md:shrink md:overflow-y-auto md:max-h-[calc(90vh-2rem)]">
          
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  Thiết kế ảnh của bạn
                </h3>
                <p className="text-xs text-white/50 mt-1">Chọn tỉ lệ ảnh, bộ màu hoặc ảnh cá nhân của riêng bạn để tạo ấn tượng như Strava.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white hidden md:block"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-accent" /> Tỉ lệ khung hình
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => {
                  const isSelected = activeRatio.id === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => setActiveRatio(ratio)}
                      className={`flex flex-col p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                        isSelected 
                          ? 'border-accent bg-accent/5' 
                          : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{ratio.name}</span>
                      <span className="text-[9px] text-white/40 font-mono mt-0.5">{ratio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Background Photo Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Ảnh nền tập luyện của bạn</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 py-3 px-4 rounded-xl border border-dashed transition-all text-xs font-semibold flex items-center justify-center gap-2 ${
                    isCustomMode 
                      ? 'border-accent text-accent bg-accent/5' 
                      : 'border-white/10 hover:border-white/30 text-white/60 hover:text-white bg-white/5'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  {isCustomMode ? 'Thay đổi ảnh' : 'Tải ảnh của bạn'}
                </button>
                {isCustomMode && (
                  <button
                    onClick={() => {
                      setCustomImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="py-3 px-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all border border-red-500/20"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>

            {/* If custom image is selected, show Overlay Opacity controls */}
            {isCustomMode ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 flex justify-between">
                  <span>Độ tối của ảnh nền (Overlay)</span>
                  <span className="font-mono text-accent font-bold">{overlayOpacity}%</span>
                </h4>
                <div className="flex gap-2">
                  {[40, 50, 60, 75, 85].map((op) => (
                    <button
                      key={op}
                      onClick={() => setOverlayOpacity(op)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        overlayOpacity === op 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {op}%
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Preset themes selection */
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Bộ màu nền thể thao</h4>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                  {PRESET_THEMES.map((theme) => {
                    const isSelected = activeTheme.id === theme.id && !isCustomMode;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setCustomImage(null);
                          setActiveTheme(theme);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'border-accent bg-accent/5' 
                            : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full ${theme.previewBg} flex items-center justify-center shrink-0`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-white/90 truncate">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Tips Card */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <h5 className="text-xs font-bold text-accent flex items-center gap-1.5 mb-1">
                <Share2 className="w-3.5 h-3.5" />
                Mẹo chia sẻ
              </h5>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Tải ảnh chất lượng cao 2x sắc nét về máy của bạn để dễ dàng đăng lên Strava Activity, Story Instagram, Facebook hoặc Zalo nhằm ghi nhận sự cố gắng!
              </p>
            </div>

          </div>

          {/* Download Action Footer */}
          <div className="pt-6 border-t border-white/5 mt-6 flex gap-3 pb-4 md:pb-0">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 font-bold uppercase text-xs tracking-wider transition-all active:scale-95 border border-white/5"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="flex-[2] py-4 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:bg-accent/50 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-accent/20"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xuất ảnh...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tải ảnh xuống
                </>
              )}
            </button>
          </div>

        </div>

        {/* Real Fullscreen Image Preview for Safe Mobile Saving */}
        <AnimatePresence>
          {exportResultUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 overflow-y-auto"
            >
              <div className="w-full max-w-sm flex flex-col items-center justify-center text-center space-y-4 my-auto">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-lg flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                    Ảnh Đã Sẵn Sàng!
                  </h4>
                  <p className="text-xs text-white/60 px-4 leading-relaxed">
                    Trình duyệt di động hạn chế tải trực tiếp. Bạn hãy <span className="text-accent font-bold">ấn giữ (long-press) vào ảnh dưới đây</span> để lưu vào máy hoặc chia sẻ!
                  </p>
                </div>

                {/* Generated Image Result Card */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[60vh] max-w-full bg-zinc-950 flex items-center justify-center">
                  <img 
                    src={exportResultUrl} 
                    alt="FlexPath Workout Summary" 
                    className="max-h-[60vh] object-contain mx-auto select-all pointer-events-auto" 
                  />
                </div>

                <div className="flex gap-3 w-full pt-2">
                  <button
                    onClick={() => setExportResultUrl(null)}
                    className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      const sanitizedName = workout.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                      link.download = `flexpath_${sanitizedName}_${activeRatio.id.replace(':', '_')}_${new Date().toISOString().slice(0,10)}.png`;
                      link.href = exportResultUrl;
                      link.click();
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Tải về
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
