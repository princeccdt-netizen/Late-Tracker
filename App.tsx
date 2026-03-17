
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="navbar">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-4 hover-purple-bg md-hidden">
            {isSidebarOpen ? <X className="w-5 h-5 text-purple-600" /> : <Menu className="w-5 h-5 text-purple-600" />}
          </button>
          <div className="flex items-center gap-3 group pointer">
            <div className="bg-purple-600 p-3 rounded-2xl shadow-lg transition-transform">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-slate-900">DGVC<span className="text-purple-600">Attendance</span></span>
              <div className="mini-indicator">
                <div className={`dot ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                <span className={`text-xs font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? 'Network: Live' : 'Network: Syncing'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="md-flex flex-col items-end pr-5 border-r hidden">
            <span className="text-sm font-black text-slate-900">{user.name}</span>
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest items-center gap-2 flex">
              <Shield className="w-3 h-3" />
              {getRoleLabel(user.role)}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-secondary">
            <LogOut className="w-3.5 h-3.5" />
            <span className="sm-inline">Terminate Session</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
