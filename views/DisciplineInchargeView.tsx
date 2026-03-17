
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
                <div className="scanner-section" style={{aspectRatio:'1/1', border:'8px solid white', boxShadow:'var(--shadow-lg)'}}>
                    <canvas ref={canvasRef} className="hidden" />
                    {isScanning ? (
                        <div className="w-full h-full relative">
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            <div className="scanner-viewfinder-premium">
                                <div className="scanner-beam"></div>
                            </div>
                        </div>
                    ) : !scannedStudent && (
                        <div className="center h-full flex-col text-white p-10 text-center gap-6">
                            <div className="btn-premium" style={{background:'white', color:'var(--purple-600)', width:'60px', height:'80px', borderRadius:'2rem'}}>
                                {error ? <AlertCircle size={40} /> : <Loader2 size={40} className="animate-spin" />}
                            </div>
                            <h2 className="text-2xl font-black">{error || "Calibrating..."}</h2>
                            <button onClick={() => setIsScanning(true)} className="btn-premium w-full">Retry</button>
                        </div>
                    )}

                    {scannedStudent && (
                        <div className="modal-content animate-fade" style={{position:'absolute', inset:0, borderRadius:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:50}}>
                            <img src={scannedStudent.photo_url} className="w-40 h-40 rounded-3xl object-cover ring-white shadow-lg mb-8" alt="" />
                            <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{scannedStudent.name}</h3>
                            <div className="badge" style={{background:'var(--rose-500)', color:'white', marginTop:'1rem'}}>{scannedStudent.roll_no}</div>

                            <div className="mt-8 p-6 bg-slate-950 text-emerald-400 text-xs font-bold leading-relaxed italic border border-emerald-500/20 rounded-2xl w-full text-left">
                                <div className="text-[10px] uppercase tracking-widest mb-2 text-emerald-500/60 font-black">AI Dossier</div>
                                {isDraftingAlert ? "Drafting..." : parentAlert}
                            </div>

                            <div className="mt-10 flex-col gap-4 w-full">
                                <button onClick={handleConfirm} disabled={notifying} className="btn-premium w-full" style={{background:'#10b981'}}>
                                    {notifying ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Confirm Entry</>}
                                </button>
                                <button onClick={resetScanner} className="btn-secondary w-full" style={{padding:'1.25rem'}}>Reset</button>
                            </div>
                        </div>
                    )}
                </div>

                {isScanning && !scannedStudent && (
                   <button onClick={() => setIsScanning(false)} className="btn-premium" style={{background:'var(--rose-500)', margin:'-2rem auto 0', zIndex:100}}>
                      <StopCircle size={18} /> Pause
                   </button>
                )}

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
