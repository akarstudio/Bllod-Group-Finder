
import React, { useState } from 'react';
import { db } from '../services/db';
import { AdminUser, AdminRole, Donor } from '../types';
import { ShieldCheck, UserCog, Key, ArrowRight, AlertCircle, Fingerprint, Info, Lock, Terminal, Shield } from 'lucide-react';

interface AdminLoginFormProps {
  onLoginSuccess: (user: AdminUser | Donor, isDonor: boolean) => void;
}

const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Check Admins
      const admins = db.getAdminUsers();
      const foundAdmin = admins.find(a => a.username === username && a.password === password);
      
      if (foundAdmin) {
        db.updateAdminUser(foundAdmin.id, { lastLogin: new Date().toISOString() });
        onLoginSuccess(foundAdmin, false);
        return;
      }

      // 2. Check Donors
      const donors = await db.getDonors();
      const foundDonor = donors.find(d => d.loginId === username && d.password === password);

      if (foundDonor) {
        if (foundDonor.isBlocked) {
          setError('Security Protocol: Node access restricted by command. Authentication suspended.');
          return;
        }
        onLoginSuccess(foundDonor, true);
      } else {
        setError('Handshake Failure: Signature not recognized in the global registry.');
      }
    } catch (err) {
      setError('System Integrity Alert: Encrypted handshake failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4 sm:px-6 animate-fadeIn">
      <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-950 p-14 text-center relative overflow-hidden">
          <div className="relative z-10 w-28 h-28 bg-rose-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-10 shadow-2xl">
            <Fingerprint size={52} strokeWidth={1.2} />
          </div>
          <h2 className="text-4xl font-[900] text-white tracking-tighter">Gateway Access</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-4 opacity-70">Secured Identity Handshake</p>
        </div>

        <form onSubmit={handleLogin} className="p-12 space-y-10">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-6 rounded-[2rem] text-[10px] font-black flex items-start gap-5 border border-rose-100 animate-fadeIn uppercase tracking-[0.15em] leading-relaxed">
              <AlertCircle size={22} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Node ID / Signature</label>
              <button type="button" onClick={() => setShowInfo(!showInfo)} className="text-rose-500 hover:text-rose-600 p-1">
                <Info size={16} />
              </button>
            </div>
            {showInfo && (
              <div className="p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 text-[10px] font-bold text-slate-500 leading-relaxed animate-fadeIn flex gap-4 items-start">
                <Terminal size={18} className="text-rose-400 shrink-0" />
                <p>Donors: Use <span className="text-rose-600 font-black">BDC-IDXXXX</span>. Staff: Use command credentials.</p>
              </div>
            )}
            <div className="relative group/input">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                 <UserCog size={24} />
              </div>
              <input 
                type="text"
                className="w-full border-2 border-slate-100 rounded-[1.8rem] pl-20 pr-8 py-7 text-slate-900 font-black focus:border-rose-600 transition-all text-sm shadow-inner bg-slate-50/20"
                placeholder="BDC-IDXXXX"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Security Passkey</label>
            <div className="relative group/input">
               <div className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                 <Key size={24} />
              </div>
              <input 
                type="password"
                className="w-full border-2 border-slate-100 rounded-[1.8rem] pl-20 pr-8 py-7 text-slate-900 font-black focus:border-rose-600 transition-all text-sm shadow-inner bg-slate-50/20"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-950 text-white py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-5 group/login disabled:bg-slate-200"
          >
            {isLoading ? 'Decrypting...' : 'Execute Authentication'} 
            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginForm;
