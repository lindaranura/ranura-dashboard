import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music as AudioIcon, 
  FileText, 
  Search, 
  Upload, 
  Plus, 
  Download, 
  Link2, 
  ExternalLink, 
  RefreshCw, 
  X, 
  FolderOpen, 
  File as FileIcon, 
  Grid, 
  List, 
  Loader2, 
  Lock, 
  FolderHeart,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Megaphone,
  Layout,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, getCachedToken } from '../lib/sheetsService';
import { CalendarPost, Campaign } from '../types';
import { INITIAL_CALENDAR_POSTS, INITIAL_CAMPAIGNS } from '../data/mockData';

interface MediaCenterProps {
  onAddLog: (source: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  calendarPosts?: CalendarPost[];
  setCalendarPosts?: React.Dispatch<React.SetStateAction<CalendarPost[]>>;
  campaigns?: Campaign[];
  setCampaigns?: React.Dispatch<React.SetStateAction<Campaign[]>>;
}

interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

export default function MediaCenter({ 
  onAddLog, 
  calendarPosts: externalCalendarPosts, 
  setCalendarPosts: externalSetCalendarPosts,
  campaigns: externalCampaigns,
  setCampaigns: externalSetCampaigns
}: MediaCenterProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'drive' | 'calendar' | 'campaign'>('drive');

  // Media Center State
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Local state for calendar and campaigns if props are not provided
  const [localCalendarPosts, setLocalCalendarPosts] = useState<CalendarPost[]>(() => {
    const saved = localStorage.getItem('apex_calendarPosts');
    return saved ? JSON.parse(saved) : INITIAL_CALENDAR_POSTS;
  });
  
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('apex_campaigns');
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  const calendarPosts = externalCalendarPosts || localCalendarPosts;
  const setCalendarPosts = externalSetCalendarPosts || setLocalCalendarPosts;
  const campaigns = externalCampaigns || localCampaigns;
  const setCampaigns = externalSetCampaigns || setLocalCampaigns;

  useEffect(() => {
    if (!externalCalendarPosts) {
      localStorage.setItem('apex_calendarPosts', JSON.stringify(localCalendarPosts));
    }
  }, [localCalendarPosts, externalCalendarPosts]);

  useEffect(() => {
    if (!externalCampaigns) {
      localStorage.setItem('apex_campaigns', JSON.stringify(localCampaigns));
    }
  }, [localCampaigns, externalCampaigns]);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Init Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    
    const token = getCachedToken();
    if (token) {
      setGoogleToken(token);
    }
    
    return () => unsubscribe();
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Auto-fetch media files on auth success, filter change, or debounced search change
  useEffect(() => {
    if (googleToken) {
      fetchMediaFiles();
    }
  }, [googleToken, activeFilter, debouncedSearch]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        onAddLog('system', 'success', `Google Drive connected for Media Center.`);
        showFeedback('success', `Berhasil menghubungkan Media Center ke Google Drive!`);
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal menghubungkan Google Account: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchMediaFiles = async () => {
    if (!googleToken) return;
    setIsFetching(true);
    try {
      let mimeQuery = '';
      if (activeFilter === 'image') {
        mimeQuery = "and mimeType contains 'image/'";
      } else if (activeFilter === 'video') {
        mimeQuery = "and mimeType contains 'video/'";
      } else if (activeFilter === 'audio') {
        mimeQuery = "and mimeType contains 'audio/'";
      } else if (activeFilter === 'document') {
        mimeQuery = "and (mimeType contains 'document' or mimeType contains 'pdf' or mimeType contains 'spreadsheet' or mimeType = 'application/pdf')";
      } else {
        mimeQuery = "and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType contains 'audio/' or mimeType contains 'pdf' or mimeType contains 'document' or mimeType contains 'spreadsheet')";
      }

      let q = `trashed = false ${mimeQuery}`;
      if (debouncedSearch) {
        q += ` and name contains '${debouncedSearch}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,webContentLink,thumbnailLink)&q=${encodeURIComponent(q)}&orderBy=modifiedTime desc`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });

      if (!res.ok) {
        throw new Error(`Drive API returned status ${res.status}`);
      }

      const data = await res.json();
      setMediaFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      onAddLog('system', 'error', `Gagal memuat Media Center: ${err.message || err}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!googleToken) return;
    setIsUploading(true);
    setUploadProgress(`Mengunggah "${file.name}"...`);
    
    try {
      const metadata = {
        name: file.name
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah file media');
      }

      onAddLog('system', 'success', `Media Diunggah: "${file.name}" berhasil diunggah ke Google Drive Media Center.`);
      showFeedback('success', `Media "${file.name}" berhasil diunggah!`);
      fetchMediaFiles();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal mengunggah media: ${err.message || err}`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleCopyLink = (file: MediaFile) => {
    const link = file.webViewLink || '';
    if (link) {
      navigator.clipboard.writeText(link);
      showFeedback('success', 'Tautan media disalin ke clipboard!');
      onAddLog('system', 'info', `Menyalin tautan media: ${file.name}`);
    }
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return '-';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '-';
    if (num === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getMediaIcon = (mimeType: string) => {
    if (mimeType.includes('image/')) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    if (mimeType.includes('video/')) return <VideoIcon className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes('audio/')) return <AudioIcon className="h-5 w-5 text-amber-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-rose-500" />;
    return <FileIcon className="h-5 w-5 text-slate-400" />;
  };

  // Stats calculation
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const uploadedThisMonth = mediaFiles.filter(f => {
      const d = new Date(f.modifiedTime);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const scheduled = calendarPosts.filter(p => p.status === 'scheduled').length;
    const published = calendarPosts.filter(p => p.status === 'published').length;

    return {
      totalAssets: mediaFiles.length,
      uploadedThisMonth,
      scheduled,
      published
    };
  }, [mediaFiles, calendarPosts]);

  // Helper for calendar
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'shopee': return 'bg-orange-500';
      case 'tiktok': return 'bg-fuchsia-500';
      case 'instagram': return 'bg-purple-500';
      case 'facebook': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  // If not authenticated, render authorization screen
  if (!googleToken) {
    return (
      <div id="media-center-lock-screen" className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Media Center</h1>
          <p className="text-sm text-slate-500">Hubungkan Google Drive Anda untuk menampilkan dan mengelola galeri foto, aset media, dan dokumen pemasaran toko.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12 shadow-sm flex flex-col items-center gap-6">
          <div className="p-4 bg-emerald-100 rounded-full border border-emerald-200 text-emerald-600">
            <Lock className="h-10 w-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Sambungkan Google Drive</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Media Center membaca foto produk, video promosi, dan file brosur Anda dari Google Drive agar langsung siap digunakan dalam administrasi toko.
            </p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button w-full sm:w-auto bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-all font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            <span className="text-sm font-sans">Hubungkan Akun Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="media-center-dashboard" className="h-full overflow-y-auto p-6 space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-md ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md">Connected</span>
            <span className="text-slate-500 text-xs">{googleUser?.email}</span>
          </div>
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Media & Konten</h1>
          <p className="text-sm text-slate-500">Kelola aset media promosi, kalender konten, dan kampanye pemasaran.</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Aset</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalAssets}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Upload Bulan Ini</p>
            <p className="text-lg font-bold text-slate-900">{stats.uploadedThisMonth}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Postingan Terjadwal</p>
            <p className="text-lg font-bold text-slate-900">{stats.scheduled}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Konten Dipublikasi</p>
            <p className="text-lg font-bold text-slate-900">{stats.published}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'drive'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Media Google Drive
          </div>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'calendar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Kalender Konten
          </div>
        </button>
        <button
          onClick={() => setActiveTab('campaign')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'campaign'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Kampanye
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'drive' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Drag-drop Box and category filters */}
            <div className="lg:col-span-3 space-y-5">
              {/* Draggable File Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 h-44 bg-white ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <Upload className={`h-7 w-7 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-700">Drop Media Di Sini</p>
                  <p className="text-[10px] text-slate-500">Atau klik untuk memilih berkas</p>
                </div>
              </div>

              {isUploading && (
                <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl flex items-center gap-3 text-xs text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="truncate text-[11px] font-medium">{uploadProgress}</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
              />

              {/* Categorization Navigation / Filters */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase px-2 mb-3 tracking-wider">Kategori Media</h3>
                
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderHeart className="h-4 w-4" />
                    Semua Media
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('image')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === 'image' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Foto & Gambar
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('video')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === 'video' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4" />
                    Video Promosi
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('audio')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === 'audio' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AudioIcon className="h-4 w-4" />
                    Audio & Musik
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('document')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === 'document' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dokumen & Brosur
                  </span>
                </button>
              </div>
            </div>

            {/* Right Side: Media Display Board */}
            <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col min-h-[600px] shadow-sm overflow-hidden">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama berkas media..."
                    className="w-full bg-slate-50 text-slate-900 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* View Mode & Refresh */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchMediaFiles} 
                    disabled={isFetching}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 text-slate-500 transition-all bg-white"
                    title="Refresh Media"
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  </button>

                  <div className="h-4 w-px bg-slate-200" />

                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Grid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Media Items Canvas */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {isFetching ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-xs font-medium">Memuat berkas media...</p>
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 text-center py-12">
                    <div className="p-4 bg-slate-50 rounded-full">
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700">Tidak Ada File Media Terpilih</p>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">Belum ada file media yang sesuai filter, atau Anda belum mengunggah file media promosi apa pun.</p>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid Layout Mode */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {mediaFiles.map((file) => {
                      const isImage = file.mimeType.includes('image/');
                      const hasError = imageErrors[file.id];
                      return (
                        <div 
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-2.5 transition-all cursor-pointer flex flex-col justify-between h-[180px] relative overflow-hidden"
                        >
                          {/* Thumbnail Container */}
                          <div className="h-28 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                            {isImage && file.thumbnailLink && !hasError ? (
                              <img 
                                src={file.thumbnailLink.replace('=s220', '=s400')} 
                                alt={file.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                onError={() => setImageErrors(prev => ({...prev, [file.id]: true}))}
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                {hasError ? (
                                  <>
                                    <ImageIcon className="h-6 w-6 text-slate-300" />
                                    <span className="text-[9px] text-slate-400 font-medium">Gambar rusak</span>
                                  </>
                                ) : (
                                  getMediaIcon(file.mimeType)
                                )}
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                              <span className="p-2 bg-white rounded-lg text-slate-700 shadow-sm hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye className="h-4 w-4" />
                              </span>
                            </div>
                          </div>

                          {/* Info bar */}
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-slate-800 truncate pr-2" title={file.name}>{file.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                              <span>{formatBytes(file.size)}</span>
                              <span className="text-[9px] font-sans font-medium px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 max-w-[65px] truncate">
                                {file.mimeType.split('/')[1] || 'doc'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List Layout Mode */
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                          <th className="p-3">Nama Berkas</th>
                          <th className="p-3">Jenis Media</th>
                          <th className="p-3">Ukuran</th>
                          <th className="p-3">Tanggal Modifikasi</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mediaFiles.map((file) => (
                          <tr 
                            key={file.id} 
                            className="hover:bg-slate-50 transition-all cursor-pointer"
                            onClick={() => setSelectedFile(file)}
                          >
                            <td className="p-3 font-medium text-slate-800 flex items-center gap-3 truncate max-w-xs">
                              {getMediaIcon(file.mimeType)}
                              <span className="truncate">{file.name}</span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{file.mimeType}</td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{formatBytes(file.size)}</td>
                            <td className="p-3 text-slate-500">{new Date(file.modifiedTime).toLocaleDateString('id-ID')}</td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleCopyLink(file)}
                                  className="p-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-all bg-white shadow-sm"
                                  title="Salin Tautan"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </button>
                                {file.webContentLink && (
                                  <a
                                    href={file.webContentLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-all bg-white shadow-sm"
                                    title="Download"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Kalender Konten {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Tambah Postingan
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-white p-2 min-h-[100px]" />;
                
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === todayDateStr;
                const posts = calendarPosts.filter(p => p.date.startsWith(dateStr));
                
                return (
                  <div key={i} className={`bg-white p-2 min-h-[120px] transition-colors hover:bg-slate-50 cursor-pointer border-t border-slate-100 ${isToday ? 'ring-inset ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                        {date.getDate()}
                      </span>
                      {posts.length > 0 && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {posts.length} post
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      {posts.slice(0, 3).map(post => (
                        <div key={post.id} className="text-[10px] leading-tight flex items-start gap-1 p-1 rounded hover:bg-slate-100 transition-colors">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${getPlatformColor(post.platform)}`} />
                          <div className="truncate text-slate-700 font-medium">{post.time} {post.title}</div>
                        </div>
                      ))}
                      {posts.length > 3 && (
                        <div className="text-[10px] text-slate-500 pl-2.5 font-medium">+{posts.length - 3} lainnya</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 items-center text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Legenda Platform:</span>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Shopee</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" /> TikTok</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Instagram</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Facebook</div>
            </div>
          </div>
        )}

        {activeTab === 'campaign' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Daftar Kampanye</h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Buat Kampanye
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(camp => {
                const progress = camp.postCount > 0 ? Math.round((camp.publishedCount / camp.postCount) * 100) : 0;
                return (
                  <div key={camp.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-900 text-base">{camp.name}</h4>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        camp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                        camp.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {camp.status === 'active' ? 'Aktif' : camp.status === 'completed' ? 'Selesai' : 'Draf'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-5 line-clamp-2">{camp.description}</p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {new Date(camp.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} - {new Date(camp.endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">Progress Konten</span>
                          <span className="font-bold text-slate-900">{camp.publishedCount} / {camp.postCount}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full screen View Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-3xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1 max-w-[85%]">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                    {selectedFile.mimeType}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 truncate leading-relaxed">{selectedFile.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Center Display */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-[250px] max-h-[400px] flex items-center justify-center overflow-hidden">
                {selectedFile.mimeType.includes('image/') && selectedFile.thumbnailLink && !imageErrors[selectedFile.id] ? (
                  <img 
                    src={selectedFile.thumbnailLink.replace('=s220', '=s800')} 
                    alt={selectedFile.name}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                    onError={() => setImageErrors(prev => ({...prev, [selectedFile.id]: true}))}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    {imageErrors[selectedFile.id] ? (
                      <ImageIcon className="h-12 w-12 text-slate-300" />
                    ) : (
                      getMediaIcon(selectedFile.mimeType)
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-700">{imageErrors[selectedFile.id] ? 'Gagal memuat gambar' : selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Format berkas didukung oleh Google Drive Viewer</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Metadata & Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-slate-100 pt-4">
                <div className="space-y-1.5 text-slate-500">
                  <p>Ukuran: <span className="font-mono font-medium text-slate-800">{formatBytes(selectedFile.size)}</span></p>
                  <p>Terakhir Diubah: <span className="font-medium text-slate-800">{new Date(selectedFile.modifiedTime).toLocaleString('id-ID')}</span></p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleCopyLink(selectedFile)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <Link2 className="h-4 w-4" />
                    Salin Link
                  </button>

                  {selectedFile.webContentLink && (
                    <a
                      href={selectedFile.webContentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-semibold shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  )}

                  {selectedFile.webViewLink && (
                    <a
                      href={selectedFile.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-xs font-semibold shadow-sm border border-slate-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Drive Viewer
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
