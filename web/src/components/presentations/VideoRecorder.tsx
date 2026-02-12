import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '../../pages/presentations/types';
import { 
  X, 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Square,
  Play,
  Pause,
  Download,
  Trash2,
  Monitor,
  Camera,
  Settings,
  ChevronDown,
  Clock,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  Film
} from 'lucide-react';

interface VideoRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  slides: Slide[];
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
}

export default function VideoRecorder({
  isOpen,
  onClose,
  slides,
  currentSlideIndex,
  onSlideChange
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<'camera' | 'screen' | 'both'>('both');
  const [cameraPosition, setCameraPosition] = useState<'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft'>('bottomRight');
  const [showSettings, setShowSettings] = useState(false);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);
  
  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: micEnabled
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError('Не удалось получить доступ к камере. Проверьте разрешения.');
      console.error('Camera error:', err);
    }
  }, [cameraEnabled, micEnabled]);
  
  useEffect(() => {
    if (isOpen && (recordingMode === 'camera' || recordingMode === 'both')) {
      initCamera();
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, initCamera]);
  
  // Start recording
  const startRecording = async () => {
    try {
      let combinedStream: MediaStream;
      
      if (recordingMode === 'screen' || recordingMode === 'both') {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: true
        });
        setScreenStream(screen);
        
        if (recordingMode === 'both' && stream) {
          // Combine screen and camera
          const tracks = [
            ...screen.getVideoTracks(),
            ...(stream.getAudioTracks() || [])
          ];
          combinedStream = new MediaStream(tracks);
        } else {
          combinedStream = screen;
        }
      } else {
        combinedStream = stream!;
      }
      
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        chunksRef.current = [];
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
    } catch (err) {
      setError('Не удалось начать запись. Попробуйте снова.');
      console.error('Recording error:', err);
    }
  };
  
  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      screenStream?.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  };
  
  // Download video
  const downloadVideo = () => {
    if (recordedVideo) {
      const a = document.createElement('a');
      a.href = recordedVideo;
      a.download = `presentation-${new Date().toISOString().slice(0,10)}.webm`;
      a.click();
    }
  };
  
  // Delete recorded video
  const deleteRecording = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
      setRecordedVideo(null);
      setRecordingTime(0);
    }
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle camera
  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled(!cameraEnabled);
  };
  
  // Toggle mic
  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-6xl max-h-[95vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-border-primary bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Film className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Запись презентации</h2>
                <p className="text-sm text-text-muted">Как в Canva, но лучше 🚀</p>
              </div>
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-mono font-bold">{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Main Content */}
          <div className="flex h-[calc(95vh-140px)]">
            {/* Preview Area */}
            <div className="flex-1 p-4 relative">
              {recordedVideo ? (
                // Recorded Video Preview
                <div className="h-full flex flex-col">
                  <video
                    src={recordedVideo}
                    controls
                    className="flex-1 rounded-xl bg-black object-contain"
                  />
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={downloadVideo}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all"
                    >
                      <Download size={18} />
                      Скачать видео
                    </button>
                    <button
                      onClick={deleteRecording}
                      className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium flex items-center gap-2 hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 size={18} />
                      Удалить
                    </button>
                  </div>
                </div>
              ) : (
                // Live Preview
                <div className="h-full flex flex-col">
                  {/* Slide Preview */}
                  <div className="flex-1 rounded-xl bg-background-tertiary overflow-hidden relative">
                    {slides[currentSlideIndex] && (
                      <div
                        className="w-full h-full p-8"
                        style={{ backgroundColor: slides[currentSlideIndex].background?.value || '#1a1a2e' }}
                      >
                        <h2 className="text-3xl font-bold text-white mb-4">
                          {slides[currentSlideIndex].title}
                        </h2>
                        <p className="text-lg text-white/80">
                          {slides[currentSlideIndex].content}
                        </p>
                      </div>
                    )}
                    
                    {/* Camera overlay */}
                    {cameraEnabled && recordingMode !== 'screen' && (
                      <div
                        className={`absolute w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl ${
                          cameraPosition === 'bottomRight' ? 'bottom-4 right-4' :
                          cameraPosition === 'bottomLeft' ? 'bottom-4 left-4' :
                          cameraPosition === 'topRight' ? 'top-4 right-4' :
                          'top-4 left-4'
                        }`}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Slide navigation */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <button
                        onClick={() => onSlideChange(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                        className="w-10 h-10 rounded-lg bg-black/50 text-white flex items-center justify-center disabled:opacity-50 hover:bg-black/70 transition-colors"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <span className="px-4 py-2 rounded-lg bg-black/50 text-white text-sm font-medium">
                        {currentSlideIndex + 1} / {slides.length}
                      </span>
                      <button
                        onClick={() => onSlideChange(Math.min(slides.length - 1, currentSlideIndex + 1))}
                        disabled={currentSlideIndex === slides.length - 1}
                        className="w-10 h-10 rounded-lg bg-black/50 text-white flex items-center justify-center disabled:opacity-50 hover:bg-black/70 transition-colors"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Error message */}
                  {error && (
                    <div className="mt-2 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Controls Sidebar */}
            <div className="w-80 border-l border-border-primary p-4 overflow-y-auto">
              {!recordedVideo && (
                <>
                  {/* Recording Mode */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-text-primary mb-3">Режим записи</h3>
                    <div className="space-y-2">
                      {[
                        { id: 'camera', label: 'Только камера', icon: Camera, desc: 'Записывает вас' },
                        { id: 'screen', label: 'Только экран', icon: Monitor, desc: 'Записывает слайды' },
                        { id: 'both', label: 'Камера + Экран', icon: Maximize2, desc: 'Профессионально' },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setRecordingMode(mode.id as 'camera' | 'screen' | 'both')}
                          className={`w-full p-3 rounded-xl text-left transition-colors ${
                            recordingMode === mode.id
                              ? 'bg-accent-primary/20 border border-accent-primary'
                              : 'bg-background-tertiary border border-transparent hover:border-border-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <mode.icon size={18} className={recordingMode === mode.id ? 'text-accent-primary' : 'text-text-muted'} />
                            <div>
                              <p className={`text-sm font-medium ${recordingMode === mode.id ? 'text-accent-primary' : 'text-text-primary'}`}>
                                {mode.label}
                              </p>
                              <p className="text-xs text-text-muted">{mode.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Camera Controls */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-text-primary mb-3">Устройства</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={toggleCamera}
                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                          cameraEnabled
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-background-tertiary text-text-muted border border-transparent'
                        }`}
                      >
                        {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                        <span className="text-sm">Камера</span>
                      </button>
                      <button
                        onClick={toggleMic}
                        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                          micEnabled
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-background-tertiary text-text-muted border border-transparent'
                        }`}
                      >
                        {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                        <span className="text-sm">Микрофон</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Camera Position */}
                  {recordingMode === 'both' && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-text-primary mb-3">Позиция камеры</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'topLeft', label: '↖ Верх-лево' },
                          { id: 'topRight', label: '↗ Верх-право' },
                          { id: 'bottomLeft', label: '↙ Низ-лево' },
                          { id: 'bottomRight', label: '↘ Низ-право' },
                        ].map(pos => (
                          <button
                            key={pos.id}
                            onClick={() => setCameraPosition(pos.id as 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft')}
                            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                              cameraPosition === pos.id
                                ? 'bg-accent-primary text-white'
                                : 'bg-background-tertiary text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Tips */}
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <h4 className="text-sm font-medium text-text-primary mb-2">💡 Советы</h4>
                    <ul className="text-xs text-text-muted space-y-1">
                      <li>• Используйте стрелки для навигации</li>
                      <li>• Говорите чётко и не торопитесь</li>
                      <li>• Делайте паузы между слайдами</li>
                      <li>• Проверьте освещение для камеры</li>
                    </ul>
                  </div>
                  
                  {/* Recording Controls */}
                  <div className="space-y-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-red-500/30 transition-all text-lg"
                      >
                        <Circle size={24} fill="white" />
                        Начать запись
                      </button>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <button
                            onClick={togglePause}
                            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                              isPaused
                                ? 'bg-green-500 text-white'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            }`}
                          >
                            {isPaused ? <Play size={18} /> : <Pause size={18} />}
                            {isPaused ? 'Продолжить' : 'Пауза'}
                          </button>
                          <button
                            onClick={stopRecording}
                            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
                          >
                            <Square size={18} fill="white" />
                            Стоп
                          </button>
                        </div>
                        <p className="text-center text-sm text-text-muted">
                          {isPaused ? '⏸️ Запись на паузе' : '🔴 Идёт запись...'}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-border-primary bg-background-secondary/50">
            <p className="text-sm text-text-muted text-center">
              🎬 Запись презентаций — функция уровня Canva Pro. В Science AI — бесплатно!
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
