
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
  <div className="bg-white rounded-[2.5rem] p-8 border border-rose-50 shadow-sm space-y-6">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-rose-50/30 hover:border-rose-100/50 transition-all">
    <div className="mt-1 text-rose-300">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
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
    console.log("Initializing Scanner...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not available. Potential causes: Insecure context (HTTP) or unsupported browser.");
      setError("Camera Access Error: Secure Connection (HTTPS) required for mobile camera access.");
      return;
    }

    try {
      const constraints = {
        video: { facingMode: 'environment' },
        audio: false
      };

      console.log("Requesting Camera Stream...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log("Scanner Optical Feed Active");
        setIsScanning(true);
        requestRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.error("Camera Access Denied or Initialization Failed:", err);
      setError(`Camera Error: ${err.name} - ${err.message}. Please ensure camera permissions are granted.`);
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
          console.log("QR Code Detected:", code.data);
          if (window.navigator.vibrate) window.navigator.vibrate([60, 40, 60]);
          // Keep isScanning true to allow persistent feed, but trigger lookup
          handleStudentLookup(code.data);
          // Briefly pause scan loop to avoid double-triggers, then resume
          setTimeout(() => {
            if (streamRef.current) requestRef.current = requestAnimationFrame(scanTick);
          }, 2000);
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
      // Logic: Search student in backend, show message, confirm, then send.
      const data = await studentService.getStudentByRoll(rollNo.trim());
      let foundStudent: Student | null = data as Student;
      if (!foundStudent) foundStudent = MOCK_STUDENTS.find(s => s.roll_no === rollNo.trim()) || null;

      if (foundStudent) {
        setShowSuccessOverlay(true);
        setScannedStudent(foundStudent);
        setIsDraftingAlert(true);

        // Generate tailored alerts via AI for this specific student context
        const pAlert = await generateParentAlert(foundStudent, activeGate);

        setParentAlert(pAlert);
        setIsDraftingAlert(false);
        setTimeout(() => setShowSuccessOverlay(false), 900);
      } else {
        alert("Student Roll Number not found in College Registry.");
      }
    } catch (err) { alert("Registry communication error."); }
  };

  const handleConfirmLate = async () => {
    if (!scannedStudent) return;
    setNotifying(true);
    try {
      // 1. Log the record in database
      await studentService.incrementLateCount(scannedStudent.roll_no, scannedStudent.late_count_this_month);
      await supabase.from('late_records').insert({
        student_roll: scannedStudent.roll_no,
        gate: activeGate,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      });

      // 2. Dispatach Twilio WhatsApp alerts
      let parentSent = false;
      let lecturerAlertSent = false;

      if (scannedStudent.father_phone) {
        parentSent = await whatsappService.sendWhatsApp(scannedStudent.father_phone, parentAlert);
      }

      // 3. High Alert for Lecturer if late > 3 times
      const newLateCount = (scannedStudent.late_count_this_month || 0) + 1;
      if (newLateCount > 3) {
        const lecturer = await staffService.getLecturerForStudent(
          scannedStudent.stream,
          scannedStudent.section,
          scannedStudent.years || ''
        );

        if (lecturer && lecturer.phone_no) {
          const highAlertMsg = await generateLecturerHighAlert(scannedStudent, lecturer.name);
          lecturerAlertSent = await whatsappService.sendWhatsApp(lecturer.phone_no, highAlertMsg);
        }
      }

      let alertMsg = `Late Entry Confirmed.\nMessage dispatched for ${scannedStudent.name}.\n\nParent: ${parentSent ? '✅ Dispatched' : '❌ Failed'}`;
      if (newLateCount > 3) {
        alertMsg += `\nLecturer High Alert: ${lecturerAlertSent ? '✅ Dispatched' : '❌ Failed/No Lecturer Found'}`;
      }

      alert(alertMsg);
      setScannedStudent(null);
      setManualRollQuery('');
    } catch (err) {
      alert("Error confirming late entry.");
    } finally {
      setNotifying(false);
    }
  };

  const handleManualWhatsAppDispatch = async () => {
    if (!manualPhone || !manualName) {
      alert("Please enter target number and student name.");
      return;
    }
    setNotifying(true);
    const currentTime = new Date().toLocaleTimeString();
    const message = `🏛️ *DGVC ATTENDANCE NOTIFICATION*\n\nStudent *${manualName}* has arrived late today at *${currentTime}* (*${manualMinutes} minutes late*). Please prioritize on-time attendance for lectures.\n\n- _DGVC Administration_`;

    const success = await whatsappService.sendWhatsApp(manualPhone, message);
    setNotifying(false);

    if (success) {
      alert("Automated Twilio alert dispatched successfully!");
      setManualPhone('');
      setManualName('');
    } else {
      alert("Twilio dispatch failed. Reverting to Manual WhatsApp redirect...");
      const cleanPhone = manualPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const SuccessOverlay = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="bg-emerald-500/95 backdrop-blur-3xl w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white/20 p-12 rounded-[5rem] border-4 border-white/30 shadow-2xl animate-bounce">
          <UserCheck className="w-32 h-32 text-white" />
        </div>
        <h2 className="text-6xl font-black text-white mt-12 tracking-tighter uppercase italic">Identity Verified</h2>
        <p className="text-white/80 font-black text-xl mt-4 uppercase tracking-[0.5em]">Synchronizing Records...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 space-y-12 pb-40">
      {showSuccessOverlay && <SuccessOverlay />}
      {/* Active Area Info */}
      <div className="bg-white rounded-[4rem] p-10 shadow-sm border border-rose-50 flex flex-col md:flex-row items-center justify-between gap-10 animate-stagger-1">
        <div className="flex items-center gap-6">
          <div className="bg-rose-50 p-4 rounded-3xl text-rose-500 shadow-inner animate-float"><MapPin className="w-8 h-8" /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Discipline Incharge Command</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5">{activeGate}</p>
          </div>
        </div>
        <div className="flex bg-rose-50/50 p-2 rounded-full border border-rose-100 overflow-x-auto max-w-full no-scrollbar">
          {GATES.map(g => (
            <button key={g} onClick={() => setActiveGate(g)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeGate === g ? 'bg-white text-rose-600 shadow-xl border border-rose-100' : 'text-slate-400 hover:text-rose-500'}`}>{g}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Optical Scanning & Manual Search Unit */}
        <div className="flex flex-col gap-8 animate-stagger-2">
          {/* Persistent Scanner Feed */}
          <div className="bg-slate-950 aspect-square rounded-[5rem] overflow-hidden relative border-[12px] border-white shadow-2xl flex items-center justify-center">
            <canvas ref={canvasRef} className="hidden" />

            <div className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 p-10 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse-rec shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Scanner Active</span>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-[92%] h-[92%] border-2 border-white/20 rounded-none relative">
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-rose-50 rounded-none" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-rose-50 rounded-none" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-rose-50 rounded-none" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-rose-50 rounded-none" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_25px_rgba(244,63,94,1)] animate-scan-beam" />
                  </div>
                </div>
              </div>
            </div>

            {isScanning && (
              <div className="flex justify-center -mt-4 z-10">
                <button onClick={stopCamera} className="pointer-events-auto px-12 py-5 bg-rose-500/90 backdrop-blur-md text-white rounded-[2.5rem] shadow-2xl font-bold text-[11px] uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-rose-600 transition-all active:scale-95">
                  <StopCircle className="w-5 h-5" /> Pause Scanner
                </button>
              </div>
            )}

            {!isScanning && (
              <div className="text-center p-16 space-y-12 h-full flex flex-col justify-center bg-slate-900/40 animate-in fade-in duration-500">
                <div className="w-32 h-32 bg-white rounded-[3.5rem] flex items-center justify-center mx-auto shadow-2xl border border-rose-50 animate-float">
                  {error ? <AlertCircle className="w-12 h-12 text-rose-500" /> : <Scan className="w-12 h-12 text-rose-500" />}
                </div>
                <div className="space-y-6">
                  <h3 className="text-3xl font-black text-white tracking-tight">{error ? "Lens Error" : "Scanner Standby"}</h3>
                  {error && <p className="text-rose-100/60 text-xs font-bold leading-relaxed max-w-xs mx-auto">{error}</p>}
                  <button onClick={startCamera} className="w-full btn-primary px-14 py-7 rounded-[3rem] font-black uppercase tracking-[0.25em] text-[11px] flex items-center gap-5 justify-center shadow-2xl active:scale-95 transition-all">
                    <PlayCircle className="w-6 h-6" /> {error ? "Try Again" : "Resume Scanning"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scanned Student Quick Card - Show below scanner when identified */}
          {scannedStudent && (
            <div className="bg-white rounded-[3.5rem] p-10 border border-rose-100 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom-12 duration-700">
              <div className="relative mb-6">
                <img src={scannedStudent.photo_url} className="w-32 h-32 rounded-[3.5rem] object-cover ring-[12px] ring-rose-50 shadow-xl" alt="" />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-3 rounded-xl text-white shadow-lg border-4 border-white">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{scannedStudent.name}</h3>
              <p className="text-rose-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-3 px-4 py-1.5 bg-rose-50 rounded-full">{scannedStudent.roll_no}</p>
            </div>
          )}

          {/* Persistent Manual Roll Number Search - Always Available */}
          <div className="bg-white rounded-[3.5rem] p-10 border border-rose-50 shadow-lg space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100"><Search className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Manual Roll Number Search</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identify student without QR</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="ENTER ROLL NO (e.g. 21E1156)"
                className="flex-1 bg-rose-50/20 border border-rose-100 rounded-[1.5rem] px-6 py-4 text-slate-900 font-mono font-black text-sm focus:ring-4 ring-rose-50 outline-none transition-all placeholder:text-slate-300"
                value={manualRollQuery}
                onChange={(e) => setManualRollQuery(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
              <button
                onClick={handleManualSearch}
                disabled={isSearchingManual || !manualRollQuery}
                className="bg-rose-500 px-6 rounded-[1.5rem] text-white hover:bg-rose-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {isSearchingManual ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dispatch Hub & Intelligence Panel */}
        <div className="space-y-10 flex flex-col animate-stagger-3">
          {scannedStudent ? (
            <div className="bg-white rounded-[4.5rem] p-12 border border-rose-50 shadow-2xl flex-1 flex flex-col justify-between animate-in slide-in-from-right-12 duration-700 overflow-y-auto no-scrollbar">
              <div className="space-y-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex px-6 py-2 bg-rose-50 text-rose-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-rose-100 animate-pulse">Late Entry Detected</div>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{scannedStudent.name}</h3>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.3em]">{scannedStudent.department} • {scannedStudent.stream || 'No Stream'}</p>
                  </div>
                </div>

                {/* Comprehensive Student Dossier */}
                <div className="grid grid-cols-1 gap-8">
                  <DetailSection title="Academic Profile" icon={Zap}>
                    <InfoItem label="Stream / Course" value={scannedStudent.stream} icon={Zap} />
                    <InfoItem label="Section" value={scannedStudent.section} icon={Hash} />
                    <InfoItem label="Shift" value={scannedStudent.shift} icon={Calendar} />
                    <InfoItem label="Batch / Year" value={scannedStudent.years} icon={Calendar} />
                    <InfoItem label="Registration ID" value={scannedStudent.registration_no} icon={CreditCard} />
                    <InfoItem label="Attendance Score" value={`${scannedStudent.punctuality_score}% Punctual`} icon={Target} />
                  </DetailSection>

                  <DetailSection title="Personal & Contact" icon={UserIcon}>
                    <InfoItem label="Gender" value={scannedStudent.sex} icon={UserIcon} />
                    <InfoItem label="Date of Birth" value={scannedStudent.dob} icon={Calendar} />
                    <InfoItem label="Student Phone" value={scannedStudent.student_phone} icon={Phone} />
                    <InfoItem label="Email Address" value={scannedStudent.email} icon={Mail} />
                    <InfoItem label="Aadhar Base" value={scannedStudent.aadhar_no} icon={Hash} />
                    <InfoItem label="Current Address" value={scannedStudent.address} icon={MapPin} />
                  </DetailSection>

                  <DetailSection title="Family & Guardian" icon={Heart}>
                    <InfoItem label="Father Name" value={scannedStudent.father_name} icon={UserIcon} />
                    <InfoItem label="Father Contact" value={scannedStudent.father_phone} icon={Phone} />
                    <InfoItem label="Father Occupation" value={scannedStudent.father_occupation} icon={Briefcase} />
                    <InfoItem label="Mother Name" value={scannedStudent.mother_name} icon={Heart} />
                    <InfoItem label="Mother Contact" value={scannedStudent.mother_phone} icon={Phone} />
                    <InfoItem label="Mother Occupation" value={scannedStudent.mother_occupation} icon={Briefcase} />
                  </DetailSection>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Parent Alert (AI Draft)
                    </label>
                    <div className="bg-slate-50 text-slate-700 p-8 rounded-[2.5rem] text-xs font-bold leading-relaxed border border-slate-100 relative shadow-inner italic">
                      {isDraftingAlert ? <RefreshCw className="animate-spin w-6 h-6 text-rose-400 mx-auto" /> : parentAlert}
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">PH: {scannedStudent.father_phone || 'MISSING'}</p>
                      <div className={`w-2 h-2 rounded-full ${scannedStudent.father_phone ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mt-12">
                <button onClick={() => { setScannedStudent(null); setManualRollQuery(''); }} className="px-10 py-6 bg-slate-50 text-slate-400 rounded-[2.5rem] transition-all flex items-center justify-center gap-4 hover:bg-rose-50 hover:text-rose-500">
                  <X className="w-5 h-5" /> Discard
                </button>
                <button onClick={handleConfirmLate} disabled={notifying || isDraftingAlert} className="flex-1 btn-primary py-7 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.25em] flex items-center justify-center gap-5 shadow-2xl active:scale-95">
                  {notifying ? <Loader2 className="animate-spin" /> : <><Send className="w-6 h-6" /> Confirm Late & Dispatch Alert</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[4.5rem] p-12 border border-rose-50 shadow-xl space-y-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl shadow-inner border border-rose-100">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Direct Alert Override</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Twilio Dispatch</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input
                      type="tel"
                      placeholder="e.g. 918888888888"
                      className="w-full pl-14 pr-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 ring-rose-50 transition-all"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input
                      type="text"
                      placeholder="Enter Full Name"
                      className="w-full pl-14 pr-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 ring-rose-50 transition-all"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Minutes Late</label>
                  <div className="relative">
                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input
                      type="number"
                      className="w-full pl-14 pr-6 py-4 bg-rose-50/20 border border-rose-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 ring-rose-50 transition-all"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleManualWhatsAppDispatch}
                disabled={notifying}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                {notifying ? <Loader2 className="animate-spin" /> : <><MessageSquare className="w-5 h-5 fill-white/20" /> Send via Twilio Sandbox</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Internal icon helpers
export default FacultyView;
