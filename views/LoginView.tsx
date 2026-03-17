
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
    <div className="login-view">
      {/* Premium Gradient Background */}
      <div className="login-bg" />
      <div className="login-glow login-glow-top" />
      <div className="login-glow login-glow-bottom" />
      
      {/* Top Navbar Simulation */}
      <div className="absolute top-0 w-full p-8 md-hidden between z-50">
        <div className="flex items-center gap-2 text-white opacity-40">
           <ShieldAlert className="w-4 h-4" />
           <span className="text-xs font-bold uppercase tracking-widest">Secure Node: 0x82A</span>
        </div>
        <div className="flex gap-4">
          <SettingsChip icon={<Globe />} label={language} onClick={() => setLanguage(l => l === 'EN' ? 'HI' : 'EN')} />
          <SettingsChip icon={<Palette />} label={theme} onClick={() => setTheme(t => t === 'Classic' ? 'Modern' : 'Classic')} />
        </div>
      </div>

      {/* Main Content Hub */}
      <div className="relative z-10 w-full max-w-6xl lg-grid grid-cols-1 gap-12 items-center" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Left Side: Branding & Info */}
        <div className="hidden lg-flex flex-col gap-8 animate-slide-up">
          <div className="login-branding">
            <div className="bg-purple-600 p-3 rounded-full shadow-lg">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">DGVC <span className="text-purple-400">Attendance</span></h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enterprise Access Suite</p>
            </div>
          </div>
          
          <div className="flex-col gap-6">
            <h1 className="text-6xl font-black text-white tracking-tighter">
              Digital Governance <br />
              <span className="text-gradient-purple italic">Simplified.</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
              Authenticate into the attendance ecosystem. Secure, smart, and efficient management for the modern institution.
            </p>
          </div>

          <div className="flex gap-4">
            <FeatureBox title="PWA Enabled" desc="Install on mobile directly" />
            <FeatureBox title="Real-time Sync" desc="Instant attendance logs" />
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full m-auto">
          <div className="login-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 blur-3xl pointer-events-none" />
            
            {showPinPrompt ? (
               <div className="flex-col gap-8 animate-fade text-center py-4">
               <div className="bg-purple-600 opacity-20 w-16 h-16 rounded-2xl center m-auto border border-purple-500">
                 <ShieldAlert className="text-purple-400 w-8 h-8" />
               </div>
               <div className="flex-col gap-2">
                 <h2 className="text-2xl font-black text-white">Verification</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entry Restricted to Faculty</p>
               </div>
               
               <div className="flex-col gap-6">
                 <PremiumInput label="Auth PIN" type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} icon={<Key />} />
                 {dbError && <p className="rose-500 text-xs font-bold uppercase tracking-widest animate-pulse">{dbError}</p>}
                 <div className="flex gap-3">
                   <button onClick={() => setShowPinPrompt(false)} className="btn-secondary flex-1">Cancel</button>
                   <button onClick={verifyPin} className="btn-premium flex-1">Proceed</button>
                 </div>
               </div>
             </div>
            ) : isSignUp ? (
              <div className="text-center flex-col gap-8 py-10 animate-fade">
                <div className="flex-col gap-3">
                  <h2 className="text-3xl font-black text-white">Enrollment Hub</h2>
                  <p className="text-slate-400 text-sm">Please utilize the internal terminal for new account commission steps.</p>
                </div>
                <button onClick={() => setIsSignUp(false)} className="settings-chip m-auto">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to Portal
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex-col gap-8 animate-fade">
                <div className="lg-hidden text-center mb-8">
                  <h1 className="text-3xl font-black text-white tracking-tighter">DGVC <span className="text-purple-400">Portal</span></h1>
                </div>

                <div className="flex-col gap-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Security Login</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authenticate your credentials</p>
                </div>

                {dbError && (
                  <div className="p-4 bg-rose-500 opacity-10 border border-rose-500 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <p className="text-xs font-bold text-rose-500 uppercase tracking-widest leading-none">{dbError}</p>
                  </div>
                )}

                <div className="flex-col gap-4">
                  <div className="flex-col gap-2">
                    <label className="text-xs font-black text-purple-400 uppercase tracking-widest ml-2">Access Level</label>
                    <div className="relative">
                      <select 
                        value={selectedRole} 
                        onChange={(e) => setSelectedRole(e.target.value as AppRole)} 
                        className="input-standard appearance-none cursor-pointer pr-12"
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
                  className="btn-login"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <>Authorize Entry <ChevronRight className="w-4 h-4" /></>}
                </button>

                <div className="pt-2 flex-col gap-4">
                  <div className="relative center py-2">
                    <div className="w-full border-t border-white opacity-5"></div>
                    <span className="absolute bg-slate-900 px-4 text-slate-600 text-xs font-black uppercase tracking-widest">External Link</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={onParentSetup}
                    className="btn-whatsapp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" fill="currentColor" /> Parent Hub: WhatsApp Secure
                  </button>
                  
                  <div className="between pt-2">
                    <button type="button" onClick={() => { setSignUpType('STUDENT'); setIsSignUp(true); }} className="text-slate-400 text-xs font-bold uppercase tracking-widest pointer hover-purple">Apply for Enrollment</button>
                    <button type="button" onClick={() => setShowPinPrompt(true)} className="text-slate-600 text-xs font-bold uppercase tracking-widest pointer hover-white underline">Faculty Commission</button>
                  </div>
                </div>
              </form>
            )}
          </div>
          
          <div className="mt-8 center gap-8">
             <div className="text-center">
               <span className="block text-white font-black text-xs">2k+</span>
               <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">Active nodes</span>
             </div>
             <div className="w-px h-6 bg-white opacity-10" />
             <div className="text-center">
               <span className="block text-white font-black text-xs">99.9%</span>
               <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">Efficiency</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for professional look with Vanilla CSS
const FeatureBox = ({ title, desc }: { title: string, desc: string }) => (
  <div className="feature-box flex-col gap-1">
    <h4 className="text-white font-black text-xs tracking-wide">{title}</h4>
    <p className="text-slate-400 text-xs font-medium leading-tight">{desc}</p>
  </div>
);

const SettingsChip = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="settings-chip"
  >
    <span className="text-purple-400">{icon}</span>
    <span className="text-xs font-black uppercase tracking-widest">{label}</span>
  </button>
);

const PremiumInput = ({ label, type = "text", value, onChange, icon }: { label: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, icon?: React.ReactNode }) => (
  <div className="premium-input-container">
    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative">
      <div className="input-icon">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="input-standard"
        style={{ paddingLeft: '3.5rem' }}
        placeholder="••••••••"
      />
    </div>
  </div>
);

export default LoginView;
