import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Package, 
  Activity,
  LogOut,
  LogIn,
  Bot,
  FolderOpen,
  Home,
  ImageIcon,
  Wallet,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  integrationStatus: {
    shopee: boolean;
    tiktok: boolean;
    telegram: boolean;
  };
  googleUser: any;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  pendingOrdersCount?: number;
  unreadChatCount?: number;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  integrationStatus,
  googleUser,
  isLoggingIn,
  onLogin,
  onLogout,
  pendingOrdersCount = 0,
  unreadChatCount = 0
}: SidebarProps) {
  const isAllConnected = integrationStatus.shopee && integrationStatus.tiktok && integrationStatus.telegram;
  const anyConnected = integrationStatus.shopee || integrationStatus.tiktok || integrationStatus.telegram;

  const menuItems = [
    { id: 'beranda', label: 'Beranda', icon: Home, desc: 'Ringkasan & status dashboard' },
    { 
      id: 'orders', 
      label: 'Master Data Order', 
      icon: Database, 
      desc: 'Shopee, TikTok & Direct',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'bg-blue-500 text-white'
    },
    { id: 'inventory', label: 'Stok & Pergudangan', icon: Package, desc: 'Zona rak, mutasi & QC' },
    { id: 'finance', label: 'Keuangan & Laba', icon: Wallet, desc: 'Faktur, arus kas & anggaran' },
    { id: 'dashboard', label: 'Analitik Real-Time', icon: LayoutDashboard, desc: 'Performa penjualan & grafik' },
    { 
      id: 'chat', 
      label: 'Chat Toko AI', 
      icon: Bot, 
      desc: 'Asisten Gemini Pro 24 jam',
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    { id: 'mediacenter', label: 'Media & Kampanye', icon: ImageIcon, desc: 'Kalender konten & berkas' },
    { id: 'workspace', label: 'Workspace Hub', icon: FolderOpen, desc: 'Akses Gmail & Google Drive' },
    { id: 'integrations', label: 'Integrasi Saluran', icon: Activity, desc: 'API Marketplace & Webhook' }
  ];

  return (
    <aside id="sidebar-container" className="w-80 bg-[#0f172a] border-r border-slate-800 flex flex-col h-screen text-slate-300 select-none shadow-2xl z-20">
      {/* Brand Header */}
      <div id="sidebar-header" className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="font-sans font-black text-lg tracking-wider text-white flex items-center gap-1">
              RANURA<span className="text-blue-400 font-extrabold">DASHBOARD</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">PT Ranura Berkah Abadi • v3.2</p>
          </div>
        </div>
      </div>

      {/* Connection Quick Stats */}
      <div id="connection-quick-stats" className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium text-[11px]">Koneksi Marketplace</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-slate-300">
            <span className={`h-2 w-2 rounded-full ${isAllConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : anyConnected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'} `}></span>
            {isAllConnected ? 'LENGKAP TERSINKRON' : anyConnected ? 'AKTIF SEBAGIAN' : 'OFFLINE'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <button 
            type="button"
            onClick={() => setActiveTab('integrations')}
            title="Shopee Seller Center - Klik untuk kelola integrasi"
            className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] ${integrationStatus.shopee ? 'bg-orange-950/40 border-orange-500/40 text-orange-400' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0">
              <path d="M19 6h-1.5c0-3.03-2.47-5.5-5.5-5.5S6.5 2.97 6.5 6H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-4.5c1.93 0 3.5 1.57 3.5 3.5h-7c0-1.93 1.57-3.5 3.5-3.5zm7 16H5V8h14v11z" fill="currentColor"/>
              <path d="M12 9.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0 3.8c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3z" fill="currentColor"/>
            </svg>
            <span className="font-bold text-[8.5px] tracking-wider">SHOPEE</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('integrations')}
            title="TikTok Seller Center - Klik untuk kelola integrasi"
            className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] ${integrationStatus.tiktok ? 'bg-fuchsia-950/40 border-fuchsia-500/40 text-fuchsia-400' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.68-4.06-1.54-.49-.36-.92-.79-1.28-1.29v7.1c-.05 2.11-.91 4.19-2.51 5.56-1.63 1.44-3.95 2.12-6.11 1.83-2.19-.28-4.23-1.58-5.27-3.52C2.08 16.03 1.8 13.62 2.52 11.4c.7-2.12 2.45-3.87 4.62-4.52 1.09-.33 2.25-.38 3.37-.17v4.11c-.81-.25-1.72-.2-2.48.24-.76.44-1.32 1.2-1.51 2.06-.28 1.16-.02 2.44.73 3.33.72.88 1.88 1.31 3.02 1.15 1.12-.14 2.12-.91 2.49-1.97.16-.48.22-.99.2-1.5V.02z" />
            </svg>
            <span className="font-bold text-[8.5px] tracking-wider">TIKTOK</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('integrations')}
            title="Telegram Bot - Klik untuk kelola integrasi"
            className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] ${integrationStatus.telegram ? 'bg-sky-950/40 border-sky-500/40 text-sky-400' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span className="font-bold text-[8.5px] tracking-wider">TELEGRAM</span>
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav id="sidebar-nav" className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Menu Operasional</span>
        </div>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all relative group cursor-pointer ${
                isActive 
                  ? 'text-white bg-blue-600 shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-1 w-1 h-6 bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/60'}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold leading-none">{item.label}</p>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] mt-1 truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{item.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div id="sidebar-footer" className="p-3.5 border-t border-slate-800/80 bg-slate-900/30 flex flex-col gap-2">
        {googleUser ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              {googleUser.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-lg border border-slate-700 object-cover" 
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 text-xs font-bold font-mono">
                  {(googleUser.displayName || googleUser.email || 'G').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {googleUser.displayName || 'Google Workspace'}
                  </p>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {googleUser.email}
                </p>
              </div>
            </div>
            <button
              id="sidebar-logout-button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
            >
              <LogOut className="h-3 w-3" />
              <span>Putus Google Workspace</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 p-2 bg-slate-900/30 rounded-xl border border-slate-800/60">
              <div className="h-9 w-9 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 text-xs font-mono">
                OFF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">Sesi Lokal (Offline)</p>
                <p className="text-[10px] text-slate-400 truncate">Google Belum Terhubung</p>
              </div>
            </div>
            <button
              id="sidebar-login-button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Hubungkan Google Workspace'}</span>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Sistem Aktif
          </span>
          <span className="font-mono text-slate-400">Depok, ID</span>
        </div>
      </div>
    </aside>
  );
}

