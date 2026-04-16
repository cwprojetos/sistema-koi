import React, { useState, useEffect, useRef } from "react";
import { Camera, Mic, MicOff, X, Video, Languages, Youtube, MonitorPlay, Loader2 } from "lucide-react";
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

type SessionState = 'idle' | 'starting' | 'active';

export function LiveCaptionsDialog() {
    const [isOpen, setIsOpen]                 = useState(false);
    const [sessionState, setSessionState]     = useState<SessionState>('idle');
    const [transcript, setTranscript]         = useState("");
    const [interimTranscript, setInterim]     = useState("");
    const [isCameraActive, setCamera]         = useState(false);
    const [mode, setMode]                     = useState<'selection' | 'camera' | 'youtube'>('selection');

    const { config } = useConfig();

    const videoRef           = useRef<HTMLVideoElement>(null);
    const recognitionRef     = useRef<any>(null);
    const cameraStreamRef    = useRef<MediaStream | null>(null);
    const finalTranscriptRef = useRef("");
    // Tracks the last result index already processed as final.
    // Needed because on mobile Android, event.resultIndex can reset to 0
    // causing already-final results to be re-appended (word repetition bug).
    const lastFinalIndexRef  = useRef(0);
    // True while the user wants the session active.
    // On mobile, onend fires constantly even with continuous=true.
    // If this flag is true when onend fires, we auto-restart the engine.
    const shouldRestartRef   = useRef(false);

    const isListening = sessionState === 'active';

    // ── Create SpeechRecognition instance once when dialog opens ──────────────
    useEffect(() => {
        if (!isOpen) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            toast.error("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
            return;
        }

        const rec = new SR();
        rec.lang           = "pt-BR";
        rec.continuous     = true;   // stay alive — NO manual restart on onend
        rec.interimResults = true;

        rec.onstart = () => {
            console.log("[SR] onstart ✓ — recognition active");
            setSessionState('active');
        };

        rec.onresult = (event: any) => {
            let newFinal = "";
            let interim  = "";

            // On mobile, the results array can be reset by the engine.
            // If its length is <= our tracked index, reset the pointer.
            if (event.results.length <= lastFinalIndexRef.current) {
                lastFinalIndexRef.current = 0;
            }

            // Always start from our own tracked index, NOT event.resultIndex,
            // because event.resultIndex resets to 0 on Android Chrome.
            for (let i = lastFinalIndexRef.current; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) {
                    newFinal += r[0].transcript.trim() + " ";
                    lastFinalIndexRef.current = i + 1; // mark as consumed
                } else {
                    interim = r[0].transcript;
                    break; // only one interim at a time, stop here
                }
            }
            if (newFinal.trim()) {
                finalTranscriptRef.current = (finalTranscriptRef.current + " " + newFinal)
                    .trim().slice(-600);
                setTranscript(finalTranscriptRef.current);
            }
            setInterim(interim);
        };

        rec.onerror = (event: any) => {
            console.error("[SR] onerror:", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                toast.error("Permissão de microfone negada. Permita o acesso nas configurações do navegador.");
                setSessionState('idle');
            } else if (event.error === "audio-capture") {
                toast.error("Microfone não encontrado. Verifique se há um microfone conectado.");
                setSessionState('idle');
            } else if (event.error === "network") {
                toast.error("Erro de rede: o navegador não conseguiu conectar ao serviço de voz do Google.");
                setSessionState('idle');
            } else if (event.error === "no-speech") {
                // Normal silence — continuous=true keeps us alive, no action needed
                console.log("[SR] no-speech (silêncio detectado — aguardando fala)");
            } else {
                console.warn("[SR] onerror irrelevante:", event.error);
            }
        };

        // On desktop, continuous=true keeps engine alive and onend only fires
        // on explicit stop. On MOBILE (Android Chrome), the engine stops after
        // each utterance/silence and fires onend — so we must auto-restart.
        rec.onend = () => {
            console.log("[SR] onend");
            setInterim("");
            if (shouldRestartRef.current && recognitionRef.current) {
                console.log("[SR] onend — auto-restarting (mobile behavior)");
                try {
                    recognitionRef.current.start();
                } catch (e: any) {
                    if (e.name !== "InvalidStateError") {
                        console.error("[SR] restart error:", e);
                        shouldRestartRef.current = false;
                        setSessionState('idle');
                    }
                }
            } else {
                setSessionState('idle');
            }
        };

        recognitionRef.current = rec;
        console.log("[SR] instance created ✓");

        return () => {
            console.log("[SR] cleanup");
            shouldRestartRef.current = false; // prevent pending auto-restart
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
                recognitionRef.current = null;
            }
        };
    }, [isOpen]);

    // ── Cleanup when dialog closes ────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) stopSession();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Start session ─────────────────────────────────────────────────────────
    //
    // IMPORTANT: We do NOT call getUserMedia({ audio }) here.
    // Keeping a getUserMedia audio stream alive while also starting
    // SpeechRecognition causes a mic conflict on Chrome — the browser
    // silently refuses to give SR access to the mic and onstart never fires.
    //
    // SpeechRecognition handles its own mic permission internally.
    // If permission hasn't been granted yet, the browser will show the prompt.
    //
    const startSession = async () => {
        if (!recognitionRef.current) {
            toast.error("Reconhecimento de voz não inicializado. Feche e reabra o diálogo.");
            return;
        }

        setTranscript("");
        setInterim("");
        finalTranscriptRef.current = "";
        lastFinalIndexRef.current  = 0;
        shouldRestartRef.current   = true; // allow auto-restart on mobile
        setSessionState('starting');

        // ── Camera (video-only stream, no audio) — optional ───────────────────
        // We NEVER request audio here to avoid conflicting with SpeechRecognition.
        if (navigator.mediaDevices?.getUserMedia) {
            try {
                const vs = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                cameraStreamRef.current = vs;
                setCamera(true);
                console.log("[Media] camera granted (video-only)");
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = vs;
                        videoRef.current.play().catch(e => console.error("[Video]", e));
                    }
                }, 100);
            } catch {
                console.log("[Media] no camera — mic-only mode");
                setCamera(false);
            }
        } else {
            setCamera(false);
        }

        // ── Start SpeechRecognition ───────────────────────────────────────────
        // SR will internally request mic access if needed.
        // onstart fires → setSessionState('active') → caption view renders.
        try {
            console.log("[SR] calling start()...");
            recognitionRef.current.start();
        } catch (e: any) {
            if (e.name === "InvalidStateError") {
                // Engine was already running (edge case)
                console.warn("[SR] already running — treating as active");
                setSessionState('active');
            } else {
                console.error("[SR] start() error:", e);
                toast.error("Erro ao iniciar reconhecimento de voz: " + e.message);
                setSessionState('idle');
            }
        }
    };

    // ── Stop session ──────────────────────────────────────────────────────────
    const stopSession = () => {
        console.log("[SR] stopSession");
        shouldRestartRef.current   = false; // prevent auto-restart on mobile
        finalTranscriptRef.current = "";
        lastFinalIndexRef.current  = 0;

        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
        }

        setSessionState('idle');
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
        } catch { return url; }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95"
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

            <DialogContent
                className="sm:max-w-[90vw] h-[90vh] bg-[#1a1a1a] border-2 border-accent text-white p-0 overflow-hidden flex flex-col"
                aria-describedby="caption-dialog-desc"
            >
                <DialogHeader className="p-4 border-b border-white/10 flex-row justify-between items-center space-y-0">
                    <DialogTitle className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Video className="w-6 h-6 text-accent" /> ACESSIBILIDADE - LEGENDA AO VIVO
                    </DialogTitle>
                    <p id="caption-dialog-desc" className="sr-only">
                        Visualização com legendas automáticas para acessibilidade.
                    </p>
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

                    {/* ── Camera mode – idle (waiting for user to click) ───── */}
                    {mode === 'camera' && sessionState === 'idle' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <div className="bg-[#212351] p-8 rounded-full animate-pulse border-4 border-accent">
                                <Languages className="w-16 h-16 text-white" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Preparado para Assistir?</h2>
                                <p className="text-gray-400 max-w-md px-8">
                                    O app usará seu microfone para gerar legendas locais em tempo real.
                                </p>
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

                    {/* ── Camera mode – starting (waiting for mic permission / onstart) ── */}
                    {mode === 'camera' && sessionState === 'starting' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-16 h-16 text-accent animate-spin" />
                            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Aguardando permissão do microfone...</h2>
                            <p className="text-gray-400 text-sm px-8 text-center">
                                Autorize o acesso ao microfone quando o navegador solicitar.
                            </p>
                            <Button variant="outline" onClick={stopSession} className="border-white/20 text-white font-bold mt-4">
                                CANCELAR
                            </Button>
                        </div>
                    )}

                    {/* ── Camera mode – active captions ───────────────────── */}
                    {mode === 'camera' && sessionState === 'active' && (
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

                {/* ── Status bar ───────────────────────────────────────────── */}
                <div className="p-4 bg-[#212351] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {sessionState === 'active'
                            ? <Mic className="w-4 h-4 text-green-400 animate-bounce" />
                            : sessionState === 'starting'
                            ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                            : <MicOff className="w-4 h-4 text-gray-400" />
                        }
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Status do Áudio:{" "}
                            {sessionState === 'active' ? 'Captando' : sessionState === 'starting' ? 'Iniciando...' : 'Inativo'}
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
