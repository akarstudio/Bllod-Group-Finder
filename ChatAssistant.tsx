
import React, { useState, useRef, useEffect } from 'react';
import { askBloodAssistant, ChatMessage } from '../services/gemini';
import { 
  Brain, 
  Trash2, 
  ClipboardCheck, 
  Lightbulb, 
  Stethoscope, 
  Send, 
  Loader2 
} from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Welcome to the BloodConnect Smart Assistant. I can help you prepare for your donation. Would you like to check if you're eligible to donate today?", sender: 'bot' }
  ]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const processResponse = async (userMsg: string) => {
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setIsTyping(true);

    const botRes = await askBloodAssistant(userMsg, chatHistory);
    const finalBotRes = botRes || "I'm currently unable to access my knowledge base. Please consult a local healthcare provider.";
    
    setMessages(prev => [...prev, { text: finalBotRes, sender: 'bot' }]);
    setChatHistory(prev => [
      ...prev,
      { role: 'user', parts: [{ text: userMsg }] },
      { role: 'model', parts: [{ text: finalBotRes }] }
    ]);
    
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setInput('');
    await processResponse(userMsg);
  };

  const clearChat = () => {
    setMessages([{ text: "History cleared. How else can I assist your blood donation journey today?", sender: 'bot' }]);
    setChatHistory([]);
  };

  const quickActions = [
    { text: "Eligibility", icon: ClipboardCheck, prompt: "I'd like to do an eligibility check. Please ask me the screening questions one by one." },
    { text: "Preparation", icon: Lightbulb, prompt: "What are some tips for a smooth donation experience?" },
    { text: "Recovery", icon: Stethoscope, prompt: "How should I recover after donating blood?" }
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[75vh] animate-fadeIn bg-white rounded-[3rem] shadow-2xl border border-slate-900 overflow-hidden">
      <div className="p-6 bg-rose-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="font-black text-lg leading-none">Health Assistant</h2>
            <p className="text-[10px] text-rose-100 font-bold uppercase tracking-widest mt-1">Powered by AI</p>
          </div>
        </div>
        <button onClick={clearChat} className="px-4 py-2 bg-rose-700/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-800 transition-colors flex items-center gap-2">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
              <div className={`px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                m.sender === 'user' 
                  ? 'bg-rose-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'
              }`}>
                {m.text}
              </div>
              <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">
                {m.sender === 'user' ? 'You' : 'Assistant'}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
             <div className="bg-white px-6 py-4 rounded-3xl rounded-tl-none border border-slate-100 text-slate-300">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button 
                key={idx} 
                onClick={() => processResponse(action.prompt)} 
                className="whitespace-nowrap bg-rose-50 text-rose-600 px-5 py-2.5 rounded-full text-[10px] font-black border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-2"
              >
                <Icon size={12} /> {action.text}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none focus:border-rose-600 transition-all placeholder:text-slate-300 shadow-inner"
            placeholder="Ask about eligibility, tips, or recovery..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
          />
          <button onClick={handleSend} disabled={isTyping || !input.trim()} className="bg-rose-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-100 active:scale-90 transition-all disabled:bg-slate-200 disabled:shadow-none">
            {isTyping ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
