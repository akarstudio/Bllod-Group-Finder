
import React, { useState, useMemo } from 'react';
import { Donor, BloodGroup, EmergencyAlert } from '../types';
import { db } from '../services/db';
import { BLOOD_GROUPS } from '../constants';
import { 
  User, 
  MapPin, 
  Phone, 
  Activity, 
  RefreshCw, 
  Save, 
  LogOut,
  CheckCircle2,
  Heart,
  Calendar,
  Briefcase,
  Building,
  Zap,
  Key,
  ChevronDown,
  ShieldAlert,
  HeartPulse,
  Shield,
  CreditCard,
  Power,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  Timer,
  AlertCircle
} from 'lucide-react';

interface DonorDashboardProps {
  donor: Donor;
  onRefresh: () => void;
  onLogout: () => void;
}

const DonorDashboard: React.FC<DonorDashboardProps> = ({ donor, onRefresh, onLogout }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'sos'>('profile');
  const [formData, setFormData] = useState<Partial<Donor>>({
    loginId: donor.loginId,
    password: donor.password,
    phone: donor.phone,
    address: donor.address,
    bloodGroup: donor.bloodGroup,
    occupation: donor.occupation,
    designation: donor.designation,
    department: donor.department,
    lastDonationDate: donor.lastDonationDate || ''
  });

  const [sosDraft, setSosDraft] = useState<Omit<EmergencyAlert, 'id' | 'updatedAt'>>({
    isActive: true,
    severity: 'Critical',
    bloodGroup: 'All', 
    hospitalName: '',
    message: ''
  });
  const [sosSuccess, setSosSuccess] = useState(false);

  // Biological Recovery Logic
  const recoveryInfo = useMemo(() => {
    if (!donor.lastDonationDate) return { isRecovered: true, daysLeft: 0, percent: 100 };
    
    const lastDate = new Date(donor.lastDonationDate);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const targetDays = 90;
    
    const isRecovered = diffDays >= targetDays;
    const daysLeft = Math.max(0, targetDays - diffDays);
    const percent = Math.min(100, Math.floor((diffDays / targetDays) * 100));
    
    return { isRecovered, daysLeft, percent };
  }, [donor.lastDonationDate]);

  const impactStats = useMemo(() => {
    const donationCount = donor.lastDonationDate ? (donor.reports || 0) + 1 : (donor.reports || 0);
    return {
      donations: donationCount,
      livesSaved: donationCount * 3
    };
  }, [donor]);

  const handleToggleAvailability = async () => {
    if (!recoveryInfo.isRecovered) return; // Locked during recovery
    const nextState = donor.availability === 'Available' ? 'Not Available' : 'Available';
    await db.updateDonor(donor.id, { availability: nextState as any });
    onRefresh();
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    await db.updateDonor(donor.id, formData);
    onRefresh();
    setIsUpdating(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDispatchSOS = () => {
    if (!sosDraft.hospitalName || !sosDraft.message) return;
    db.addEmergencyAlert(sosDraft);
    db.addAuditLog({
        action: 'SOS_SENT',
        details: `Donor broadcast SOS for ${sosDraft.bloodGroup} at ${sosDraft.hospitalName}`,
        adminUsername: donor.name
    });
    setSosSuccess(true);
    setTimeout(() => {
        setSosSuccess(false);
        setSosDraft({ isActive: true, severity: 'Critical', bloodGroup: 'All', hospitalName: '', message: '' });
    }, 5000);
  };

  // If not recovered, visibility is effectively offline/terminated
  const isAvailable = donor.availability === 'Available' && recoveryInfo.isRecovered;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Premium Header: Medical Identity */}
      <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full blur-[100px] -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-110"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-white transform transition-transform group-hover:rotate-3">
              {donor.bloodGroup}
            </div>
            {isAvailable && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white animate-pulse">
                <Activity size={16} />
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-[1000] text-slate-900 leading-none tracking-tighter mb-3">{donor.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
              <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} className="text-rose-500" /> Verified Member
              </span>
              <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200">NODE: {donor.loginId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12 relative z-10">
          <div className="flex gap-10">
             <div className="text-center group/stat">
                <p className="text-3xl font-[1000] text-slate-900 leading-none mb-1 group-hover/stat:text-rose-600 transition-colors">{impactStats.livesSaved}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lives Impacted</p>
             </div>
             <div className="text-center group/stat">
                <p className="text-3xl font-[1000] text-slate-900 leading-none mb-1 group-hover/stat:text-rose-600 transition-colors">{impactStats.donations}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Donor Logs</p>
             </div>
          </div>
          <div className="h-12 w-px bg-slate-100 hidden md:block"></div>
          <button onClick={onLogout} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-100 shadow-sm">
            <LogOut size={22} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar: Status & Controls */}
        <div className="lg:col-span-4 space-y-8">
          {/* Node Visibility Card */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-10 relative overflow-hidden group">
            {/* Dynamic Status Glow */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] transition-all duration-700 ${isAvailable ? 'bg-emerald-500/10' : 'bg-slate-500/5'}`}></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-300'}`}></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Node Visibility</h4>
              </div>
              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all ${isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {isAvailable ? 'Available' : 'Terminated'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-8 relative z-10">
               {/* Visual Indicator Hub */}
               <div className="relative">
                  <div className={`absolute -inset-4 rounded-full border-2 border-dashed border-slate-100 transition-all duration-[3000ms] ease-linear ${isAvailable ? 'animate-spin-slow border-emerald-200/50 opacity-100' : 'opacity-0'}`}></div>
                  
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center border-4 shadow-2xl transition-all duration-500 ${isAvailable ? 'bg-emerald-500 border-white text-white rotate-0 scale-100' : 'bg-slate-50 border-white text-slate-300 rotate-[-10deg] scale-95'}`}>
                     {isAvailable ? <Radio size={48} className="animate-pulse" /> : <WifiOff size={48} />}
                  </div>
                  
                  {isAvailable && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 border border-emerald-50">
                       <Wifi size={20} className="animate-bounce" />
                    </div>
                  )}
               </div>

               <div className="text-center space-y-3">
                  <h3 className={`text-xl font-black tracking-tighter ${isAvailable ? 'text-slate-900' : 'text-slate-400'}`}>
                    {isAvailable ? 'Broadcasting Presence' : 'Signal Terminated'}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed px-2">
                    {isAvailable 
                      ? 'Your node is currently active and indexed in the global donor registry.' 
                      : !recoveryInfo.isRecovered 
                        ? 'Signal is automatically terminated during the biological recovery window.' 
                        : 'Visibility is manually restricted. Your profile is hidden from active search.'}
                  </p>
               </div>

              <button 
                onClick={handleToggleAvailability}
                disabled={!recoveryInfo.isRecovered}
                className={`w-full py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-[0.97] group/btn overflow-hidden relative ${
                  !recoveryInfo.isRecovered 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                  : isAvailable 
                    ? 'bg-slate-900 text-white hover:bg-rose-600' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                }`}
              >
                <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                <div className="relative z-10 flex items-center gap-4">
                  {!recoveryInfo.isRecovered ? <Timer size={20} /> : isAvailable ? <Power size={20} /> : <Zap size={20} className="animate-pulse" />}
                  {!recoveryInfo.isRecovered ? 'In Recovery' : isAvailable ? 'Terminate Signal' : 'Activate Live Presence'}
                </div>
              </button>
            </div>
          </div>

          {/* Last Donation / Recovery Status Card */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Biological Registry</h4>
              <Clock size={16} className="text-slate-300" />
            </div>

            <div className="space-y-6">
               <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Last Entry Date</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Record'}
                  </p>
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recovery Progress</p>
                    <span className={`text-[10px] font-black ${recoveryInfo.isRecovered ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {recoveryInfo.isRecovered ? 'COMPLETED' : `${recoveryInfo.daysLeft} Days Remaining`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${recoveryInfo.isRecovered ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${recoveryInfo.percent}%` }}
                    ></div>
                  </div>
               </div>

               {!recoveryInfo.isRecovered && (
                 <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 animate-fadeIn">
                   <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] font-bold text-rose-700 leading-relaxed uppercase tracking-wider">
                     Protocol Lockdown: Biological cycle in progress. System will allow signal activation in {recoveryInfo.daysLeft} days.
                   </p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Content Section: Tabs & Data */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex gap-2 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
            {[
              { id: 'profile', label: 'Identity', icon: <CreditCard size={16} /> },
              { id: 'sos', label: 'SOS Hub', icon: <Zap size={16} /> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-slate-950 text-white shadow-2xl scale-102' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[550px]">
            {activeTab === 'profile' && (
              <div className="space-y-12 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <DashboardField label="Registered Identity" icon={<User size={18} />} value={donor.name} readOnly />
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Blood Signature</label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                        <Heart size={18} />
                      </div>
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-8 py-5 text-sm font-black outline-none transition-all shadow-inner focus:border-slate-900 focus:bg-white focus:shadow-sm appearance-none"
                        value={formData.bloodGroup} 
                        onChange={(e) => setFormData({...formData, bloodGroup: e.target.value as BloodGroup})}
                      >
                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <DashboardField label="Terminal Number" icon={<Phone size={18} />} value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} />
                    <DashboardField label="Base Hub" icon={<MapPin size={18} />} value={formData.address} onChange={(v) => setFormData({...formData, address: v})} />
                    <DashboardField label="Current Occupation" icon={<Briefcase size={18} />} value={formData.occupation} onChange={(v) => setFormData({...formData, occupation: v})} />
                    <DashboardField label="Assigned Dept" icon={<Building size={18} />} value={formData.department} onChange={(v) => setFormData({...formData, department: v})} />
                    <DashboardField label="Last Entry Date" icon={<Calendar size={18} />} type="date" value={formData.lastDonationDate} onChange={(v) => setFormData({...formData, lastDonationDate: v})} />
                    <DashboardField label="Auth Passkey" icon={<Key size={18} />} type="text" value={formData.password} onChange={(v) => setFormData({...formData, password: v})} />
                  </div>

                  <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                     {saveSuccess ? (
                       <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-fadeIn">
                         <CheckCircle2 size={18} /> Profile Synchronized
                       </p>
                     ) : <div />}
                     <button type="submit" disabled={isUpdating} className="w-full sm:w-auto bg-slate-950 text-white px-12 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-rose-600 transition-all flex items-center justify-center gap-4 disabled:bg-slate-200">
                        {isUpdating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Commit Node Changes
                     </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'sos' && (
              <div className="space-y-10 animate-fadeIn">
                <div className="p-10 bg-rose-50 rounded-[2.5rem] border border-rose-100 flex items-center gap-8 shadow-inner relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-rose-200/20 rounded-full blur-2xl -mr-20 -mt-20 group-hover:bg-rose-300/30 transition-all"></div>
                   <div className="w-16 h-16 bg-rose-600 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-pulse relative z-10"><ShieldAlert size={36} /></div>
                   <div className="relative z-10">
                      <h4 className="text-2xl font-black text-rose-900 leading-none tracking-tighter">Signal Propagation</h4>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em] mt-2">Broadcast crisis requirement to area nodes</p>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DashboardField label="Crisis Hub" icon={<Building size={18} />} value={sosDraft.hospitalName} onChange={(v) => setSosDraft({...sosDraft, hospitalName: v})} />
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Signature</label>
                        <div className="relative">
                          <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-sm font-black text-slate-900 focus:border-rose-600 outline-none appearance-none shadow-inner" value={sosDraft.bloodGroup} onChange={e => setSosDraft({...sosDraft, bloodGroup: e.target.value as any})}>
                            <option value="All">All Groups (Emergency Burst)</option>
                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg} Specific</option>)}
                          </select>
                          <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
                        </div>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgent Directives</label>
                      <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-8 py-7 text-sm font-medium text-slate-600 focus:border-rose-600 outline-none min-h-[160px] resize-none leading-relaxed shadow-inner" value={sosDraft.message} onChange={e => setSosDraft({...sosDraft, message: e.target.value})} placeholder="Describe the crisis requirements for targeted nodes..." />
                   </div>
                   {sosSuccess ? (
                     <div className="p-14 bg-emerald-500 text-white rounded-[3rem] flex flex-col items-center gap-6 animate-fadeIn shadow-2xl">
                       <CheckCircle2 size={64} />
                       <p className="font-[1000] uppercase tracking-[0.3em] text-xs">Propagation Successful</p>
                     </div>
                   ) : (
                     <button onClick={handleDispatchSOS} disabled={!sosDraft.hospitalName || !sosDraft.message} className="w-full bg-rose-600 text-white py-7 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-2xl hover:bg-rose-700 transition-all flex items-center justify-center gap-5 active:scale-[0.98] disabled:bg-slate-50 disabled:text-slate-200">
                        <Zap size={24} /> Authorize SOS Broadcast
                     </button>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Internal Helper Components */

const DashboardField = ({ label, value, onChange, type = "text", icon, readOnly = false }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
        {icon}
      </div>
      <input 
        type={type} 
        readOnly={readOnly}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-8 py-5 text-sm font-black outline-none transition-all shadow-inner ${readOnly ? 'opacity-50 cursor-default' : 'focus:border-slate-900 focus:bg-white focus:shadow-sm'}`}
        value={value} 
        onChange={onChange ? (e) => onChange(e.target.value) : undefined} 
      />
    </div>
  </div>
);

export default DonorDashboard;
