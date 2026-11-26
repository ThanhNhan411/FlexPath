import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Camera, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { RepCounter, RepUpdate, CameraExercise } from '../lib/repCounter';
import { cn } from '../lib/utils';

// Keep the WASM runtime version in sync with the installed @mediapipe/tasks-vision package.
const VISION_VERSION = '1.2.3';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const TARGET_FPS = 20;

const SETUP_HINT: Record<CameraExercise, string> = {
  squat: 'Đặt điện thoại hoặc máy tính cách 2–3 mét, đứng quay nghiêng sao cho thấy rõ hông, đầu gối và cổ chân.',
  pushup:
    'Đặt camera ngang tầm sàn, cách 2–3 mét và quay nghiêng người sao cho thấy rõ vai, khuỷu tay, cổ tay và hông. Giữ thân thẳng khi hạ xuống.',
};

interface CameraRepCounterProps {
  kind: CameraExercise;
  exerciseName: string;
  targetReps: number;
  onFinish: (reps: number) => void;
  onClose: () => void;
}

type Stage = 'loading' | 'ready' | 'error';

export default function CameraRepCounter({ kind, exerciseName, targetReps, onFinish, onClose }: CameraRepCounterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef(new RepCounter(kind));
  const finishedRef = useRef(false);

  const [stage, setStage] = useState<Stage>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [reps, setReps] = useState(0);
  const [info, setInfo] = useState<Pick<RepUpdate, 'angle' | 'phase' | 'status' | 'feedback'>>({
    angle: null,
    phase: 'up',
    status: 'no-pose',
    feedback: null,
  });

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarker: { close: () => void; detectForVideo: (v: HTMLVideoElement, t: number) => any } | null = null;
    let raf = 0;
    let lastFrame = 0;

    const speak = (text: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'vi-VN';
        window.speechSynthesis.speak(u);
      }
    };

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ camera. Hãy dùng HTTPS hoặc trình duyệt mới hơn.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        // Loaded lazily so the WASM runtime and model only cost bandwidth when the feature is used.
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);

        const create = (delegate: 'GPU' | 'CPU') =>
          vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numPoses: 1,
          });

        try {
          landmarker = await create('GPU');
        } catch {
          landmarker = await create('CPU');
        }
        if (cancelled) {
          landmarker.close();
          return;
        }

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const drawing = new vision.DrawingUtils(ctx);
        setStage('ready');

        const loop = (now: number) => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          if (now - lastFrame < 1000 / TARGET_FPS || video.readyState < 2) return;
          lastFrame = now;

          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const result = landmarker!.detectForVideo(video, now);
          const lms = result.landmarks?.[0];

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (lms) {
            drawing.drawConnectors(lms, vision.PoseLandmarker.POSE_CONNECTIONS, { color: '#6366f1', lineWidth: 3 });
            drawing.drawLandmarks(lms, { color: '#ffffff', fillColor: '#6366f1', radius: 3 });
          }

          const aspect = video.videoWidth / video.videoHeight || 4 / 3;
          const u = counterRef.current.update(lms, aspect, now);
          setInfo({ angle: u.angle, phase: u.phase, status: u.status, feedback: u.feedback });

          if (u.repCompleted && !finishedRef.current) {
            setReps(u.reps);
            speak(String(u.reps));
            if (u.reps >= targetReps) {
              finishedRef.current = true;
              speak('Hoàn thành set!');
              setTimeout(() => !cancelled && onFinish(u.reps), 1200);
            }
          }
        };
        raf = requestAnimationFrame(loop);
      } catch (e: any) {
        if (cancelled) return;
        console.error('Camera rep counter error:', e);
        const denied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError';
        setErrorMsg(
          denied
            ? 'Bạn chưa cấp quyền truy cập camera. Hãy cho phép camera trong trình duyệt rồi thử lại.'
            : e?.name === 'NotFoundError'
              ? 'Không tìm thấy camera trên thiết bị này.'
              : e?.message || 'Không khởi động được camera hoặc mô hình nhận diện.'
        );
        setStage('error');
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
      stream?.getTracks().forEach(t => t.stop());
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    counterRef.current.reset();
    finishedRef.current = false;
    setReps(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl glass-panel overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-brand/40">Đếm rep bằng camera (thử nghiệm)</p>
              <p className="font-bold truncate">{exerciseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3]">
          {/* Mirrored like a selfie view; both layers share the same transform so the skeleton stays aligned. */}
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" />

          {stage === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-xs font-mono uppercase tracking-widest text-brand/60">Đang tải mô hình nhận diện…</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
              <p className="text-sm text-red-300 max-w-sm">{errorMsg}</p>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-xs font-mono uppercase tracking-widest">
                Quay lại
              </button>
            </div>
          )}

          {stage === 'ready' && (
            <>
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
                <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand/50">Reps</p>
                  <p className="text-4xl font-black font-mono leading-none">
                    {reps}
                    <span className="text-lg text-brand/40"> / {targetReps}</span>
                  </p>
                </div>
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest',
                    info.status === 'tracking' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  )}
                >
                  {info.status === 'tracking' ? `${info.phase === 'down' ? 'Xuống' : 'Lên'} • ${Math.round(info.angle ?? 0)}°` : 'Chưa thấy người'}
                </div>
              </div>

              {info.feedback && (
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="inline-block px-4 py-2 rounded-xl bg-black/70 text-amber-300 text-sm font-bold">{info.feedback}</span>
                </div>
              )}

              {finishedRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-brand/50 leading-relaxed">
            {SETUP_HINT[kind]} Video chỉ được xử lý trên thiết bị của bạn, không được gửi đi.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-widest"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Đếm lại
            </button>
            <button
              onClick={() => onFinish(reps)}
              disabled={reps === 0}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-mono uppercase tracking-widest disabled:opacity-30"
            >
              Kết thúc set ({reps} reps)
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
