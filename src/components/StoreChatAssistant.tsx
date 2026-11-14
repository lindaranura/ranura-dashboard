import React, { useState, useEffect, useRef } from 'react';
import { Bot, PlayCircle, Loader2, Send, CheckCircle2, User, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StoreChatAssistant(props: any) {
  const [localThreads, setLocalThreads] = useState<any[]>(() => {
    return props.threads && props.threads.length > 0 ? props.threads : [];
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    return props.threads && props.threads.length > 0 ? props.threads[0].id : null;
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [manualReply, setManualReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Sync with props if updated externally
  useEffect(() => {
    if (props.threads && props.threads.length > 0 && localThreads.length === 0) {
      setLocalThreads(props.threads);
      if (!activeThreadId) {
        setActiveThreadId(props.threads[0].id);
      }
    }
  }, [props.threads]);

  // Auto scroll chat to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadId, localThreads]);

  // Polling backend if available, fallback gracefully if not
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch('/api/chats');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setLocalThreads(data);
            if (!activeThreadId) setActiveThreadId(data[0].id);
            if (props.setThreads) props.setThreads(data);
          }
        }
      } catch (err) {
        // Backend offline, keep props or current state without breaking
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 4000);
    return () => clearInterval(interval);
  }, [activeThreadId]);

  const handleSimulateWebhook = async () => {
    const customPrompt = window.prompt(
      "Masukkan pertanyaan/pesan pembeli untuk direspon oleh Gemini AI:", 
      "Halo min, baju renang anak M ready? bahannya apa ya? aman ga buat berenang?"
    );
    if (!customPrompt) return; // User cancelled

    setIsSimulating(true);
    showNotification('info', 'Menghubungkan ke Engine Gemini AI (Port 3000)...');
    
    const simulatedCustomer = "Budi (Simulasi Live)";
    const simulatedProduct = "Baju Renang & Rompi";
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      // Call the REAL Gemini Chat Engine on server.ts (Port 3000)
      const res = await fetch('http://localhost:3000/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: customPrompt,
          history: [] // Fresh conversation
        })
      });

      if (!res.ok) throw new Error('Backend HTTP error');
      
      const data = await res.json();
      const aiReplyText = data.reply || "Maaf, sistem AI sedang offline.";

      const newThreadId = `thr-sim-${Date.now()}`;
      const newThread = {
        id: newThreadId,
        customerName: simulatedCustomer,
        platform: "shopee" as const,
        productName: simulatedProduct,
        lastMessage: aiReplyText,
        timestamp: nowTime,
        unread: false,
        messages: [
          {
            id: `m-user-${Date.now()}`,
            sender: 'user',
            text: customPrompt,
            timestamp: nowTime
          },
          {
            id: `m-ai-${Date.now()}`,
            sender: 'assistant',
            text: aiReplyText,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            isAiResponse: true
          }
        ]
      };

      setLocalThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThreadId);
      if (props.setThreads) {
        props.setThreads((prev: any[]) => [newThread, ...prev]);
      }
      showNotification('success', 'Gemini AI berhasil merespon pesan!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Gagal menghubungi Server Gemini (Port 3000). Pastikan server menyala.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSendManualReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReply.trim() || !activeThreadId) return;

    setIsSendingReply(true);
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const replyMessage = {
      id: `manual-${Date.now()}`,
      sender: 'assistant',
      text: manualReply.trim(),
      timestamp: nowTime,
      isAiResponse: false
    };

    setLocalThreads(prev => {
      const updated = prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            lastMessage: replyMessage.text,
            messages: [...(t.messages || []), replyMessage]
          };
        }
        return t;
      });
      if (props.setThreads) props.setThreads(updated);
      return updated;
    });

    // Attempt to post to backend if active
    fetch(`/api/chats/${activeThreadId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: manualReply.trim() })
    }).catch(() => {});

    setManualReply('');
    setIsSendingReply(false);
    showNotification('success', 'Balasan manual Customer Service berhasil dikirim!');
  };

  const handleThreadClick = (threadId: string) => { setActiveThreadId(threadId); setLocalThreads(prev => { const updated = prev.map(t => t.id === threadId ? { ...t, unread: false } : t); if (props.setThreads) props.setThreads(updated); return updated; }); };

  const activeThread = localThreads.find(t => t.id === activeThreadId);

  return (
    <div className="h-full flex flex-col p-8 bg-[#f8fafc] space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-md ${
              statusNotification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {statusNotification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Sparkles className="h-5 w-5 text-blue-600" />}
            <span className="font-medium">{statusNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-fuchsia-500 rounded-full animate-ping"></span>
              AI Autopilot Aktif
            </span>
            <span className="text-slate-400 text-xs font-medium">Gemini 3.5 Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Chat Toko AI Autopilot</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pantau dan kelola interaksi obrolan calon pembeli dari Shopee & TikTok secara real-time.</p>
        </div>

        <button 
          onClick={handleSimulateWebhook}
          disabled={isSimulating}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {isSimulating ? 'Mengirim Simulasi...' : 'Simulasikan Chat Masuk'}
        </button>
      </div>

      {/* Main Chat Shell */}
      <div className="flex-1 flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[550px]">
        {/* Left: Chat Inbox List */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Inbox Pelanggan</h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {localThreads.length} Thread
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {localThreads.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Bot className="h-8 w-8 mx-auto mb-2 text-slate-300 animate-bounce" />
                <p className="text-xs font-medium">Layar monitor standby.</p>
                <p className="text-[11px] text-slate-400 mt-1">Klik tombol &ldquo;Simulasikan Chat Masuk&rdquo; di kanan atas untuk uji coba respon AI.</p>
              </div>
            ) : (
              localThreads.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleThreadClick(t.id)} 
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    activeThreadId === t.id 
                      ? 'bg-blue-50/80 border border-blue-300 shadow-sm' 
                      : 'bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{t.customerName}</p>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">{t.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate leading-relaxed">{t.lastMessage}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`px-1.5 py-0.2 text-[8px] font-bold rounded uppercase ${
                      t.platform === 'shopee' ? 'bg-orange-100 text-orange-700' : 'bg-fuchsia-100 text-fuchsia-700'
                    }`}>
                      {t.platform || 'SHOPEE'}
                    </span>
                    {t.productName && (
                      <span className="text-[9px] text-slate-400 truncate max-w-[140px] font-mono">
                        {t.productName}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        <div className="flex-1 flex flex-col bg-slate-50/40">
          {activeThread ? (
            <>
              {/* Active Header */}
              <div className="p-4 border-b border-slate-200 bg-white shadow-xs z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{activeThread.customerName}</h3>
                    <p className="text-[11px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                      <span>Produk Ditanyakan:</span>
                      <span className="font-semibold text-slate-700">{activeThread.productName}</span>
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-xs">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  AI AUTO-REPLY AKTIF
                </span>
              </div>
              
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {(activeThread.messages || []).map((m: any) => (
                  <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[78%] p-3.5 text-xs shadow-xs ${
                      m.sender === 'user' 
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs' 
                        : m.sender === 'system' 
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl' 
                        : 'bg-blue-600 text-white rounded-2xl rounded-tr-xs'
                    }`}>
                      {m.isAiResponse && (
                        <div className="text-[9px] font-bold text-blue-200 mb-1.5 flex items-center gap-1 border-b border-blue-500/50 pb-1 uppercase tracking-wider">
                          <Bot className="h-3 w-3"/> Auto-Replied by Gemini AI
                        </div>
                      )}
                      {!m.isAiResponse && m.sender === 'assistant' && (
                        <div className="text-[9px] font-bold text-blue-200 mb-1.5 flex items-center gap-1 border-b border-blue-500/50 pb-1 uppercase tracking-wider">
                          <User className="h-3 w-3"/> Customer Service (Manual)
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">{m.timestamp}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Human Intervention Reply Input Bar */}
              <form onSubmit={handleSendManualReply} className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5">
                <input 
                  type="text"
                  value={manualReply}
                  onChange={(e) => setManualReply(e.target.value)}
                  placeholder="Ketik balasan manual Customer Service untuk mengambil alih percakapan..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!manualReply.trim() || isSendingReply}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Kirim Balasan</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Bot className="h-12 w-12 mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Pusat Pengawasan Chat Toko</p>
              <p className="text-xs text-slate-400 mt-1">Pilih salah satu percakapan di kolom kiri untuk melihat riwayat atau membalas secara manual.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}