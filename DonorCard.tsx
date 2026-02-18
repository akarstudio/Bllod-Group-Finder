import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MapPin, 
  User, 
  Calendar, 
  Edit2, 
  X, 
  ShieldCheck, 
  MessageSquare, 
  Copy, 
  Check, 
  Lock, 
  Activity,
  Trash2,
  AlertCircle,
  Loader2,
  Building,
  Briefcase,
  Save as SaveIcon,
  Shield,
  Key,
  ChevronDown,
  Clock
} from 'lucide-react';
import { Donor, BloodGroup } from '../types';
import { db } from '../services/db';
import { ADMIN_CREDENTIALS } from '../constants';

interface DonorCardProps {
  donor: Donor;
  onRefresh?: () => void;
  isLoggedIn?: boolean;
  isAdminMode?: boolean;
}

const DonorCard: React.FC<DonorCardProps> = ({ donor, onRefresh, isLoggedIn = false, isAdminMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (uiError) {
      const timer = setTimeout(() => setUiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uiError]);

  const handleSaveEdit = async (updatedData: Partial<Donor>) => {
    setIsProcessing(true);
    try {
      await db.updateDonor(donor.id, updatedData);
      db.addAuditLog({
        action: 'NODE_UPDATE',
        details: `Updated profile for ${donor.name}`,
        adminUsername: ADMIN_CREDENTIALS.username
      });
      onRefresh?.();
      setIsEditing(false);
    } catch (error) {
      setUiError("Update failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    setIsProcessing(true);
    try {
      await db.deleteDonor(donor.id);
      db.addAuditLog({ action: 'NODE_PURGE', details: `Deleted ${donor.name}`, adminUsername: ADMIN_CREDENTIALS.username });
      setShowDeleteConfirm(false);
      onRefresh?.();
    } catch (error) {
      setUiError("Purge failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyNumber = () => {
    if (!isLoggedIn) return;
    navigator.clipboard.writeText(donor.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No record found';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isBiologicallyRecovered = (lastDate?: string) => {
    if (!lastDate) return true;
    const diff = Date.now() - new Date(lastDate).getTime();
    return diff >= 90 * 24 * 60 * 60 * 1000;
  };

  const isManualAvailable = donor.availability === 'Available';
  const isRecovered = isBiologicallyRecovered(donor.lastDonationDate);
  const isActuallyAvailable = isManualAvailable && isRecovered;
  
  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] group/card">
      {isAdminMode && (
        <div className="bg-[#1e293b] px-6 py-2 flex justify-between items-center">
          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.3em]">Command Active</span>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} title="Edit Node" className="text-white hover:text-rose-400 transition-colors"><Edit2 size={12} /></button>
            <button onClick={() => setShowDeleteConfirm(true)} title="Purge Node" className="text-white hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
          </div>
        </div>
      )}

      <div className="p-8 space-y-8 flex-1">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {getInitials(donor.name)}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{donor.name}</h2>
              <p className="text-[10px] font-bold text-slate-300 tracking-wider mt-0.5 uppercase">{donor.loginId}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-rose-600 leading-none">{donor.bloodGroup}</div>
            <div className="mt-1 text-[7px] font-black text-emerald-500 uppercase tracking-widest text-center leading-tight">
              VERIFIED<br/>GROUP
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isActuallyAvailable ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-emerald-50/50 border-emerald-100 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </div>
          ) : !isRecovered ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-amber-50/50 border-amber-100 text-amber-600">
              <Clock size={10} className="animate-spin-slow" />
              In Recovery
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-100 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              Offline
            </div>
          )}
        </div>

        {/* Designation & Department */}
        <div className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Designation & Department</h3>
          <div className="flex flex-wrap gap-2">
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-bold text-slate-700 shadow-sm">
              {donor.designation || 'Volunteer'}
            </div>
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-bold text-slate-700 shadow-sm">
              {donor.department || 'General'}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Age</h4>
            <p className="text-sm font-black text-slate-900">{donor.age} Years</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profession</h4>
            <p className="text-sm font-black text-slate-900">{donor.occupation || 'Professional'}</p>
          </div>
        </div>

        {/* Location & Last Donate */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</h4>
            <p className="text-sm font-black text-slate-900">{donor.address}</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Donate</h4>
            <p className={`text-sm font-black ${!isRecovered ? 'text-amber-600' : 'text-slate-900'}`}>{formatDate(donor.lastDonationDate)}</p>
          </div>
        </div>

        {/* Authentication or Contact Info Section */}
        {!isLoggedIn ? (
          <div className="border-2 border-dashed border-slate-100 rounded-[1.5rem] p-8 text-center space-y-4 bg-slate-50/30">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
              <Lock size={14} className="text-slate-300" />
            </div>
            <div className="space-y-1">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Restricted Hub Access</h5>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Authentication protocol required</p>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/number animate-fadeIn">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white shadow-md">
                <Phone size={16} />
              </div>
              <div>
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Number</h4>
                <p className="text-sm font-black text-slate-900 tracking-wider">{donor.phone}</p>
              </div>
            </div>
            <button 
              onClick={handleCopyNumber}
              className={`p-2.5 rounded-lg transition-all duration-300 ${copied ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-200'}`}
              title="Copy Number"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {/* Call to Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => isLoggedIn && window.open(`tel:${donor.phone}`)}
            disabled={!isLoggedIn}
            className={`flex-1 flex items-center justify-center py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!isLoggedIn ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-rose-600 shadow-lg active:scale-95'}`}
          >
            {isLoggedIn ? 'Initialize Call' : 'Locked Node'}
          </button>
          <button 
            disabled={!isLoggedIn}
            onClick={() => isLoggedIn && window.open(`https://wa.me/${donor.phone.replace(/[^0-9]/g, '')}`)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all border border-slate-100 ${!isLoggedIn ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-white text-[#0f172a] hover:bg-emerald-500 hover:text-white active:scale-95'}`}
            title="WhatsApp Contact"
          >
            <MessageSquare size={18} fill={isLoggedIn ? "currentColor" : "none"} className={isLoggedIn ? "opacity-90" : ""} />
          </button>
        </div>
      </div>

      {/* Modals */}
      {isEditing && (
        <EditDonorModal donor={donor} onClose={() => setIsEditing(false)} onSave={handleSaveEdit} isProcessing={isProcessing} />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmModal donorName={donor.name} onConfirm={executeDelete} onCancel={() => setShowDeleteConfirm(false)} isProcessing={isProcessing} />
      )}
    </div>
  );
};

const DeleteConfirmModal: React.FC<{ donorName: string, onConfirm: () => void, onCancel: () => void, isProcessing: boolean }> = ({ donorName, onConfirm, onCancel, isProcessing }) => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slideUp">
      <div className="bg-rose-600 p-8 text-center text-white">
        <h2 className="text-xl font-black uppercase tracking-tighter">Authorize Purge</h2>
      </div>
      <div className="p-8 space-y-6 text-center">
        <p className="text-slate-500 font-bold text-sm">Confirm permanent disconnection of node: <span className="text-rose-600 font-black">"{donorName}"</span></p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} disabled={isProcessing} className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Execute Purge
          </button>
          <button onClick={onCancel} className="w-full bg-slate-50 text-slate-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Abort</button>
        </div>
      </div>
    </div>
  </div>
);

const EditDonorModal: React.FC<{ donor: Donor, onClose: () => void, onSave: (data: Partial<Donor>) => void, isProcessing: boolean }> = ({ donor, onClose, onSave, isProcessing }) => {
  const [formData, setFormData] = useState<Partial<Donor>>({ ...donor });
  
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e293b] p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Modify Donor Record</h2>
            <p className="text-xs text-slate-400">Reference ID: <span className="font-semibold text-slate-300">{donor.loginId}</span></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <InputItem 
            label="Donor ID" 
            icon={<Shield size={18} />} 
            value={formData.loginId || ''} 
            onChange={(v: string) => setFormData({...formData, loginId: v})} 
          />
          
          <InputItem 
            label="Full Name" 
            icon={<User size={18} />} 
            value={formData.name || ''} 
            onChange={(v: string) => setFormData({...formData, name: v})} 
          />

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700">Blood Group</label>
              <div className="relative">
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 focus:border-[#1e293b] outline-none transition-all appearance-none shadow-sm"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({...formData, bloodGroup: e.target.value as BloodGroup})}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700">Age</label>
              <input 
                type="number"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] text-slate-900 focus:border-[#1e293b] outline-none transition-all shadow-sm"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <InputItem 
            label="Phone Number" 
            icon={<Phone size={18} />} 
            value={formData.phone || ''} 
            onChange={(v: string) => setFormData({...formData, phone: v})} 
          />

          <InputItem 
            label="Address" 
            icon={<MapPin size={18} />} 
            value={formData.address || ''} 
            onChange={(v: string) => setFormData({...formData, address: v})} 
          />

          <InputItem 
            label="Designation" 
            icon={<Briefcase size={18} />} 
            value={formData.designation || ''} 
            onChange={(v: string) => setFormData({...formData, designation: v})} 
          />

          <InputItem 
            label="Department" 
            icon={<Building size={18} />} 
            value={formData.department || ''} 
            onChange={(v: string) => setFormData({...formData, department: v})} 
          />

          <div className="space-y-4 pt-2">
            <label className="text-[14px] font-bold text-[#1e293b]">Access Level</label>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
              <AccessLevelBtn 
                label="Viewer" 
                active={formData.userType === 'User'} 
                onClick={() => setFormData({...formData, userType: 'User'})} 
              />
              <AccessLevelBtn 
                label="Editor" 
                active={formData.userType === 'Donor'} 
                onClick={() => setFormData({...formData, userType: 'Donor'})} 
              />
              <AccessLevelBtn 
                label="Management" 
                active={false} 
                onClick={() => {}} 
              />
            </div>
          </div>

          <InputItem 
            label="Password" 
            icon={<Lock size={18} />} 
            value={formData.password || ''} 
            onChange={(v: string) => setFormData({...formData, password: v})} 
            placeholder="password"
          />
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 py-3.5 rounded-xl text-[15px] font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)} 
            disabled={isProcessing}
            className="flex-[1.2] bg-[#0f172a] text-white py-3.5 rounded-xl text-[15px] font-semibold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const AccessLevelBtn = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
  >
    {label}
  </button>
);

const InputItem = ({ label, value, onChange, type = "text", icon, placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-[13px] font-semibold text-slate-700 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1e293b] transition-colors">
        {icon}
      </div>
      <input 
        type={type} 
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-[15px] text-slate-900 focus:border-[#1e293b] outline-none transition-all shadow-sm" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  </div>
);

export default DonorCard;