import React, { useState, useEffect, useRef } from "react";
import { Camera, Mic, X, Video, Languages, Youtube, MonitorPlay } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfig } from "@/contexts/ConfigContext";

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function LiveCaptionsDialog() {
    const [isOpen, setIsOpen]             = useState(false);
    const [isListening, setIsListening]   = useState(false);
    const [transcript, setTranscript]     = useState("");
    const [interimTranscript, setInterim] = useState("");
    const [isCameraActive, setCamera]     = useState(false);
    const [mode, setMode]                 = useState<'selection' | 'camera' | 'youtube'>('selection');

    const { config } = useConfig();

    const videoRef           = useRef<HTMLVideoElement>(null);
    const recognitionRef     = useRef<any>(null);
    const cameraStreamRef    = useRef<MediaStream | null>(null); // video-only stream (no audio)
    const finalTranscriptRef = useRef("");

    // ── Create the SpeechRecognition instance once per dialog open ────────────
    // We create it here and NEVER call stop() inside this effect.
    // The instance is reused for the whole session.
    useEffect(() => {
        if (!isOpen) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            toast.error("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        const rec = new SR();
        rec.lang           = "pt-BR";
        rec.continuous     = true;   // keep session alive — browser handles mic on its own
        rec.interimResults = true;

        rec.onstart = () => {
            console.log("[SR] onstart — recognition active");
            setIsListening(true);
        };

        rec.onresult = (event: any) => {
            let newFinal = "";
            let interim  = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) {
                    newFinal += r[0].transcript.trim() + " ";
                } else {
                    interim = r[0].transcript;
                }
            }

            if (newFinal.trim()) {
                finalTranscriptRef.current = (finalTranscriptRef.current + " " + newFinal)
                    .trim()
                    .slice(-600);
                setTranscript(finalTranscriptRef.current);
            }
            setInterim(interim);
        };

        rec.onerror = (event: any) => {
            console.error("[SR] onerror:", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                toast.error("Permissão de microfone negada. Verifique as configurações do navegador.");
                setIsListening(false);
            } else if (event.error === "no-speech") {
                // Normal silence with continuous=true — engine stays alive, ignore
                console.log("[SR] no-speech (silence)");
            } else if (event.error === "audio-capture") {
                toast.error("Microfone não encontrado ou ocupado por outro app.");
                setIsListening(false);
            } else if (event.error === "network") {
                toast.error("Erro de rede no reconhecimento de voz.");
            } else {
                console.warn("[SR] onerror:", event.error);
            }
        };

        // onend only fires if something external ends the session (e.g. error, stop() call).
        // With continuous=true it should NOT fire during normal operation.
        // Do NOT call start() here — that is what created the infinite loop.
        rec.onend = () => {
            console.log("[SR] onend — session ended");
            setInterim("");
            setIsListening(false);
        };

        recognitionRef.current = rec;
        console.log("[SR] instance created");

        return () => {
            // Cleanup: stop recognition when dialog closes / component unmounts
            console.log("[SR] cleanup — stopping instance");
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
                recognitionRef.current = null;
            }
        };
    }, [isOpen]);

    // ── Close dialog → tear everything down ───────────────────────────────────
    useEffect(() => {
        if (!isOpen) stopSession();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Start capture ─────────────────────────────────────────────────────────
    //
    // Key design:
    //   • getUserMedia is used ONLY for the camera preview (video only, no audio).
    //   • For mic permission: request audio via getUserMedia, then IMMEDIATELY stop
    //     those audio tracks so the mic is free for SpeechRecognition.
    //   • SpeechRecognition manages its own microphone access internally.
    //
    const startSession = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error("O sistema requer uma conexão segura (HTTPS).");
            return;
        }
        if (!recognitionRef.current) {
            toast.error("Erro interno: reconhecimento de voz não inicializado.");
            return;
        }

        setTranscript("");
        setInterim("");
        finalTranscriptRef.current = "";

        // ── Step 1: Camera (video only — no audio track to avoid mic conflict) ─
        let cameraGranted = false;
        try {
            toast.info("Acessando câmera...");
            // Request video ONLY — audio stays free for SpeechRecognition
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStreamRef.current = videoStream;
            cameraGranted = true;
            setCamera(true);
            console.log("[Media] camera granted (video-only stream)");

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                    videoRef.current.play().catch(e => console.error("[Video] play error:", e));
                }
            }, 100);
        } catch {
            console.log("[Media] camera unavailable — mic-only mode");
            setCamera(false);

            // ── Step 1b: Trigger browser mic permission prompt, then release ──
            // We must NOT hold this stream — it would block SpeechRecognition.
            try {
                toast.info("Solicitando permissão do microfone...");
                const tempMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Immediately release all audio tracks so SR can take the mic
                tempMicStream.getTracks().forEach(t => t.stop());
                console.log("[Media] mic permission granted and released for SR");
            } catch (micErr: any) {
                console.error("[Media] mic denied:", micErr);
                toast.error("Permissão de microfone é obrigatória para as legendas.");
                return;
            }
        }

        // ── Step 2: Start SpeechRecognition ───────────────────────────────────
        // By now the mic is free (no competing audio stream).
        // SpeechRecognition will grab it on its own.
        try {
            console.log("[SR] calling start()...");
            recognitionRef.current.start();
            // setIsListening(true) happens in onstart callback
        } catch (e: any) {
            if (e.name === "InvalidStateError") {
                // Already running — treat as success
                console.warn("[SR] InvalidStateError on start — already running");
                setIsListening(true);
            } else {
                console.error("[SR] start() threw:", e);
                toast.error("Erro ao iniciar reconhecimento de voz: " + e.message);
                return;
            }
        }

        toast.success("Monitoramento iniciado!");
    };

    // ── Stop session ──────────────────────────────────────────────────────────
    const stopSession = () => {
        console.log("[SR] stopSession called");
        finalTranscriptRef.current = "";

        // Stop camera stream
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        }

        // Stop recognition (onend will fire and set isListening=false)
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        setIsListening(false);
        setCamera(false);
        setTranscript("");
        setInterim("");
        setMode('selection');
    };

    // ── YouTube embed URL ─────────────────────────────────────────────────────
    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return "";
        try {
            let id = "";
            if (url.includes("v="))             id = url.split("v=")[1].split("&")[0];
            else if (url.includes("youtu.be/")) id = url.split("youtu.be/")[1].split("?")[0];
            else if (url.includes("live/"))     id = url.split("live/")[1].split("?")[0];
            return `https://www.youtube.com/embed/${id}?autoplay=1&cc_load_policy=1&cc_lang_pref=pt&hl=pt&rel=0`;
        } catch {
            return url;
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
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
                    <span className="text-[12px] font-black text-[#E91E63] tracking-tighter uppercase leading-none">
                        ASSISTIR O CULTO
                    </span>
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

                    {/* ── Mode selection ─────────────────────────────────── */}
                    {mode === 'selection' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-[#1a1a1a] to-black">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Como deseja assistir?</h2>
                                <p className="text-gray-400">Escolha a fonte para gerar as legendas automáticas</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-6">
                                <button
                                    onClick={() => setMode('youtube')}
                                    className="flex flex-col items-center gap-4 p-8 bg-[#212351] rounded-2xl border-4 border-accent hover:bg-accent/20 transition-all"
                                >
                                    <div className="bg-[#FF0000] p-4 rounded-full shadow-lg">
                                        <Youtube className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Via Youtube</h3>
                                        <p className="text-xs text-gray-400 mt-1">Transmissão ao vivo com legendas automáticas do Youtube</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setMode('camera')}
                                    className="flex flex-col items-center gap-4 p-8 bg-[#212351] rounded-2xl border-4 border-white/10 hover:border-white/30 hover:bg-white/5 transition-all"
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

                    {/* ── YouTube mode ────────────────────────────────────── */}
                    {mode === 'youtube' && (
                        <div className="flex-1 flex flex-col relative">
                            <iframe
                                src={getYoutubeEmbedUrl(config.youtube_link)}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title="YouTube Live Stream"
                            />
                            <div className="absolute top-4 right-4 z-50">
                                <Button variant="destructive" size="icon" className="rounded-full w-12 h-12 shadow-xl" onClick={stopSession}>
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

                    {/* ── Camera mode – waiting to start ──────────────────── */}
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
                                <Button variant="outline" onClick={() => setMode('selection')} className="border-white/20 text-white font-bold">
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

                    {/* ── Camera mode – active captions ───────────────────── */}
                    {mode === 'camera' && isListening && (
                        <>
                            {isCameraActive && (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover opacity-60"
                                />
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent min-h-[40%] flex flex-col justify-end">
                                <div className="max-w-4xl mx-auto w-full space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-xs font-black tracking-widest uppercase text-red-500">
                                            AO VIVO — {isCameraActive ? 'CÂMERA + MICROFONE' : 'MICROFONE'}
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

                            <div className="absolute top-4 right-4">
                                <Button variant="destructive" size="icon" className="rounded-full w-12 h-12" onClick={stopSession}>
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-[#212351] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Mic className={`w-4 h-4 ${isListening ? 'text-green-400 animate-bounce' : 'text-gray-400'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Status do Áudio: {isListening ? 'Captando' : 'Inativo'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/50 uppercase italic">
                        Sistema de Acessibilidade v1.0 • KOI - Conectados em Cristo
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
