import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Donor, BloodGroup, AuditLog, EmergencyAlert, AlertSeverity, AdminUser, AdminRole, AlertTemplate } from '../types';
import { db } from '../services/db';
import { BLOOD_GROUPS, ALERT_TEMPLATES } from '../constants';
import EmergencyBanner from './EmergencyBanner';
import { 
  ShieldCheck, 
  Activity, 
  Users, 
  Trash2, 
  Lock, 
  Unlock, 
  Search, 
  Zap, 
  History,
  RefreshCw,
  LogOut,
  X,
  MapPin,
  Save,
  AlertTriangle,
  Megaphone,
  Plus,
  Download,
  Upload,
  Info,
  CircleSlash,
  ChevronRight,
  UserX,
  ShieldAlert,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Filter,
  Eye,
  Radar,
  Heart,
  Phone,
  Settings2,
  ArrowUpDown,
  FileText,
  Database,
  FileSpreadsheet,
  Briefcase,
  Building,
  ClipboardList,
  Binary,
  HardDriveDownload,
  Terminal,
  Layers,
  FileSearch,
  Check,
  Split,
  BoxSelect,
  FileWarning,
  DatabaseBackup,
  Stethoscope,
  Scan,
  ShieldQuestion,
  Wand2,
  Cpu,
  ArrowRight,
  CircleArrowLeft,
  UserCog,
  Shield,
  UserPlus,
  Square,
  CheckSquare,
  MinusCircle,
  TableProperties,
  Key,
  Fingerprint,
  Loader2,
  ChevronDown,
  Clock,
  Send,
  ChevronLeft,
  TallyMarks,
  Waves,
  GanttChart
} from 'lucide-react';

interface AdminPanelProps {
  donors: Donor[];
  currentAdmin: AdminUser;
  onRefresh: () => void;
  onLogout: () => void;
}

type SortKey = 'name' | 'bloodGroup' | 'createdAt' | 'availability';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'All' | 'Active' | 'Blocked' | 'Verified' | 'Unverified' | 'Available' | 'Duplicates' | 'Incomplete';
type PanelTab = 'overview' | 'donors' | 'broadcast' | 'management' | 'logs' | 'admins';
type BulkActionType = 'VERIFY' | 'BLOCK' | 'UNBLOCK' | 'DELETE';

interface ValidationIssue {
  row: number;
  field: string;
  issue: string;
  severity: 'Warning' | 'Error';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ donors = [], currentAdmin, onRefresh, onLogout }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('All');
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [donorToView, setDonorToView] = useState<Donor | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  
  // Broadcast State
  const [broadcastDraft, setBroadcastDraft] = useState<Omit<EmergencyAlert, 'id' | 'updatedAt'>>({
    isActive: true,
    severity: 'Urgent',
    bloodGroup: 'All',
    hospitalName: '',
    message: ''
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionToConfirm, setBulkActionToConfirm] = useState<{ type: BulkActionType; count: number } | null>(null);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Admin Management State
  const [isManagingAdmin, setIsManagingAdmin] = useState<AdminUser | Partial<AdminUser> | null>(null);
  const [adminForm, setAdminForm] = useState<Partial<AdminUser>>({ username: '', password: '', role: AdminRole.VIEWER });

  // RBAC Helpers
  const isSuperAdmin = currentAdmin.role === AdminRole.SUPER_ADMIN;
  const isEditor = currentAdmin.role === AdminRole.EDITOR;
  const isViewer = currentAdmin.role === AdminRole.VIEWER;
  const canManage = isSuperAdmin || isEditor;

  // Advanced Management State
  const [importPreview, setImportPreview] = useState<{
    donors: Donor[];
    fileName: string;
    globalWarnings: ValidationIssue[];
  } | null>(null);
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [healthReport, setHealthReport] = useState<{
    duplicates: string[];
    incomplete: string[];
    unverified: number;
    totalNodes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'logs') setAuditLogs(db.getAuditLogs());
    if (activeTab === 'broadcast') setEmergencyAlerts(db.getEmergencyAlerts());
    if (activeTab === 'management' || selectedStatus === 'Duplicates' || selectedStatus === 'Incomplete') runHealthCheck();
    if (activeTab === 'admins' && isSuperAdmin) setAdminUsers(db.getAdminUsers());
  }, [activeTab, donors, isSuperAdmin, selectedStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, selectedStatus, bloodFilter, itemsPerPage]);

  const stats = useMemo(() => {
    const total = donors.length;
    const available = donors.filter(d => d.availability === 'Available' && !d.isBlocked).length;
    const blocked = donors.filter(d => d.isBlocked).length;
    const verified = donors.filter(d => d.verificationStatus === 'Verified').length;
    const groupDist = (BLOOD_GROUPS || []).reduce((acc, bg) => {
      acc[bg] = donors.filter(d => d.bloodGroup === bg && !d.isBlocked).length;
      return acc;
    }, {} as Record<string, number>);
    return { total, available, blocked, verified, groupDist };
  }, [donors]);

  // Broadcast specific analytics
  const targetReachCount = useMemo(() => {
    if (broadcastDraft.bloodGroup === 'All') return stats.available;
    return donors.filter(d => d.bloodGroup === broadcastDraft.bloodGroup && d.availability === 'Available' && !d.isBlocked).length;
  }, [broadcastDraft.bloodGroup, stats, donors]);

  const runHealthCheck = () => {
    const seenPhones = new Map<string, string>();
    const duplicates: string[] = [];
    const incomplete: string[] = [];
    let unverified = 0;

    donors.forEach(d => {
      const phone = String(d.phone || '');
      if (phone && seenPhones.has(phone)) {
        duplicates.push(d.id);
        const originalId = seenPhones.get(phone);
        if (originalId && !duplicates.includes(originalId)) duplicates.push(originalId);
      }
      if (phone) seenPhones.set(phone, d.id);
      
      if (!d.bloodGroup || !phone || !d.address || (d.name || '').length < 3) incomplete.push(d.id);
      if (d.verificationStatus !== 'Verified') unverified++;
    });

    setHealthReport({ duplicates, incomplete, unverified, totalNodes: donors.length });
  };

  const processedDonors = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const filtered = donors.filter(d => {
      if (!d) return false;
      const name = String(d.name || '').toLowerCase();
      const phone = String(d.phone || '').toLowerCase();
      const loginId = String(d.loginId || '').toLowerCase();
      
      const matchesSearch = name.includes(term) || 
                          phone.includes(term) || 
                          loginId.includes(term);
      
      let matchesStatus = true;
      if (selectedStatus === 'Blocked') matchesStatus = !!d.isBlocked;
      else if (selectedStatus === 'Active') matchesStatus = !d.isBlocked;
      else if (selectedStatus === 'Verified') matchesStatus = d.verificationStatus === 'Verified';
      else if (selectedStatus === 'Unverified') matchesStatus = d.verificationStatus === 'Unverified';
      else if (selectedStatus === 'Available') matchesStatus = d.availability === 'Available';
      else if (selectedStatus === 'Duplicates') matchesStatus = (healthReport?.duplicates || []).includes(d.id);
      else if (selectedStatus === 'Incomplete') matchesStatus = (healthReport?.incomplete || []).includes(d.id);

      const matchesBlood = bloodFilter === 'All' ? true : d.bloodGroup === bloodFilter;
      return matchesSearch && matchesStatus && matchesBlood;
    });

    return filtered.sort((a, b) => {
      const valA = String((a as any)[sortKey] || '').toLowerCase();
      const valB = String((b as any)[sortKey] || '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [donors, searchTerm, selectedStatus, bloodFilter, sortKey, sortDirection, healthReport]);

  const paginatedDonors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedDonors.slice(start, start + itemsPerPage);
  }, [processedDonors, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedDonors.length / itemsPerPage);

  // Sliding window pagination logic
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const toggleSelectAll = () => {
    const currentIds = new Set(paginatedDonors.map(d => d.id));
    const allPaginatedSelected = paginatedDonors.length > 0 && paginatedDonors.every(d => selectedIds.has(d.id));

    const next = new Set(selectedIds);
    if (allPaginatedSelected) {
      currentIds.forEach(id => next.delete(id));
    } else {
      currentIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const executeBulkAction = async (action: BulkActionType | 'EXPORT') => {
    if (selectedIds.size === 0) return;
    
    setIsBulkExecuting(true);
    await new Promise(r => setTimeout(r, 600));

    if (action === 'DELETE') {
        const remaining = donors.filter(d => !selectedIds.has(d.id));
        db.saveDonors(remaining);
    } else if (action === 'EXPORT') {
        const selectedDonors = donors.filter(d => selectedIds.has(d.id));
        const data = JSON.stringify(selectedDonors, null, 2);
        downloadFile(data, 'json', `bulk_export_${selectedIds.size}_nodes`);
    } else {
        const updates = donors.map(d => {
            if (!selectedIds.has(d.id)) return d;
            if (action === 'VERIFY') return { ...d, verificationStatus: 'Verified' as const };
            if (action === 'BLOCK') return { ...d, isBlocked: true };
            if (action === 'UNBLOCK') return { ...d, isBlocked: false };
            return d;
        });
        db.saveDonors(updates);
    }

    db.addAuditLog({ 
        action: `BULK_${action}`, 
        details: `Executed ${action} protocol on ${selectedIds.size} nodes.`, 
        adminUsername: currentAdmin.username 
    });

    setIsBulkExecuting(false);
    setBulkActionToConfirm(null);
    setSelectedIds(new Set());
    onRefresh();
  };

  const CSV_COLUMNS = [
    { label: 'ID', key: 'id' },
    { label: 'User ID', key: 'loginId' },
    { label: 'Password', key: 'password' },
    { label: 'Name', key: 'name' },
    { label: 'Age', key: 'age' },
    { label: 'Gender', key: 'gender' },
    { label: 'Occupation', key: 'occupation' },
    { label: 'Designation', key: 'designation' },
    { label: 'Department', key: 'department' },
    { label: 'Phone Number', key: 'phone' },
    { label: 'Blood Group', key: 'bloodGroup' },
    { label: 'Address', key: 'address' },
    { label: 'Availability', key: 'availability' },
    { label: 'Verified Status', key: 'verificationStatus' },
    { label: 'Last Donation Date', key: 'lastDonationDate' },
    { label: 'Blocked', key: 'isBlocked' },
    { label: 'Reports', key: 'reports' },
    { label: 'Created At', key: 'createdAt' },
    { label: 'Internal Notes', key: 'internalNotes' },
    { label: 'Access Type', key: 'userType' }
  ];

  const handleDownloadNode = (donor: Donor) => {
    const data = JSON.stringify(donor, null, 2);
    downloadFile(data, 'json', `donor_dossier_${donor.loginId}`);
    db.addAuditLog({ 
      action: 'SINGLE_NODE_EXPORT', 
      details: `Exported dossier for ${donor.name} (${donor.loginId}).`, 
      adminUsername: currentAdmin.username 
    });
  };

  const handleDownloadTemplate = () => {
    const headers = CSV_COLUMNS.map(c => c.label).join(',');
    const example = CSV_COLUMNS.map(c => {
      if (c.key === 'bloodGroup') return 'O+';
      if (c.key === 'age') return '28';
      if (c.key === 'isBlocked') return 'false';
      if (c.key === 'reports') return '0';
      if (c.key === 'gender') return 'Male';
      if (c.key === 'availability') return 'Available';
      if (c.key === 'verificationStatus') return 'Verified';
      if (c.key === 'lastDonationDate') return '2023-12-25';
      if (c.key === 'loginId') return 'BDC-ID5522';
      if (c.key === 'password') return 'SECRET123';
      if (c.key === 'userType') return 'Donor';
      return `Sample ${c.label}`;
    }).join(',');
    downloadFile(`${headers}\n${example}`, 'csv', 'blood_donor_connect_template');
  };

  const handleExportCSV = () => {
    if (donors.length === 0) return;
    const headers = CSV_COLUMNS.map(c => c.label).join(',');
    const rows = donors.map(donor => {
      return CSV_COLUMNS.map(col => {
        const val = (donor as any)[col.key];
        const stringVal = val === null || val === undefined ? '' : String(val);
        const escaped = stringVal.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(',');
    });
    
    downloadFile(`${headers}\n${rows.join('\n')}`, 'csv', `registry_export_${new Date().toISOString().split('T')[0]}`);
    db.addAuditLog({ 
      action: 'BULK_CSV_EXPORT', 
      details: `Exported ${donors.length} records to CSV.`, 
      adminUsername: currentAdmin.username 
    });
  };

  const downloadFile = (content: string, ext: string, filename: string) => {
    const blob = new Blob([content], { type: ext === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const executeBulkCommand = async (command: 'VERIFY_ALL' | 'RESET_AVAILABILITY') => {
    if (!isSuperAdmin) return;
    if (!confirm(`Confirm Global Protocol: ${command.replace('_', ' ')}?`)) return;
    
    const updates = donors.map(d => {
      if (command === 'VERIFY_ALL') return { ...d, verificationStatus: 'Verified' as const };
      if (command === 'RESET_AVAILABILITY') return { ...d, availability: 'Not Available' as const };
      return d;
    });
    
    db.saveDonors(updates);
    db.addAuditLog({ 
      action: `GLOBAL_${command}`, 
      details: `Executed global ${command} protocol.`, 
      adminUsername: currentAdmin.username 
    });
    onRefresh();
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(donors, null, 2);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(data, 'json', `registry_backup_${date}`);
    db.addAuditLog({ 
      action: 'GLOBAL_JSON_EXPORT', 
      details: 'Full registry backup exported as JSON.', 
      adminUsername: currentAdmin.username 
    });
  };

  const analyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("File structure invalid: Missing headers.");

      const splitCSVLine = (line: string) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        result.push(cur.trim());
        return result;
      };

      const fileHeaders = splitCSVLine(lines[0]);
      const parsedDonors: Donor[] = [];
      const globalWarnings: ValidationIssue[] = [];

      const labelToKey: Record<string, string> = {};
      CSV_COLUMNS.forEach(c => labelToKey[c.label] = c.key);
      
      for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i]);
        const obj: any = {};
        
        fileHeaders.forEach((label, idx) => {
          const key = labelToKey[label];
          if (key) {
            let val = values[idx] || '';
            if (key === 'age' || key === 'reports') obj[key] = parseInt(val) || 0;
            else if (key === 'isBlocked') obj[key] = String(val).toLowerCase() === 'true';
            else obj[key] = val;
          }
        });

        if (obj.name && obj.bloodGroup) {
          if (!(BLOOD_GROUPS || []).includes(obj.bloodGroup as any)) {
            globalWarnings.push({ row: i, field: 'bloodGroup', issue: `Unsupported blood group: ${obj.bloodGroup}`, severity: 'Error' });
          }
          if (obj.age && (obj.age < 18 || obj.age > 65)) {
            globalWarnings.push({ row: i, field: 'age', issue: `Age (${obj.age}) outside 18-65 range`, severity: 'Warning' });
          }
          
          if (!obj.id) obj.id = Math.random().toString(36).substring(2, 11);
          if (!obj.createdAt) obj.createdAt = new Date().toISOString();
          if (!obj.loginId) obj.loginId = `IMP-${Math.floor(1000 + Math.random() * 9000)}`;
          if (!obj.password) obj.password = Math.random().toString(36).substring(2, 8).toUpperCase();
          if (!obj.availability) obj.availability = 'Available';
          if (!obj.verificationStatus) obj.verificationStatus = 'Unverified';
          if (!obj.userType) obj.userType = 'Donor';
          
          parsedDonors.push(obj as Donor);
        }
      }

      setImportPreview({ donors: parsedDonors, fileName: file.name, globalWarnings });
    } catch (err: any) {
      alert(`Terminal Error: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const commitImport = () => {
    if (!importPreview || !canManage) return;
    let finalRegistry: Donor[];

    if (isMirrorMode && isSuperAdmin) {
      finalRegistry = [...importPreview.donors];
    } else {
      const currentDonors = [...donors];
      const existingMap = new Map(currentDonors.map(d => [d.id, d]));
      importPreview.donors.forEach(newDonor => {
        const existing = existingMap.get(newDonor.id);
        existingMap.set(newDonor.id, { ...existing, ...newDonor });
      });
      finalRegistry = Array.from(existingMap.values());
    }

    db.saveDonors(finalRegistry);
    db.addAuditLog({ 
      action: isMirrorMode ? 'REGISTRY_MIRROR' : 'BULK_IMPORT', 
      details: `${isMirrorMode ? 'Registry mirrored from file.' : `Imported/Merged ${importPreview.donors.length} nodes.`}`, 
      adminUsername: currentAdmin.username 
    });
    
    setImportPreview(null);
    setIsMirrorMode(false);
    onRefresh();
  };

  const removeFromImport = (index: number) => {
    if (!importPreview) return;
    const nextDonors = [...importPreview.donors];
    nextDonors.splice(index, 1);
    setImportPreview({ ...importPreview, donors: nextDonors });
  };

  const handleToggleVerify = async (donor: Donor) => {
    if (!canManage) return;
    const nextStatus = donor.verificationStatus === 'Verified' ? 'Unverified' : 'Verified';
    await db.updateDonor(donor.id, { verificationStatus: nextStatus as any });
    onRefresh();
  };

  const handleToggleBlock = async (donor: Donor) => {
    if (!canManage) return;
    const nextState = !donor.isBlocked;
    await db.updateDonor(donor.id, { isBlocked: nextState });
    onRefresh();
  };

  const handleSaveAdmin = () => {
    if (!adminForm.username || !adminForm.password) return;
    if (isManagingAdmin && (isManagingAdmin as AdminUser).id) {
      db.updateAdminUser((isManagingAdmin as AdminUser).id, adminForm);
    } else {
      db.addAdminUser(adminForm as Omit<AdminUser, 'id' | 'createdAt'>);
    }
    setAdminUsers(db.getAdminUsers());
    setIsManagingAdmin(null);
    setAdminForm({ username: '', password: '', role: AdminRole.VIEWER });
  };

  const handleDeleteAdmin = (id: string) => {
    if (id === currentAdmin.id) return;
    if (confirm("Permanently disconnect this administrator node?")) {
      db.deleteAdminUser(id);
      setAdminUsers(db.getAdminUsers());
    }
  };

  const handleDispatchBroadcast = async () => {
    if (!broadcastDraft.hospitalName || !broadcastDraft.message) return;
    setIsBroadcasting(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate propagation
    db.addEmergencyAlert(broadcastDraft);
    db.addAuditLog({ 
      action: 'BROADCAST_DISPATCH', 
      details: `Dispatched ${broadcastDraft.severity} signal for ${broadcastDraft.bloodGroup} @ ${broadcastDraft.hospitalName}. Reach: ${targetReachCount} nodes.`, 
      adminUsername: currentAdmin.username 
    });
    setBroadcastDraft({
      isActive: true,
      severity: 'Urgent',
      bloodGroup: 'All',
      hospitalName: '',
      message: ''
    });
    setEmergencyAlerts(db.getEmergencyAlerts());
    setIsBroadcasting(false);
  };

  const applyTemplate = (template: AlertTemplate) => {
    setBroadcastDraft({
      ...broadcastDraft,
      severity: template.severity,
      message: template.message
    });
  };

  const handleDeleteAlert = (id: string) => {
    db.deleteEmergencyAlert(id);
    setEmergencyAlerts(db.getEmergencyAlerts());
    db.addAuditLog({ action: 'BROADCAST_TERMINATE', details: `Terminated signal ${id}.`, adminUsername: currentAdmin.username });
  };

  const availableTabs: { id: PanelTab; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'donors', label: 'Donors', icon: <Users size={18} /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Megaphone size={18} /> },
    { id: 'management', label: 'Management', icon: <Settings2 size={18} />, hidden: isViewer },
    { id: 'logs', label: 'Audit Logs', icon: <History size={18} />, hidden: !isSuperAdmin },
    { id: 'admins', label: 'Staff Matrix', icon: <Shield size={18} />, hidden: !isSuperAdmin },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col p-4 md:p-8 animate-fadeIn relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-slate-950 rounded-[2.2rem] flex items-center justify-center text-rose-500 shadow-2xl border border-white/5">
              <ShieldCheck size={40} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#f8fafc] animate-pulse shadow-lg"></div>
          </div>
          <div>
            <h1 className="text-4xl font-[1000] text-slate-900 tracking-tighter leading-none mb-2">Central Command</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-600">{currentAdmin.role}: {currentAdmin.username}</span>
              <span className="px-3 py-1 bg-emerald-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600">Local Station Live</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-rose-600 shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
            <RefreshCw size={24} className="group-active:rotate-180 transition-transform" />
          </button>
          <button onClick={onLogout} className="bg-slate-950 text-white px-8 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-4 active:scale-95">
            <LogOut size={16} /> Terminate Session
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col flex-1 relative">
        <div className="bg-slate-50/50 p-4 md:px-12 md:py-6 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full">
            {availableTabs.filter(t => !t.hidden).map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-12 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {(BLOOD_GROUPS || []).map(bg => (
                  <div key={bg} className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-rose-200 transition-all shadow-sm hover:shadow-xl">
                    <span className="text-4xl font-black text-slate-900 group-hover:text-rose-600">{bg}</span>
                    <div className="text-right">
                       <p className="text-3xl font-[1000] text-slate-900">{stats.groupDist[bg] || 0}</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="bg-slate-950 p-12 rounded-[3.5rem] text-white space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shadow-xl"><Database size={32} /></div>
                       <h3 className="text-3xl font-[900] tracking-tighter">Diagnostic Matrix</h3>
                    </div>
                    <div className="space-y-6">
                       <MetricRow label="Registry Health" status="Optimized" icon={<Heart size={14} />} />
                       <MetricRow label="Node Redundancy" status="0.4%" icon={<Scan size={14} />} />
                       <MetricRow label="Signal Status" status="Nominal" icon={<Radar size={14} />} />
                    </div>
                 </div>
                 <div className="bg-rose-600 p-12 rounded-[3.5rem] text-white flex flex-col justify-between group relative overflow-hidden shadow-rose-200 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                    <div>
                       <h3 className="text-4xl font-[1000] tracking-tighter mb-4">Signal Hub</h3>
                       <p className="text-sm font-medium text-rose-100 leading-relaxed max-w-xs">Coordinate urgent bio-resource requirements across the local node network.</p>
                    </div>
                    <button onClick={() => setActiveTab('broadcast')} className="mt-10 bg-white text-rose-600 py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl">
                       Initialize Broadcast <Megaphone size={18} />
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'donors' && (
            <div className="space-y-10 animate-fadeIn h-full flex flex-col">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-1 group">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" size={20} />
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] pl-16 pr-8 py-5 text-sm font-black text-slate-900 outline-none focus:border-rose-600 shadow-inner"
                     placeholder="Search assets by ID, contact, or affiliation..."
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
                <div className="flex flex-wrap gap-4">
                   <select className="bg-white border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-rose-500 shadow-sm" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)}>
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Blocked">Restricted</option>
                      <option value="Verified">Vetted</option>
                      <option value="Duplicates">Flagged Duplicates</option>
                      <option value="Incomplete">Incomplete Profiles</option>
                   </select>
                   <select className="bg-white border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-rose-500 shadow-sm" value={bloodFilter} onChange={e => setBloodFilter(e.target.value as any)}>
                      <option value="All">All Groups</option>
                      {(BLOOD_GROUPS || []).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                   </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[3rem] border border-slate-100 shadow-sm bg-white">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-8 py-6 w-16">
                             <button onClick={toggleSelectAll} className="text-slate-400 hover:text-rose-600 transition-colors">
                                {paginatedDonors.length > 0 && paginatedDonors.every(d => selectedIds.has(d.id)) ? <CheckSquare size={20} /> : <Square size={20} />}
                             </button>
                          </th>
                          <th className="px-4 py-6 text-[9px] font-black uppercase text-slate-400 tracking-[0.4em]">Node Identity</th>
                          <th className="px-4 py-6 text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] text-center">Group</th>
                          <th className="px-4 py-6 text-[9px] font-black uppercase text-slate-400 tracking-[0.4em]">Status Flags</th>
                          <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {paginatedDonors.map(donor => (
                         <tr key={donor.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.has(donor.id) ? 'bg-rose-50/30' : ''}`}>
                            <td className="px-8 py-6">
                               <button onClick={() => toggleSelectOne(donor.id)} className={`${selectedIds.has(donor.id) ? 'text-rose-600' : 'text-slate-200'} transition-colors`}>
                                  {selectedIds.has(donor.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                               </button>
                            </td>
                            <td className="px-4 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-[10px] font-black shadow-lg group-hover:scale-110 transition-transform">{(donor.name || '?')[0]}</div>
                                  <div>
                                     <p className="font-black text-slate-900 text-sm">{donor.name || 'Unknown Asset'}</p>
                                     <div className="flex items-center gap-2">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{donor.loginId || 'NO-ID'}</p>
                                       {donor.userType === 'User' && <span className="text-[7px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded uppercase tracking-widest border border-slate-200">User</span>}
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 py-6 text-center">
                               <span className="text-xl font-[1000] text-rose-600">{donor.bloodGroup || '??'}</span>
                            </td>
                            <td className="px-4 py-6">
                               <div className="flex gap-2">
                                  <StatusTag type={donor.isBlocked ? 'error' : 'success'} label={donor.isBlocked ? 'Blocked' : 'Active'} />
                                  <StatusTag type={donor.verificationStatus === 'Verified' ? 'info' : 'warning'} label={donor.verificationStatus || 'Unverified'} />
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <div className="flex justify-end gap-2">
                                  <ActionBtn onClick={() => setDonorToView(donor)} icon={<Eye size={18} />} />
                                  <ActionBtn onClick={() => handleToggleVerify(donor)} icon={<ShieldCheck size={18} />} active={donor.verificationStatus === 'Verified'} activeColor="text-emerald-500" />
                                  <ActionBtn onClick={() => handleToggleBlock(donor)} icon={donor.isBlocked ? <Unlock size={18} /> : <Lock size={18} />} active={donor.isBlocked} activeColor="text-rose-600" />
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Enhanced Pagination UI */}
              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 px-4 pb-12">
                 <div className="flex items-center gap-4 flex-wrap">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rows per page</p>
                    <select 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-rose-500"
                      value={itemsPerPage}
                      onChange={e => setItemsPerPage(Number(e.target.value))}
                    >
                      {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
                    </select>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedDonors.length)} of {processedDonors.length}
                    </p>
                 </div>

                 <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 flex-wrap justify-center">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                       <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                       {getPageNumbers().map((pageNum, idx) => (
                          <button
                            key={idx}
                            disabled={pageNum === '...'}
                            onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-slate-950 text-white shadow-xl' : pageNum === '...' ? 'bg-transparent text-slate-400' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'}`}
                          >
                               {pageNum}
                          </button>
                       ))}
                    </div>

                    <button 
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                       <ChevronRight size={16} />
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 animate-fadeIn">
              {/* Dispatch Controls */}
              <div className="xl:col-span-7 space-y-10">
                <div className={`p-10 rounded-[3.5rem] border transition-all duration-700 shadow-2xl relative overflow-hidden bg-white ${
                  broadcastDraft.severity === 'Critical' ? 'border-rose-100' : 
                  broadcastDraft.severity === 'Urgent' ? 'border-amber-100' : 'border-indigo-100'
                }`}>
                  <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] -mr-40 -mt-40 transition-all duration-1000 ${
                    broadcastDraft.severity === 'Critical' ? 'bg-rose-500/10' : 
                    broadcastDraft.severity === 'Urgent' ? 'bg-amber-500/10' : 'bg-indigo-500/10'
                  }`}></div>

                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white shadow-xl transition-all duration-500 ${
                        broadcastDraft.severity === 'Critical' ? 'bg-rose-600 animate-pulse' : 
                        broadcastDraft.severity === 'Urgent' ? 'bg-amber-600' : 'bg-indigo-600'
                      }`}>
                        <Megaphone size={32} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-[900] tracking-tighter text-slate-900">Signal Composer</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">New Propagation Packet</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Potential</p>
                       <div className="flex items-center gap-3">
                          <span className="text-2xl font-[1000] text-slate-900">{targetReachCount}</span>
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-500">Nodes</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8 relative z-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-2">
                        <Waves size={14} className="text-slate-400" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Smart Profiles</label>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {(ALERT_TEMPLATES || []).map(t => (
                          <button 
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:border-rose-400 hover:text-rose-600 transition-all shadow-sm whitespace-nowrap"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Assigned Hub</label>
                        <div className="relative group">
                          <Building className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-600 transition-colors" size={18} />
                          <input 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-6 py-5 text-sm font-black text-slate-900 focus:border-rose-600 outline-none shadow-inner transition-all"
                            placeholder="Hospital / Facility Name"
                            value={broadcastDraft.hospitalName}
                            onChange={e => setBroadcastDraft({...broadcastDraft, hospitalName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Protocol Priority</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-black text-slate-900 focus:border-rose-600 outline-none appearance-none shadow-inner"
                            value={broadcastDraft.severity}
                            onChange={e => setBroadcastDraft({...broadcastDraft, severity: e.target.value as AlertSeverity})}
                          >
                            <option value="Standard">Standard Propagation</option>
                            <option value="Urgent">Urgent Linkage</option>
                            <option value="Critical">Critical Override</option>
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Serotype Signature</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-black text-slate-900 focus:border-rose-600 outline-none appearance-none shadow-inner"
                            value={broadcastDraft.bloodGroup}
                            onChange={e => setBroadcastDraft({...broadcastDraft, bloodGroup: e.target.value as any})}
                          >
                            <option value="All">Omni-Broadcast (All Groups)</option>
                            {(BLOOD_GROUPS || []).map(bg => <option key={bg} value={bg}>{bg} Target Only</option>)}
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Network Penetration</label>
                        <div className="p-5 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-between shadow-2xl overflow-hidden relative group">
                           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                           <div className="flex flex-col relative z-10">
                              <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Live Feed Saturation</span>
                              <span className="text-xl font-[1000] text-emerald-500">{Math.min(100, Math.floor((targetReachCount / (stats.total || 1)) * 100))}%</span>
                           </div>
                           <div className="h-10 w-px bg-white/10 relative z-10"></div>
                           <div className="text-right relative z-10">
                              <p className="text-[10px] font-black text-white">{targetReachCount} Nodes</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active Pulse</p>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end px-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Directives</label>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{(broadcastDraft.message || '').length} Characters</span>
                      </div>
                      <textarea 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 text-sm font-medium text-slate-600 focus:border-rose-600 outline-none shadow-inner min-h-[140px] resize-none leading-relaxed transition-all"
                        placeholder="Provide mission-specific details for targeted nodes..."
                        value={broadcastDraft.message}
                        onChange={e => setBroadcastDraft({...broadcastDraft, message: e.target.value})}
                      />
                    </div>

                    <button 
                      onClick={handleDispatchBroadcast}
                      disabled={isBroadcasting || !broadcastDraft.hospitalName || !broadcastDraft.message}
                      className={`w-full py-8 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 ${
                        broadcastDraft.severity === 'Critical' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-950 hover:bg-rose-600'
                      }`}
                    >
                      {isBroadcasting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} 
                      {isBroadcasting ? 'Encrypting Signal...' : 'Authorize Propagation'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4">
                  <div className="flex items-center gap-3">
                    <Scan size={14} className="text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Signal Field Preview</h4>
                  </div>
                  <div className="opacity-80 scale-[0.98] blur-[0.5px] hover:blur-0 transition-all cursor-default select-none grayscale-[0.2]">
                    <EmergencyBanner alert={broadcastDraft as EmergencyAlert} />
                  </div>
                </div>
              </div>

              {/* Propagation Monitoring */}
              <div className="xl:col-span-5 space-y-8">
                <div className="bg-slate-950 p-10 rounded-[4rem] text-white space-y-10 relative overflow-hidden h-fit border border-white/5 shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(225,29,72,0.1),transparent)] pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/5 rounded-[1.4rem] flex items-center justify-center text-rose-500 border border-white/10 shadow-inner">
                        <Radar size={28} className="animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tighter">Live Propagation</h3>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Network Stream Status</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-rose-500">{emergencyAlerts.length}</p>
                       <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Active Links</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    {emergencyAlerts.length > 0 ? (
                      emergencyAlerts.map(alert => (
                        <div key={alert.id} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:bg-white/10 transition-all duration-500 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 h-1 w-full opacity-50 ${alert.severity === 'Critical' ? 'bg-rose-600' : 'bg-indigo-600'}`}></div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${alert.severity === 'Critical' ? 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.6)] animate-pulse' : 'bg-emerald-500'}`}></div>
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{alert.severity} Signal</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                             <h4 className="text-xl font-black tracking-tight leading-none">
                                {alert.bloodGroup === 'All' ? 'Omni-Emergency' : `${alert.bloodGroup} Specific`} @ <span className="text-rose-500">{alert.hospitalName}</span>
                             </h4>
                             <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                   <Clock size={12} className="text-slate-500" />
                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                      {new Date(alert.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Dispatch
                                   </span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                   <Zap size={12} className="text-emerald-500" />
                                   <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Linked</span>
                                </div>
                             </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center space-y-6 opacity-30 border-2 border-dashed border-white/10 rounded-[3rem]">
                        <div className="relative inline-block">
                           <CircleSlash size={64} className="mx-auto" />
                           <Radar size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Network Silence Optimized</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Network Load</p>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-600" style={{ width: `${Math.min(100, (emergencyAlerts.length / 5) * 100)}%` }}></div>
                           </div>
                           <span className="text-[9px] font-black text-slate-400">NOMINAL</span>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Link Persistence</p>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: '92%' }}></div>
                           </div>
                           <span className="text-[9px] font-black text-slate-400">92%</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="p-10 bg-white rounded-[4rem] border border-slate-100 space-y-8 shadow-xl relative group overflow-hidden">
                   <div className="absolute top-0 left-0 w-2 h-full bg-rose-600 opacity-0 group-hover:opacity-100 transition-all"></div>
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                         <Shield size={24} />
                      </div>
                      <h4 className="text-sm font-[1000] uppercase tracking-tighter text-slate-900">Broadcast Ethics & Safety</h4>
                   </div>
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">
                      All signals propagate across the entire node matrix within 800ms. Terminate signals manually once resources are secured to ensure high-priority data remains visible to active life-savers.
                   </p>
                   <div className="pt-4 border-t border-slate-50 flex items-center gap-3 text-rose-500">
                      <AlertTriangle size={14} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Protocol strictly Humanitarian</span>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admins' && isSuperAdmin && (
            <div className="space-y-10 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-[900] tracking-tighter text-slate-900">Staff Matrix</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Administrative Node Management</p>
                </div>
                <button onClick={() => { setIsManagingAdmin({}); setAdminForm({ username: '', password: '', role: AdminRole.VIEWER }); }} className="bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking widest flex items-center gap-3 shadow-xl hover:bg-rose-600 transition-all">
                  <UserPlus size={18} /> Provision Admin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {adminUsers.map(admin => (
                  <div key={admin.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl group hover:-translate-y-2 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${admin.role === AdminRole.SUPER_ADMIN ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Shield size={24} />
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => { setIsManagingAdmin(admin); setAdminForm(admin); }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><UserCog size={18} /></button>
                         <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{admin.username || 'Unnamed Staff'}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{admin.role}</p>
                    <div className="pt-4 border-t border-slate-50">
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Last Auth: {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'management' && canManage && (
            <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn py-8">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                  <HealthCard label="Total Nodes" value={donors.length} icon={<Layers className="text-slate-400" />} />
                  <HealthCard label="Duplicates" value={healthReport?.duplicates?.length || 0} icon={<Split className="text-amber-500" />} color="text-amber-600" onClick={() => { setActiveTab('donors'); setSelectedStatus('Duplicates'); }} interactive />
                  <HealthCard label="Incomplete Dossiers" value={healthReport?.incomplete?.length || 0} icon={<FileWarning className="text-rose-500" />} color="text-rose-600" onClick={() => { setActiveTab('donors'); setSelectedStatus('Incomplete'); }} interactive />
                  <HealthCard label="Vetting Backlog" value={healthReport?.unverified || 0} icon={<ShieldQuestion className="text-indigo-500" />} color="text-indigo-600" onClick={() => { setActiveTab('donors'); setSelectedStatus('Unverified'); }} interactive />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 p-10 bg-slate-50 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col justify-between">
                     <div className="flex items-center justify-between">
                        <div className="space-y-4">
                           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-md border border-slate-100"><HardDriveDownload size={28} /></div>
                           <h3 className="text-3xl font-[900] tracking-tighter">Ingestion Matrix</h3>
                           <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-sm">Synchronize external donor datasets via CSV load. Includes full identity and credential mapping.</p>
                        </div>
                        <button onClick={handleDownloadTemplate} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm"><Download size={14} /> Template</button>
                     </div>
                     <div className="p-8 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-4">
                        <div className="flex justify-center"><Upload className="text-slate-300" size={48} /></div>
                        <input type="file" ref={fileInputRef} onChange={analyzeFile} className="hidden" accept=".csv" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-rose-600 transition-all flex items-center gap-3 mx-auto">
                           {isImporting ? <RefreshCw className="animate-spin" size={16} /> : <Cpu size={16} />} Initialize Load
                        </button>
                     </div>
                  </div>

                  <div className="p-10 bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-sm space-y-8">
                     <div className="space-y-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-md border border-slate-100"><Wand2 size={28} /></div>
                        <h3 className="text-2xl font-[900] tracking-tighter">Global Protocols</h3>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">Mass-execution utility for registry maintenance and status broadcasting.</p>
                     </div>
                     <div className="space-y-4">
                        {isSuperAdmin ? (
                          <>
                            <CommandBtn label="Global Vetting Sweep" onClick={() => executeBulkCommand('VERIFY_ALL')} icon={<ShieldCheck size={14} />} color="text-emerald-600" />
                            <CommandBtn label="Force Offline Protocol" onClick={() => executeBulkCommand('RESET_AVAILABILITY')} icon={<CircleArrowLeft size={14} />} color="text-rose-600" />
                            <CommandBtn label="Archive JSON Backup" onClick={handleExportJSON} icon={<FileJson size={14} />} color="text-indigo-600" />
                          </>
                        ) : (
                          <div className="py-12 text-center opacity-40"><Lock size={32} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Level 2 Locked</p></div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'logs' && isSuperAdmin && (
            <div className="space-y-8 animate-fadeIn">
               <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                           <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Timestamp</th>
                           <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Signature</th>
                           <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Action</th>
                           <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Operational Details</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {auditLogs.map(log => (
                           <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-8 py-6 text-xs font-black text-slate-900">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-600">{log.adminUsername || 'SYS'}</span></td>
                              <td className="px-8 py-6 text-xs font-black text-rose-600">{log.action || 'LOG'}</td>
                              <td className="px-8 py-6 text-xs font-medium text-slate-500">{log.details || 'No data'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-2xl px-8 py-6 rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] flex items-center gap-8 z-[200] animate-slideUp">
              <div className="flex flex-col">
                 <p className="text-white text-sm font-black tracking-tight">{selectedIds.size} Nodes Selected</p>
                 <button onClick={() => setSelectedIds(new Set())} className="text-rose-500 text-[9px] font-black uppercase tracking-widest text-left hover:text-rose-400">Deselect Matrix</button>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <div className="flex gap-2">
                 <FloatAction icon={<ShieldCheck size={16} />} label="Verify" onClick={() => setBulkActionToConfirm({ type: 'VERIFY', count: selectedIds.size })} color="text-emerald-500" />
                 <FloatAction icon={<Lock size={16} />} label="Restrict" onClick={() => setBulkActionToConfirm({ type: 'BLOCK', count: selectedIds.size })} color="text-amber-500" />
                 <FloatAction icon={<Unlock size={16} />} label="Release" onClick={() => setBulkActionToConfirm({ type: 'UNBLOCK', count: selectedIds.size })} color="text-blue-500" />
                 <FloatAction icon={<Download size={16} />} label="Export" onClick={() => executeBulkAction('EXPORT')} color="text-indigo-500" />
                 <FloatAction icon={<Trash2 size={16} />} label="Purge" onClick={() => setBulkActionToConfirm({ type: 'DELETE', count: selectedIds.size })} color="text-rose-500" />
              </div>
           </div>
        )}
      </div>

      {/* BULK ACTION CONFIRMATION MODAL */}
      {bulkActionToConfirm && (
         <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-float border border-white/20">
               <div className={`p-12 text-center text-white ${
                 bulkActionToConfirm.type === 'DELETE' ? 'bg-rose-600' : 
                 bulkActionToConfirm.type === 'BLOCK' ? 'bg-amber-600' :
                 bulkActionToConfirm.type === 'VERIFY' ? 'bg-emerald-600' : 'bg-blue-600'
               }`}>
                  {bulkActionToConfirm.type === 'DELETE' && <Trash2 size={56} className="mx-auto mb-6" />}
                  {bulkActionToConfirm.type === 'BLOCK' && <ShieldAlert size={56} className="mx-auto mb-6" />}
                  {bulkActionToConfirm.type === 'VERIFY' && <ShieldCheck size={56} className="mx-auto mb-6" />}
                  {bulkActionToConfirm.type === 'UNBLOCK' && <Unlock size={56} className="mx-auto mb-6" />}
                  <h2 className="text-3xl font-[1000] tracking-tighter leading-tight uppercase">Confirm Command</h2>
               </div>
               <div className="p-10 space-y-8 text-center">
                  <div className="space-y-2">
                    <p className="text-slate-500 font-bold text-base">Authorize <span className="font-black text-slate-900">{bulkActionToConfirm.type}</span> protocol on</p>
                    <div className="inline-block px-6 py-2 bg-slate-100 rounded-full text-2xl font-black text-slate-900">
                      {bulkActionToConfirm.count} Nodes
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => executeBulkAction(bulkActionToConfirm.type)} 
                      disabled={isBulkExecuting} 
                      className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-white ${
                        bulkActionToConfirm.type === 'DELETE' ? 'bg-rose-600 hover:bg-rose-700' : 
                        bulkActionToConfirm.type === 'BLOCK' ? 'bg-amber-600 hover:bg-amber-700' :
                        bulkActionToConfirm.type === 'VERIFY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isBulkExecuting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} Execute Protocol
                    </button>
                    <button 
                      onClick={() => setBulkActionToConfirm(null)} 
                      disabled={isBulkExecuting} 
                      className="w-full bg-slate-50 text-slate-400 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Abort Mission
                    </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {importPreview && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-slideUp border border-white/20">
               <div className="bg-slate-950 p-12 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-emerald-500 rounded-[2.2rem] flex items-center justify-center shadow-2xl animate-pulse">
                        <Split size={36} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-[1000] tracking-tighter leading-none">Staging Terminal</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Ingesting: {importPreview.fileName}</p>
                    </div>
                  </div>
                  <button onClick={() => setImportPreview(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X size={24} /></button>
               </div>
               
               <div className="p-12 space-y-8">
                  <div className="space-y-4">
                     <div className="flex justify-between items-end px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Validation Ledger</h4>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{(importPreview.donors || []).length} Valid Nodes Staged</span>
                     </div>
                     <div className="h-80 overflow-y-auto rounded-[2.5rem] border border-slate-100 bg-slate-50/50 p-6 custom-scrollbar">
                        <div className="space-y-3">
                           {(importPreview.donors || []).map((d, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group/row">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[9px] font-black">{d.bloodGroup || '?'}</div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900">{d.name || 'Anonymous'}</p>
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{d.phone || 'No Data'}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => removeFromImport(idx)} className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover/row:opacity-100 transition-all">
                                    <MinusCircle size={18} />
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     {isSuperAdmin && (
                        <label className={`flex items-center gap-6 p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all ${isMirrorMode ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-100'}`}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isMirrorMode ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                            <BoxSelect size={28} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900">Registry Mirror (1:1 Replica)</p>
                            <p className="text-[10px] font-medium text-slate-400 leading-relaxed">WARNING: Overwrites local data not present in this batch.</p>
                          </div>
                          <input type="checkbox" checked={isMirrorMode} onChange={e => setIsMirrorMode(e.target.checked)} className="w-6 h-6 accent-rose-600" />
                        </label>
                     )}

                     <div className="flex gap-4 pt-6">
                        <button onClick={() => setImportPreview(null)} className="flex-1 bg-slate-100 text-slate-400 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Abort</button>
                        <button onClick={commitImport} className="flex-[2] bg-slate-950 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:bg-rose-600 flex items-center justify-center gap-3 transition-all active:scale-95">
                           <Check size={20} /> Commit Deployment
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {donorToView && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-slideUp border border-white/20">
            <div className="bg-slate-950 p-12 text-white flex justify-between items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
               <div className="flex items-center gap-8 relative z-10">
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 text-3xl font-black shadow-inner">
                    {donorToView.bloodGroup || '?'}
                  </div>
                  <div>
                    <h2 className="text-4xl font-[1000] tracking-tighter leading-none mb-3">{donorToView.name || 'Registry Asset'}</h2>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Asset Ref: {donorToView.id}</span>
                       <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${donorToView.verificationStatus === 'Verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{donorToView.verificationStatus || 'Unverified'}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => setDonorToView(null)} className="p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-all relative z-10">
                    <X size={24} />
               </button>
            </div>
            
            <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex-1 p-12 space-y-12">
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 flex items-center gap-2">
                      <Lock size={12} className="text-rose-500" /> Access Protocol
                    </h4>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${donorToView.userType === 'Donor' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                      Type: {donorToView.userType || 'Donor'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner group relative">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">User ID (loginId)</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight font-mono">{donorToView.loginId || 'N/A'}</p>
                        <Fingerprint size={32} className="absolute top-6 right-6 text-slate-100" />
                     </div>
                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner group relative">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Security Passkey</p>
                        <p className="text-xl font-black text-rose-600 tracking-tight font-mono">{donorToView.password || '****'}</p>
                        <Key size={32} className="absolute top-6 right-6 text-slate-100" />
                     </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 border-b border-slate-100 pb-3">Personal Dossier</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <ProfileItem label="Bio Age" value={`${donorToView.age || 0} Cycles`} />
                    <ProfileItem label="Bio Gender" value={donorToView.gender || 'Not Specified'} />
                    <ProfileItem label="Terminal Link" value={donorToView.phone || 'N/A'} />
                    <ProfileItem label="Hub Location" value={donorToView.address || 'N/A'} />
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 border-b border-slate-100 pb-3">Professional Brief</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <ProfileItem label="Occupation" value={donorToView.occupation || 'Private'} />
                    <ProfileItem label="Designation" value={donorToView.designation || 'Volunteer'} />
                    <ProfileItem label="Assigned Unit" value={donorToView.department || 'General Registry'} highlight />
                  </div>
                </section>
              </div>

              <div className="w-full lg:w-80 bg-slate-50 p-12 border-l border-slate-100 space-y-10">
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Node Telemetry</h4>
                  <div className="space-y-4">
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Signal</p>
                      <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${donorToView.availability === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{donorToView.availability || 'Terminated'}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered On</p>
                      <p className="text-xs font-black text-slate-900">{donorToView.createdAt ? new Date(donorToView.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Engagement</p>
                      <p className="text-xs font-black text-rose-600">{donorToView.lastDonationDate || 'Initial Node'}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-12 bg-white flex justify-end gap-4 border-t border-slate-100">
                <button onClick={() => { handleDownloadNode(donorToView); }} className="px-8 py-5 border-2 border-slate-100 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:border-slate-300 hover:text-slate-900 transition-all flex items-center gap-3">
                   <Download size={16} /> Export Dossier
                </button>
                <button onClick={() => setDonorToView(null)} className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-rose-600 transition-all">Close Terminal</button>
            </div>
          </div>
        </div>
      )}

      {isManagingAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-slideUp border border-white/20">
             <div className="bg-slate-950 p-12 text-white flex justify-between items-center">
                <h2 className="text-3xl font-[1000] tracking-tighter">{ (isManagingAdmin as AdminUser).id ? 'Revise Node' : 'Provision Admin' }</h2>
                <button onClick={() => setIsManagingAdmin(null)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X size={24} /></button>
             </div>
             <div className="p-12 space-y-8">
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-sm outline-none focus:border-rose-600 shadow-inner" value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} placeholder="Username" />
                <input type="password" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-sm outline-none focus:border-rose-600 shadow-inner" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} placeholder="Password" />
                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-sm outline-none focus:border-rose-600 appearance-none shadow-inner" value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value as AdminRole})}>
                   <option value={AdminRole.VIEWER}>Viewer (Read-Only)</option>
                   <option value={AdminRole.EDITOR}>Editor (Management)</option>
                   <option value={AdminRole.SUPER_ADMIN}>Super Admin (Full Access)</option>
                </select>
                <button onClick={handleSaveAdmin} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3">
                   <Save size={18} /> Commit Configuration
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HealthCard = ({ label, value, icon, color = 'text-slate-900', onClick, interactive = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col gap-6 group transition-all duration-300 ${interactive ? 'cursor-pointer hover:-translate-y-2 hover:border-rose-200' : ''}`}
  >
     <div className="flex justify-between items-center">
        <div className={`w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner ${interactive ? 'group-hover:bg-rose-600 group-hover:text-white' : ''} transition-all duration-500`}>{icon}</div>
        {interactive && <ChevronRight className="text-slate-200" size={16} />}
     </div>
     <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-3xl font-[1000] tracking-tighter ${color}`}>{value}</p>
     </div>
  </div>
);

const CommandBtn = ({ label, onClick, icon, color }: any) => (
  <button onClick={onClick} className="w-full p-6 bg-slate-50 hover:bg-white rounded-[1.8rem] border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all flex items-center justify-between group">
     <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900">{label}</span>
     </div>
     <ArrowRight className="text-slate-300" size={14} />
  </button>
);

const FloatAction = ({ icon, label, onClick, color }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all group">
     <div className={`${color} group-hover:scale-125 transition-transform`}>{icon}</div>
     <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">{label}</span>
  </button>
);

const MetricRow = ({ label, status, icon }: { label: string, status: string, icon: React.ReactNode }) => (
  <div className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0">
     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">{icon} {label}</span>
     <span className={`text-[10px] font-black uppercase tracking-widest text-emerald-500`}>{status}</span>
  </div>
);

const StatusTag = ({ type, label }: { type: 'success' | 'error' | 'warning' | 'info', label: string }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-600',
    error: 'bg-rose-100 text-rose-600',
    warning: 'bg-amber-100 text-amber-600',
    info: 'bg-blue-100 text-blue-600'
  };
  return <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${styles[type]}`}>{label}</span>;
};

const ActionBtn = ({ onClick, icon, active = false, activeColor = "" }: any) => (
  <button onClick={onClick} className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all ${active ? activeColor : 'text-slate-300'}`}>{icon}</button>
);

const ProfileItem = ({ label, value, highlight = false }: any) => (
  <div className="space-y-2">
     <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] ml-2">{label}</div>
     <div className={`p-5 bg-white rounded-2xl border border-slate-200 shadow-inner truncate ${highlight ? 'text-sm font-[1000] text-rose-600 bg-rose-50/20' : 'text-sm font-black text-slate-900'}`}>
        {value || 'NULL'}
     </div>
  </div>
);

export default AdminPanel;