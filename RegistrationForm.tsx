
import React, { useState, useMemo } from 'react';
import { BloodGroup, DonorFormData, Donor } from '../types';
import { BLOOD_GROUPS } from '../constants';
import { db } from '../services/db';
import { 
  HeartPulse, 
  CheckCircle2, 
  AlertTriangle, 
  Weight, 
  User, 
  Briefcase, 
  MapPin, 
  Calendar,
  Phone,
  ArrowRight,
  ShieldCheck,
  Key,
  UserCheck,
  Clipboard,
  Check
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: () => void;
}

type Step = 'eligibility' | 'personal' | 'blood' | 'contact' | 'review' | 'success';
const STEPS: Step[] = ['eligibility', 'personal', 'blood', 'contact', 'review'];

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<Step>('eligibility');
  const [generatedDonor, setGeneratedDonor] = useState<Donor | null>(null);
  const [copied, setCopied] = useState(false);

  const [eligibility, setEligibility] = useState({ 
    weight: true, 
    healthy: true, 
    travel: false, 
    medication: false,
    ageConfirmed: true 
  });
  
  const [formData, setFormData] = useState<DonorFormData>({
    name: '',
    bloodGroup: 'O+',
    age: 25,
    gender: 'Male',
    address: '',
    phone: '',
    occupation: '',
    designation: '',
    department: '',
    lastDonationDate: '',
    availability: 'Available'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isEligibleByDate = (dateStr: string) => {
    if (!dateStr) return true;
    const lastDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 90;
  };

  const fieldValidation = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Required";
    if (formData.age < 18 || formData.age > 65) errs.age = "18-65 only";
    const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
    if (!formData.phone.trim()) errs.phone = "Required";
    else if (!phoneRegex.test(formData.phone.trim())) errs.phone = "Invalid format";
    if (!formData.address.trim()) errs.address = "Required";
    return errs;
  }, [formData]);

  const handleInputChange = (field: keyof DonorFormData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'lastDonationDate') {
        next.availability = isEligibleByDate(value) ? 'Available' : 'Not Available';
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const newDonor = await db.addDonor({ ...formData, verificationStatus: 'Unverified' });
      setGeneratedDonor(newDonor);
      setStep('success');
    } catch (error) {
      console.error("Submission failed", error);
      alert("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedDonor) return;
    const text = `BloodConnect Credentials\nID: ${generatedDonor.loginId}\nPassword: ${generatedDonor.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceed = () => {
    if (step === 'eligibility') return eligibility.healthy && eligibility.weight && !eligibility.travel && !eligibility.medication && eligibility.ageConfirmed;
    if (step === 'personal') return !fieldValidation.name && !fieldValidation.age;
    if (step === 'blood') return !!formData.bloodGroup;
    if (step === 'contact') return !fieldValidation.phone && !fieldValidation.address;
    if (step === 'review') return agreedToTerms;
    return true;
  };

  const nextStep = () => {
    if (canProceed()) {
      if (step === 'review') handleSubmit();
      else {
        const currentIndex = STEPS.indexOf(step as any);
        if (currentIndex < STEPS.length - 1) setStep(STEPS[currentIndex + 1] as Step);
      }
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.indexOf(step as any);
    if (currentIndex > 0) setStep(STEPS[currentIndex - 1] as Step);
  };

  if (step === 'success') {
    return (
      <div className="max-w-3xl mx-auto py-20 px-6 text-center animate-fadeIn">
        <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[3rem] flex items-center justify-center text-6xl mx-auto mb-10 shadow-xl border border-emerald-200 animate-bounce">
          <CheckCircle2 size={64} />
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Registration Complete</h1>
        <p className="text-slate-500 text-lg mb-12 max-w-md mx-auto leading-relaxed">Your account has been provisioned. Use the credentials below to access the Viewer Command center.</p>
        
        <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group mb-12">
           <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl"></div>
           <div className="flex flex-col gap-6 relative z-10">
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Access ID</p>
                    <p className="text-white text-2xl font-black tracking-widest font-mono">{generatedDonor?.loginId}</p>
                 </div>
                 <UserCheck size={32} className="text-rose-500" />
              </div>
              <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Passkey</p>
                    <p className="text-white text-2xl font-black tracking-widest font-mono">{generatedDonor?.password}</p>
                 </div>
                 <Key size={32} className="text-rose-500" />
              </div>
           </div>
           <button onClick={copyToClipboard} className={`mt-8 w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${copied ? 'bg-emerald-600 text-white' : 'bg-white text-slate-950 hover:bg-slate-100'}`}>
             {copied ? <><Check size={14} /> Credentials Copied</> : <><Clipboard size={14} /> Copy to Clipboard</>}
           </button>
        </div>

        <button onClick={onSuccess} className="bg-rose-600 text-white px-12 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-4 mx-auto active:scale-95">
          Enter Network <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-fadeIn">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[700px] flex flex-col">
        <div className="bg-slate-900 p-12 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg"><HeartPulse size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Enrollment Step {STEPS.indexOf(step as any) + 1} of 5</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter capitalize">{step.replace('_', ' ')} protocol</h2>
        </div>

        <div className="p-12 flex-1 custom-scrollbar overflow-y-auto max-h-[600px]">
          {step === 'eligibility' && (
            <div className="space-y-10">
              <p className="text-slate-500 font-medium text-lg mb-10">Health screening for system compliance.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ToggleCard label="Weight Threshold" desc="At least 50kg (110lbs)" selected={eligibility.weight} onClick={() => setEligibility({...eligibility, weight: !eligibility.weight})} />
                <ToggleCard label="Current Wellness" desc="No active flu or symptoms" selected={eligibility.healthy} onClick={() => setEligibility({...eligibility, healthy: !eligibility.healthy})} />
              </div>
            </div>
          )}

          {step === 'personal' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-rose-600 border-l-4 border-rose-600 pl-4">Personal Identity</h4>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Full Name</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Full Legal Name" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Age</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="number" value={formData.age} onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Bio Gender</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all appearance-none shadow-inner" value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600 border-l-4 border-blue-600 pl-4">Professional Status</h4>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Occupation</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="text" value={formData.occupation} onChange={(e) => handleInputChange('occupation', e.target.value)} placeholder="Current Profession" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Designation</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="text" value={formData.designation} onChange={(e) => handleInputChange('designation', e.target.value)} placeholder="Current Title" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Department</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="text" value={formData.department} onChange={(e) => handleInputChange('department', e.target.value)} placeholder="Assigned Unit" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'blood' && (
            <div className="space-y-10 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 ml-2 text-center">Serotype Selection</label>
                <div className="grid grid-cols-4 gap-4">
                  {BLOOD_GROUPS.map((bg) => (
                    <button key={bg} onClick={() => handleInputChange('bloodGroup', bg)} className={`h-16 rounded-2xl border-2 transition-all font-black text-xl shadow-sm ${formData.bloodGroup === bg ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200'}`}>{bg}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Previous Entry Date</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black outline-none shadow-inner" type="date" value={formData.lastDonationDate} onChange={(e) => handleInputChange('lastDonationDate', e.target.value)} />
                {formData.lastDonationDate && !isEligibleByDate(formData.lastDonationDate) && <p className="mt-4 text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> System marked as "Recovering" (90 days not yet reached)</p>}
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Mobile Uplink</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+..." />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Location Hub</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 text-slate-900 font-black focus:border-rose-500 outline-none transition-all shadow-inner" type="text" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Area / City" />
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-inner">
                <ReviewItem label="Name" value={formData.name} />
                <ReviewItem label="Group" value={formData.bloodGroup} highlight />
                <ReviewItem label="Designation" value={formData.designation || 'Not Provided'} />
                <ReviewItem label="Department" value={formData.department || 'Not Provided'} />
                <ReviewItem label="Phone" value={formData.phone} />
                <ReviewItem label="Zone" value={formData.address} />
              </div>
              <label className="flex items-start gap-4 p-8 bg-rose-50 rounded-[2rem] border border-rose-100 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 accent-rose-600" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                <span className="text-[11px] font-bold text-rose-900 leading-relaxed">I certify that all information is accurate and I voluntarily join the community registry.</span>
              </label>
            </div>
          )}
        </div>

        <div className="p-12 border-t border-slate-50 flex justify-between bg-slate-50/50 shrink-0">
          {STEPS.indexOf(step as any) > 0 ? (
            <button onClick={prevStep} className="px-10 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-600 transition-colors">Back</button>
          ) : <div />}
          
          <button onClick={nextStep} disabled={isLoading || !canProceed()} className="bg-slate-900 text-white px-14 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-rose-600 disabled:bg-slate-200 transition-all flex items-center gap-3">
            {step === 'review' ? 'Activate node' : 'Proceed'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleCard = ({ label, desc, selected, onClick }: { label: string, desc: string, selected: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${selected ? 'bg-white border-rose-600 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
    <p className="font-black text-slate-900 text-lg mb-1">{label}</p>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{desc}</p>
  </button>
);

const ReviewItem = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
  <div className="flex justify-between items-center pb-3 border-b border-slate-200 last:border-0 last:pb-0">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`font-black text-right truncate ml-4 ${highlight ? 'text-2xl text-rose-600' : 'text-slate-900 text-sm'}`}>{value}</span>
  </div>
);

export default RegistrationForm;
