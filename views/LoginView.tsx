
import React, { useState, useRef } from 'react';
import { ArrowRight, Lock, User as UserIcon, Hash, Loader2, AlertCircle, Zap, ShieldAlert, Key, MessageSquare, Palette, Globe, Layout as LayoutIcon, ChevronRight } from 'lucide-react';
import { AppRole, User } from '../types';
import { studentService } from '../services/studentService';
import { staffService } from '../services/staffService';

interface LoginViewProps {
  onLogin: (user: User) => void;
  onParentSetup?: () => void;
}

const ADMIN_PIN = "357159";

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onParentSetup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpType, setSignUpType] = useState<'STUDENT' | 'STAFF'>('STUDENT');
  const [pinInput, setPinInput] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>(AppRole.STUDENT);
  const [showPinPrompt, setShowPinPrompt] = useState(false);

  // Settings State
  const [theme, setTheme] = useState('Classic');
  const [language, setLanguage] = useState('EN');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDbError(null);

    // Default admin bypass
    if (loginId.toLowerCase() === 'admin' && loginPassword === 'admin') {
      onLogin({ id: 'admin', name: 'System Admin', role: AppRole.ADMIN_PRINCIPAL, assignedValue: 'Central' });
      setIsLoading(false);
      return;
    }

    try {
      if (selectedRole === AppRole.STUDENT) {
        const data = await studentService.getStudentByRoll(loginId);
        if (!data) throw new Error("Credentials not recognized.");
        if (data.password !== loginPassword) throw new Error("Unauthorized access key.");
        onLogin({ id: data.roll_no, name: data.name, role: AppRole.STUDENT, hasGeneratedQR: data.has_generated_qr || false });
      } else {
        const data = await staffService.getStaffByIdOrEmail(loginId);
        if (!data) throw new Error("Identity verification failed.");
        if (data.password !== loginPassword) throw new Error("Unauthorized access key.");
        onLogin({ id: data.id, name: data.name, role: data.role as AppRole, assignedValue: data.assigned_value });
      }
    } catch (err: any) { setDbError(err.message); }
    finally { setIsLoading(false); }
  };

  const verifyPin = () => {
    if (pinInput === ADMIN_PIN) {
      setShowPinPrompt(false);
      setSignUpType('STAFF');
      setIsSignUp(true);
      setPinInput('');
    } else {
      setDbError("Authorization Denied: Invalid PIN.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Premium Gradient Background - Refined and Softer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1c2c] via-[#4a148c] to-[#040404] opacity-90" />
      <div className="absolute top-[-25%] left-[-15%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[80%] h-[80%] bg-indigo-600/15 rounded-full blur-[180px] pointer-events-none" />
      
      {/* Top Navbar Simulation */}
      <div className="absolute top-0 w-full p-8 hidden md:flex justify-between items-center z-50">
        <div className="flex items-center gap-2 text-white/40">
           <ShieldAlert className="w-4 h-4" />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure Node: 0x82A</span>
        </div>
        <div className="flex gap-4">
          <SettingsChip icon={<Globe />} label={language} onClick={() => setLanguage(l => l === 'EN' ? 'HI' : 'EN')} />
          <SettingsChip icon={<Palette />} label={theme} onClick={() => setTheme(t => t === 'Classic' ? 'Modern' : 'Classic')} />
        </div>
      </div>

      {/* Main Content Hub */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex flex-col space-y-8 animate-in slide-in-from-left duration-1000">
          <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 pr-8 rounded-full border border-white/10 self-start">
            <div className="bg-purple-500 p-3 rounded-full shadow-lg shadow-purple-900/40">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight leading-none">DGVC <span className="text-purple-400">Attendance</span></h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Enterprise Access Suite</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-white leading-[1.1] tracking-tighter">
              Digital Governance <br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent italic">Simplified.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
              Authenticate into the attendance ecosystem. Secure, smart, and efficient management for the modern institution.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureBox title="PWA Enabled" desc="Install on mobile directly" />
            <FeatureBox title="Real-time Sync" desc="Instant attendance logs" />
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] p-8 md:p-12 relative overflow-hidden group">
            {/* Subtle card internal glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl pointer-events-none" />
            
            {showPinPrompt ? (
               <div className="space-y-8 animate-in fade-in zoom-in-95 text-center py-4">
               <div className="bg-purple-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/20">
                 <ShieldAlert className="text-purple-400 w-8 h-8" />
               </div>
               <div className="space-y-2">
                 <h2 className="text-2xl font-black text-white">Verification</h2>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Restricted to Faculty</p>
               </div>
               
               <div className="space-y-6">
                 <PremiumInput label="Auth PIN" type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} icon={<Key />} />
                 {dbError && <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">{dbError}</p>}
                 <div className="flex gap-3">
                   <button onClick={() => setShowPinPrompt(false)} className="flex-1 px-6 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/5 hover:bg-white/10 transition-all">Cancel</button>
                   <button onClick={verifyPin} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-purple-900/50 transition-all active:scale-95">Proceed</button>
                 </div>
               </div>
             </div>
            ) : isSignUp ? (
              <div className="text-center space-y-8 py-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-white">Enrollment Hub</h2>
                  <p className="text-slate-400 text-sm">Please utilize the internal terminal for new account commission steps.</p>
                </div>
                <button onClick={() => setIsSignUp(false)} className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full text-purple-400 font-bold uppercase text-[10px] tracking-widest border border-white/10 hover:bg-white/10 transition-all">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to Portal
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-7 animate-in fade-in duration-700">
                <div className="lg:hidden text-center mb-8">
                  <h1 className="text-3xl font-black text-white tracking-tighter">DGVC <span className="text-purple-400">Portal</span></h1>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Security Login</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Authenticate your credentials</p>
                </div>

                {dbError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none">{dbError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-purple-400/80 uppercase tracking-widest ml-2">Access Level</label>
                    <div className="relative group/select">
                      <select 
                        value={selectedRole} 
                        onChange={(e) => setSelectedRole(e.target.value as AppRole)} 
                        className="w-full pl-6 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold appearance-none cursor-pointer focus:border-purple-500/50 transition-all text-xs"
                      >
                        <option value={AppRole.STUDENT}>Student Learner</option>
                        <option value={AppRole.ADMIN_TEACHER}>Academic Faculty</option>
                        <option value={AppRole.ADMIN_HOD}>Department Head</option>
                        <option value={AppRole.DISCIPLINE_INCHARGE}>Discipline Logic</option>
                        <option value={AppRole.ADMIN_PRINCIPAL}>Executive Hub</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <PremiumInput label="Digital Identity (Roll No/E-mail)" value={loginId} onChange={(e) => setLoginId(e.target.value)} icon={<UserIcon />} />
                  <PremiumInput label="Secret Key" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} icon={<Lock />} />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl shadow-purple-900/40 active:scale-[0.98] border border-white/5 group"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <>Authorize Entry <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>

                <div className="pt-2 space-y-4">
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-slate-600 text-[8px] font-black uppercase tracking-widest leading-none">External Link</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={onParentSetup}
                    className="w-full bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-emerald-500/10 group"
                  >
                    <MessageSquare className="w-3.5 h-3.5" fill="currentColor" /> Parent Hub: WhatsApp Secure
                  </button>
                  
                  <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={() => { setSignUpType('STUDENT'); setIsSignUp(true); }} className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.2em] hover:text-purple-400 transition-colors">Apply for Enrollment</button>
                    <button type="button" onClick={() => setShowPinPrompt(true)} className="text-slate-600 text-[8px] font-bold uppercase tracking-[0.2em] hover:text-white transition-colors underline underline-offset-4">Faculty Commission</button>
                  </div>
                </div>
              </form>
            )}
          </div>
          
          <div className="mt-8 flex justify-center items-center gap-8">
             <div className="text-center">
               <span className="block text-white font-black text-xs">2k+</span>
               <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Active nodes</span>
             </div>
             <div className="w-px h-6 bg-white/10" />
             <div className="text-center">
               <span className="block text-white font-black text-xs">99.9%</span>
               <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Efficiency</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for professional look
const FeatureBox = ({ title, desc }: { title: string, desc: string }) => (
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl space-y-1">
    <h4 className="text-white font-black text-xs tracking-wide">{title}</h4>
    <p className="text-slate-500 text-[9px] font-medium leading-tight">{desc}</p>
  </div>
);

const SettingsChip = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group active:scale-95"
  >
    <span className="text-purple-400/80 group-hover:text-purple-400 group-hover:scale-110 transition-all">{icon}</span>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
  </button>
);

const PremiumInput = ({ label, type = "text", value, onChange, icon }: { label: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, icon?: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-400/30 group-focus-within:text-purple-400 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:border-purple-500/40 focus:ring-4 ring-purple-500/10 outline-none font-bold transition-all placeholder:text-slate-700"
        placeholder="••••••••"
      />
    </div>
  </div>
);

export default LoginView;
