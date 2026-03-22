
import {
  MessageSquare, Camera, MapPin, X, Check, RefreshCw, ShieldCheck, Scan, AlertCircle, Zap, StopCircle, PlayCircle,
  Terminal, UserCheck, Clock, Phone, User as UserIcon, Send, Loader2, Search, ArrowRight,
  Mail, BookOpen, Calendar, Hash, Briefcase, Heart, Shield, CreditCard, Target, Upload
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GATES, MOCK_STUDENTS } from '../constants';
import { Student } from '../types';
import { generateParentAlert, generateStudentAlert, generateLecturerHighAlert } from '../services/geminiService';
import { whatsappService } from '../services/whatsappService';
import { supabase } from '../lib/supabase';
import { studentService } from '../services/studentService';
import { staffService } from '../services/staffService';
import jsQR from 'jsqr';

const DetailSection = ({ title, icon: Icon, children }: any) => (
  <div className="card-white p-6 mb-6" style={{ borderRadius: '2.5rem' }}>
    <div className="items-center gap-3 mb-4">
      <div className="btn-icon purple" style={{padding:'0.4rem'}}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="lg-grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-purple-50 transition-all">
    <div className="mt-1 text-purple-300">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-col">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-slate-800 tracking-tight">{value || 'N/A'}</span>
    </div>
  </div>
);

const FacultyView: React.FC = () => {
  const [activeGate, setActiveGate] = useState(GATES[0]);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [parentAlert, setParentAlert] = useState<string>('');
  const [notifying, setNotifying] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isDraftingAlert, setIsDraftingAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Entry State
  const [manualRollQuery, setManualRollQuery] = useState('');
  const [isSearchingManual, setIsSearchingManual] = useState(false);

  // Direct Messenger State (Override)
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualMinutes, setManualMinutes] = useState('15');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) handleStudentLookup(code.data);
          else alert("No QR found.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => { return () => stopCamera(); }, []);

  useEffect(() => {
    if (isScanning) {
      startCamera();
    }
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    setScannedStudent(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera Access Error: Secure Connection (HTTPS) required.");
      return;
    }

    try {
      const constraints = { video: { facingMode: 'environment' }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        requestRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      setError(`Camera Error: ${err.name}. Check permissions.`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsScanning(false);
  };

  const scanTick = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          if (window.navigator.vibrate) window.navigator.vibrate([60, 40, 60]);
          handleStudentLookup(code.data);
          setTimeout(() => { if (streamRef.current) requestRef.current = requestAnimationFrame(scanTick); }, 2000);
          return;
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanTick);
  };

  const handleManualSearch = async () => {
    if (!manualRollQuery) return;
    setIsSearchingManual(true);
    await handleStudentLookup(manualRollQuery);
    setIsSearchingManual(false);
  };

  const handleStudentLookup = async (rollNo: string) => {
    try {
      const data = await studentService.getStudentByRoll(rollNo.trim());
      let foundStudent = data as Student || MOCK_STUDENTS.find(s => s.roll_no === rollNo.trim()) || null;
      if (foundStudent) {
        setShowSuccessOverlay(true);
        setScannedStudent(foundStudent);
        setIsDraftingAlert(true);
        const pAlert = await generateParentAlert(foundStudent, activeGate);
        setParentAlert(pAlert);
        setIsDraftingAlert(false);
        setTimeout(() => setShowSuccessOverlay(false), 900);
      } else { alert("Not found."); }
    } catch (err) { alert("Registry error."); }
  };

  const handleConfirmLate = async () => {
    if (!scannedStudent) return;
    setNotifying(true);
    try {
      await studentService.incrementLateCount(scannedStudent.roll_no, scannedStudent.late_count_this_month);
      await supabase.from('late_records').insert({
        student_roll: scannedStudent.roll_no,
        gate: activeGate,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      });
      if (scannedStudent.father_phone) await whatsappService.sendWhatsApp(scannedStudent.father_phone, parentAlert);
      alert("Late Entry Confirmed & Dispatched.");
      setScannedStudent(null);
    } catch (err) { alert("Error."); }
    finally { setNotifying(false); }
  };

  const handleManualWhatsAppDispatch = async () => {
    if (!manualPhone || !manualName) return;
    setNotifying(true);
    const message = `🏛️ *DGVC ATTENDANCE*\n\nStudent *${manualName}* arrived late today (${manualMinutes} mins).`;
    await whatsappService.sendWhatsApp(manualPhone, message);
    setNotifying(false);
    setManualPhone('');
    setManualName('');
  };

  return (
    <div className="student-container" style={{maxWidth:'1200px'}}>
      {showSuccessOverlay && (
        <div className="modal-overlay" style={{background:'var(--purple-600)'}}>
           <div className="center flex-col text-white">
              <UserCheck className="w-24 h-24 mb-6" />
              <h2 className="text-4xl font-black uppercase tracking-tighter">Verified</h2>
           </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="p-4 between rounded-[4rem] gap-4" style={{ backgroundColor: '#fff1f2', border: '1px solid #ffe4e6' }}>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[#f43f5e]"><MapPin size={18} /></div>
          <div className="flex-col">
            <h2 className="text-sm font-black text-slate-800 leading-none">Command Center</h2>
            <p className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-widest mt-1">{activeGate}</p>
          </div>
        </div>
        
        <div className="tab-group flex gap-1.5 overflow-x-auto no-scrollbar py-1" style={{ flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', flex: 1, minWidth: 0 }}>
          {GATES.map(g => (
            <button key={g} onClick={() => setActiveGate(g)} className={`tab-btn ${activeGate === g ? 'active' : ''}`} style={{ borderRadius: '999px', padding: '0.5rem 1rem', fontSize: '0.6rem', whiteSpace: 'nowrap', flexShrink: 0, border: 'none', cursor: 'pointer', boxShadow: activeGate === g ? '0 4px 12px -2px rgba(0,0,0,0.05)' : 'none' }}>{g}</button>
          ))}
        </div>
      </div>

      <div className="flex-col gap-4 w-full mt-2">
          {scannedStudent ? (
            <div className="p-8 animate-fade" style={{ borderRadius: '4rem', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
               <div className="flex-col gap-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-col gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[0.6rem] font-black text-emerald-600 uppercase tracking-widest">Identity Verified</span>
                      </div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter mt-2">{scannedStudent.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{scannedStudent.roll_no}</p>
                    </div>
                    <div className="relative">
                      <img src={scannedStudent.photo_url} className="w-32 h-32 rounded-full object-cover ring-8 ring-slate-50 shadow-2xl border-2 border-white" alt="" />
                      <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                        <Check className="w-4 h-4 text-white stroke-[4]" />
                      </div>
                    </div>
                  </div>

                 <DetailSection title="Dossier" icon={Zap}>
                    <InfoItem label="Stream" value={scannedStudent.stream} icon={Zap} />
                    <InfoItem label="Section" value={scannedStudent.section} icon={Hash} />
                    <InfoItem label="Shift" value={scannedStudent.shift} icon={Calendar} />
                    <InfoItem label="Contact" value={scannedStudent.student_phone} icon={Phone} />
                 </DetailSection>

                 <div className="flex-col gap-2">
                   <label className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={14} /> AI Parent Alert
                   </label>
                   <div className="p-6 rounded-2xl bg-slate-950 text-emerald-400 text-xs font-bold leading-relaxed italic border border-emerald-500/20">
                    {isDraftingAlert ? <Loader2 className="animate-spin text-purple-400 mx-auto" /> : parentAlert}
                   </div>
                 </div>
               </div>

               <div className="flex gap-4 mt-10">
                 <button onClick={() => setScannedStudent(null)} className="btn-secondary" style={{padding:'1.25rem'}}>Discard</button>
                  <button onClick={handleConfirmLate} disabled={notifying} className="flex-1 h-16 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-2xl shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 transition-all active:scale-95" style={{ border: 'none', cursor: 'pointer', borderRadius: '1.25rem' }}>
                    {notifying ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send size={18} className="fill-white" /> <span className="text-sm font-black uppercase tracking-widest">Confirm Entry</span></>}
                  </button>
               </div>
            </div>
          ) : (
            <div className="p-4 rounded-[4rem] relative w-full flex flex-col gap-2" style={{ borderRadius: '4rem', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6' }}>
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="relative overflow-hidden w-full bg-slate-50 flex flex-col items-center justify-center text-center shadow-inner" style={{ borderRadius: '2.5rem', minHeight: '200px', aspectRatio: '2/1' }}>
                <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${!isScanning && !scannedStudent ? 'hidden' : ''}`} muted playsInline />
                
                {isScanning ? (
                  <>
                    {/* Professional Viewfinder Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                        <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-white/90">System: Active Lens</span>
                      </div>
                      
                      {/* Scanning Beam */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-scan opacity-60" style={{ position: 'absolute', top: '0' }} />
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 relative">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white absolute inset-0 w-full h-full flex flex-col items-center justify-center z-10">
                    <div className="mb-2">
                      <Scan size={56} className="text-slate-800 mx-auto" />
                    </div>
                    <div className="flex flex-col gap-1 w-full relative z-10 mt-4">
                      <h3 className="text-[1.75rem] font-black text-slate-800 tracking-tight">{error ? "Lens Error" : "Scanner Standby"}</h3>
                      <p className="text-[0.7rem] font-black text-slate-800 uppercase tracking-widest mt-1">{error || "Awaiting Command Initialization"}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 w-full px-2 mt-8 justify-center">
                <button 
                  onClick={startCamera} 
                  disabled={isScanning}
                  style={{ backgroundColor: 'transparent', border: 'none', color: isScanning ? '#cccccc' : '#000000', opacity: isScanning ? 0.6 : 1 }}
                  className="px-4 h-10 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-[0.8rem] cursor-pointer"
                >
                  <PlayCircle className="w-5 h-5" /> START SCAN
                </button>
                <button 
                  onClick={stopCamera} 
                  disabled={!isScanning}
                  style={{ backgroundColor: 'transparent', border: 'none', color: !isScanning ? '#cccccc' : '#000000', opacity: !isScanning ? 0.6 : 1 }}
                  className="px-4 h-10 flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-[0.8rem] cursor-pointer"
                >
                  <StopCircle className="w-5 h-5" /> STOP SCAN
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry Hub */}
          <div className="p-6 rounded-[4rem] animate-slide-up" style={{ backgroundColor: '#fff1f2', border: '1px solid #ffe4e6' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-purple-600"><Terminal size={18} /></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Manual Entry Hub</h3>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Hash size={16} />
                </div>
                <input 
                  type="text" 
                  value={manualRollQuery}
                  onChange={(e) => setManualRollQuery(e.target.value.toUpperCase())}
                  placeholder="ENTER ROLL NUMBER"
                  className="w-full h-12 pl-11 pr-4 rounded-full bg-white/60 border border-white/80 focus:border-purple-300 outline-none text-xs font-bold tracking-widest uppercase transition-all"
                />
              </div>
              <button 
                onClick={handleManualSearch}
                disabled={isSearchingManual || !manualRollQuery}
                className="h-12 px-6 rounded-full bg-slate-900 text-white font-black text-[0.65rem] uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearchingManual ? <Loader2 className="animate-spin w-4 h-4" /> : <><Search size={14} /> Verify</>}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default FacultyView;
