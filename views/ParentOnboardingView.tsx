
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
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      {/* Header */}
      <div className="bg-[#075E54] text-white p-8 pb-12 rounded-b-[3rem] shadow-lg sticky top-0 z-50">
        <button onClick={onBack} className="mb-6 p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-black tracking-tight leading-tight">
          Connect to College Late Alerts on WhatsApp
        </h1>
        <p className="text-emerald-100 text-sm mt-2 font-medium opacity-80">
          Get real-time updates on your ward's arrival at college.
        </p>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-6 space-y-6">
        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <StepBox 
            number="1" 
            title="Save the Number" 
            description="Add this number to your phone contacts as 'College Alerts'."
            icon={<Phone className="text-emerald-500" />}
          >
            <div className="mt-4 flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <span className="text-emerald-900 font-black text-xl">{sandboxNumber}</span>
              <button onClick={() => copyToClipboard(sandboxNumber)} className="p-2 bg-white rounded-xl shadow-sm text-emerald-500 hover:scale-105 transition-transform">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </StepBox>

          <StepBox 
            number="2" 
            title="Open WhatsApp" 
            description="Launch WhatsApp and start a new chat with 'College Alerts'."
            icon={<MessageSquare className="text-emerald-500" />}
          />

          <StepBox 
            number="3" 
            title="Send the Join Code" 
            description="Send this exact message to connect your WhatsApp account."
            icon={<Send className="text-emerald-500" />}
          >
            <div className="mt-4 flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-white font-mono font-bold text-lg">{joinCode}</span>
              <button onClick={() => copyToClipboard(joinCode)} className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </StepBox>

          <StepBox 
            number="4" 
            title="Wait for Confirmation" 
            description="You will receive a message: 'Your sandbox is ready'."
            icon={<CheckCircle className="text-emerald-500" />}
          />

          <StepBox 
            number="5" 
            title="You're All Set!" 
            description="You will now receive late alerts for your child automatically. ✅"
            icon={<ShieldCheck className="text-emerald-500" />}
          />
        </div>

        {/* What Happens Next Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <Info className="text-[#25D366] w-6 h-6" />
            <h3 className="text-xl font-black text-slate-900">What happens next?</h3>
          </div>
          <ul className="space-y-4">
            <FeatureItem icon="⏰" text="Receive alerts exactly when your ward is marked late." />
            <FeatureItem icon="🏛️" text="Get important college-wide broadcast notifications." />
            <FeatureItem icon="🛡️" text="Zero spam. Only critical updates from the administration." />
          </ul>
        </div>

        {/* Test Section */}
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-lg text-white">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5" /> Test Your Connection
          </h3>
          <p className="text-emerald-50 text-sm font-medium leading-relaxed">
            After connecting, send the word <span className="font-black underline">TEST</span> to the WhatsApp number. You should receive a confirmation message back instantly!
          </p>
        </div>

        {/* Contact Information */}
        <div className="text-center py-6">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Need Help? Contact College Office
          </p>
          <p className="text-slate-500 font-bold mt-1 tracking-tight">
            Institutional Support Hub • LateTracker Pro
          </p>
        </div>
      </div>
    </div>
  );
};

const StepBox = ({ number, title, description, icon, children }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex gap-5 animate-in slide-in-from-bottom-4">
    <div className="shrink-0">
      <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#128C7E] font-black text-lg">
        {number}
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-900 font-black tracking-tight">{title}</span>
        <div className="opacity-60">{icon}</div>
      </div>
      <p className="text-slate-500 text-sm font-medium leading-relaxed">{description}</p>
      {children}
    </div>
  </div>
);

const FeatureItem = ({ icon, text }: any) => (
  <li className="flex items-start gap-3">
    <span className="text-xl">{icon}</span>
    <span className="text-slate-600 font-semibold text-sm leading-snug">{text}</span>
  </li>
);

export default ParentOnboardingView;
