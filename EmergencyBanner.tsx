import React from 'react';
import { AlertTriangle, Zap, Info, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { EmergencyAlert } from '../types';

interface EmergencyBannerProps {
  alert: EmergencyAlert;
  onAction?: () => void;
  onClose?: () => void;
  isCompact?: boolean;
}

const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ alert, onAction, onClose, isCompact = false }) => {
  if (!alert.isActive) return null;

  const severityConfigs = {
    Standard: {
      bg: 'from-blue-600 via-indigo-600 to-violet-600',
      shadow: 'shadow-blue-200',
      icon: <Info size={isCompact ? 20 : 28} />,
      label: 'Network Update',
      btnText: 'View',
      pulse: ''
    },
    Urgent: {
      bg: 'from-amber-500 via-orange-600 to-rose-500',
      shadow: 'shadow-orange-200',
      icon: <ShieldAlert size={isCompact ? 20 : 28} />,
      label: 'Priority Request',
      btnText: 'Respond',
      pulse: ''
    },
    Critical: {
      bg: 'from-rose-600 via-rose-700 to-red-800',
      shadow: 'shadow-rose-300',
      icon: <AlertTriangle size={isCompact ? 20 : 28} className="animate-bounce" />,
      label: 'Critical Alert',
      btnText: 'Emergency',
      pulse: 'animate-pulse-soft'
    }
  };

  const config = severityConfigs[alert.severity] || severityConfigs.Critical;

  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${config.bg} p-1 ${config.shadow} shadow-2xl transition-all duration-500 ${config.pulse} animate-fadeIn mb-4 last:mb-0`}>
      {/* Decorative Background Elements */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
      
      <div className={`relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-8 rounded-[2.3rem] ${isCompact ? 'px-6 py-4' : 'px-8 py-6'}`}>
        {/* Icon Container with Glassmorphism */}
        <div className={`flex shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md ${isCompact ? 'h-12 w-12' : 'h-16 w-16'}`}>
          {config.icon}
        </div>
        
        {/* Text Content */}
        <div className="flex-1 text-center md:text-left">
          <div className="mb-1 flex items-center justify-center gap-2 md:justify-start">
            <span className={`h-2 w-2 rounded-full bg-white ${alert.severity !== 'Standard' ? 'animate-ping' : ''}`}></span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/80">
              {config.label}
            </span>
          </div>
          <h4 className={`font-black tracking-tight text-white leading-tight ${isCompact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
            {alert.bloodGroup === 'All' ? 'Emergency' : `${alert.bloodGroup} Required`} @ {alert.hospitalName}
          </h4>
          {!isCompact && (
            <p className="mt-2 text-xs md:text-sm font-medium text-white/90 leading-relaxed opacity-90 italic">
              "{alert.message}"
            </p>
          )}
        </div>

        {/* Call to Action Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onAction}
            className={`group relative flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white font-black uppercase tracking-widest text-slate-900 shadow-xl transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 ${isCompact ? 'px-6 py-3 text-[9px]' : 'px-8 py-4 text-[10px]'}`}
          >
            {config.btnText} 
            <Zap size={12} className={`${alert.severity === 'Critical' ? 'animate-pulse text-rose-600' : 'text-blue-600'}`} />
          </button>
          
          {onClose && (
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyBanner;