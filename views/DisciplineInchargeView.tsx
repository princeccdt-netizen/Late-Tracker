
import React, { useState, useRef, useEffect } from 'react';
import {
    Camera,
    MapPin,
    X,
    Check,
    RefreshCw,
    Scan,
    AlertCircle,
    StopCircle,
    PlayCircle,
    Loader2,
    Search,
    ArrowRight,
    Send,
    Upload,
    MessageSquare
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
            console.log("Requesting Mobile Camera...");
            const constraints = {
                video: { facingMode: 'environment' },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("Camera stream obtained.");
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                console.log("Video playing, starting scan loop.");
                requestRef.current = requestAnimationFrame(scanTick);
            }
        } catch (err: any) {
            console.error("Camera Error:", err);
            setError(`Camera Error: ${err.message || 'Unknown'}. Please ensure permissions are granted.`);
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
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        handleStudentLookup(code.data);
                    } else {
                        alert("No QR code found in the image. Please try a clearer photo.");
                    }
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
            } else {
                alert("Student not found.");
                setIsScanning(true);
            }
        } catch (err) {
            alert("Error fetching student details.");
            setIsScanning(true);
        } finally {
            setIsDraftingAlert(false);
        }
    };

    const handleConfirm = async () => {
        if (!scannedStudent) return;
        setNotifying(true);
        try {
            await studentService.incrementLateCount(scannedStudent.roll_no, scannedStudent.late_count_this_month);
            const success = await whatsappService.sendWhatsApp(scannedStudent.father_phone, parentAlert);
            alert(success ? "Late entry logged & Parent notified! ✅" : "Logged, but WhatsApp failed. ⚠️");
            resetScanner();
        } catch (err) {
            alert("Confirmation failed.");
        } finally {
            setNotifying(false);
        }
    };

    const resetScanner = () => {
        setScannedStudent(null);
        setParentAlert('');
        setManualRoll('');
        setIsScanning(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white px-6 py-6 border-b border-rose-100 sticky top-0 z-40">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-500 p-2 rounded-xl text-white">
                            <Scan className="w-5 h-5" />
                        </div>
                        <h1 className="font-black text-lg tracking-tight">Gate Scanner</h1>
                    </div>
                    <select
                        value={activeGate}
                        onChange={(e) => setActiveGate(e.target.value)}
                        className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase px-4 py-2 rounded-full border-none outline-none ring-1 ring-rose-100"
                    >
                        {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            <main className="p-4 space-y-6">
                {/* Scanner Feed Container */}
                <div className="bg-black aspect-square rounded-[3rem] overflow-hidden relative shadow-2xl border-4 border-white">
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Viewfinder logic */}
                    {isScanning ? (
                        <>
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            <div className="absolute inset-0 border-[12px] border-black/40 pointer-events-none">
                                <div className="w-full h-full border-2 border-rose-500/50 rounded-none relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-none" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-rose-50 rounded-none" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-rose-50 rounded-none" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-rose-50 rounded-none" />
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)] animate-scan-beam" />
                                </div>
                            </div>
                        </>
                    ) : !scannedStudent && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-slate-900">
                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6">
                                {error ? <AlertCircle className="w-10 h-10 text-rose-400" /> : <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />}
                            </div>
                            <h2 className="text-white font-black text-xl mb-2">{error || "Preparing Lens..."}</h2>
                            <button onClick={() => setIsScanning(true)} className="mt-4 px-8 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Retry Camera</button>
                        </div>
                    )}

                    {/* Scanned Card Overlay */}
                    {scannedStudent && (
                        <div className="absolute inset-0 bg-white p-8 mb-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300 z-50">
                            <img src={scannedStudent.photo_url} className="w-40 h-40 rounded-[3rem] object-cover ring-[12px] ring-rose-50 mb-8 shadow-2xl" alt="" />
                            <h3 className="text-4xl font-black text-slate-950 leading-tight tracking-tighter">{scannedStudent.name}</h3>
                            <div className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-full inline-block">
                                <p className="font-black text-xl tracking-widest">{scannedStudent.roll_no}</p>
                            </div>

                            <div className="mt-8 w-full p-8 bg-slate-950 rounded-[2.5rem] border-2 border-emerald-500/30 text-left text-sm font-bold text-emerald-400 leading-relaxed italic shadow-2xl">
                                <div className="text-[10px] uppercase tracking-[0.2em] mb-3 text-emerald-500/60 font-black flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Digital Dossier / AI Parent Alert
                                </div>
                                {isDraftingAlert ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Drafting high-priority alert...</span>
                                    </div>
                                ) : parentAlert}
                            </div>

                            <div className="mt-10 flex flex-col gap-4 w-full">
                                <button
                                    onClick={handleConfirm}
                                    disabled={notifying || isDraftingAlert}
                                    className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-sm tracking-widest rounded-3xl shadow-2xl shadow-emerald-200 flex items-center justify-center gap-4 active:scale-95 transition-all"
                                >
                                    {notifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-6 h-6" /> Confirm & Notify Parent</>}
                                </button>
                                <button onClick={resetScanner} className="w-full py-5 bg-slate-100 text-slate-500 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">Discard & Reset</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pause Button - Moved below square as requested */}
                {isScanning && !scannedStudent && (
                    <div className="flex justify-center -mt-8 relative z-50">
                        <button
                            onClick={() => setIsScanning(false)}
                            className="bg-rose-500 text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all animate-in slide-in-from-top-4"
                        >
                            <StopCircle className="w-5 h-5" /> Pause Scanner
                        </button>
                    </div>
                )}

                {/* Action Bar */}
                {!scannedStudent && (
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all"
                        >
                            <div className="bg-rose-50 p-3 rounded-2xl text-rose-500">
                                <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Upload Photo</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </button>

                        <button
                            onClick={() => {
                                const roll = prompt("Enter Student Roll Number:");
                                if (roll) handleStudentLookup(roll);
                            }}
                            className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all"
                        >
                            <div className="bg-rose-50 p-3 rounded-2xl text-rose-500">
                                <Search className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Manual Entry</span>
                        </button>
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <h3 className="text-xl font-black tracking-tight mb-2">Gate Intelligence</h3>
                    <p className="text-indigo-100 text-[11px] font-medium leading-relaxed">System automatically detects QR codes. If camera access is slow, use the 'Upload' button to take a steady picture of the ID.</p>
                </div>
            </main>
        </div>
    );
};

export default DisciplineInchargeView;
