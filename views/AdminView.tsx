
import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShieldCheck, RefreshCw, UploadCloud, X, LayoutDashboard, Database, Users, Hash, User, Shield, TrendingUp, Edit3, Save, Phone, Mail, BookOpen, Calendar, MapPin, Loader2, Award, Heart, Zap, ArrowUpDown, Clock, Filter } from 'lucide-react';
import { AppRole, Student, User as AuthUser, LateRecord } from '../types';
import { supabase } from '../lib/supabase';
import { studentService } from '../services/studentService';
import { staffService, StaffData } from '../services/staffService';

interface AdminViewProps { initialUser: AuthUser; }

const AdminView: React.FC<AdminViewProps> = ({ initialUser }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [dbStaff, setDbStaff] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<LateRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Helper to normalize roles for comparison
  const role = String(initialUser.role).toUpperCase();
  const isPrincipal = role === AppRole.ADMIN_PRINCIPAL || role === 'PRINCIPAL';
  const isHOD = role === AppRole.ADMIN_HOD || role === 'HOD';
  const isTeacher = role === AppRole.ADMIN_TEACHER || role === 'TEACHER';

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      if (activeTab === 'students') {
        let query = supabase.from('students').select('*');
        
        if (isTeacher) {
          const staff = await staffService.getStaffById(initialUser.id);
          if (staff) {
            setStaffProfile(staff);
            if (staff.department) query = query.eq('department', staff.department);
            if (staff.stream) query = query.eq('stream', staff.stream);
            if (staff.years) query = query.eq('years', staff.years);
            if (staff.section) query = query.eq('section', staff.section);
          }
        } else if (isHOD) {
          if (initialUser.assignedValue) {
            query = query.eq('department', initialUser.assignedValue);
          }
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setDbStudents((data as Student[]) || []);
      } else if (activeTab === 'staff') {
        let staffList = await staffService.getAllStaff();
        if (isHOD && initialUser.assignedValue) {
          staffList = staffList.filter(s => s.department === initialUser.assignedValue);
        }
        setDbStaff(staffList);
      }
    } catch (err) { 
      console.error("Registry Sync Failure:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [activeTab]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedStudent) {
        setSelectedStudentLogs([]);
        return;
      }
      setLogsLoading(true);
      try {
        const { data, error } = await supabase
          .from('late_records')
          .select('*')
          .eq('student_roll', selectedStudent.roll_no)
          .order('timestamp', { ascending: false });
        if (error) throw error;
        setSelectedStudentLogs((data as LateRecord[]) || []);
      } catch (err) {
        console.error("Logs Fetch Failure:", err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
  }, [selectedStudent]);

  const handleUpdateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setEditLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updates = Object.fromEntries(formData.entries());
      await studentService.updateStudent(selectedStudent.roll_no, updates);
      setIsEditMode(false);
      setSelectedStudent(null);
      fetchRegistry();
    } catch (err) { alert("Update failed."); }
    finally { setEditLoading(false); }
  };

  const handleUpdateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setEditLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updates = Object.fromEntries(formData.entries());
      await staffService.updateStaff(selectedStaff.id, updates);
      setIsEditMode(false);
      setSelectedStaff(null);
      fetchRegistry();
    } catch (err) { alert("Update failed."); }
    finally { setEditLoading(false); }
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let result: any[] = [];

    if (activeTab === 'students') {
      result = dbStudents.filter(s => 
        s.roll_no?.toLowerCase().includes(q) || 
        s.name?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    } else if (activeTab === 'staff') {
      result = dbStaff.filter(s => 
        s.name?.toLowerCase().includes(q) || 
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchQuery, dbStudents, dbStaff, activeTab, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const canSwitchTabs = isPrincipal || isHOD;

  return (
    <div className="px-4 py-6 flex flex-col gap-6">
      {/* Top Header & Search */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-black text-purple-950 tracking-tight">
          {isPrincipal ? 'Command Center' : isHOD ? 'Dept Console' : 'Portal'}
        </h2>
        <div className="bg-white rounded-2xl flex items-center px-4 py-2 border border-slate-200 shadow-sm">
          <Search className="text-purple-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full bg-transparent border-none outline-none p-2 font-bold text-purple-950 text-sm" 
          />
          <button onClick={() => setShowImportModal(true)} className="p-2 bg-slate-50 rounded-xl text-slate-500">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('students')} 
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'students' ? 'bg-purple-600 text-white' : 'bg-white text-purple-400 border border-purple-100 hover:bg-purple-50'}`}
        >
          Students
        </button>
        {canSwitchTabs && (
          <button 
            onClick={() => setActiveTab('staff')} 
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'staff' ? 'bg-purple-600 text-white' : 'bg-white text-purple-400 border border-purple-100 hover:bg-purple-50'}`}
          >
            Staff
          </button>
        )}
      </div>

      {/* Stats Cards (Mockup styling matching Envato) */}
      <div className="flex flex-col gap-4">
        {/* Work Location Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-5 text-white flex gap-4 items-center shadow-soft relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white rounded-full blur-2xl opacity-10" />
          <div className="relative z-10 w-20 h-20 rounded-full border-[6px] border-purple-400 border-r-purple-300 flex items-center justify-center">
            <span className="font-black text-xl text-white">82%</span>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <h4 className="text-purple-100 font-bold text-sm">On-Site</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-xs font-bold text-purple-200">Office (68)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-300" />
              <span className="text-xs font-bold text-purple-200">Remote (14)</span>
            </div>
          </div>
        </div>

        {/* 2-Column Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-100 rounded-3xl p-5 flex flex-col gap-2 relative overflow-hidden group shadow-sm border border-purple-200">
            <div className="p-3 bg-white rounded-2xl w-fit shadow-sm text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-purple-950">203</h3>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">All Employees</p>
            </div>
          </div>
          <div className="bg-white flex flex-col rounded-3xl p-4 gap-3 relative overflow-hidden shadow-sm border border-purple-50">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-purple-50 rounded-xl text-purple-500"><User className="w-4 h-4"/></div>
               <div className="flex flex-col">
                 <span className="font-black text-lg text-purple-950">102</span>
                 <span className="text-[0.6rem] font-bold text-purple-400 uppercase tracking-widest">Male</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="p-2 bg-purple-50 rounded-xl text-purple-400"><User className="w-4 h-4"/></div>
               <div className="flex flex-col">
                 <span className="font-black text-lg text-purple-950">101</span>
                 <span className="text-[0.6rem] font-bold text-purple-400 uppercase tracking-widest">Female</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 px-1">
        <h3 className="font-black text-lg text-purple-950">{activeTab === 'students' ? 'All Students' : 'All Staff'}</h3>
        <button className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
          Sort <ArrowUpDown className="w-3 h-3" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center flex-col center gap-6" style={{ height: '400px' }}>
          <Loader2 className="animate-spin text-purple-600 w-12 h-12 opacity-40" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-300">Synchronizing Global Records</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item: any) => (
            <div 
              key={item.roll_no || item.id} 
              onClick={() => activeTab === 'students' ? setSelectedStudent(item) : setSelectedStaff(item)} 
              className="list-item-card"
            >
              <div className="flex items-center gap-4">
                 {activeTab === 'students' ? (
                   <img src={item.photo_url} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-50" alt="" />
                 ) : (
                   <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                     <User className="w-6 h-6" />
                   </div>
                 )}
                 <div className="flex flex-col">
                   <h3 className="font-black text-purple-950 text-sm max-w-[150px] truncate">{item.name}</h3>
                   <span className="text-[0.65rem] font-bold text-purple-400 uppercase tracking-widest mt-0.5">
                     {activeTab === 'students' ? item.department : (item.role || 'STAFF').replace('ADMIN_', '')}
                   </span>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl bg-purple-50 text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors">
                  <Mail className="w-4 h-4" />
                </button>
                <button className="p-2.5 rounded-xl bg-purple-50 text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="between mb-10">
              <h3 className="text-3xl font-black text-purple-950 tracking-tight">{isEditMode ? 'Modify Protocol' : 'Student Identity'}</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsEditMode(!isEditMode)} className="btn-icon purple">
                  {isEditMode ? <X className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
                </button>
                {!isEditMode && <button onClick={() => setSelectedStudent(null)} className="btn-icon"><X className="w-6 h-6" /></button>}
              </div>
            </div>

            {isEditMode ? (
              <form onSubmit={handleUpdateStudent} className="lg-grid gap-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <EditInput label="Full Name" name="name" defaultValue={selectedStudent.name} icon={<User className="w-4 h-4"/>} />
                <EditInput label="Department" name="department" defaultValue={selectedStudent.department} icon={<BookOpen className="w-4 h-4"/>} />
                <EditInput label="Stream" name="stream" defaultValue={selectedStudent.stream} icon={<Zap className="w-4 h-4"/>} />
                <EditInput label="Batch" name="years" defaultValue={selectedStudent.years} icon={<Calendar className="w-4 h-4"/>} />
                <EditInput label="Section" name="section" defaultValue={selectedStudent.section} icon={<Hash className="w-4 h-4"/>} />
                <EditInput label="Mobile" name="student_phone" defaultValue={selectedStudent.student_phone} icon={<Phone className="w-4 h-4"/>} />
                <EditInput label="Email" name="email" defaultValue={selectedStudent.email} icon={<Mail className="w-4 h-4"/>} />
                <EditInput label="Father Name" name="father_name" defaultValue={selectedStudent.father_name} icon={<User className="w-4 h-4"/>} />
                <EditInput label="Father Phone" name="father_phone" defaultValue={selectedStudent.father_phone} icon={<Phone className="w-4 h-4"/>} />
                <EditInput label="Mother Name" name="mother_name" defaultValue={selectedStudent.mother_name} icon={<Heart className="w-4 h-4"/>} />
                <EditInput label="Mother Phone" name="mother_phone" defaultValue={selectedStudent.mother_phone} icon={<Phone className="w-4 h-4"/>} />
                <div style={{ gridColumn: 'span 3', paddingTop: '2.5rem' }}>
                  <button type="submit" disabled={editLoading} className="btn-premium w-full" style={{ padding: '1.5rem' }}>
                    {editLoading ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> Commit Modifications</>}
                  </button>
                </div>
              </form>
            ) : (
               <div className="flex-col gap-12">
                <div className="flex items-center gap-10 border-b border-purple-50 pb-12">
                  <img src={selectedStudent.photo_url} className="w-40 h-40 rounded-[3.5rem] object-cover ring-[12px] ring-purple-50 shadow-2xl" alt="" />
                  <div className="flex-1">
                    <h3 className="text-5xl font-black text-purple-950 tracking-tighter leading-none">{selectedStudent.name}</h3>
                    <div className="flex gap-3 mt-6">
                      <span className="badge badge-purple" style={{background:'var(--slate-900)', color:'white'}}>{selectedStudent.roll_no}</span>
                      <span className="badge badge-purple">{selectedStudent.department} • {selectedStudent.stream}</span>
                    </div>
                  </div>
                </div>
                <div className="detail-grid">
                  <div className="flex-col gap-4">
                    <DetailRow label="Institutional" value={`${selectedStudent.department} / ${selectedStudent.stream}`} />
                    <DetailRow label="Batch / Section" value={`${selectedStudent.years} - Sec ${selectedStudent.section}`} />
                    <DetailRow label="Shift" value={selectedStudent.shift} />
                  </div>
                  <div className="flex-col gap-4">
                    <DetailRow label="Student Contact" value={selectedStudent.student_phone} />
                    <DetailRow label="College Email" value={selectedStudent.email} />
                    <DetailRow label="Gender" value={selectedStudent.sex} />
                  </div>
                  <div className="flex-col gap-4">
                    <DetailRow label="Father Name" value={selectedStudent.father_name} />
                    <DetailRow label="Father Contact" value={selectedStudent.father_phone} />
                    <DetailRow label="Father Occ." value={selectedStudent.father_occupation} />
                  </div>
                  <div className="flex-col gap-4">
                    <DetailRow label="Mother Name" value={selectedStudent.mother_name} />
                    <DetailRow label="Mother Contact" value={selectedStudent.mother_phone} />
                    <DetailRow label="Mother Occ." value={selectedStudent.mother_occupation} />
                  </div>
                </div>

                {/* Late Entry History Section */}
                <div className="mt-12 pt-12 border-t border-purple-50">
                  <div className="flex items-center gap-3 mb-8">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <h4 className="text-xl font-black text-purple-950 tracking-tight">Late Entry History</h4>
                  </div>
                  
                  {logsLoading ? (
                    <div className="flex items-center gap-3 text-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Retrieving Logs...</span>
                    </div>
                  ) : selectedStudentLogs.length > 0 ? (
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
                          {selectedStudentLogs.map(log => (
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
                                <span className={`badge ${
                                  log.status === 'confirmed' ? 'badge-emerald' : 'status-pending'
                                }`} style={{fontSize:'0.6rem'}}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-purple-50 rounded-3xl border border-dashed border-purple-200">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No late entries recorded for this student.</p>
                    </div>
                  )}
                </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SortButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const SortButton: React.FC<SortButtonProps> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`tab-btn flex items-center gap-2 ${active ? 'active' : ''}`}
    style={{ padding: '0.5rem 1rem' }}
  >
    {label}
    <ArrowUpDown className="w-3 h-3" />
  </button>
);

const EditInput = ({ label, name, defaultValue, icon }: any) => (
  <div className="flex-col gap-2">
    <label className="text-xs font-black text-purple-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-300">{icon}</div>
      <input 
        name={name} 
        defaultValue={defaultValue} 
        className="input-standard" 
        style={{ paddingLeft: '3.5rem', background: 'var(--purple-50)', color: 'var(--slate-800)', border: '1px solid var(--purple-100)' }}
      />
    </div>
  </div>
);

const DetailRow = ({ label, value }: any) => (
  <div className="detail-row">
    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{label}</p>
    <p className="font-bold text-slate-800 text-sm">{value || 'N/A'}</p>
  </div>
);

export default AdminView;
