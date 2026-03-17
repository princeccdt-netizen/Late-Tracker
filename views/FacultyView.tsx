
import {
  MessageSquare, Camera, MapPin, X, Check, RefreshCw, ShieldCheck, Scan, AlertCircle, Zap, StopCircle, PlayCircle,
  Terminal, UserCheck, Clock, Phone, User as UserIcon, Send, Loader2, Search, ArrowRight,
  Mail, BookOpen, Calendar, Hash, Briefcase, Heart, Shield, CreditCard, Target
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
  <div className="card-white p-8 mb-6">
    <div className="items-center gap-3 mb-6">
      <div className="btn-icon purple" style={{padding:'0.5rem'}}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="lg-grid gap-6" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
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
      <div className="card-white p-8 between">
        <div className="items-center gap-4">
          <div className="btn-premium" style={{padding:'0.75rem'}}><MapPin /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Command Center</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeGate}</p>
          </div>
        </div>
        <div className="tab-group">
          {GATES.map(g => (
            <button key={g} onClick={() => setActiveGate(g)} className={`tab-btn ${activeGate === g ? 'active' : ''}`}>{g}</button>
          ))}
        </div>
      </div>

      <div className="lg-grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex-col gap-8">
          <div className="scanner-section" style={{aspectRatio:'1/1', border:'10px solid white', boxShadow:'var(--shadow-lg)'}}>
            <canvas ref={canvasRef} className="hidden" />
            {isScanning ? (
              <div className="w-full h-full relative">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="scanner-viewfinder-premium">
                  <div className="scanner-beam"></div>
                </div>
              </div>
            ) : (
              <div className="center h-full flex-col text-white p-10 text-center gap-6">
                <div className="btn-premium" style={{background:'white', color:'var(--purple-600)', width:'80px', height:'80px', borderRadius:'2rem'}}>
                  {error ? <AlertCircle size={40} /> : <Scan size={40} />}
                </div>
                <h3 className="text-2xl font-black">{error ? "Lens Error" : "Scanner Standby"}</h3>
                <button onClick={startCamera} className="btn-premium w-full">Resume Lens</button>
              </div>
            )}
          </div>

          <div className="card-white p-8">
             <div className="items-center gap-4 mb-6">
               <div className="btn-icon purple" style={{padding:'0.5rem'}}><Search /></div>
               <h3 className="text-lg font-black text-slate-800">Manual Search</h3>
             </div>
             <div className="flex gap-2">
               <input 
                type="text" 
                placeholder="REGISTRY ID" 
                className="input-standard flex-1" 
                style={{background:'var(--purple-50)', color:'var(--slate-800)', border:'1px solid var(--purple-100)'}}
                value={manualRollQuery}
                onChange={e => setManualRollQuery(e.target.value.toUpperCase())}
               />
               <button onClick={handleManualSearch} className="btn-premium" style={{borderRadius:'1.25rem'}}><ArrowRight /></button>
             </div>
          </div>
        </div>

        <div className="flex-col gap-8">
          {scannedStudent ? (
            <div className="card-white p-10 animate-fade" style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
               <div className="flex-col gap-10">
                 <div className="between items-start">
                   <div className="flex-col gap-2">
                     <span className="badge badge-emerald">Identity Verified</span>
                     <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{scannedStudent.name}</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{scannedStudent.roll_no}</p>
                   </div>
                   <img src={scannedStudent.photo_url} className="w-24 h-24 rounded-3xl object-cover ring-white shadow-md" alt="" />
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
                 <button onClick={handleConfirmLate} disabled={notifying} className="btn-premium flex-1">
                   {notifying ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Confirm Entry</>}
                 </button>
               </div>
            </div>
          ) : (
            <div className="card-white p-10 flex-col gap-8">
               <div className="items-center gap-4">
                 <div className="btn-icon purple" style={{padding:'0.5rem'}}><Zap /></div>
                 <h3 className="text-xl font-black text-slate-800">Direct Dispatch</h3>
               </div>
               <div className="flex-col gap-4">
                 <div className="flex-col gap-2">
                   <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1">Terminal Phone</label>
                   <input className="input-standard" style={{background:'var(--purple-50)', color:'var(--slate-800)', border:'1px solid var(--purple-100)'}} value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                 </div>
                 <div className="flex-col gap-2">
                   <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1">Student Name</label>
                   <input className="input-standard" style={{background:'var(--purple-50)', color:'var(--slate-800)', border:'1px solid var(--purple-100)'}} value={manualName} onChange={e => setManualName(e.target.value)} />
                 </div>
                 <div className="flex-col gap-2">
                   <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1">Lateness (Mins)</label>
                   <input type="number" className="input-standard" style={{background:'var(--purple-50)', color:'var(--slate-800)', border:'1px solid var(--purple-100)'}} value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} />
                 </div>
               </div>
               <button onClick={handleManualWhatsAppDispatch} className="btn-premium" style={{background:'var(--emerald-500)'}}>
                 <MessageSquare size={18} /> Dispatch Override
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyView;
