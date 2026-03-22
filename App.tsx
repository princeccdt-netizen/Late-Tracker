
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
    <div className="min-h-screen bg-purple-50 flex flex-col relative overflow-x-hidden selection:bg-purple-200">
      <header className="top-header glass-nav z-50 flex items-center justify-between px-6" style={{ height: '5rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-[#f43f5e] p-2.5 rounded-full shadow-lg shadow-rose-200">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-slate-900 leading-none">DGVC<span className="text-[#f43f5e]">Attendance</span></span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                  <span className={`text-[0.65rem] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isOnline ? 'Live' : 'Syncing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-black text-slate-900">{user.name.split(' ')[0]}</span>
              <span className="text-[0.6rem] text-[#f43f5e] font-bold uppercase tracking-widest">
                {getRoleLabel(user.role)}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <LogOut className="w-6 h-6" />
            </button>
          </div>
      </header>

        <main className="main-content flex-1 h-full overflow-y-auto w-full relative">
          {renderView()}
        </main>

        <nav className="bottom-nav glass-nav">
          <button className="bottom-nav-item active flex-1">
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </button>
          <button className="bottom-nav-item flex-1">
            <Shield className="w-5 h-5" />
            <span>Analytics</span>
          </button>
          <button className="bottom-nav-item flex-1">
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </nav>
    </div>
  );
};

export default App;
