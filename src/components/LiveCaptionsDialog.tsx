import React, { useState, useEffect, useRef } from "react";
import { Camera, Mic, X, Loader2, Video, Languages, Youtube, MonitorPlay } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfig } from "@/contexts/ConfigContext";

// Extend Window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function LiveCaptionsDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [mode, setMode] = useState<'selection' | 'camera' | 'youtube'>('selection');
    const { config } = useConfig();

    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    // Ref to control auto-restart without stale closures
    const shouldRestartRef = useRef(false);
    const finalTranscriptAccRef = useRef(""); // accumulates final text across restarts
    const lastProcessedIndexRef = useRef(0); // guards against re-processing same results on mobile

    // Initialize Speech Recognition once
    useEffect(() => {
        if (!isOpen) return;

        console.log("Initializing Speech Recognition...");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Browser does not support Speech Recognition.");
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        // continuous=true causes duplicate events on Android/Safari; managed manually via onend restart
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("Speech Recognition started");
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let newFinal = "";
            let interim = "";

            // Start from whichever is greater: event.resultIndex or the last index we already processed.
            // This prevents re-processing the same results when the engine restarts on mobile.
            const startIndex = Math.max(event.resultIndex, lastProcessedIndexRef.current);

            for (let i = startIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    newFinal += result[0].transcript.trim() + " ";
                    lastProcessedIndexRef.current = i + 1; // mark as processed
                } else {
                    interim = result[0].transcript; // interim always replaces — only last partial matters
                }
            }

            if (newFinal.trim()) {
                finalTranscriptAccRef.current = (finalTranscriptAccRef.current + " " + newFinal).trim().slice(-400);
                setTranscript(finalTranscriptAccRef.current);
            }
            // Interim always replaces (it's the current partial word/phrase)
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error, event.message || "");
            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada ou bloqueada pelo sistema. Verifique as configurações do navegador.");
                shouldRestartRef.current = false;
            } else if (event.error === 'network') {
                toast.error("Erro de rede no reconhecimento de voz.");
            } else if (event.error === 'no-speech') {
                console.warn("No speech detected, will restart if active.");
            } else {
                console.warn(`Recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            console.log("Speech Recognition ended. shouldRestart:", shouldRestartRef.current);
            setInterimTranscript(""); // clear any dangling interim on session end
            // Use the ref — never reads from stale closure
            if (shouldRestartRef.current && recognitionRef.current) {
                // Small delay before restart avoids rapid-fire start/stop on mobile
                setTimeout(() => {
                    if (!shouldRestartRef.current || !recognitionRef.current) return;
                    try {
                        console.log("Restarting Speech Recognition...");
                        // Reset index guard: new session, new result array
                        lastProcessedIndexRef.current = 0;
                        recognitionRef.current.start();
                    } catch (e) {
                        console.error("Failed to restart:", e);
                        shouldRestartRef.current = false;
                        setIsListening(false);
                    }
                }, 250);
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            console.log("Cleaning up Speech Recognition...");
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
                recognitionRef.current = null;
            }
        };
    }, [isOpen]);

    const startSession = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error("O sistema requer uma conexão segura (HTTPS).");
            return;
        }

        try {
            toast.info("Acessando dispositivos...");
            
            let stream: MediaStream | null = null;
            // Use a local variable to track camera state synchronously (React setState is async)
            let cameraGranted = false;
            try {
                // Request BOTH audio and video.
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true 
                });
                cameraGranted = true;
                setIsCameraActive(true);
                console.log("Camera and Microphone access granted.");
            } catch (mediaError: any) {
                console.warn("Could not access camera, trying audio-only fallback", mediaError);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    cameraGranted = false;
                    setIsCameraActive(false);
                    toast.warning("Iniciando apenas com microfone (câmera indisponível).");
                    console.log("Microphone access granted (no camera).");
                } catch (audioError: any) {
                    console.error("Critical: Microphone access denied", audioError);
                    toast.error("Permissão de microfone é obrigatória para as legendas.");
                    return;
                }
            }

            streamRef.current = stream;
            
            // Wait for video element to be available if camera is active
            // NOTE: use local variable `cameraGranted`, NOT the state (which is async)
            if (cameraGranted) {
                setTimeout(async () => {
                    if (videoRef.current && stream) {
                        videoRef.current.srcObject = stream;
                        try { 
                            await videoRef.current.play(); 
                        } catch (e) { 
                            console.error("Video play error:", e); 
                        }
                    }
                }, 100);
            }

            // Reset transcript accumulators
            setTranscript("");
            setInterimTranscript("");
            finalTranscriptAccRef.current = "";
            lastProcessedIndexRef.current = 0;

            if (recognitionRef.current) {
                try {
                    // Mark that we WANT continuous listening (used in onend to decide restart)
                    shouldRestartRef.current = true;
                    console.log("Starting Speech Recognition...");
                    // Do NOT call stop() here — it triggers onend which calls start() again (double start)
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e: any) {
                    console.error("Recognition start error:", e);
                    if (e.name === 'InvalidStateError') {
                        // Already running — that's fine, just mark as listening
                        setIsListening(true);
                    } else {
                        toast.error("Erro ao iniciar reconhecimento de voz.");
                        shouldRestartRef.current = false;
                    }
                }
            } else {
                console.error("Speech Recognition not initialized");
                toast.error("Erro interno: Reconhecimento de voz não inicializado.");
            }

            toast.success("Monitoramento iniciado!");
        } catch (err: any) {
            console.error("Critical access error:", err);
            toast.error("Erro ao iniciar sessão: " + err.message);
        }
    };

    const stopSession = () => {
        console.log("Stopping session...");
        // Signal onend NOT to restart before calling stop()
        shouldRestartRef.current = false;
        finalTranscriptAccRef.current = "";
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
        }
        setIsListening(false);
        setIsCameraActive(false);
        setTranscript("");
        setInterimTranscript("");
        setMode('selection');
    };

    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return "";
        try {
            let videoId = "";
            if (url.includes("v=")) {
                videoId = url.split("v=")[1].split("&")[0];
            } else if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1].split("?")[0];
            } else if (url.includes("live/")) {
                videoId = url.split("live/")[1].split("?")[0];
            }
            
            // cc_load_policy=1: Forces captions
            // cc_lang_pref=pt: Prefers Portuguese
            // autoplay=1: Autoplays
            // mute=1: Often required for autoplay (user can unmute)
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&cc_load_policy=1&cc_lang_pref=pt&hl=pt&rel=0`;
        } catch (e) {
            return url;
        }
    };

    useEffect(() => {
        if (!isOpen) {
            stopSession();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="flex flex-col items-center gap-2 group transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="bg-[#E91E63] p-4 rounded-xl shadow-[6px_6px_0px_rgba(233,30,99,0.2)] border-2 border-[#880E4F] text-white">
                        <Languages className="w-10 h-10" />
                    </div>
                    <span className="text-[12px] font-black text-[#E91E63] tracking-tighter uppercase leading-none">ASSISTIR O CULTO</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] h-[90vh] bg-[#1a1a1a] border-2 border-accent text-white p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-4 border-b border-white/10 flex-row justify-between items-center space-y-0">
                    <DialogTitle className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Video className="w-6 h-6 text-accent" /> ACESSIBILIDADE - LEGENDA AO VIVO
                    </DialogTitle>
                    <div className="sr-only">Visualização com legendas automáticas para acessibilidade.</div>
                </DialogHeader>

                <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
                    {mode === 'selection' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-[#1a1a1a] to-black">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Como deseja assistir?</h2>
                                <p className="text-gray-400">Escolha a fonte para gerar as legendas automáticas</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-6">
                                {/* Option YouTube */}
                                <button 
                                    onClick={() => setMode('youtube')}
                                    className="flex flex-col items-center gap-4 p-8 bg-[#212351] rounded-2xl border-4 border-accent hover:bg-accent/20 transition-all group group-hover:scale-105"
                                >
                                    <div className="bg-[#FF0000] p-4 rounded-full shadow-lg">
                                        <Youtube className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Via Youtube</h3>
                                        <p className="text-xs text-gray-400 mt-1">Transmissão ao vivo com legendas automáticas do Youtube</p>
                                    </div>
                                </button>

                                {/* Option Camera */}
                                <button 
                                    onClick={() => setMode('camera')}
                                    className="flex flex-col items-center gap-4 p-8 bg-[#212351] rounded-2xl border-4 border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                                >
                                    <div className="bg-emerald-500 p-4 rounded-full shadow-lg">
                                        <Camera className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Presencial / Câmera</h3>
                                        <p className="text-xs text-gray-400 mt-1">Usa o microfone do celular para gerar legendas locais</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'youtube' && (
                        <div className="flex-1 flex flex-col relative">
                            <iframe 
                                src={getYoutubeEmbedUrl(config.youtube_link)} 
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                                title="YouTube Live Stream"
                            ></iframe>
                            <div className="absolute top-4 right-4 z-50">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="rounded-full w-12 h-12 shadow-xl"
                                    onClick={stopSession}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="bg-accent/10 border-t border-accent/20 p-2 text-center">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-accent flex items-center justify-center gap-2">
                                    <MonitorPlay className="w-3 h-3" /> Transmissão via Youtube com Legendas Automáticas Ativadas
                                </span>
                            </div>
                        </div>
                    )}

                    {mode === 'camera' && !isListening && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <div className="bg-[#212351] p-8 rounded-full animate-pulse border-4 border-accent">
                                <Languages className="w-16 h-16 text-white" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Preparado para Assistir?</h2>
                                <p className="text-gray-400 max-w-md px-8">O app usará seu microfone para gerar legendas locais em tempo real.</p>
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setMode('selection')}
                                    className="border-white/20 text-white font-bold"
                                >
                                    VOLTAR
                                </Button>
                                <Button
                                    onClick={startSession}
                                    className="bg-accent hover:bg-accent/90 text-white font-black px-12 py-8 text-xl rounded-none border-4 border-white transform hover:scale-105 transition-all shadow-[8px_8px_0px_rgba(255,255,255,0.2)]"
                                >
                                    INICIAR CAPTURA
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Caption view: shown when listening — with or without camera */}
                    {mode === 'camera' && isListening && (
                        <>
                            {/* Video Viewport — only rendered when camera is available */}
                            {isCameraActive && (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted={true}
                                    className="w-full h-full object-cover opacity-60"
                                />
                            )}

                            {/* Captions Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent min-h-[40%] flex flex-col justify-end">
                                <div className="max-w-4xl mx-auto w-full space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-black tracking-widest uppercase text-red-500">
                                            AO VIVO - {isCameraActive ? 'CÂMERA + MICROFONE' : 'MICROFONE'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-2xl md:text-3xl font-black text-white/60 leading-tight">
                                            {transcript}
                                        </p>
                                        <p className="text-3xl md:text-5xl font-black text-white leading-tight bg-white/10 px-4 py-2 inline-block">
                                            {interimTranscript || (transcript ? "" : "Captando áudio local...")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="absolute top-4 right-4 flex gap-4">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="rounded-full w-12 h-12"
                                    onClick={stopSession}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-[#212351] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Mic className={`w-4 h-4 ${isListening ? 'text-green-400 animate-bounce' : 'text-gray-400'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Status do Áudio: {isListening ? 'Captando' : 'Inativo'}
                            </span>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-white/50 uppercase italic">
                        Sistema de Acessibilidade v1.0 • KOI - Conectados em Cristo
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
