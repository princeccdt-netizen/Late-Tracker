import React, { useState } from 'react';
import { ArrowRight, Lock, User as UserIcon, Loader2, AlertCircle, ChevronDown, ChevronRight, Key, MessageSquare } from 'lucide-react';
import { AppRole, User } from '../types';
import { studentService } from '../services/studentService';
import { staffService } from '../services/staffService';

interface LoginViewProps {
  onLogin: (user: User) => void;
  onParentSetup?: () => void;
}

const ADMIN_PIN = "357159";

const PremiumInput = ({ label, type = "text", value, onChange, icon, placeholder }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
    <label className="login-label">{label}</label>
    <div style={{ position: 'relative', width: '100%' }}>
      <div className="login-icon-pink">
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="login-input"
        placeholder={placeholder}
      />
    </div>
  </div>
);

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

    if (loginId.toLowerCase() === 'faculty' && loginPassword === 'faculty') {
      onLogin({ id: 'faculty1', name: 'Dr. Ramesh Kumar', role: AppRole.FACULTY, assignedValue: 'CS' });
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
    <div className="login-bg-pink" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingTop: '4rem', overflow: 'hidden' }}>
      
      {/* Branding Head */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '2.5rem', flexShrink: 0 }}>
        <h1 className="login-title-color" style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1 }}>DGVC Attendance</h1>
        <p className="login-subtitle">College Access Management</p>
      </div>

      {/* Login Card */}
      <div className="login-card-radius" style={{ width: '100%', flex: 1, padding: '3rem 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {showPinPrompt ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '0.5rem 0', position: 'relative', zIndex: 10 }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <h2 className="login-title-color" style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em' }}>Verification</h2>
               <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entry Restricted to Faculty</p>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', textAlign: 'left' }}>
                <PremiumInput label="Auth PIN" type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} icon={<Key />} placeholder="••••••" />
               {dbError && <p style={{ color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>{dbError}</p>}
               <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                 <button onClick={() => setShowPinPrompt(false)} style={{ width: '100%', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', height: '3.5rem', backgroundColor: '#f1f5f9', borderRadius: '9999px', cursor: 'pointer', border: 'none' }}>Cancel</button>
                 <button onClick={verifyPin} className="login-btn-red">Proceed</button>
               </div>
             </div>
           </div>
        ) : isSignUp ? (
           <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 0', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h2 className="login-title-color" style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em' }}>Enrollment Hub</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Please utilize the internal terminal for new account commission steps.</p>
              </div>
              <button onClick={() => setIsSignUp(false)} style={{ margin: '1rem auto 0 auto', padding: '0 1.5rem', height: '3.5rem', backgroundColor: '#f1f5f9', borderRadius: '9999px', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}>
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Portal
              </button>
           </div>
        ) : (
           <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                <h2 className="login-title-color" style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.025em' }}>College Login</h2>
              </div>

              {dbError && (
                <div style={{ padding: '1rem', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertCircle size={20} color="#e11d48" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>{dbError}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', textAlign: 'left', width: '100%' }}>
                {/* Select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <label className="login-label">Portal Path</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <select 
                      value={selectedRole} 
                      onChange={(e) => setSelectedRole(e.target.value as AppRole)} 
                      className="login-input"
                    >
                      <option value={AppRole.STUDENT}>Student Portal</option>
                      <option value={AppRole.ADMIN_TEACHER}>Faculty Portal</option>
                      <option value={AppRole.ADMIN_HOD}>Department Head</option>
                      <option value={AppRole.DISCIPLINE_INCHARGE}>Discipline Incharge</option>
                      <option value={AppRole.ADMIN_PRINCIPAL}>Administrative Access</option>
                    </select>
                    <div className="login-dropdown-arrow">
                      <ChevronDown size={16} strokeWidth={3} />
                      <ChevronRight size={16} strokeWidth={3} style={{ marginLeft: '-4px' }} />
                    </div>
                  </div>
                </div>

                <PremiumInput label="Roll No / College Email" value={loginId} onChange={(e) => setLoginId(e.target.value)} icon={<UserIcon />} placeholder="••••••••" />
                <PremiumInput label="Password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} icon={<Lock />} placeholder="••••••" />
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="login-btn-red"
                style={{ marginTop: '1rem' }}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} color="white" /> : <><span style={{ marginTop: '2px' }}>Authorize Access</span> <ArrowRight size={20} strokeWidth={2.5} /></>}
              </button>

              <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={onParentSetup}
                  style={{ width: '100%', backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#075E54', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem', border: 'none', cursor: 'pointer' }}
                >
                  <MessageSquare size={16} /> Parent: WhatsApp Onboarding
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setSignUpType('STUDENT'); setIsSignUp(true); }} 
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    Apply for Enrollment
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowPinPrompt(true)} 
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'underline' }}
                  >
                    Faculty Commission
                  </button>
                </div>
              </div>
           </form>
        )}
      </div>
    </div>
  );
};

export default LoginView;
