
import React from 'react';
import { MessageSquare, Phone, Copy, CheckCircle, Info, ArrowLeft, Send, ShieldCheck, Clock, Zap } from 'lucide-react';

interface ParentOnboardingViewProps {
  onBack: () => void;
}

const ParentOnboardingView: React.FC<ParentOnboardingViewProps> = ({ onBack }) => {
  const sandboxNumber = "+1 415 523 8886"; // User-specified Sandbox Number
  const joinCode = "join swept-population"; // User-specified Join Code

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ backgroundColor: '#ffffff', color: '#1e293b' }}>
      {/* Header - Matching User Screenshot */}
      <div className="bg-white text-slate-900 p-8 pb-10 sticky top-0 z-50 border-b border-slate-50" style={{ borderBottomColor: '#f1f5f9' }}>
        <button 
          onClick={onBack} 
          className="mb-8 w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors"
          style={{ width: '3rem', height: '3rem', borderRadius: '9999px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft className="w-6 h-6 text-slate-900" style={{ width: '1.5rem', height: '1.5rem' }} />
        </button>
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight max-w-sm" style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2 }}>
          Connect to College Late Alerts on WhatsApp
        </h1>
        <p className="text-slate-500 text-sm mt-3 font-medium opacity-90" style={{ color: '#64748b', marginTop: '0.75rem' }}>
          Get real-time updates on your ward's arrival at college.
        </p>
      </div>

      <div className="max-w-xl mx-auto px-6 mt-4 space-y-6" style={{ maxWidth: '36rem', margin: '2rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Step-by-Step Instructions */}
        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <StepBox 
            number="1" 
            title="Save the Number" 
            description="Add this number to your phone contacts as 'College Alerts'."
            icon={<Phone className="text-slate-400" />}
          >
            <div className="mt-4 flex items-center justify-between p-6 rounded-2xl shadow-xl" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', backgroundColor: '#000000', padding: '1.5rem', borderRadius: '1rem' }}>
              <span className="text-white font-black text-2xl tracking-tight" style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.5rem' }}>{sandboxNumber}</span>
              <button onClick={() => copyToClipboard(sandboxNumber)} className="p-3 rounded-xl text-white transition-colors" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '0.75rem', color: '#ffffff', border: 'none' }}>
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </StepBox>

          <StepBox 
            number="2" 
            title="Open WhatsApp" 
            description="Launch WhatsApp and start a new chat with 'College Alerts'."
            icon={<MessageSquare className="text-slate-400" />}
          />

          <StepBox 
            number="3" 
            title="Send the Join Code" 
            description="Send this exact message to connect your WhatsApp account."
            icon={<Send className="text-slate-400" />}
          >
            <div className="mt-4 flex items-center justify-between p-6 rounded-2xl shadow-xl" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', backgroundColor: '#000000', padding: '1.5rem', borderRadius: '1rem' }}>
              <span className="text-white font-mono font-bold text-lg tracking-wider" style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.125rem' }}>{joinCode}</span>
              <button onClick={() => copyToClipboard(joinCode)} className="p-3 rounded-xl text-white transition-colors" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '0.75rem', color: '#ffffff', border: 'none' }}>
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </StepBox>

          <StepBox 
            number="4" 
            title="Wait for Confirmation" 
            description="You will receive a message: 'Your sandbox is ready'."
            icon={<CheckCircle className="text-slate-400" />}
          />

          <StepBox 
            number="5" 
            title="You're All Set!" 
            description="You will now receive late alerts for your child automatically. ✅"
            icon={<ShieldCheck className="text-slate-400" />}
          />
        </div>

        {/* What Happens Next Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm" style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '2.5rem', border: '1px solid #cbd5e1', marginTop: '1rem' }}>
          <div className="flex items-center gap-3 mb-6" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Info className="text-slate-900 w-6 h-6" style={{ color: '#0f172a' }} />
            <h3 className="text-xl font-black text-slate-900" style={{ fontSize: '1.25rem', fontWeight: 900 }}>What happens next?</h3>
          </div>
          <ul className="space-y-5" style={{ listStyle: 'none' }}>
            <FeatureItem icon="⏰" text="Receive alerts exactly when your ward is marked late." />
            <FeatureItem icon="🏛️" text="Get important college-wide broadcast notifications." />
            <FeatureItem icon="🛡️" text="Zero spam. Only critical updates from the administration." />
          </ul>
        </div>

        {/* Test Section */}
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100" style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '2.5rem', border: '1px solid #cbd5e1' }}>
          <h3 className="text-xl font-black mb-3 flex items-center gap-2 text-slate-800" style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" style={{ color: '#f59e0b' }} /> Test Your Connection
          </h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed" style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 600 }}>
            After connecting, send the word <span className="font-black underline text-slate-950" style={{ fontWeight: 900, textDecoration: 'underline', color: '#020617' }}>TEST</span> to the WhatsApp number. You should receive a confirmation message back instantly!
          </p>
        </div>

        {/* Contact Information */}
        <div className="text-center py-6 pb-12" style={{ textAlign: 'center', padding: '1.5rem 0 3rem' }}>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Need Help? Contact College Office
          </p>
          <p className="text-slate-800 font-extrabold mt-1 tracking-tight" style={{ color: '#1e293b', fontWeight: 800, marginTop: '0.25rem' }}>
            Institutional Support Hub • LateTracker Pro
          </p>
        </div>
      </div>
    </div>
  );
};

const StepBox = ({ number, title, description, icon, children }: any) => (
  <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-6 animate-in slide-in-from-bottom-4" style={{ backgroundColor: '#ffffff', padding: '1.75rem', borderRadius: '2.5rem', border: '1.5px solid #cbd5e1', display: 'flex', gap: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
    <div className="shrink-0" style={{ flexShrink: 0 }}>
      <div className="w-12 h-12 flex items-center justify-center font-black text-lg" style={{ width: '3rem', height: '3rem', backgroundColor: '#000000', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 900 }}>
        {number}
      </div>
    </div>
    <div className="flex-1" style={{ flex: 1 }}>
      <div className="flex items-center gap-2 mb-1.5" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span className="text-lg font-black tracking-tight text-slate-900" style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{title}</span>
        <div className="opacity-40" style={{ opacity: 0.4 }}>{icon}</div>
      </div>
      <p className="text-slate-500 text-sm font-medium leading-relaxed" style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 600 }}>{description}</p>
      {children}
    </div>
  </div>
);

const FeatureItem = ({ icon, text }: any) => (
  <li className="flex items-start gap-4" style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
    <span className="text-2xl mt-[-2px]" style={{ fontSize: '1.5rem' }}>{icon}</span>
    <span className="text-slate-700 font-bold text-sm leading-relaxed" style={{ color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>{text}</span>
  </li>
);

export default ParentOnboardingView;
