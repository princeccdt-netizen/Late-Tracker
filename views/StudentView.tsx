
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

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="animate-spin text-purple-600 mb-6 w-12 h-12 opacity-40" /><p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-400">Verifying Digital Identity</p></div>;

  if (!student?.has_generated_qr) {
    return (
      <div className="max-w-md mx-auto mt-20 p-12 text-center bg-white rounded-[3.5rem] shadow-xl border border-purple-50 animate-stagger-1">
        <div className="bg-purple-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-purple-100/50"><Zap className="w-10 h-10 text-purple-600" fill="currentColor" /></div>
        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Activation Required</h2>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Provision your digital identity to enable secure scanning at institution gateways.</p>
        <button onClick={handleGenerateQR} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl shadow-purple-900/40">
          {isGenerating ? <RefreshCw className="animate-spin" /> : <><Scan className="w-4 h-4" /> Initialize Scanner</>}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 space-y-10 pb-32">
      {/* Profile Header */}
      <div className="bg-white rounded-[3.5rem] p-8 shadow-sm border border-purple-50 flex flex-col md:flex-row gap-8 items-center animate-stagger-1">
        <div className="relative group">
          <img src={student?.photo_url} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-purple-50/50 shadow-xl" alt="" />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-2 rounded-xl text-white shadow-lg border-2 border-white"><CheckCircle2 className="w-4 h-4" /></div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{student?.name}</h2>
            <button onClick={() => setShowEditModal(true)} className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"><Edit3 className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
            <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">{student?.roll_no}</span>
            <span className="px-4 py-1.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-[10px] font-bold uppercase tracking-widest">{student?.department} • {student?.years}</span>
          </div>
        </div>
        <div className="bg-purple-50/50 border border-purple-100 p-8 rounded-[3rem] text-center min-w-[200px] shadow-inner">
          <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2 opacity-60" />
          <p className="text-5xl font-black tracking-tighter text-slate-900">{student?.punctuality_score}%</p>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-2">Punctuality Rating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 border border-purple-50 flex flex-col items-center shadow-sm">
            <div className="p-6 bg-purple-50 rounded-[2.5rem] border border-purple-100 mb-8 group cursor-pointer hover:bg-white transition-all shadow-inner">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${student.roll_no}`} className="w-40 h-40 mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" alt="QR" />
            </div>
            <button onClick={handleDownloadQR} disabled={downloading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-4 shadow-xl">
              {downloading ? <RefreshCw className="animate-spin" /> : <Download className="w-3.5 h-3.5 text-purple-400" />}
              Save Access Token
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 border border-purple-50 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2"><User className="w-4 h-4 text-purple-400" /><h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400">Personal Descriptor</h4></div>
              <InfoItem label="Full Identification" value={student.name} />
              <InfoItem label="Date of Genesis" value={student.dob} />
              <InfoItem label="Comm Channel" value={student.student_phone} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2"><Shield className="w-4 h-4 text-purple-400" /><h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400">Credentialing</h4></div>
              <InfoItem label="Registry ID" value={student.registration_no} />
              <InfoItem label="Academic Stream" value={student.class} />
              <InfoItem label="Current Cycle" value={student.years} />
              <InfoItem label="Terminal Email" value={student.email} />
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 border border-purple-50 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-purple-600" /><h3 className="text-xl font-black tracking-tighter text-slate-900">Attendance Analytics</h3></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f5f3ff" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9333ea', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9333ea', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="late" stroke="#9333ea" strokeWidth={4} fillOpacity={1} fill="url(#colorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Late Entry History */}
          <div className="bg-white rounded-[3.5rem] p-10 border border-purple-50 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shadow-inner">
                 <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tighter text-slate-900">Temporal Logs</h3>
            </div>

            {lateHistory.length > 0 ? (
              <div className="bg-purple-50/20 rounded-3xl border border-purple-100/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Node Gate</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Authorization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100/50">
                    {[...lateHistory].reverse().map(log => (
                      <tr key={log.id} className="hover:bg-white/60 transition-colors">
                        <td className="px-8 py-5">
                          <span className="px-3 py-1.5 bg-white text-purple-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-purple-100 shadow-sm">
                            {log.gate}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-600 text-[11px] font-bold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${log.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                            <div className={`w-1 h-1 rounded-full ${log.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center bg-purple-50/10 rounded-[2.5rem] border border-dashed border-purple-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Temporal logs currently vacant.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Self-Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-2xl animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 relative animate-in zoom-in-95">
            <button onClick={() => setShowEditModal(false)} className="absolute top-10 right-10 p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-all"><X className="w-6 h-6" /></button>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-12">Core Descriptor Update</h3>
            <form onSubmit={handleUpdateSelf} className="space-y-10">
              <LightEditInput label="Terminal Email" name="email" defaultValue={student.email} icon={<Mail className="w-4 h-4" />} />
              <LightEditInput label="Mobile Vector" name="student_phone" defaultValue={student.student_phone} icon={<Phone className="w-4 h-4" />} />
              <LightEditInput label="Geo Descriptor" name="address" defaultValue={student.address} icon={<MapPin className="w-4 h-4" />} />
              <div className="pt-8">
                <button type="submit" disabled={editLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-6 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl shadow-purple-900/40">
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
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-300 group-focus-within:text-purple-600 transition-colors">{icon}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full pl-16 pr-8 py-5 bg-purple-50/20 border border-purple-100 rounded-[2rem] text-sm text-slate-900 outline-none font-bold focus:ring-8 ring-purple-100/50 transition-all"
      />
    </div>
  </div>
);

const InfoItem = ({ label, value }: any) => (
  <div className="group border-l-2 border-purple-50 pl-5 py-2 hover:border-purple-200 transition-all">
    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1.5">{label}</p>
    <p className="font-bold text-slate-900 text-sm tracking-tight">{value || 'Not Processed'}</p>
  </div>
);

export default StudentView;
