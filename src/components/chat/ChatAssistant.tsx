import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setChatOpen } from '../../store/store';
import { cn } from '../../lib/utils';
import { chatWithAssistant } from '../../services/geminiService';

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  timestamp: string;
}

export const ChatAssistant: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.chatOpen);
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const appointments = useSelector((state: RootState) => state.appointments.list);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm PostureAI. How can I help with your health today?", isAi: true, timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
      {/* FAB */}
      <motion.button
        drag
        dragConstraints={{
          top: -window.innerHeight + 100,
          left: -window.innerWidth + 80,
          right: 0,
          bottom: 0,
        }}
        dragElastic={0.1}
        whileHover={{ scale: 1.1 }}
        whileDrag={{ scale: 1.2, cursor: 'grabbing', zIndex: 100 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => dispatch(setChatOpen(!isOpen))}
        className="fixed bottom-32 right-6 w-14 h-14 rounded-full bg-slate-900 text-white shadow-premium z-50 flex items-center justify-center overflow-hidden border border-white/20 touch-none"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Bot size={28} />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && messages.length > 0 && (
          <div className="absolute top-0 right-0 w-4 h-4 bg-red rounded-full border-2 border-white" />
        )}
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 h-[72vh] bg-white rounded-t-[32px] shadow-2xl z-[60] flex flex-col border-t border-border"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-[32px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">PostureAI</h3>
                  <div className="flex items-center gap-1.5 text-xs text-greenLight">
                    <div className="w-2 h-2 bg-greenLight rounded-full animate-pulse" />
                    Online · Score: {Math.round(posture.score)}% 🌟
                  </div>
                </div>
              </div>
              <button 
                onClick={() => dispatch(setChatOpen(false))}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg/30"
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
                    "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
                    msg.isAi ? "bg-green/10 text-green" : "bg-green text-white"
                  )}>
                    {msg.isAi ? <Bot size={16} /> : (user?.photo ? <img src={user.photo} className="w-full h-full rounded-full" /> : user?.name[0])}
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    msg.isAi 
                      ? "bg-white text-slate-800 rounded-bl-none border border-slate-100" 
                      : "bg-indigo-600 text-white rounded-br-none shadow-premium"
                  )}>
                    {msg.text}
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
