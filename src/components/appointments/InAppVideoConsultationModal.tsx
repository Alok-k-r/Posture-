import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  MessageSquare, 
  Activity, 
  Lock, 
  Send, 
  X, 
  ChevronLeft, 
  Volume2, 
  PictureInPicture2,
  ShieldCheck
} from 'lucide-react';
import { 
  RootState, 
  minimizeCall, 
  endCall, 
  toggleCallMic, 
  toggleCallCamera, 
  toggleCallTelemetry,
  addChatMessage 
} from '../../store/store';
import { LocalModelService } from '../../services/localModelService';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export const InAppVideoConsultationModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isActive, isMinimized, appointment, isMicMuted, isCameraOff, showTelemetryHUD, callStartedAt } = useSelector(
    (state: RootState) => state.call
  );
  const posture = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);
  const localMetrics = LocalModelService.getMetrics();

  // In-call local states
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const userVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize patient camera
  useEffect(() => {
    if (!isActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setElapsedSeconds(0);
      return;
    }

    let streamInstance: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamInstance = stream;
        setCameraStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn('Camera access optional or blocked in preview:', err);
      });

    const startTimestamp = callStartedAt ? new Date(callStartedAt).getTime() : Date.now();
    const updateElapsed = () => {
      const now = Date.now();
      const secs = Math.max(0, Math.floor((now - startTimestamp) / 1000));
      setElapsedSeconds(secs);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    const speakingTimer = setInterval(() => {
      setIsDoctorSpeaking(prev => !prev);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(speakingTimer);
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, callStartedAt]);

  // Sync camera track with isCameraOff
  useEffect(() => {
    if (cameraStream) {
      const videoTrack = cameraStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOff;
      }
    }
  }, [cameraStream, isCameraOff]);

  // Sync mic track with isMicMuted
  useEffect(() => {
    if (cameraStream) {
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicMuted;
      }
    }
  }, [cameraStream, isMicMuted]);

  // Handle system PiP when user changes tabs / windows
  const handleSystemPiP = async () => {
    try {
      if (userVideoRef.current && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await userVideoRef.current.requestPictureInPicture();
        }
      } else {
        dispatch(minimizeCall());
        toast('Floating in-app screen enabled. You can continue using PostureCare.');
      }
    } catch {
      dispatch(minimizeCall());
    }
  };

  const handleSendInCallMessage = () => {
    if (!chatInput.trim() || !appointment) return;
    const text = chatInput.trim();
    setChatInput('');

    dispatch(addChatMessage({
      appointmentId: appointment.id,
      message: {
        id: 'incall-' + Date.now(),
        sender: 'patient',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }));

    setTimeout(() => {
      dispatch(addChatMessage({
        appointmentId: appointment.id,
        message: {
          id: 'incall-doc-' + Date.now(),
          sender: 'doctor',
          text: `I received your message. Your thoracic alignment is tracking well on my monitor.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      }));
    }, 1400);
  };

  const handleEndCall = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    dispatch(endCall());
    toast.success('Consultation session concluded.');
  };

  const handleMinimize = () => {
    dispatch(minimizeCall());
    toast('Consultation active in background. Floating mini-player active.', {
      icon: '📹'
    });
  };

  if (!isActive || isMinimized || !appointment) return null;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const messages = appointment.chatMessages || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] w-screen h-screen bg-slate-50 flex flex-col select-none overflow-hidden font-sans text-slate-900">
        
        {/* ========================================================= */}
        {/* 1. FULLSCREEN MAIN VIDEO STAGE (SOOTHING WHITE / IOS THEME) */}
        {/* ========================================================= */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-gradient-to-b from-slate-100/90 via-white to-slate-50 flex items-center justify-center">
          
          {/* Ambient soft background lighting */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-50/70 rounded-full blur-3xl pointer-events-none" />

          {/* MAIN DOCTOR CONSULTATION CARD (IOS FACETIME AESTHETIC) */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-md w-full">
            
            {/* Doctor Portrait Avatar */}
            <div className="relative">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white border-4 border-white shadow-2xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-indigo-600 ring-1 ring-slate-200/80">
                {appointment.doctorName.replace('Dr. ', '').charAt(0)}
              </div>

              {isDoctorSpeaking && (
                <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white animate-pulse">
                  <Volume2 size={16} />
                </div>
              )}
            </div>

            {/* Doctor Info */}
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {appointment.doctorName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {appointment.specialty}
              </p>
              <p className="text-[11px] text-indigo-600 font-bold">
                {appointment.hospital}
              </p>
            </div>

            {/* iOS Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200 shadow-sm text-xs text-slate-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FaceTime Clinical HD</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. PICTURE-IN-PICTURE (PiP) PATIENT SELF-VIEW CAMERA     */}
          {/* ========================================================= */}
          <div className="absolute top-20 right-4 sm:top-20 sm:right-6 z-30">
            <div className="relative w-28 sm:w-36 aspect-[3/4] rounded-3xl overflow-hidden bg-slate-200 border-2 border-white shadow-2xl transition-all group">
              {cameraStream && !isCameraOff ? (
                <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-700 font-bold text-sm mb-1">
                    {user?.name?.charAt(0) || 'P'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Camera off</span>
                </div>
              )}

              {/* Bottom self tag */}
              <div className="absolute bottom-2 left-2.5 text-[10px] font-bold text-slate-800 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-full shadow-xs">
                You
              </div>

              {isMicMuted && (
                <div className="absolute top-2 right-2 p-1 rounded-full bg-rose-500 text-white shadow-xs">
                  <MicOff size={10} />
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. SOOTHING LIGHT IOS TOP HEADER                          */}
          {/* ========================================================= */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-white/90 via-white/50 to-transparent">
            {/* Back / Minimize to Floating Screen */}
            <button
              onClick={handleMinimize}
              className="px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 shadow-xs transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold"
              title="Minimize & float video call"
            >
              <ChevronLeft size={18} />
              <span>Back & Float</span>
            </button>

            {/* Doctor Status & Encrypted Badge */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                <Lock size={12} className="text-emerald-600" />
                <span>Encrypted Telehealth</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {timerFormatted}
              </div>
            </div>

            {/* Biofeedback & PiP Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSystemPiP}
                className="p-2 rounded-full bg-white/80 text-slate-600 border border-slate-200 hover:text-slate-900 shadow-xs transition-all active:scale-95"
                title="Picture in Picture Mode"
              >
                <PictureInPicture2 size={16} />
              </button>

              <button
                onClick={() => dispatch(toggleCallTelemetry())}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95",
                  showTelemetryHUD
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "bg-white/80 text-slate-500 border border-slate-200 hover:text-slate-800"
                )}
              >
                <Activity size={14} className={showTelemetryHUD ? "text-indigo-600" : ""} />
                <span className="hidden sm:inline">Posture HUD</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. CLEAN SOOTHING WHITE POSTURE BIOFEEDBACK HUD           */}
          {/* ========================================================= */}
          {showTelemetryHUD && (
            <div className="absolute top-20 left-4 sm:left-6 z-20">
              <div className="p-3.5 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 text-slate-900 space-y-2 shadow-soft max-w-[210px] sm:max-w-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-1">
                  <span>Spine Telemetry</span>
                  <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    50Hz Live
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block">Pitch</span>
                    <span className="font-black text-slate-800">{Math.round(posture.angle || 84)}°</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block">Load</span>
                    <span className="font-black text-slate-800">{localMetrics.cervicalSpineLoadHansrajLbs || 14.2}#</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block">Score</span>
                    <span className="font-black text-indigo-600">{posture.score || 92}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. IN-CALL CHAT DRAWER (IOS IMESSAGE WHITE STYLE)         */}
          {/* ========================================================= */}
          {showChatDrawer && (
            <div className="absolute inset-y-0 right-0 z-40 w-full sm:w-88 bg-white border-l border-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {appointment.doctorName.replace('Dr. ', '').charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{appointment.doctorName}</h4>
                    <p className="text-[10px] text-slate-400">In-Call Messages</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
                {messages.map((m) => {
                  const isUser = m.sender === 'patient';
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col max-w-[80%] p-3 rounded-2xl text-xs shadow-xs",
                        isUser
                          ? "ml-auto bg-indigo-600 text-white rounded-br-none"
                          : "mr-auto bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                      )}
                    >
                      <p className="leading-relaxed font-medium">{m.text}</p>
                      <span className={cn(
                        "text-[9px] self-end mt-1 font-semibold",
                        isUser ? "text-indigo-200" : "text-slate-400"
                      )}>
                        {m.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Input Bar */}
              <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInCallMessage()}
                  placeholder="Message doctor..."
                  className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={handleSendInCallMessage}
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full transition-all shadow-sm active:scale-95"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. FLOATING IOS FROSTED WHITE BOTTOM CALL CONTROLS DOCK   */}
          {/* ========================================================= */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center px-4">
            <div className="flex items-center gap-3.5 sm:gap-5 bg-white/95 backdrop-blur-2xl px-6 py-3 rounded-full border border-slate-200 shadow-2xl">
              
              {/* 1. Camera Toggle */}
              <button
                onClick={() => dispatch(toggleCallCamera())}
                className={cn(
                  "p-3.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs",
                  isCameraOff
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? <VideoOff size={19} /> : <Video size={19} />}
              </button>

              {/* 2. Microphone Toggle */}
              <button
                onClick={() => dispatch(toggleCallMic())}
                className={cn(
                  "p-3.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs",
                  isMicMuted
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              {/* 3. In-Call Chat Drawer Toggle */}
              <button
                onClick={() => setShowChatDrawer(!showChatDrawer)}
                className={cn(
                  "p-3.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs",
                  showChatDrawer
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
                title="In-call chat"
              >
                <MessageSquare size={19} />
              </button>

              {/* 4. End Call Button (Iconic iOS Red Circle) */}
              <button
                onClick={handleEndCall}
                className="p-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-all active:scale-95 shadow-lg cursor-pointer"
                title="End Consultation"
              >
                <PhoneOff size={19} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </AnimatePresence>
  );
};
