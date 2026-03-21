
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
      <header className="top-header glass-nav z-50">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-xl shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-slate-900">DGVC<span className="text-purple-600">Attendance</span></span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                <span className={`text-[0.6rem] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? 'Live' : 'Sync'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-slate-900 truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
              <span className="text-[0.6rem] text-purple-600 font-bold uppercase tracking-widest">
                {getRoleLabel(user.role)}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-purple-50 rounded-xl text-purple-500 hover:text-rose-500 transition-colors">
            <LogOut className="w-4 h-4" />
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
