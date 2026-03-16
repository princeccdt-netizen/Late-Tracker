
import React, { useState, useMemo, useEffect } from 'react';
// Added Zap to the import list from lucide-react to fix missing name error
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

    // Apply Sorting
    return result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
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
    <div className="p-6 lg:p-12 space-y-10 max-w-[1600px] mx-auto pb-32">
      {/* Admin Header */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-purple-50 flex flex-col xl:flex-row items-center justify-between gap-8 animate-stagger-1">
        <div className="flex items-center gap-6">
           <div className={`p-6 rounded-[2.5rem] shadow-inner border transition-all ${isPrincipal ? 'bg-purple-600 text-white border-purple-700' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
             {isPrincipal ? <Award className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
           </div>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">
               {isPrincipal ? 'Principal Command Center' : isHOD ? 'HOD Department Console' : 'Lecturer Portal'}
             </h2>
             <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.3em] mt-1.5 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
               {isPrincipal ? 'Full Institutional Authority' : isHOD ? `Department: ${initialUser.assignedValue || 'Global'}` : `Managing: ${staffProfile?.stream || 'Assigned Stream'}`}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-purple-50/50 p-2 rounded-3xl flex gap-1 mr-4 border border-purple-100/50 shadow-inner">
            <button 
              onClick={() => setActiveTab('students')} 
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-white text-purple-600 shadow-md border border-purple-100' : 'text-slate-400 hover:text-purple-600'}`}
            >
              Students
            </button>
            {canSwitchTabs && (
              <button 
                onClick={() => setActiveTab('staff')} 
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white text-purple-600 shadow-md border border-purple-100' : 'text-slate-400 hover:text-purple-600'}`}
              >
                Staff
              </button>
            )}
          </div>
          
          <button onClick={fetchRegistry} className="p-5 bg-purple-50 text-purple-600 rounded-3xl hover:bg-purple-100 transition-all shadow-sm">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button onClick={() => setShowImportModal(true)} className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-10 py-5 rounded-3xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-4 shadow-lg active:scale-95 transition-all">
            <UploadCloud className="w-5 h-5" /> Bulk Sync
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 animate-stagger-2">
        <div className="flex-1 bg-white rounded-[2.5rem] p-4 flex items-center border border-purple-50 shadow-sm group focus-within:ring-4 ring-purple-50 transition-all">
          <Search className="ml-6 text-slate-300 group-focus-within:text-purple-600 transition-colors" />
          <input 
            type="text" 
            placeholder={`Search by name, ID, or department in ${activeTab}...`} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full px-6 py-4 bg-transparent outline-none font-bold text-slate-800 placeholder:text-slate-300" 
          />
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-4 flex items-center border border-purple-50 shadow-sm gap-4">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Sort By:</span>
          <div className="flex gap-2 pr-4">
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
        <div className="py-40 text-center flex flex-col items-center gap-6">
          <Loader2 className="animate-spin text-rose-600 w-16 h-16 opacity-40" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-300">Synchronizing Global Records</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-stagger-3">
          {filteredItems.map((item: any) => (
            <div 
              key={item.roll_no || item.id} 
              onClick={() => activeTab === 'students' ? setSelectedStudent(item) : setSelectedStaff(item)} 
              className="bg-white p-8 rounded-[3rem] border border-purple-50 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer group relative overflow-hidden"
            >
               <div className="relative z-10 flex items-start justify-between">
                 {activeTab === 'students' ? (
                   <img src={item.photo_url} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-md mb-4" alt="" />
                 ) : (
                   <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4 shadow-inner border border-purple-100">
                     <User className="w-8 h-8" />
                   </div>
                 )}
                 <div className="flex flex-col items-end">
                    <Edit3 className="w-4 h-4 text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {activeTab === 'students' && (
                      <div className={`mt-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${item.late_count_this_month > 5 ? 'bg-rose-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.late_count_this_month} Lates
                      </div>
                    )}
                 </div>
               </div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors truncate">{item.name}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{item.roll_no || item.id}</p>
               <div className="mt-6 pt-6 border-t border-purple-50">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    {activeTab === 'students' ? `${item.stream || 'N/A'} • ${item.department || 'N/A'}` : (item.role || 'STAFF').replace('ADMIN_', '')}
                  </span>
               </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl border border-white max-h-[90vh] overflow-y-auto no-scrollbar relative p-12 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Modify Protocol' : 'Student Identity'}</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsEditMode(!isEditMode)} className="p-4 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-all">
                  {isEditMode ? <X className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
                </button>
                {!isEditMode && <button onClick={() => setSelectedStudent(null)} className="p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-all"><X className="w-6 h-6" /></button>}
              </div>
            </div>

            {isEditMode ? (
              <form onSubmit={handleUpdateStudent} className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <div className="md:col-span-3 pt-10">
                  <button type="submit" disabled={editLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-6 rounded-3xl font-bold uppercase tracking-widest flex items-center justify-center gap-4 transition-all">
                    {editLoading ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> Commit Modifications</>}
                  </button>
                </div>
              </form>
            ) : (
               <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center gap-10 border-b border-purple-50 pb-12">
                  <img src={selectedStudent.photo_url} className="w-44 h-44 rounded-[3.5rem] object-cover ring-[12px] ring-purple-50 shadow-2xl" alt="" />
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{selectedStudent.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                      <span className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">{selectedStudent.roll_no}</span>
                      <span className="px-5 py-2 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-widest">{selectedStudent.department} • {selectedStudent.stream}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  <div className="space-y-4">
                    <DetailRow label="Institutional" value={`${selectedStudent.department} / ${selectedStudent.stream}`} />
                    <DetailRow label="Batch / Section" value={`${selectedStudent.years} - Sec ${selectedStudent.section}`} />
                    <DetailRow label="Shift" value={selectedStudent.shift} />
                  </div>
                  <div className="space-y-4">
                    <DetailRow label="Student Contact" value={selectedStudent.student_phone} />
                    <DetailRow label="College Email" value={selectedStudent.email} />
                    <DetailRow label="Gender" value={selectedStudent.sex} />
                  </div>
                  <div className="space-y-4">
                    <DetailRow label="Father Name" value={selectedStudent.father_name} />
                    <DetailRow label="Father Contact" value={selectedStudent.father_phone} />
                    <DetailRow label="Father Occ." value={selectedStudent.father_occupation} />
                  </div>
                  <div className="space-y-4">
                    <DetailRow label="Mother Name" value={selectedStudent.mother_name} />
                    <DetailRow label="Mother Contact" value={selectedStudent.mother_phone} />
                    <DetailRow label="Mother Occ." value={selectedStudent.mother_occupation} />
                  </div>
                </div>

                {/* Late Entry History Section */}
                <div className="mt-12 pt-12 border-t border-purple-50">
                  <div className="flex items-center gap-3 mb-8">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Late Entry History</h4>
                  </div>
                  
                  {logsLoading ? (
                    <div className="flex items-center gap-3 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Retrieving Logs...</span>
                    </div>
                  ) : selectedStudentLogs.length > 0 ? (
                    <div className="bg-purple-50/30 rounded-3xl border border-purple-100 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-purple-50/50 border-b border-purple-100">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Gate</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {selectedStudentLogs.map(log => (
                            <tr key={log.id} className="hover:bg-white transition-colors">
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-white text-purple-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-100">
                                  {log.gate}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 text-[11px] font-bold">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                  log.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
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
                    <div className="p-10 text-center bg-purple-50/20 rounded-3xl border border-dashed border-purple-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No late entries recorded for this student.</p>
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

const SortButton = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-400 hover:bg-purple-100'}`}
  >
    {label}
    <ArrowUpDown className="w-3 h-3" />
  </button>
);

const EditInput = ({ label, name, defaultValue, icon }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-300 group-focus-within:text-purple-600 transition-colors">{icon}</div>
      <input 
        name={name} 
        defaultValue={defaultValue} 
        className="w-full pl-14 pr-6 py-4 bg-purple-50/20 border border-purple-100 rounded-2xl text-sm text-slate-900 outline-none font-bold focus:ring-4 ring-purple-50 transition-all" 
      />
    </div>
  </div>
);

const DetailRow = ({ label, value }: any) => (
  <div className="group border-l-2 border-purple-50 pl-4 py-1 hover:border-purple-200 transition-all">
    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">{label}</p>
    <p className="font-bold text-slate-800 text-sm">{value || 'N/A'}</p>
  </div>
);

export default AdminView;
