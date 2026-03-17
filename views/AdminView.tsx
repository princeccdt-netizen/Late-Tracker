
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
    <div className="admin-container">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="flex items-center gap-6">
           <div className={`header-icon-box ${isPrincipal ? 'active' : 'standard'}`}>
             {isPrincipal ? <Award className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
           </div>
           <div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">
               {isPrincipal ? 'Principal Command Center' : isHOD ? 'HOD Department Console' : 'Lecturer Portal'}
             </h2>
             <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1.5 flex items-center gap-2">
               <div className="dot bg-purple-600 animate-pulse" />
               {isPrincipal ? 'Full Institutional Authority' : isHOD ? `Department: ${initialUser.assignedValue || 'Global'}` : `Managing: ${staffProfile?.stream || 'Assigned Stream'}`}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="tab-group mr-4">
            <button 
              onClick={() => setActiveTab('students')} 
              className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            >
              Students
            </button>
            {canSwitchTabs && (
              <button 
                onClick={() => setActiveTab('staff')} 
                className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              >
                Staff
              </button>
            )}
          </div>
          
          <button onClick={fetchRegistry} className="btn-icon purple">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button onClick={() => setShowImportModal(true)} className="btn-premium">
            <UploadCloud className="w-5 h-5" /> Bulk Sync
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="search-container">
          <Search className="text-slate-300" />
          <input 
            type="text" 
            placeholder={`Search by name, ID, or department in ${activeTab}...`} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="search-input" 
          />
        </div>
        
        <div className="bg-white rounded-3xl p-4 flex items-center border border-purple-100 gap-4 px-6 shadow-md">
          <span className="text-xs font-black uppercase text-slate-300 tracking-widest">Sort:</span>
          <div className="flex gap-2">
            {activeTab === 'students' && (
              <>
                <SortButton label="Name" active={sortConfig.key === 'name'} onClick={() => toggleSort('name')} />
                <SortButton label="Lates" active={sortConfig.key === 'late_count_this_month'} onClick={() => toggleSort('late_count_this_month')} />
              </>
            )}
            {activeTab === 'staff' && (
              <>
                <SortButton label="Name" active={sortConfig.key === 'name'} onClick={() => toggleSort('name')} />
                <SortButton label="Dept" active={sortConfig.key === 'department'} onClick={() => toggleSort('department')} />
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex-col center gap-6" style={{ height: '400px' }}>
          <Loader2 className="animate-spin text-purple-600 w-12 h-12 opacity-40" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-300">Synchronizing Global Records</p>
        </div>
      ) : (
        <div className="entity-grid">
          {filteredItems.map((item: any) => (
            <div 
              key={item.roll_no || item.id} 
              onClick={() => activeTab === 'students' ? setSelectedStudent(item) : setSelectedStaff(item)} 
              className="entity-card group"
            >
               <div className="between items-start">
                 {activeTab === 'students' ? (
                   <img src={item.photo_url} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-md mb-4" alt="" />
                 ) : (
                   <div className="w-16 h-16 rounded-2xl bg-purple-50 center text-purple-600 mb-4 shadow-inner border border-purple-100">
                     <User className="w-8 h-8" />
                   </div>
                 )}
                 <div className="flex-col items-end">
                    <Edit3 className="w-4 h-4 text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {activeTab === 'students' && (
                      <div className={`mt-2 badge ${item.late_count_this_month > 5 ? 'bg-rose-500' : 'badge-emerald'}`} style={item.late_count_this_month > 5 ? {color:'white'} : {}}>
                        {item.late_count_this_month} Lates
                      </div>
                    )}
                 </div>
               </div>
               <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-purple-600 transition-colors truncate">{item.name}</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{item.roll_no || item.id}</p>
               <div className="mt-6 pt-6 border-t border-purple-50">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    {activeTab === 'students' ? `${item.stream || 'N/A'} • ${item.department || 'N/A'}` : (item.role || 'STAFF').replace('ADMIN_', '')}
                  </span>
               </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="between mb-10">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{isEditMode ? 'Modify Protocol' : 'Student Identity'}</h3>
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
                    <h3 className="text-5xl font-black text-slate-800 tracking-tighter leading-none">{selectedStudent.name}</h3>
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
                    <h4 className="text-xl font-black text-slate-800 tracking-tight">Late Entry History</h4>
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
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
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
