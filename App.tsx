
import React, { useState, useEffect } from 'react';
import { AppRole, User } from './types';
import FacultyView from './views/FacultyView';
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
    <div className="min-h-screen bg-[#fffafa] flex flex-col">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-rose-100/60 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-rose-50 rounded-xl md:hidden transition-colors">
            {isSidebarOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5 text-rose-500" />}
          </button>
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-rose-500 p-2.5 rounded-2xl shadow-lg shadow-rose-100 group-hover:rotate-12 transition-transform duration-500">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight leading-none text-slate-900">LateTracker<span className="text-rose-500">Pro</span></span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? 'Live' : 'Syncing'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end pr-4 border-r border-rose-50">
            <span className="text-sm font-extrabold text-slate-800">{user.name}</span>
            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {getRoleLabel(user.role)}
            </span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
