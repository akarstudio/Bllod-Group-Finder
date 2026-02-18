import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Donor, BloodGroup, EmergencyAlert, AdminUser } from './types';
import { db } from './services/db';
import { BLOOD_GROUPS } from './constants';
import Layout from './components/Layout';
import DonorCard from './components/DonorCard';
import RegistrationForm from './components/RegistrationForm';
import AdminPanel from './components/AdminPanel';
import AdminLoginForm from './components/AdminLoginForm';
import ChatAssistant from './components/ChatAssistant';
import DonorDashboard from './components/DonorDashboard';
import EmergencyBanner from './components/EmergencyBanner';
import { 
  Search, 
  Plus, 
  Users, 
  Zap, 
  MapPin, 
  ShieldCheck, 
  Heart, 
  Radio, 
  ArrowRight,
  MousePointer2,
  Activity,
  HandHeart,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchQuery, setSearchQuery] = useState({ group: '' as BloodGroup | '', location: '' });
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AdminUser | null>(null);
  const [authenticatedDonor, setAuthenticatedDonor] = useState<Donor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>(db.getEmergencyAlerts());

  const [searchPage, setSearchPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    const session = db.getSession();
    if (session) {
      if (session.type === 'admin') {
        setAuthenticatedAdmin(session.user as AdminUser);
        setCurrentView(AppView.ADMIN);
      } else {
        setAuthenticatedDonor(session.user as Donor);
        setCurrentView(AppView.DONOR_DASHBOARD);
      }
    }

    refreshDonors();
    const interval = setInterval(() => {
      setEmergencyAlerts(db.getEmergencyAlerts());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSearchPage(1);
  }, [searchQuery, itemsPerPage]);

  const refreshDonors = async () => {
    setIsLoading(true);
    try {
      const data = await db.getDonors();
      setDonors(data || []);
      if (authenticatedDonor) {
        const updated = (data || []).find(d => d.id === authenticatedDonor.id);
        if (updated) setAuthenticatedDonor(updated);
      }
    } catch (e) {
      console.error("Error fetching donors:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAlertAction = (alert: EmergencyAlert) => {
    if (alert.bloodGroup !== 'All') {
      setSearchQuery({ ...searchQuery, group: alert.bloodGroup as BloodGroup });
    } else {
      setSearchQuery({ ...searchQuery, group: '' });
    }
    handleNavigate(AppView.SEARCH);
  };

  const handleLogout = () => {
    db.clearSession();
    setAuthenticatedAdmin(null);
    setAuthenticatedDonor(null);
    handleNavigate(AppView.HOME);
  };

  const filteredDonors = useMemo(() => {
    return (donors || []).filter(donor => {
      if (!donor) return false;
      // EXCLUDE BLOCKED NODES
      if (donor.isBlocked) return false;

      const matchesGroup = !searchQuery.group || donor.bloodGroup === searchQuery.group;
      
      const donorAddress = String(donor.address || '').toLowerCase();
      const searchLoc = String(searchQuery.location || '').toLowerCase();
      const matchesLocation = !searchLoc || donorAddress.includes(searchLoc);
      
      return matchesGroup && matchesLocation;
    });
  }, [donors, searchQuery]);

  const paginatedDonors = useMemo(() => {
    const start = (searchPage - 1) * itemsPerPage;
    return filteredDonors.slice(start, start + itemsPerPage);
  }, [filteredDonors, searchPage, itemsPerPage]);

  const totalSearchPages = Math.ceil(filteredDonors.length / itemsPerPage);

  const getSearchPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalSearchPages <= maxVisible + 2) {
      for (let i = 1; i <= totalSearchPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (searchPage > 3) pages.push('...');
      const start = Math.max(2, searchPage - 1);
      const end = Math.min(totalSearchPages - 1, searchPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (searchPage < totalSearchPages - 2) pages.push('...');
      pages.push(totalSearchPages);
    }
    return pages;
  };

  const isAdmin = !!authenticatedAdmin;
  const isDonor = !!authenticatedDonor;

  return (
    <Layout 
      currentView={currentView} 
      onNavigate={handleNavigate} 
      isAdmin={isAdmin}
      isDonor={isDonor}
    >
      {currentView === AppView.HOME && (
        <div className="animate-fadeIn">
          <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[85vh]">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">Network Operational</span>
              </div>
              
              <div className="relative">
                <h1 className="text-7xl md:text-8xl font-black text-slate-900 leading-[1.05] tracking-tight">
                  Real-Time <br />
                  <span className="relative inline-block">
                    Blood Search
                    <span className="absolute -bottom-1 left-0 w-full h-3 bg-rose-100 -z-10 rounded-full"></span>
                  </span>
                </h1>
              </div>
              
              <p className="text-xl text-slate-500 max-w-lg leading-relaxed font-medium">
                A sophisticated, verified network connecting voluntary life-savers with patients in seconds.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => handleNavigate(AppView.SEARCH)}
                  className="bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-rose-600 transition-all flex items-center gap-3 active:scale-95"
                >
                  Find a Hero <Radio size={16} />
                </button>
                <button 
                  onClick={() => handleNavigate(AppView.REGISTER)}
                  className="bg-white text-rose-600 border border-rose-100 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all flex items-center gap-3 active:scale-95"
                >
                  <Plus size={16} /> Join Registry
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <MousePointer2 size={12} className="text-rose-500" /> Direct Serotype Access
                </p>
                <div className="flex flex-wrap gap-2">
                  {(BLOOD_GROUPS || []).map(group => (
                    <button 
                      key={group}
                      onClick={() => {
                        setSearchQuery({ ...searchQuery, group });
                        handleNavigate(AppView.SEARCH);
                      }}
                      className="w-12 h-12 rounded-xl bg-white border border-slate-100 text-slate-900 font-black text-sm hover:border-rose-500 hover:text-rose-600 hover:shadow-lg transition-all"
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-6 items-center">
              <HeroCard 
                icon={<Zap size={24} />} 
                title="Rapid Link" 
                desc="Sub-second indexing." 
                color="bg-rose-500" 
                className="mt-12"
              />
              <HeroCard 
                icon={<MapPin size={24} />} 
                title="Local Focus" 
                desc="City-wide search." 
                color="bg-indigo-500" 
              />
              <HeroCard 
                icon={<ShieldCheck size={24} />} 
                title="Trust Shield" 
                desc="Medical vetting." 
                color="bg-emerald-500" 
              />
              <HeroCard 
                icon={<HandHeart size={24} />} 
                title="Purely Free" 
                desc="Humanitarian only." 
                color="bg-amber-500" 
                className="-mt-12"
              />
            </div>
          </section>

          {(emergencyAlerts || []).length > 0 && (
            <section className="max-w-6xl mx-auto px-6 py-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg animate-pulse">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Active Emergency Pulses</h2>
                </div>
                {(emergencyAlerts || []).map((alert, idx) => (
                  <EmergencyBanner 
                    key={alert.id}
                    alert={alert} 
                    isCompact={idx > 0}
                    onAction={() => handleAlertAction(alert)} 
                  />
                ))}
              </div>
            </section>
          )}

          <section className="max-w-7xl mx-auto px-6 py-16">
            <div className="bg-slate-950 rounded-[4rem] p-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-center text-white">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-rose-500"><Users size={24} /></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Global Registry</p>
                <p className="text-7xl font-black tracking-tighter">{donors.length}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Life-Savers</p>
              </div>
              <div className="space-y-4 border-x border-white/5">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-emerald-500"><Heart size={24} /></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Instant Ready</p>
                <p className="text-7xl font-black tracking-tighter text-emerald-500">{donors.filter(d => d.availability === 'Available').length}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified Availability</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-indigo-500"><ShieldCheck size={24} /></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Health</p>
                <p className="text-7xl font-black tracking-tighter">100%</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ethical Protocol Adherence</p>
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Telemetry Feed
                </p>
                <h2 className="text-6xl font-black text-slate-900 tracking-tighter">Recent Life-Savers</h2>
              </div>
              <button 
                onClick={() => handleNavigate(AppView.SEARCH)}
                className="bg-white border-2 border-slate-900 text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-950 hover:text-white transition-all flex items-center gap-3 active:scale-95"
              >
                Access Full Registry <ArrowRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {isLoading && donors.length === 0 ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-[600px] bg-slate-50 rounded-[3rem] animate-pulse"></div>)
              ) : (
                donors.slice(0, 3).map(donor => (
                  <DonorCard key={donor.id} donor={donor} isLoggedIn={!!authenticatedAdmin || !!authenticatedDonor} onRefresh={refreshDonors} />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {currentView === AppView.SEARCH && (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-fadeIn space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Donor Directory</h1>
              <p className="text-slate-500 font-medium text-lg">Locate verified blood group assets in your perimeter.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-10 sticky top-24">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Serotype Filter</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-sm focus:border-rose-500 outline-none shadow-inner" 
                    value={searchQuery.group} 
                    onChange={(e) => setSearchQuery({...searchQuery, group: e.target.value as BloodGroup})}
                  >
                    <option value="">All Serotypes</option>
                    {(BLOOD_GROUPS || []).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Hub Location</label>
                  <div className="relative group">
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="City or Area Hub..." 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-5 font-black text-sm focus:border-rose-500 outline-none shadow-inner" 
                      value={searchQuery.location} 
                      onChange={(e) => setSearchQuery({...searchQuery, location: e.target.value})} 
                    />
                  </div>
                </div>
                <button onClick={() => setSearchQuery({ group: '', location: '' })} className="w-full text-xs font-black text-rose-600 uppercase tracking-widest hover:text-rose-700 transition-colors">Reset Protocol Filters</button>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-10">
              {paginatedDonors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {paginatedDonors.map(donor => (
                    <DonorCard 
                      key={donor.id} 
                      donor={donor} 
                      onRefresh={refreshDonors} 
                      isLoggedIn={!!authenticatedAdmin || !!authenticatedDonor}
                      isAdminMode={isAdmin} 
                    />
                  ))}
                </div>
              ) : (
                <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><Search size={48} /></div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Zero Nodes matched query</p>
                </div>
              )}

              {totalSearchPages > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex-wrap">
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2.5rem] border border-slate-100 flex-wrap justify-center">
                    <button 
                      disabled={searchPage === 1}
                      onClick={() => { setSearchPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="p-4 bg-white rounded-2xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                       {getSearchPageNumbers().map((p, i) => (
                         <button
                          key={i}
                          disabled={p === '...'}
                          onClick={() => { typeof p === 'number' && setSearchPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className={`w-12 h-12 rounded-2xl text-xs font-black transition-all ${searchPage === p ? 'bg-slate-950 text-white shadow-xl scale-110' : p === '...' ? 'bg-transparent text-slate-400 cursor-default' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'}`}
                         >
                           {p}
                         </button>
                       ))}
                    </div>

                    <button 
                      disabled={searchPage === totalSearchPages}
                      onClick={() => { setSearchPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="p-4 bg-white rounded-2xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full md:w-auto text-center md:text-right">
                    Assets { (searchPage - 1) * itemsPerPage + 1 } - { Math.min(searchPage * itemsPerPage, filteredDonors.length) } of { filteredDonors.length }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentView === AppView.REGISTER && <RegistrationForm onSuccess={() => { refreshDonors(); handleNavigate(AppView.HOME); }} />}
      {currentView === AppView.ADMIN_LOGIN && (
        <AdminLoginForm 
          onLoginSuccess={(user, typeIsDonor) => { 
            db.setSession(user, typeIsDonor ? 'donor' : 'admin');
            if (typeIsDonor) {
              setAuthenticatedDonor(user as Donor);
              handleNavigate(AppView.DONOR_DASHBOARD);
            } else {
              setAuthenticatedAdmin(user as AdminUser);
              handleNavigate(AppView.ADMIN);
            }
          }} 
        />
      )}
      {currentView === AppView.ADMIN && authenticatedAdmin && (
        <AdminPanel donors={donors} currentAdmin={authenticatedAdmin} onRefresh={refreshDonors} onLogout={handleLogout} />
      )}
      {currentView === AppView.DONOR_DASHBOARD && authenticatedDonor && (
        <DonorDashboard donor={authenticatedDonor} onRefresh={refreshDonors} onLogout={handleLogout} />
      )}
      {currentView === AppView.CHAT && <div className="py-12 max-w-7xl mx-auto px-4"><ChatAssistant /></div>}
    </Layout>
  );
};

const HeroCard = ({ icon, title, desc, color, className = "" }: any) => (
  <div className={`bg-white p-10 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] border border-slate-50 relative group transition-all hover:-translate-y-2 hover:shadow-2xl ${className}`}>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg ${color}`}>
      {icon}
    </div>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{title}</h3>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{desc}</p>
  </div>
);

export default App;