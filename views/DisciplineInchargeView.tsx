
import React, { useState, useRef, useEffect } from 'react';
import {
    Camera, MapPin, X, Check, RefreshCw, Scan, AlertCircle, StopCircle, PlayCircle, Loader2, Search, ArrowRight,
    Send, Upload, MessageSquare, ShieldCheck
} from 'lucide-react';
import { GATES, MOCK_STUDENTS } from '../constants';
import { Student } from '../types';
import { generateParentAlert } from '../services/geminiService';
import { whatsappService } from '../services/whatsappService';
import { studentService } from '../services/studentService';
import jsQR from 'jsqr';

const DisciplineInchargeView: React.FC = () => {
    const [activeGate, setActiveGate] = useState(GATES[0]);
    const [isScanning, setIsScanning] = useState(true);
    const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
    const [parentAlert, setParentAlert] = useState<string>('');
    const [notifying, setNotifying] = useState(false);
    const [isDraftingAlert, setIsDraftingAlert] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualRoll, setManualRoll] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isScanning) startCamera();
        return () => stopCamera();
    }, [isScanning]);

    const startCamera = async () => {
        setError(null);
        try {
            const constraints = { video: { facingMode: 'environment' }, audio: false };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                requestRef.current = requestAnimationFrame(scanTick);
            }
        } catch (err: any) {
            setError(`Error: ${err.message || 'Check permissions'}`);
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const scanTick = () => {
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
                    handleStudentLookup(code.data);
                    return;
                }
            }
        }
        requestRef.current = requestAnimationFrame(scanTick);
    };

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

    const handleStudentLookup = async (rollNo: string) => {
        stopCamera();
        setIsScanning(false);
        setIsDraftingAlert(true);
        try {
            const data = await studentService.getStudentByRoll(rollNo.trim());
            let found = data as Student || MOCK_STUDENTS.find(s => s.roll_no === rollNo.trim());
            if (found) {
                setScannedStudent(found);
                const alertMsg = await generateParentAlert(found, activeGate);
                setParentAlert(alertMsg);
            } else { alert("Not found."); setIsScanning(true); }
        } catch (err) { alert("Registry error."); setIsScanning(true); }
        finally { setIsDraftingAlert(false); }
    };

    const handleConfirm = async () => {
        if (!scannedStudent) return;
        setNotifying(true);
        try {
            await studentService.incrementLateCount(scannedStudent.roll_no, scannedStudent.late_count_this_month);
            await whatsappService.sendWhatsApp(scannedStudent.father_phone, parentAlert);
            alert("Confirmed!");
            resetScanner();
        } catch (err) { alert("Failed."); }
        finally { setNotifying(false); }
    };

    const resetScanner = () => {
        setScannedStudent(null);
        setParentAlert('');
        setIsScanning(true);
    };

    return (
        <div className="student-container" style={{maxWidth:'600px'}}>
            {/* Simple Header */}
            <div className="card-white p-6 between mb-6">
                <div className="items-center gap-3">
                    <div className="btn-icon purple" style={{padding:'0.5rem'}}><ShieldCheck /></div>
                    <h1 className="font-black text-xl tracking-tighter">Security <span className="text-purple-600">Gate</span></h1>
                </div>
                <select 
                    value={activeGate} 
                    onChange={e => setActiveGate(e.target.value)}
                    className="tab-btn active"
                    style={{fontSize:'0.6rem', padding:'0.5rem 1rem'}}
                >
                    {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>

            <main className="flex-col gap-6">
                <div className="card-white p-7 rounded-[3.5rem] shadow-2xl relative border-none mb-6" style={{ borderRadius: '3.5rem', padding: '1.75rem', backgroundColor: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="relative overflow-hidden rounded-[2.8rem] aspect-square bg-slate-900 border-none shadow-inner" style={{ borderRadius: '2.8rem', position: 'relative', overflow: 'hidden', aspectRatio: '1/1' }}>
                        {isScanning ? (
                            <>
                                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                                
                                {/* Status Pill Overlay */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-6 py-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10" style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]" />
                                    <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white">Scanner Active</span>
                                </div>

                                {/* Viewfinder Frame */}
                                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-32 relative">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500/60 rounded-tl-2xl" />
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-500/60 rounded-tr-2xl" />
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-500/60 rounded-bl-2xl" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-500/60 rounded-br-2xl" />
                                    </div>
                                </div>

                                {/* Large Pause Button Overlay */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full px-8">
                                    <button 
                                        onClick={() => setIsScanning(false)} 
                                        className="w-full bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-[2rem] shadow-2xl shadow-rose-500/40 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                                        style={{ borderRadius: '2rem', height: '4rem', border: 'none', cursor: 'pointer' }}
                                    >
                                        <StopCircle className="w-6 h-6 fill-white" />
                                        <span className="text-xs font-black uppercase tracking-widest text-white">Pause</span>
                                    </button>
                                </div>
                            </>
                        ) : !scannedStudent && (
                            <div className="center h-full flex-col text-white p-10 text-center gap-6 bg-gradient-to-br from-slate-800 to-slate-950">
                                <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl mb-2" style={{ borderRadius: '2rem' }}>
                                    {error ? <AlertCircle size={48} className="text-rose-500" /> : <Loader2 size={48} className="animate-spin text-rose-500" />}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-2xl font-black tracking-tight">{error || "Calibrating Lens"}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Command</p>
                                </div>
                                <button onClick={() => setIsScanning(true)} className="w-full h-16 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-2xl shadow-xl shadow-rose-500/20 font-black uppercase tracking-widest text-xs mt-4" style={{ borderRadius: '1.25rem', border: 'none', cursor: 'pointer' }}>
                                    Retry Scanner
                                </button>
                            </div>
                        )}

                        {scannedStudent && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-8 animate-fade text-center" style={{ borderRadius: '2.8rem' }}>
                                <div className="relative mb-6 mt-4">
                                    <img src={scannedStudent.photo_url} className="w-32 h-32 rounded-full object-cover ring-8 ring-slate-50 shadow-2xl border-2 border-white" alt="" />
                                    <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                        <Check className="w-4 h-4 text-white stroke-[4]" />
                                    </div>
                                </div>
                                
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{scannedStudent.name}</h3>
                                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">{scannedStudent.roll_no}</p>

                                <div className="p-5 bg-slate-950 text-emerald-400 text-[10px] font-bold leading-relaxed italic border border-emerald-500/20 rounded-xl w-full text-left mb-6 overflow-y-auto max-h-24">
                                    <div className="text-[9px] uppercase tracking-widest mb-1.5 text-emerald-500/60 font-black flex items-center gap-1.5"><ShieldCheck size={10} /> AI Dossier</div>
                                    {isDraftingAlert ? "Drafting Report..." : parentAlert}
                                </div>

                                <div className="flex-col gap-3 w-full mt-auto mb-2">
                                    <button onClick={handleConfirm} disabled={notifying} className="w-full h-14 bg-[#10b981] hover:bg-[#059669] text-white rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95" style={{ borderRadius: '1.25rem', border: 'none' }}>
                                        {notifying ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send size={16} className="fill-white" /> <span className="text-xs font-black uppercase tracking-widest">Confirm Entry</span></>}
                                    </button>
                                    <button onClick={resetScanner} className="w-full text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 py-3 transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Discard Record
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!scannedStudent && (
                    <div className="lg-grid gap-4" style={{gridTemplateColumns:'1fr 1fr'}}>
                        <button onClick={() => fileInputRef.current?.click()} className="card-white p-6 center flex-col gap-2 hover:border-purple-300">
                            <Upload className="text-purple-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Take Photo</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </button>
                        <button 
                            onClick={() => { const roll = prompt("Roll No:"); if(roll) handleStudentLookup(roll); }}
                            className="card-white p-6 center flex-col gap-2 hover:border-purple-300"
                        >
                            <Search className="text-purple-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Manual Entry</span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DisciplineInchargeView;
