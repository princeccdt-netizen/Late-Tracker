
import React, { useState, useRef } from 'react';
import { ArrowRight, Lock, User as UserIcon, Mail, Phone, BookOpen, Calendar, Hash, Loader2, AlertCircle, Briefcase, Users, Camera, Zap, ShieldCheck, CreditCard, ShieldAlert, Key, MessageSquare, Heart } from 'lucide-react';
import { AppRole, User } from '../types';
import { supabase } from '../lib/supabase';
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
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>(AppRole.STUDENT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', dob: '', sex: 'Male', department: '', stream: '', section: '',
    roll_no: '', registration_no: '', aadhar_no: '', has_pan: 'No', pan_no: '',
    shift: 'Day', address: '', student_phone: '', alt_phone: '', email: '',
    father_name: '', father_phone: '', father_occupation: '',
    mother_name: '', mother_phone: '', mother_occupation: '',
    password: '', confirmPassword: '', photoUrl: '',
    staffRole: AppRole.ADMIN_TEACHER, assignedValue: '',
    staffPhone: '', years: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setDbError(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setDbError("Limit exceeded. Use a photo under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDbError(null);

    if (loginId.toLowerCase() === 'admin' && loginPassword === 'admin') {
      onLogin({ id: 'admin', name: 'System Admin', role: AppRole.ADMIN_PRINCIPAL, assignedValue: 'Central' });
      setIsLoading(false);
      return;
    }

    try {
      if (selectedRole === AppRole.STUDENT) {
        const data = await studentService.getStudentByRoll(loginId);
        if (!data) throw new Error("Roll Number not recognized.");
        if (data.password !== loginPassword) throw new Error("Incorrect access key.");
        onLogin({ id: data.roll_no, name: data.name, role: AppRole.STUDENT, hasGeneratedQR: data.has_generated_qr || false });
      } else {
        const data = await staffService.getStaffByIdOrEmail(loginId);
        if (!data) throw new Error("Identity not verified.");
        if (data.password !== loginPassword) throw new Error("Incorrect access key.");
        onLogin({ id: data.id, name: data.name, role: data.role as AppRole, assignedValue: data.assigned_value });
      }
    } catch (err: any) { setDbError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);
    if (formData.password !== formData.confirmPassword) { setDbError("Passwords must match."); return; }

    setIsLoading(true);
    try {
      if (signUpType === 'STUDENT') {
        if (!formData.photoUrl) { setDbError("A profile photo is required."); setIsLoading(false); return; }
        await studentService.createStudent(formData);
        alert("Student Registration Successful!");
        setLoginId(formData.roll_no);
        setIsSignUp(false);
      } else {
        if (formData.staffRole === AppRole.ADMIN_PRINCIPAL) {
          const { data: existingPrincipal } = await supabase
            .from('staff_users')
            .select('id')
            .eq('role', AppRole.ADMIN_PRINCIPAL)
            .maybeSingle();

          if (existingPrincipal) {
            setDbError("A Principal is already commissioned. Only one Principal is permitted.");
            setIsLoading(false);
            return;
          }
        }
        await staffService.createStaff({
          id: formData.roll_no,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.staffRole,
          assigned_value: formData.department || formData.assignedValue,
          phone_no: formData.staffPhone,
          department: formData.department,
          stream: formData.stream,
          years: formData.years,
          section: formData.section
        });
        alert("Faculty Registration Successful!");
        setLoginId(formData.roll_no);
        setSelectedRole(formData.staffRole);
        setIsSignUp(false);
      }
    } catch (err: any) { setDbError(err.message); }
    finally { setIsLoading(false); }
  };

  const verifyPin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsPinVerified(true);
      setShowPinPrompt(false);
      setSignUpType('STAFF');
      setIsSignUp(true);
      setPinInput('');
    } else {
      setDbError("Invalid Administrative PIN.");
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-200/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center mb-10 animate-stagger-1 relative z-10">
        <div className="inline-block p-5 bg-white rounded-[2.5rem] shadow-xl shadow-rose-100 mb-6">
          <Zap className="w-10 h-10 text-rose-50" fill="#f43f5e" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">DGVC <span className="text-rose-500">Attendance</span></h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">College Access Management</p>
      </div>

      <div className={`w-full ${isSignUp ? 'max-w-6xl' : 'max-w-md'} glass-card rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 relative z-10 transition-all duration-700`}>
        {showPinPrompt ? (
          <div className="space-y-8 animate-in fade-in zoom-in-95 text-center">
            <div className="bg-rose-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
              <ShieldAlert className="text-rose-500 w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Security Clearance</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Enter Administrative PIN</p>
            <div className="space-y-4 max-w-sm mx-auto">
              <LightInput label="Command PIN" type="password" value={pinInput} onChange={(e: any) => setPinInput(e.target.value)} icon={<Key />} />
              {dbError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">{dbError}</p>}
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowPinPrompt(false)} className="flex-1 px-6 py-4 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-2xl">Cancel</button>
                <button onClick={verifyPin} className="flex-1 btn-primary py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Authorize</button>
              </div>
            </div>
          </div>
        ) : isSignUp ? (
          <form onSubmit={handleSignUp} className="space-y-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {signUpType === 'STUDENT' ? 'Student Enrollment Hub' : 'Faculty Commissioning Hub'}
              </h2>
              <p className="text-[11px] text-rose-500 font-black uppercase tracking-[0.3em] mt-3">Register New Institutional Account</p>
            </div>

            {dbError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 mb-8 max-w-2xl mx-auto">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-rose-600">{dbError}</p>
              </div>
            )}

            <div className={`grid grid-cols-1 ${signUpType === 'STUDENT' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6 md:gap-10`}>
              {/* Profile Photo & Primary Info */}
              <div className="space-y-6">
                <h3 className="text-rose-500 text-[10px] font-black uppercase tracking-widest border-b border-rose-50 pb-2">1. Identity Profile</h3>
                <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square max-w-[240px] mx-auto md:max-w-none rounded-[2.5rem] md:rounded-[3rem] bg-rose-50/30 border-2 border-dashed border-rose-100 flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 hover:bg-white transition-all group relative overflow-hidden">
                  {formData.photoUrl ? (
                    <>
                      <img src={formData.photoUrl} className="w-full h-full object-cover" alt="ID" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white w-8 h-8" /></div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-rose-300 mb-2 group-hover:text-rose-400" />
                      <p className="text-[9px] font-bold uppercase text-rose-400 tracking-wider">Access Device Camera</p>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="user" onChange={handlePhotoUpload} />
                <LightInput label="Full Name" name="name" value={formData.name} onChange={handleInputChange} icon={<UserIcon />} />
                <LightSelect label="Gender" name="sex" value={formData.sex} onChange={handleInputChange} options={['Male', 'Female', 'Other']} />
              </div>

              {/* Academic & Contact Info */}
              <div className="space-y-6">
                <h3 className="text-rose-500 text-[10px] font-black uppercase tracking-widest border-b border-rose-50 pb-2">2. Institutional Path</h3>
                {signUpType === 'STAFF' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <select
                      name="staffRole"
                      value={formData.staffRole}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-sm text-slate-900 outline-none font-bold appearance-none cursor-pointer focus:ring-4 ring-rose-50 transition-all"
                    >
                      <option value={AppRole.DISCIPLINE_INCHARGE}>Discipline Incharge</option>
                      <option value={AppRole.ADMIN_TEACHER}>Lecturer</option>
                      <option value={AppRole.ADMIN_HOD}>HOD</option>
                      <option value={AppRole.ADMIN_PRINCIPAL}>Principal</option>
                    </select>
                  </div>
                )}
                <LightInput label="Department" name="department" value={formData.department} onChange={handleInputChange} icon={<BookOpen />} />

                {signUpType === 'STUDENT' ? (
                  <>
                    <LightInput label="Batch (Year)" name="years" value={formData.years} onChange={handleInputChange} icon={<Calendar />} />
                    <LightInput label="Stream" name="stream" value={formData.stream} onChange={handleInputChange} icon={<Zap />} />
                    <LightInput label="Section" name="section" value={formData.section} onChange={handleInputChange} icon={<Hash />} />
                    <LightSelect label="Shift" name="shift" value={formData.shift} onChange={handleInputChange} options={['Day', 'Morning', 'Evening']} />
                    <LightInput label="Roll Number" name="roll_no" value={formData.roll_no} onChange={handleInputChange} icon={<Hash />} />
                    <LightInput label="Registration No" name="registration_no" value={formData.registration_no} onChange={handleInputChange} icon={<CreditCard />} />
                    <LightInput label="Mobile Number" name="student_phone" value={formData.student_phone} onChange={handleInputChange} icon={<Phone />} />
                  </>
                ) : (
                  <>
                    <LightInput label="Staff ID" name="roll_no" value={formData.roll_no} onChange={handleInputChange} icon={<Hash />} />
                    <LightInput label="Email Address" name="email" value={formData.email} onChange={handleInputChange} icon={<Mail />} />
                    <LightInput label="Contact Number" name="staffPhone" value={formData.staffPhone} onChange={handleInputChange} icon={<Phone />} />

                    {formData.staffRole === AppRole.ADMIN_TEACHER && (
                      <div className="space-y-4 pt-2 border-t border-rose-50">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Class Allocation Details</p>
                        <LightInput label="Assigned Stream" name="stream" value={formData.stream} onChange={handleInputChange} icon={<Zap />} />
                        <LightInput label="Assigned Section" name="section" value={formData.section} onChange={handleInputChange} icon={<Hash />} />
                        <LightInput label="Assigned Batch (Year)" name="years" value={formData.years} onChange={handleInputChange} icon={<Calendar />} />
                      </div>
                    )}

                    <LightSelect label="Shift" name="shift" value={formData.shift} onChange={handleInputChange} options={['Day', 'Morning', 'Evening']} />
                    <div className="pt-4 space-y-4">
                      <LightInput label="Create Password" name="password" value={formData.password} onChange={handleInputChange} type="password" icon={<Lock />} />
                      <LightInput label="Confirm Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} type="password" icon={<Lock />} />
                    </div>
                  </>
                )}
              </div>

              {/* Family Background & Security - Only for Students */}
              {signUpType === 'STUDENT' && (
                <div className="space-y-6">
                  <h3 className="text-rose-500 text-[10px] font-black uppercase tracking-widest border-b border-rose-50 pb-2">3. Family & Security</h3>
                  <LightInput label="Father's Name" name="father_name" value={formData.father_name} onChange={handleInputChange} icon={<UserIcon />} />
                  <LightInput label="Father's Number" name="father_phone" value={formData.father_phone} onChange={handleInputChange} icon={<Phone />} />
                  <LightInput label="Father's Occupation" name="father_occupation" value={formData.father_occupation} onChange={handleInputChange} icon={<Briefcase />} />

                  <LightInput label="Mother's Name" name="mother_name" value={formData.mother_name} onChange={handleInputChange} icon={<Heart />} />
                  <LightInput label="Mother's Number" name="mother_phone" value={formData.mother_phone} onChange={handleInputChange} icon={<Phone />} />
                  <LightInput label="Mother's Occupation" name="mother_occupation" value={formData.mother_occupation} onChange={handleInputChange} icon={<Briefcase />} />

                  <div className="pt-4 space-y-4">
                    <LightInput label="Create Password" name="password" value={formData.password} onChange={handleInputChange} type="password" icon={<Lock />} />
                    <LightInput label="Confirm Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} type="password" icon={<Lock />} />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-10 border-t border-rose-50">
              <button type="submit" disabled={isLoading} className="w-full btn-primary py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 active:scale-[0.98]">
                {isLoading ? <Loader2 className="animate-spin" /> : <>Complete Enrollment <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Existing Student? <button type="button" onClick={() => setIsSignUp(false)} className="text-rose-500 hover:underline">Return to Login</button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-7 animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">College Login</h2>
            </div>

            {dbError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{dbError}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Portal Path</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as AppRole)} className="w-full px-6 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl text-slate-900 outline-none font-bold appearance-none cursor-pointer focus:ring-2 ring-rose-100 transition-all">
                <option value={AppRole.STUDENT}>Student Portal</option>
                <option value={AppRole.ADMIN_TEACHER}>Lecturer Portal</option>
                <option value={AppRole.ADMIN_HOD}>HOD Console</option>
                <option value={AppRole.DISCIPLINE_INCHARGE}>Discipline Incharge</option>
                <option value={AppRole.ADMIN_PRINCIPAL}>Principal Hub</option>
              </select>
            </div>
            <LightInput label="Roll No / College Email" value={loginId} onChange={(e: any) => setLoginId(e.target.value)} icon={<UserIcon />} />
            <LightInput label="Password" type="password" value={loginPassword} onChange={(e: any) => setLoginPassword(e.target.value)} icon={<Lock />} />

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-5 rounded-3xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin" /> : <>Authorize Access <ArrowRight className="w-4 h-4" /></>}
            </button>
            <div className="text-center pt-4 space-y-4">
              <button
                type="button"
                onClick={onParentSetup}
                className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" /> Parent: WhatsApp Onboarding
              </button>
              <div className="flex justify-center gap-6 pt-2">
                <button type="button" onClick={() => { setSignUpType('STUDENT'); setIsSignUp(true); }} className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-600">New Student Entry</button>
                <button type="button" onClick={() => setShowPinPrompt(true)} className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-50">Faculty Access</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const LightInput = ({ label, type = "text", value, onChange, name, icon }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-300 group-focus-within:text-rose-500 transition-colors">{icon}</div>
      <input
        type={type}
        name={name}
        required
        value={value}
        onChange={onChange}
        className="w-full pl-14 pr-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-sm text-slate-900 focus:border-rose-400 focus:ring-4 ring-rose-50 outline-none font-bold transition-all"
      />
    </div>
  </div>
);

const LightSelect = ({ label, name, value, onChange, options }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select name={name} value={value} onChange={onChange} className="w-full px-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-sm text-slate-900 outline-none font-bold appearance-none cursor-pointer focus:ring-4 ring-rose-50 transition-all">
      {options.map((o: any) => <option key={o} value={o}>{o.replace('ADMIN_', '').replace('_', ' ')}</option>)}
    </select>
  </div>
);

export default LoginView;
