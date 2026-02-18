
import React, { useState } from 'react';
import { AppView } from '../types';
import { 
  Home, 
  Search, 
  HeartPulse, 
  ShieldCheck, 
  Brain, 
  Menu, 
  X, 
  Droplets,
  Stethoscope,
  ShieldAlert,
  Fingerprint,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  CircleArrowRight,
  UserCircle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isAdmin: boolean;
  isDonor?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, isAdmin, isDonor }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dynamic Navigation Items
  const navItems = [
    { view: AppView.HOME, label: 'Home', icon: Home },
    { view: AppView.SEARCH, label: 'Find Donors', icon: Search },
    { view: AppView.REGISTER, label: 'Be a Donor', icon: HeartPulse },
    { view: AppView.CHAT, label: 'Assistant', icon: Brain },
  ];

  // Logic: Show Command (Admin) OR Dashboard (Donor) OR Login (Staff)
  if (isAdmin) {
    navItems.push({ view: AppView.ADMIN, label: 'Command', icon: ShieldCheck });
  } else if (isDonor) {
    navItems.push({ view: AppView.DONOR_DASHBOARD, label: 'Dashboard', icon: UserCircle });
  } else {
    navItems.push({ view: AppView.ADMIN_LOGIN, label: 'Staff Hub', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-rose-100 selection:text-rose-900">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => onNavigate(AppView.HOME)}>
              <div className="bg-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-all">
                <Droplets size={24} />
              </div>
              <div>
                <h1 className="font-extrabold text-xl text-slate-900 tracking-tighter leading-none">BloodConnect</h1>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 mt-1">Live Network</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 group/nav ${
                      isActive ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-rose-600' : 'opacity-50'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="lg:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 p-4 space-y-2 animate-fadeIn shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => { onNavigate(item.view); setIsMenuOpen(false); }}
                  className={`flex items-center gap-5 w-full px-6 py-5 rounded-2xl text-base font-bold transition-all ${
                    isActive ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-slate-950 text-slate-300 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-rose-600/10 rounded-2xl flex items-center justify-center border border-rose-600/20">
                  <Droplets className="text-rose-500" size={32} />
                </div>
                <h2 className="text-white font-black text-2xl tracking-tighter">BloodConnect</h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-400 font-medium max-w-xs">Verified, P2P donor coordination network.</p>
            </div>
            
            <div>
              <h3 className="text-white font-black mb-8 text-xs uppercase tracking-[0.3em] flex items-center gap-3">Platform</h3>
              <ul className="space-y-4 text-sm font-semibold">
                <li><button onClick={() => onNavigate(AppView.SEARCH)} className="hover:text-rose-400">Live Registry</button></li>
                <li><button onClick={() => onNavigate(AppView.REGISTER)} className="hover:text-rose-400">Enrollment</button></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-black mb-8 text-xs uppercase tracking-[0.3em] flex items-center gap-3">Essentials</h3>
              <ul className="space-y-4 text-sm font-semibold">
                <li><a href="#" className="hover:text-rose-400">Safety Checklist</a></li>
                <li><button onClick={() => onNavigate(AppView.ADMIN_LOGIN)} className="hover:text-rose-400">Staff Hub</button></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-black mb-8 text-xs uppercase tracking-[0.3em] flex items-center gap-3">Integrity</h3>
              <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800">
                <p className="text-[11px] leading-relaxed italic text-slate-400 mb-4">"Humanitarian registry strictly. Commercial activity prohibited."</p>
                <div className="flex gap-3">
                  <Fingerprint className="text-emerald-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Verified Protocol</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-12 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} BloodConnect.</div>
            <div className="flex gap-10">
              <Facebook size={18} className="text-slate-500" />
              <Twitter size={18} className="text-slate-500" />
              <Instagram size={18} className="text-slate-500" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
