
import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Download, RefreshCw, Activity, CheckCircle2, Loader2, User, Mail, Phone, BookOpen, Zap, Shield, TrendingUp, Calendar, Edit3, X, Save, MapPin, GraduationCap, Clock, Scan } from 'lucide-react';
// Fix: Import User and alias it to AuthUser as expected by the props definition
import { User as AuthUser, Student, LateRecord } from '../types';
import { supabase } from '../lib/supabase';
import { studentService } from '../services/studentService';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StudentViewProps {
  currentUser: AuthUser;
  onUpdateUser: (user: AuthUser) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ currentUser, onUpdateUser }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [lateHistory, setLateHistory] = useState<LateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [studentRes, recordsRes] = await Promise.all([
        supabase.from('students').select('*').eq('roll_no', currentUser.id).single(),
        supabase.from('late_records').select('*').eq('student_roll', currentUser.id).order('timestamp', { ascending: true })
      ]);
      if (studentRes.error) throw studentRes.error;
      setStudent(studentRes.data as Student);
      setLateHistory((recordsRes.data as LateRecord[]) || []);
    } catch (err) { console.error("Sync Error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser.id]);

  const handleUpdateSelf = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student) return;
    setEditLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updates = Object.fromEntries(formData.entries());
      await studentService.updateStudent(student.roll_no, updates);
      setShowEditModal(false);
      fetchData();
    } catch (err) { alert("Failed to update profile."); }
    finally { setEditLoading(false); }
  };

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      await supabase.from('students').update({ has_generated_qr: true }).eq('roll_no', currentUser.id);
      onUpdateUser({ ...currentUser, hasGeneratedQR: true });
      if (student) setStudent({ ...student, has_generated_qr: true });
    } catch (err) { alert("Activation interrupted."); }
    finally { setIsGenerating(false); }
  };

  const chartData = useMemo(() => {
    const weeks = [{ name: 'Week 1', late: 0 }, { name: 'Week 2', late: 0 }, { name: 'Week 3', late: 0 }, { name: 'Week 4', late: 0 }];
    const now = new Date();
    const month = now.getMonth();
    lateHistory.forEach(r => {
      const date = new Date(r.timestamp);
      if (date.getMonth() === month) {
        const day = date.getDate();
        if (day <= 7) weeks[0].late++;
        else if (day <= 14) weeks[1].late++;
        else if (day <= 21) weeks[2].late++;
        else weeks[3].late++;
      }
    });
    return weeks;
  }, [lateHistory]);

  const handleDownloadQR = async () => {
    if (!student) return;
    setDownloading(true);
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${student.roll_no}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `QR_ID_${student.roll_no}.png`;
      link.click();
    } finally { setDownloading(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="animate-spin text-rose-500 mb-6 w-10 h-10" /><p className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400">Verifying Identity...</p></div>;

  if (!student?.has_generated_qr) {
    return (
      <div className="max-w-md mx-auto mt-20 p-12 text-center bg-white rounded-[3.5rem] shadow-xl border border-rose-50 animate-stagger-1">
        <div className="bg-rose-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-100/50"><Zap className="w-10 h-10 text-rose-500" fill="currentColor" /></div>
        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Scanner Activation</h2>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Activate your digital ID to enable optical scanning at college gates.</p>
        <button onClick={handleGenerateQR} disabled={isGenerating} className="w-full btn-primary py-5 rounded-3xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg">
          {isGenerating ? <RefreshCw className="animate-spin" /> : <><Scan className="w-4 h-4" /> Activate Digital Scanner</>}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 space-y-10 pb-32">
      {/* Profile Header */}
      <div className="bg-white rounded-[3.5rem] p-8 shadow-sm border border-rose-50 flex flex-col md:flex-row gap-8 items-center animate-stagger-1">
        <div className="relative group">
          <img src={student?.photo_url} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-rose-50/50 shadow-xl" alt="" />
          <div className="absolute -bottom-1 -right-1 bg-rose-500 p-2 rounded-xl text-white shadow-lg border-2 border-white"><CheckCircle2 className="w-4 h-4" /></div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{student?.name}</h2>
            <button onClick={() => setShowEditModal(true)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"><Edit3 className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
            <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">{student?.roll_no}</span>
            <span className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-bold uppercase tracking-widest">{student?.department} • {student?.years}</span>
          </div>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 p-8 rounded-[3rem] text-center min-w-[200px] shadow-inner">
          <Activity className="w-6 h-6 text-rose-500 mx-auto mb-2 opacity-60" />
          <p className="text-5xl font-black tracking-tight text-slate-900">{student?.punctuality_score}%</p>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Punctuality Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 border border-rose-50 flex flex-col items-center shadow-sm">
            <div className="p-6 bg-rose-50 rounded-[2.5rem] border border-rose-100 mb-8 group cursor-pointer hover:bg-white transition-all shadow-inner">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${student.roll_no}`} className="w-40 h-40 mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" alt="QR" />
            </div>
            <button onClick={handleDownloadQR} disabled={downloading} className="w-full bg-slate-900 text-white py-4 rounded-3xl font-bold text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg">
              {downloading ? <RefreshCw className="animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Save Access Key
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 border border-rose-50 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2"><User className="w-4 h-4 text-rose-400" /><h4 className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Personal Data</h4></div>
              <InfoItem label="Legal Name" value={student.name} />
              <InfoItem label="DOB" value={student.dob} />
              <InfoItem label="Contact" value={student.student_phone} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2"><Shield className="w-4 h-4 text-rose-400" /><h4 className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Institutional</h4></div>
              <InfoItem label="Identity ID" value={student.registration_no} />
              <InfoItem label="Class / Course" value={student.class} />
              <InfoItem label="Academic Year" value={student.years} />
              <InfoItem label="Academic Email" value={student.email} />
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 border border-rose-50 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-rose-500" /><h3 className="text-lg font-black tracking-tight text-slate-900">Attendance Analytics</h3></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#fff1f2" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#f43f5e', fontSize: 9, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#f43f5e', fontSize: 9, fontWeight: 700 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="late" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Late Entry History */}
          <div className="bg-white rounded-[3.5rem] p-10 border border-rose-50 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Clock className="w-5 h-5 text-rose-500" />
              <h3 className="text-lg font-black tracking-tight text-slate-900">Late Entry History</h3>
            </div>

            {lateHistory.length > 0 ? (
              <div className="bg-rose-50/30 rounded-3xl border border-rose-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-rose-50/50 border-b border-rose-100">
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Gate</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {[...lateHistory].reverse().map(log => (
                      <tr key={log.id} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-white text-rose-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100">
                            {log.gate}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-[11px] font-bold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${log.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center bg-rose-50/20 rounded-3xl border border-dashed border-rose-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No late entries recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Self-Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 relative animate-in zoom-in-95">
            <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="w-6 h-6" /></button>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-10">Modify Profile</h3>
            <form onSubmit={handleUpdateSelf} className="space-y-8">
              <LightEditInput label="Personal Email" name="email" defaultValue={student.email} icon={<Mail className="w-4 h-4" />} />
              <LightEditInput label="Phone Number" name="student_phone" defaultValue={student.student_phone} icon={<Phone className="w-4 h-4" />} />
              <LightEditInput label="Residential Address" name="address" defaultValue={student.address} icon={<MapPin className="w-4 h-4" />} />
              <div className="pt-6">
                <button type="submit" disabled={editLoading} className="w-full btn-primary py-6 rounded-3xl font-bold uppercase tracking-widest flex items-center justify-center gap-4">
                  {editLoading ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> Commit Modifications</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const LightEditInput = ({ label, name, defaultValue, icon }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-300 group-focus-within:text-rose-500 transition-colors">{icon}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full pl-14 pr-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-sm text-slate-900 outline-none font-bold focus:ring-4 ring-rose-50 transition-all"
      />
    </div>
  </div>
);

const InfoItem = ({ label, value }: any) => (
  <div className="group border-l-2 border-rose-50 pl-4 py-1 hover:border-rose-100 transition-colors">
    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">{label}</p>
    <p className="font-bold text-slate-800 text-sm">{value || 'Pending'}</p>
  </div>
);

export default StudentView;
