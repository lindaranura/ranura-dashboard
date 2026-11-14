import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  FolderOpen, 
  Search, 
  RefreshCw, 
  Plus, 
  ArrowLeft, 
  Send, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  File as FileIcon,
  Download, 
  Loader2, 
  Lock, 
  PlusCircle, 
  User, 
  Calendar, 
  Inbox,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, logout, getCachedToken } from '../lib/sheetsService';

interface WorkspaceHubProps {
  onAddLog: (source: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export default function WorkspaceHub({ onAddLog }: WorkspaceHubProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'gmail' | 'drive'>('gmail');

  // Gmail State
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [gmailSearch, setGmailSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  
  // Compose Email State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Drag and Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Feedback Notification State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize Auth Status
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
    
    // Attempt to grab any already active token
    const token = getCachedToken();
    if (token) {
      setGoogleToken(token);
    }
    
    return () => unsubscribe();
  }, []);

  // Auto-fetch data when token or tab changes
  useEffect(() => {
    if (googleToken) {
      if (activeSubTab === 'gmail') {
        fetchEmails();
      } else {
        fetchDriveFiles(currentFolderId);
      }
    }
  }, [googleToken, activeSubTab, currentFolderId]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Google Login & Logout Handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        onAddLog('system', 'success', `Google Workspace Connected: Akun ${res.user.email} berhasil terhubung.`);
        showFeedback('success', `Berhasil menghubungkan akun ${res.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      onAddLog('system', 'error', `Google Workspace Auth Gagal: ${err.message || err}`);
      showFeedback('error', `Gagal menghubungkan Google Account: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleGoogleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setEmails([]);
      setDriveFiles([]);
      setShowLogoutConfirm(false);
      onAddLog('system', 'warning', 'Google Workspace Terputus: Otorisasi akun dicabut.');
      showFeedback('success', 'Koneksi akun Google berhasil dicabut.');
    } catch (err: any) {
      console.error(err);
      showFeedback('error', 'Gagal memutus koneksi Google');
    }
  };

  // ------------------- GMAIL API CALLS -------------------
  const fetchEmails = async () => {
    if (!googleToken) return;
    setIsFetchingEmails(true);
    try {
      let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15';
      if (gmailSearch) {
        url += `&q=${encodeURIComponent(gmailSearch)}`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      
      if (!res.ok) {
        throw new Error(`Gmail API returned status ${res.status}`);
      }
      
      const data = await res.json();
      const rawMessages = data.messages || [];
      
      // Fetch details in parallel
      const detailedEmails = await Promise.all(
        rawMessages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${googleToken}` }
          });
          if (!detailRes.ok) return null;
          const detail = await detailRes.json();
          
          const headers = detail.payload.headers || [];
          const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
          
          return {
            id: detail.id,
            threadId: detail.threadId,
            from: fromHeader,
            subject: subjectHeader,
            date: dateHeader,
            snippet: detail.snippet || '',
            body: parseEmailBody(detail)
          };
        })
      );
      
      setEmails(detailedEmails.filter(Boolean) as GmailMessage[]);
    } catch (err: any) {
      console.error(err);
      onAddLog('system', 'error', `Gagal memuat Gmail: ${err.message || err}`);
    } finally {
      setIsFetchingEmails(false);
    }
  };

  const parseEmailBody = (messageDetail: any): string => {
    try {
      const payload = messageDetail.payload;
      if (!payload) return '';
      
      // If simple body
      if (payload.body && payload.body.data) {
        return decodeBase64(payload.body.data);
      }
      
      // If multipart
      if (payload.parts) {
        const textPart = findTextPart(payload.parts);
        if (textPart && textPart.body && textPart.body.data) {
          return decodeBase64(textPart.body.data);
        }
      }
      
      return messageDetail.snippet || '';
    } catch (e) {
      return messageDetail.snippet || '';
    }
  };

  const findTextPart = (parts: any[]): any => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return part;
      }
      if (part.parts) {
        const nested = findTextPart(part.parts);
        if (nested) return nested;
      }
    }
    return null;
  };

  const decodeBase64 = (data: string): string => {
    try {
      const clean = data.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(
        atob(clean)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken) return;
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showFeedback('error', 'Semua kolom email (Kepada, Subjek, dan Pesan) wajib diisi!');
      return;
    }

    setIsSendingEmail(true);
    try {
      const emailContent = [
        `To: ${composeTo}`,
        `Subject: ${composeSubject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        composeBody
      ].join('\r\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Gmail Send API error: ${errTxt}`);
      }

      onAddLog('system', 'success', `Email Terkirim: Berhasil mengirim email ke ${composeTo}.`);
      showFeedback('success', `Email berhasil dikirim ke ${composeTo}`);
      
      // Reset compose form
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setShowCompose(false);
      
      // Reload inbox
      fetchEmails();
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal mengirim email: ${err.message || err}`);
      onAddLog('system', 'error', `Gagal mengirim email: ${err.message || err}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ------------------- DRIVE API CALLS -------------------
  const fetchDriveFiles = async (folderId: string) => {
    if (!googleToken) return;
    setIsFetchingDrive(true);
    try {
      let q = `'${folderId}' in parents and trashed = false`;
      if (driveSearch) {
        q = `name contains '${driveSearch}' and trashed = false`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=40&fields=files(id,name,mimeType,modifiedTime,size)&q=${encodeURIComponent(q)}&orderBy=folder,name`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      
      if (!res.ok) {
        throw new Error(`Drive API returned status ${res.status}`);
      }
      
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      onAddLog('system', 'error', `Gagal memuat file Google Drive: ${err.message || err}`);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const metadata = {
        name: newFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: currentFolderId === 'root' ? [] : [currentFolderId]
      };

      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!res.ok) {
        throw new Error('Gagal membuat folder baru');
      }

      onAddLog('system', 'success', `Folder Baru Dibuat: "${newFolderName}" berhasil ditambahkan di Google Drive.`);
      showFeedback('success', `Folder "${newFolderName}" berhasil dibuat!`);
      setNewFolderName('');
      setShowCreateFolder(false);
      fetchDriveFiles(currentFolderId);
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal membuat folder: ${err.message || err}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!googleToken) return;
    setIsUploading(true);
    setUploadProgress(`Mengunggah "${file.name}"...`);
    
    try {
      const metadata = {
        name: file.name,
        parents: currentFolderId === 'root' ? [] : [currentFolderId]
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
        throw new Error('Gagal mengunggah file ke Google Drive');
      }

      onAddLog('system', 'success', `File Berhasil Diunggah: "${file.name}" sukses diunggah ke Google Drive.`);
      showFeedback('success', `File "${file.name}" berhasil diunggah!`);
      fetchDriveFiles(currentFolderId);
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal mengunggah file: ${err.message || err}`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Drag and Drop Handlers
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

  // Folder Navigation Handlers
  const handleFolderClick = (folderId: string, folderName: string) => {
    const newHistory = [...folderHistory, { id: folderId, name: folderName }];
    setFolderHistory(newHistory);
    setCurrentFolderId(folderId);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory[newHistory.length - 1].id);
  };

  // Formatting helpers
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderOpen className="h-5 w-5 text-blue-400 fill-blue-400/20" />;
    }
    if (mimeType.includes('image/')) {
      return <ImageIcon className="h-5 w-5 text-emerald-400" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'application/vnd.google-apps.spreadsheet') {
      return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileIcon className="h-5 w-5 text-rose-500" />;
    }
    if (mimeType.includes('document') || mimeType === 'application/vnd.google-apps.document') {
      return <FileText className="h-5 w-5 text-indigo-400" />;
    }
    return <FileIcon className="h-5 w-5 text-slate-400" />;
  };

  // If not authenticated, render login panel
  if (!googleToken) {
    return (
      <div id="workspace-hub-container" className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Google Workspace Hub</h1>
          <p className="text-sm text-slate-500">Hubungkan Gmail & Google Drive ke dalam Ranura Dashboard untuk kemudahan operasional toko.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12 shadow-sm flex flex-col items-center gap-6">
          <div className="p-4 bg-blue-50 rounded-full border border-blue-100 text-blue-600">
            <Lock className="h-10 w-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Otorisasi Akun Diperlukan</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Ranura Dashboard memerlukan izin dengan kredensial Google Anda untuk membaca inbox Gmail (layanan pelanggan) dan mengakses Google Drive (manajemen berkas & dokumen toko).
            </p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-all font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 bg-white p-0.5 rounded-full">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            <span className="text-sm font-sans font-medium">Hubungkan Akun Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="workspace-hub-container" className="p-8 max-w-7xl mx-auto space-y-6">
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
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
            <span className="font-medium">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md">Terhubung</span>
            <span className="text-slate-500 text-xs font-medium">{googleUser?.email}</span>
          </div>
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Workspace Hub</h1>
          <p className="text-sm text-slate-500">Kelola komunikasi Gmail pelanggan dan arsip Google Drive toko Anda langsung di satu dasbor.</p>
        </div>

        <button 
          onClick={handleGoogleLogout}
          className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer self-start sm:self-center shadow-sm"
        >
          Putus Hubungan Google
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Putus Koneksi Google Workspace?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sesi akun {googleUser?.email} akan diakhiri dan akses Gmail/Drive akan ditutup.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer"
                >
                  Ya, Putus Koneksi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('gmail')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'gmail' 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="h-4 w-4" />
            Kotak Masuk Gmail
          </button>
          <button
            onClick={() => setActiveSubTab('drive')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'drive' 
                ? 'border-blue-600 text-blue-600 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Ranura Cloud Drive
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          {activeSubTab === 'gmail' ? (
            <button 
              onClick={fetchEmails} 
              disabled={isFetchingEmails}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
              title="Refresh Gmail"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingEmails ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <button 
              onClick={() => fetchDriveFiles(currentFolderId)} 
              disabled={isFetchingDrive}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
              title="Refresh Drive"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingDrive ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'gmail' ? (
          <motion.div
            key="gmail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* List Section */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-[650px] shadow-sm">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={gmailSearch}
                    onChange={(e) => setGmailSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchEmails()}
                    placeholder="Cari email & pengirim..."
                    className="w-full bg-slate-50 text-slate-800 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <button
                  onClick={() => setShowCompose(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Compose
                </button>
              </div>

              {/* Email list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isFetchingEmails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-xs">Memuat email...</p>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Inbox className="h-10 w-10 opacity-40" />
                    <p className="text-xs">Tidak ada email yang ditemukan</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                        selectedEmail?.id === email.id
                          ? 'bg-blue-50/80 border-blue-300 text-slate-900 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-blue-600 truncate max-w-[150px]">{email.from}</span>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{formatDate(email.date)}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 truncate">{email.subject}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{email.snippet}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Email Detail Panel */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-[650px] shadow-sm overflow-hidden">
              {showCompose ? (
                /* Compose Mode */
                <form onSubmit={handleSendEmail} className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PlusCircle className="h-4 w-4 text-blue-600" />
                      Kirim Email Baru
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setShowCompose(false)}
                      className="text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-2 text-xs font-semibold text-slate-600">Kepada:</label>
                      <input
                        type="email"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        placeholder="pelanggan@domain.com"
                        required
                        className="col-span-10 bg-slate-50 text-slate-800 text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-2 text-xs font-semibold text-slate-600">Subjek:</label>
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="Tulis judul email..."
                        required
                        className="col-span-10 bg-slate-50 text-slate-800 text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-slate-600 mb-1.5">Isi Email:</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Tulis pesan lengkap Anda..."
                      required
                      className="flex-1 bg-slate-50 text-slate-800 text-xs rounded-xl border border-slate-200 p-4 focus:outline-none focus:border-blue-500 focus:bg-white resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompose(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Kirim Pesan
                    </button>
                  </div>
                </form>
              ) : selectedEmail ? (
                /* Detail Mode */
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div className="space-y-1 max-w-[85%]">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{selectedEmail.subject}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <User className="h-3 w-3" />
                          {selectedEmail.from}
                        </span>
                        <span className="hidden sm:inline text-slate-300">|</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDate(selectedEmail.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="p-1 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                      title="Tutup Detail"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-50 rounded-xl border border-slate-200 leading-relaxed text-xs text-slate-800 font-sans whitespace-pre-line custom-scrollbar">
                    {selectedEmail.body || selectedEmail.snippet}
                  </div>

                  {/* Quick Action: Reply */}
                  <div className="border-t border-slate-200 pt-4 flex gap-3">
                    <button
                      onClick={() => {
                        setComposeTo(selectedEmail.from.match(/<([^>]+)>/)?.[1] || selectedEmail.from);
                        setComposeSubject(`Re: ${selectedEmail.subject}`);
                        setComposeBody(`\n\n--- Pada ${formatDate(selectedEmail.date)}, ${selectedEmail.from} menulis:\n> ${selectedEmail.snippet}`);
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
                    >
                      <Send className="h-4 w-4 text-blue-100" />
                      Balas Email
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state detail */
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Mail className="h-12 w-12 opacity-30 animate-bounce" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-700">Detail Email Belum Terpilih</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mt-1 leading-relaxed">Pilih salah satu email di sebelah kiri untuk melihat isi pesan penuh atau klik Compose untuk mulai menulis.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* GOOGLE DRIVE PANEL */
          <motion.div
            key="drive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Control Column: Stats & Folder Creation & Upload */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Actions Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Operasi Drive</h3>
                
                {/* Upload drag drop */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50/50 text-blue-700' 
                      : 'border-slate-200 hover:border-blue-300 bg-slate-50/60 text-slate-500'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upload Berkas Toko</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Drag & drop di sini atau klik untuk browse</p>
                  </div>
                </div>

                {isUploading && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="truncate">{uploadProgress}</span>
                  </div>
                )}

                {/* Create Folder Trigger */}
                {showCreateFolder ? (
                  <form onSubmit={handleCreateFolder} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Buat Folder Baru</span>
                      <button 
                        type="button" 
                        onClick={() => setShowCreateFolder(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nama folder..."
                      required
                      className="w-full bg-white text-slate-800 text-xs rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateFolder(false)}
                        className="px-2.5 py-1 text-[10px] border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingFolder}
                        className="px-2.5 py-1 text-[10px] bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 shadow-sm"
                      >
                        {isCreatingFolder ? 'Memproses...' : 'Buat Folder'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4 text-blue-600" />
                    Buat Folder Baru
                  </button>
                )}
              </div>

              {/* Guide card */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Panduan Penggunaan Cloud Drive</h4>
                <ul className="text-[11px] text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Unggah file invoice (PDF), foto produk, dokumen SOP, atau berkas Excel.</li>
                  <li>Gunakan struktur folder rapi untuk mengarsipkan nota pembukuan & pengiriman.</li>
                  <li>Format spreadsheet terintegrasi langsung dengan modul sinkronisasi stok.</li>
                </ul>
              </div>
            </div>

            {/* Right Drive Files Table Column */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[650px] shadow-sm overflow-hidden">
              {/* Navigation Header / Breadcrumbs */}
              <div className="flex flex-col gap-3 mb-4 border-b border-slate-200 pb-4">
                {/* Search & Back */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {folderHistory.length > 1 && (
                      <button
                        onClick={() => handleBreadcrumbClick(folderHistory.length - 2)}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Kembali"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex items-center flex-wrap gap-1 text-xs">
                      {folderHistory.map((folder, idx) => (
                        <React.Fragment key={folder.id}>
                          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                          <button
                            onClick={() => handleBreadcrumbClick(idx)}
                            className={`font-semibold hover:text-blue-600 transition-all cursor-pointer ${
                              idx === folderHistory.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {folder.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="relative w-48 sm:w-64">
                    <span className="absolute left-2.5 top-2.5 text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchDriveFiles(currentFolderId)}
                      placeholder="Cari file drive..."
                      className="w-full bg-slate-50 text-slate-800 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Files Table */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {isFetchingDrive ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-xs">Memuat berkas drive...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <FolderOpen className="h-10 w-10 opacity-30 text-slate-400" />
                    <p className="text-xs">Folder ini kosong</p>
                  </div>
                ) : (
                  <div className="min-w-full overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="pb-2.5">Nama Berkas</th>
                          <th className="pb-2.5 hidden sm:table-cell">Modifikasi Terakhir</th>
                          <th className="pb-2.5 text-right hidden md:table-cell">Ukuran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {driveFiles.map((file) => {
                          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                          return (
                            <tr 
                              key={file.id}
                              className="group hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-3">
                                {isFolder ? (
                                  <button
                                    onClick={() => handleFolderClick(file.id, file.name)}
                                    className="flex items-center gap-3 text-slate-800 hover:text-blue-600 font-semibold transition-all text-left cursor-pointer"
                                  >
                                    {getFileIcon(file.mimeType)}
                                    <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-3 text-slate-700">
                                    {getFileIcon(file.mimeType)}
                                    <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-slate-500 hidden sm:table-cell font-mono text-[11px]">
                                {formatDate(file.modifiedTime)}
                              </td>
                              <td className="py-3 text-slate-500 text-right hidden md:table-cell font-mono text-[11px]">
                                {formatBytes(file.size)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
