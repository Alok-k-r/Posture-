import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, Sparkles, Brain, Cpu, Activity } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setChatOpen } from '../../store/store';
import { cn } from '../../lib/utils';
import { chatWithAssistant } from '../../services/geminiService';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  timestamp: string;
}

export const ChatAssistant: React.FC = () => {
  const dispatch = useDispatch();
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const isOpen = useSelector((state: RootState) => state.ui.chatOpen);
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const appointments = useSelector((state: RootState) => state.appointments.list);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm PostureAI. How can I help with your health today?", isAi: true, timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = startY - currentY; // positive indicates swipe up
    
    if (diffY > 50) {
      setIsFullScreen(true);
      setStartY(null);
    } else if (diffY < -50) {
      if (isFullScreen) {
        setIsFullScreen(false);
      } else {
        dispatch(setChatOpen(false));
      }
      setStartY(null);
    }
  };

  const handleTouchEnd = () => {
    setStartY(null);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const handleTriggerReport = (e: Event) => {
      const customEvent = e as CustomEvent;
      const reportText = customEvent.detail?.report || '';
      if (reportText) {
        dispatch(setChatOpen(true));
        
        const userMsg: Message = {
          id: Date.now().toString(),
          text: "Can you analyze my Local AI Biomechanical report and provide clinical suggestions?",
          isAi: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        const context = {
          userName: user?.name,
          posture: {
            currentAngle: posture.angle,
            score: posture.score,
          },
          appointments: appointments.map(a => ({
            doctor: a.doctorName,
            date: a.date,
            specialty: a.specialty
          })),
          localModelReport: reportText
        };

        chatWithAssistant("Analyze this detailed local biomechanical report: " + reportText, context)
          .then(response => {
            const aiMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: response,
              isAi: true,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);
          })
          .catch(err => console.error("Error analyzing local report:", err))
          .finally(() => setIsTyping(false));
      }
    };

    window.addEventListener('posturecare_trigger_ai_report', handleTriggerReport);
    return () => {
      window.removeEventListener('posturecare_trigger_ai_report', handleTriggerReport);
    };
  }, [user, posture, appointments, dispatch]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      isAi: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const context = {
        userName: user?.name,
        posture: {
          currentAngle: posture.angle,
          score: posture.score,
        },
        appointments: appointments.map(a => ({
          doctor: a.doctorName,
          date: a.date,
          specialty: a.specialty
        }))
      };

      const response = await chatWithAssistant(currentInput, context);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isAi: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Invisible container boundary to restrict FAB drag strictly inside the safe app frame */}
      <div 
        ref={dragConstraintsRef} 
        className="fixed inset-4 pointer-events-none z-50" 
        id="chat_fab_drag_constraints" 
      />

      {/* FAB */}
      <motion.button
        drag
        dragConstraints={dragConstraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        whileHover={{ scale: 1.08 }}
        whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 100 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => dispatch(setChatOpen(!isOpen))}
        className="fixed bottom-32 right-6 w-14 h-14 rounded-full bg-slate-950 text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] z-50 flex items-center justify-center border border-slate-800 touch-none transition-all duration-300 group"
      >
        <div className="relative z-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <X size={20} className="text-slate-400 stroke-[2]" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 45, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -45, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <Sparkles 
                  size={20} 
                  className="text-indigo-400 fill-indigo-400/10 stroke-[1.75] group-hover:text-amber-300 group-hover:fill-amber-300/10 transition-colors duration-300" 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isOpen && messages.length > 0 && (
          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-md animate-bounce" />
        )}
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-[60] flex flex-col border-t border-border transition-all duration-300 ease-out",
              isFullScreen ? "h-[100dvh] rounded-t-none" : "h-[72vh] rounded-t-[32px]"
            )}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-[32px] flex flex-col gap-3">
              {/* Swipe Handle Indicator */}
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="w-full pb-3 flex flex-col items-center justify-center cursor-row-resize select-none border-b border-white/5"
              >
                <div className="w-16 h-1.5 bg-white/25 rounded-full hover:bg-white/40 transition-colors" />
                <span className="text-[7.5px] font-black tracking-widest text-slate-300 uppercase mt-1">
                  {isFullScreen ? 'Swipe/Tap down to shrink' : 'Swipe/Tap up for full screen'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-2 shadow-lg shadow-indigo-500/20 shrink-0">
                    <Sparkles size={22} className="text-white fill-white/10" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg leading-tight">PostureAI</h3>
                    <div className="flex items-center gap-1.5 text-xs text-greenLight">
                      <div className="w-1.5 h-1.5 bg-greenLight rounded-full animate-pulse" />
                      Online · Score: {Math.round(posture.score)}% 🌟
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => dispatch(setChatOpen(false))}
                  className="p-2.5 bg-white/10 hover:bg-white/15 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg/30 flex flex-col"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex max-w-[85%] items-end gap-2",
                    msg.isAi ? "self-start" : "self-end flex-row-reverse ml-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center p-1.5",
                    msg.isAi ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm" : "bg-green text-white rounded-full"
                  )}>
                    {msg.isAi ? (
                      <Sparkles size={16} className="text-white fill-white/10" />
                    ) : (user?.photo ? <img src={user.photo} className="w-full h-full rounded-full" /> : (user?.name?.[0] || 'U'))}
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    msg.isAi 
                      ? "bg-white text-slate-800 rounded-bl-none border border-slate-100" 
                      : "bg-indigo-600 text-white rounded-br-none shadow-premium"
                  )}>
                    {msg.isAi ? (
                      <div className="prose text-xs leading-relaxed font-sans space-y-1.5 text-slate-800">
                        <Markdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider mt-3 mb-1 border-b border-slate-100 pb-0.5" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xs font-black text-indigo-600 uppercase tracking-wider mt-2 mb-0.5" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xs font-bold text-slate-800 mt-1.5 mb-0.5" {...props} />,
                            p: ({node, ...props}) => <p className="text-slate-600 leading-relaxed my-1" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1 space-y-0.5 text-slate-600" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-1 space-y-0.5 text-slate-600" {...props} />,
                            li: ({node, ...props}) => <li className="text-slate-600 leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-black text-slate-900" {...props} />,
                          }}
                        >
                          {msg.text}
                        </Markdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                    <div className={cn(
                      "text-[10px] mt-1 opacity-50",
                      msg.isAi ? "text-slate-500" : "text-white/70"
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2 items-center text-green/50 p-2">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                </div>
              )}
            </div>

            {/* Quick Questions */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap bg-white border-t border-border">
              {['How to fix posture?', 'Break timer tips', 'Yoga for back', 'Sitting position'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full border border-green/30 text-green text-xs font-medium hover:bg-green/5 whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-border flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                maxLength={50000}
                className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                disabled={!input.trim()}
                onClick={handleSend}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90",
                  input.trim() ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-slate-200 text-slate-400"
                )}
              >
                <Send size={18} className="translate-x-0.5 -translate-y-0.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
