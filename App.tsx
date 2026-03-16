
import React, { useState, useEffect } from 'react';
import { AppRole, User } from './types';
import FacultyView from './views/FacultyView';
import DisciplineInchargeView from './views/DisciplineInchargeView';
import StudentView from './views/StudentView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import ParentOnboardingView from './views/ParentOnboardingView';
import { supabase } from './lib/supabase';
import {
  LogOut,
  Menu,
  X,
  Zap,
  Shield,
  LayoutDashboard
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'APP' | 'PARENT_SETUP'>('APP');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('students').select('count', { count: 'exact', head: true });
        setIsOnline(error ? error.code === '42P01' : true);
      } catch {
        setIsOnline(false);
      }
    };
    const interval = setInterval(checkConnection, 15000);
    checkConnection();
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => {
    setUser(null);
    setCurrentView('APP');
  };

  if (currentView === 'PARENT_SETUP') {
    return <ParentOnboardingView onBack={() => setCurrentView('APP')} />;
  }

  if (!user) return <LoginView onLogin={handleLogin} onParentSetup={() => setCurrentView('PARENT_SETUP')} />;

  const renderView = () => {
    // Robust role checking: Normalize to uppercase string for comparison
    const role = String(user.role).toUpperCase();

    // Admin tiers: Teacher, HOD, Principal
    if (role.includes('ADMIN') || role === 'PRINCIPAL' || role === 'HOD') {
      return <AdminView initialUser={user} />;
    }

    switch (role) {
      case 'FACULTY':
        return <FacultyView />;
      case 'DISCIPLINE_INCHARGE':
        return <DisciplineInchargeView />;
      case 'STUDENT':
        return <StudentView currentUser={user} onUpdateUser={setUser} />;
      default:
        // Fallback for any unknown administrative or authorized roles
        return <AdminView initialUser={user} />;
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace('ADMIN_', '').replace('_', ' ').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white/95 backdrop-blur-2xl border-b border-purple-100/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm shadow-purple-900/5">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-purple-50 rounded-xl md:hidden transition-all">
            {isSidebarOpen ? <X className="w-5 h-5 text-purple-600" /> : <Menu className="w-5 h-5 text-purple-600" />}
          </button>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-purple-600 p-2.5 rounded-2xl shadow-lg shadow-purple-200 group-hover:rotate-12 transition-transform duration-500">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter leading-none text-slate-900">DGVC<span className="text-purple-600 font-black">Attendance</span></span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? 'Network: Live' : 'Network: Syncing'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end pr-5 border-r border-slate-100">
            <span className="text-sm font-black text-slate-900">{user.name}</span>
            <span className="text-[9px] text-purple-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              {getRoleLabel(user.role)}
            </span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100/50 hover:bg-purple-50 text-slate-500 hover:text-purple-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-purple-100">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terminate Session</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto bg-slate-50/50">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
