import React, { useState, useEffect, useRef } from "react";
import { Camera, Mic, X, Loader2, Video, Languages } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("Speech Recognition started");
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let interim = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                setTranscript((prev) => (prev + " " + finalTranscript).slice(-300));
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech Recognition Error:", event.error);
            if (event.error === 'not-allowed') {
                toast.error("Permissão de microfone negada ou bloqueada pelo sistema.");
            }
            if (event.error === 'network') {
                toast.error("Erro de rede no reconhecimento de voz.");
            }
        };

        recognition.onend = () => {
            console.log("Speech Recognition ended");
            // If we are still supposed to be listening, restart it
            // Use a ref check because state might be stale in this callback
            if (recognitionRef.current && isOpen) {
                try {
                    console.log("Restarting Speech Recognition...");
                    recognition.start();
                } catch (e) {
                    console.error("Failed to restart:", e);
                    setIsListening(false);
                }
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
            let videoEnabled = false;

            try {
                // Tenta vídeo e áudio primeiro
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: true
                });
                videoEnabled = true;
                setIsCameraActive(true);
            } catch (videoError: any) {
                console.warn("Retrying with only audio...", videoError);
                try {
                    // Tenta apenas áudio
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setIsCameraActive(false);
                    videoEnabled = false;
                    toast.warning("Iniciando apenas áudio (câmera indisponível).");
                } catch (audioError: any) {
                    console.error("No audio device found either:", audioError);
                    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                        toast.error("O acesso ao microfone requer HTTPS em servidores remotos.");
                    } else {
                        toast.error("Nenhum microfone ou câmera encontrado. Conecte um dispositivo.");
                    }
                    return;
                }
            }

            if (!stream) return;
            streamRef.current = stream;
            
            setTimeout(async () => {
                if (videoRef.current && stream && videoEnabled) {
                    videoRef.current.srcObject = stream;
                    try { 
                        await videoRef.current.play(); 
                    } catch (e) { 
                        console.error("Video play error:", e); 
                    }
                }
            }, 100);

            setTranscript("");
            setInterimTranscript("");

            if (recognitionRef.current) {
                try { 
                    recognitionRef.current.start(); 
                    setIsListening(true);
                } catch (e) { 
                    console.error("Recognition start error:", e);
                }
            }

            toast.success("Monitoramento iniciado!");
        } catch (err: any) {
            console.error("Critical access error:", err);
            toast.error("Erro inesperado ao acessar dispositivos: " + err.message);
        }
    };

    const stopSession = () => {
        console.log("Stopping session...");
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
                    <DialogDescription className="sr-only">
                        Este diálogo permite visualizar legendas ao vivo para acessibilidade durante o culto.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
                    {!isCameraActive && !isListening ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <div className="bg-[#212351] p-8 rounded-full animate-pulse border-4 border-accent">
                                <Languages className="w-16 h-16 text-white" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Preparado para Assistir?</h2>
                                <p className="text-gray-400 max-w-md px-8">O app usará seu microfone (e opcionalmente a câmera) para gerar legendas automáticas da pregação.</p>
                            </div>
                            <Button
                                onClick={startSession}
                                className="bg-accent hover:bg-accent/90 text-white font-black px-12 py-8 text-xl rounded-none border-4 border-white transform hover:scale-105 transition-all shadow-[8px_8px_0px_rgba(255,255,255,0.2)]"
                            >
                                INICIAR TRANSMISSÃO
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Video Viewport */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted={false}
                                className="w-full h-full object-cover opacity-60"
                            />

                            {/* Captions Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent min-h-[40%] flex flex-col justify-end">
                                <div className="max-w-4xl mx-auto w-full space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-black tracking-widest uppercase text-red-500">AO VIVO</span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-2xl md:text-3xl font-black text-white/60 leading-tight">
                                            {transcript}
                                        </p>
                                        <p className="text-3xl md:text-5xl font-black text-white leading-tight bg-white/10 px-4 py-2 inline-block">
                                            {interimTranscript || (transcript ? "" : "Aguardando pregação...")}
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
