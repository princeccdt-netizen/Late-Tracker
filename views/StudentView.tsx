
import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Download, RefreshCw, Activity, CheckCircle2, Loader2, User, Mail, Phone, BookOpen, Zap, Shield, TrendingUp, Calendar, Edit3, X, Save, MapPin, Clock, Scan } from 'lucide-react';
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

  if (loading) return <div className="min-h-screen center flex-col gap-6"><Loader2 className="animate-spin text-purple-600 w-12 h-12 opacity-40" /><p className="font-black text-xs uppercase tracking-widest text-slate-400">Verifying Digital Identity</p></div>;

  if (!student?.has_generated_qr) {
    return (
      <div className="center min-h-screen p-4">
        <div className="card-white max-w-md p-10 text-center animate-fade">
          <div className="bg-purple-50 w-24 h-24 rounded-3xl center mx-auto mb-8 shadow-md">
            <Zap className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tighter">Activation Required</h2>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed font-bold">Provision your digital identity to enable secure scanning at institution gateways.</p>
          <button onClick={handleGenerateQR} disabled={isGenerating} className="btn-premium w-full">
            {isGenerating ? <RefreshCw className="animate-spin" /> : <><Scan className="w-4 h-4" /> Initialize Scanner</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="relative">
          <img src={student?.photo_url} className="w-32 h-32 rounded-3xl object-cover ring-white shadow-lg" alt="" />
          <div className="absolute inset-0 center rounded-3xl" style={{ border: '4px solid var(--purple-50)', pointerEvents: 'none' }}></div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-2 rounded-xl text-white shadow-md border-2 border-white"><CheckCircle2 className="w-4 h-4" /></div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="center md:justify-start gap-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{student?.name}</h2>
            <button onClick={() => setShowEditModal(true)} className="btn-icon purple">
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 center md:justify-start">
            <span className="badge badge-purple" style={{background:'var(--slate-900)', color:'white'}}>{student?.roll_no}</span>
            <span className="badge badge-purple">{student?.department} • {student?.years}</span>
          </div>
        </div>
        <div className="punctuality-box">
          <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2 opacity-60" />
          <p className="text-5xl font-black tracking-tighter text-slate-800">{student?.punctuality_score}%</p>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">Punctuality</p>
        </div>
      </div>

      <div className="lg-grid gap-10" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="flex-col gap-10">
          <div className="card-white p-10 center flex-col">
            <div className="qr-box mb-8">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${student.roll_no}`} className="w-40 h-40" alt="QR" />
            </div>
            <button onClick={handleDownloadQR} disabled={downloading} className="btn-premium w-full" style={{background:'var(--slate-950)'}}>
              {downloading ? <RefreshCw className="animate-spin" /> : <Download className="w-3.5 h-3.5 text-purple-400" />}
              Save Token
            </button>
          </div>
        </div>

        <div className="flex-col gap-10" style={{ gridColumn: 'span 2' }}>
          <div className="card-white p-10 lg-grid gap-10" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="flex-col gap-6">
              <div className="items-center gap-3 mb-2"><User className="w-4 h-4 text-purple-400" /><h4 className="font-black uppercase text-xs tracking-widest text-slate-400">Personal</h4></div>
              <InfoItem label="Name" value={student.name} />
              <InfoItem label="DOB" value={student.dob} />
              <InfoItem label="Phone" value={student.student_phone} />
            </div>
            <div className="flex-col gap-6">
              <div className="items-center gap-3 mb-2"><Shield className="w-4 h-4 text-purple-400" /><h4 className="font-black uppercase text-xs tracking-widest text-slate-400">Credentials</h4></div>
              <InfoItem label="Registry ID" value={student.registration_no} />
              <InfoItem label="Stream" value={student.class} />
              <InfoItem label="Year" value={student.years} />
              <InfoItem label="Email" value={student.email} />
            </div>
          </div>

          <div className="card-white p-10">
            <div className="between mb-8">
              <div className="items-center gap-3"><TrendingUp className="w-5 h-5 text-purple-600" /><h3 className="text-xl font-black tracking-tighter text-slate-800">Analytics</h3></div>
            </div>
            <div style={{ height: '250px' }}>
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
          <div className="card-white p-10">
            <div className="items-center gap-4 mb-10">
              <div className="btn-icon purple">
                 <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tighter text-slate-800">Temporal Logs</h3>
            </div>

            {lateHistory.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Gate</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...lateHistory].reverse().map(log => (
                      <tr key={log.id}>
                        <td>
                          <span className="badge badge-purple" style={{fontSize:'0.6rem'}}>
                            {log.gate}
                          </span>
                        </td>
                        <td className="text-slate-600 text-xs font-bold">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${log.status === 'confirmed' ? 'badge-emerald' : 'badge-purple'}`} style={{fontSize:'0.6rem'}}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center bg-purple-50 rounded-3xl border border-dashed border-purple-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Temporal logs vacant.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Self-Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '40rem'}}>
            <button onClick={() => setShowEditModal(false)} className="btn-icon absolute" style={{top:'2.5rem', right:'2.5rem'}}><X className="w-6 h-6" /></button>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-12">Core Update</h3>
            <form onSubmit={handleUpdateSelf} className="flex-col gap-10">
              <LightEditInput label="Terminal Email" name="email" defaultValue={student.email} icon={<Mail className="w-4 h-4" />} />
              <LightEditInput label="Mobile Vector" name="student_phone" defaultValue={student.student_phone} icon={<Phone className="w-4 h-4" />} />
              <LightEditInput label="Geo Descriptor" name="address" defaultValue={student.address} icon={<MapPin className="w-4 h-4" />} />
              <div className="mt-8">
                <button type="submit" disabled={editLoading} className="btn-premium w-full">
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
  <div className="flex-col gap-3">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
    <div className="relative">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-300">{icon}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        className="input-standard" 
        style={{ paddingLeft: '4rem', background: 'var(--purple-50)', color: 'var(--slate-800)', border: '1px solid var(--purple-100)' }}
      />
    </div>
  </div>
);

const InfoItem = ({ label, value }: any) => (
  <div className="detail-row">
    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1.5">{label}</p>
    <p className="font-bold text-slate-800 text-sm">{value || 'Not Processed'}</p>
  </div>
);

export default StudentView;
