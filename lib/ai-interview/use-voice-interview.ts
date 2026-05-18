'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  configureNaturalUtterance,
  pickNaturalVoice,
  prepareSpeechSynthesis,
  warmSpeechVoices,
} from '@/lib/ai-interview/speech-voice';

type SpeechResult = {
  isFinal: boolean;
  0?: { transcript: string };
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionStatic = {
  available?: (options: { langs: string[]; processLocally?: boolean }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally?: boolean }) => Promise<boolean>;
};

type BrowserSpeechRecognitionCtor = (new () => BrowserSpeechRecognition) & SpeechRecognitionStatic;

const RECOGNITION_LANG = 'en-US';
const MAX_NETWORK_RETRIES = 4;
const RESTART_DELAY_MS = 900;

function getRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}

function mapSpeechError(error: string, useLocal: boolean): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the mic in your browser site settings, then tap Speak answer again.';
    case 'no-speech':
      return 'No speech detected. Speak clearly and try again.';
    case 'audio-capture':
      return 'No microphone found. Connect a mic or check system settings.';
    case 'network':
      if (useLocal) {
        return 'Speech recognition failed. Type your answer below, or tap Speak answer to retry.';
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'You appear to be offline. Connect to the internet, or type your answer below.';
      }
      return 'Voice-to-text could not reach Google’s speech service (blocked VPN, firewall, or ad-blocker). Type your answer below, or tap Speak answer to retry.';
    case 'aborted':
      return 'Listening stopped.';
    default:
      return `Microphone error: ${error}`;
  }
}

/** Only enable on-device STT when already installed — never block UI on language pack download. */
async function enableOnDeviceIfPossible(recognition: BrowserSpeechRecognition): Promise<boolean> {
  if (!('processLocally' in recognition)) return false;

  const Ctor = getRecognitionCtor();
  if (!Ctor?.available) return false;

  try {
    const status = await Ctor.available({ langs: [RECOGNITION_LANG], processLocally: true });
    if (status === 'available') {
      recognition.processLocally = true;
      return true;
    }
  } catch {
    /* use cloud recognition */
  }
  return false;
}

export function useVoiceInterview() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoListen, setAutoListen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [usingOnDeviceSpeech, setUsingOnDeviceSpeech] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>(
    'unknown',
  );
  const [awaitingMicTap, setAwaitingMicTap] = useState(false);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryRef = useRef(0);
  const preferLocalRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const onTranscriptRef = useRef<(text: string) => void>(() => {});
  const onSpeakEndRef = useRef<(() => void) | null>(null);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});
  const listeningBusyRef = useRef(false);
  const transcriptRafRef = useRef<number | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const releaseMicStream = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionCtor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    };
    const recognitionAvailable =
      typeof w.SpeechRecognition !== 'undefined' || typeof w.webkitSpeechRecognition !== 'undefined';
    setSpeechAvailable(recognitionAvailable && isSecureContext());
    if (!recognitionAvailable || !isSecureContext()) setVoiceEnabled(false);

    const cacheVoices = () => {
      warmSpeechVoices();
      if ('speechSynthesis' in window) {
        preferredVoiceRef.current = pickNaturalVoice(window.speechSynthesis.getVoices());
      }
    };
    cacheVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = cacheVoices;
    }

    return () => {
      shouldListenRef.current = false;
      listeningBusyRef.current = false;
      clearRestartTimer();
      if (transcriptRafRef.current !== null) cancelAnimationFrame(transcriptRafRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      releaseMicStream();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [clearRestartTimer, releaseMicStream]);

  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    setSpeechError(null);
    if (!isSecureContext()) {
      setSpeechError('Voice input requires HTTPS or localhost. Open the site on a secure URL.');
      setMicPermission('unsupported');
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechError('Microphone API is not available in this browser.');
      setMicPermission('unsupported');
      return false;
    }
    try {
      if (!micStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
      }
      setMicPermission('granted');
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setMicPermission('denied');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setSpeechError(
          'Microphone permission denied. Click the lock icon in the address bar, allow the microphone, then try again.',
        );
      } else if (name === 'NotFoundError') {
        setSpeechError('No microphone detected. Connect a microphone and try again.');
      } else {
        setSpeechError('Could not access the microphone. Check browser and system settings.');
      }
      return false;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    networkRetryRef.current = 0;
    setAwaitingMicTap(false);
    clearRestartTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }
    setIsListening(false);
  }, [clearRestartTimer]);

  const scheduleRecognitionRestart = useCallback((delayMs = RESTART_DELAY_MS) => {
    clearRestartTimer();
    restartTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current) return;
      void startListeningRef.current();
    }, delayMs);
  }, [clearRestartTimer]);

  const attachRecognitionHandlers = useCallback(
    (recognition: BrowserSpeechRecognition) => {
      recognition.onstart = () => {
        setIsListening(true);
        setAwaitingMicTap(false);
        setSpeechError(null);
        networkRetryRef.current = 0;
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!shouldListenRef.current || listeningBusyRef.current) return;
        scheduleRecognitionRestart();
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted') return;

        if (event.error === 'no-speech') {
          if (shouldListenRef.current) {
            setSpeechError(mapSpeechError('no-speech', preferLocalRef.current));
          }
          return;
        }

        if (event.error === 'network' && shouldListenRef.current) {
          networkRetryRef.current += 1;

          if (!preferLocalRef.current) {
            preferLocalRef.current = true;
            scheduleRecognitionRestart(600);
            return;
          }

          if (networkRetryRef.current < MAX_NETWORK_RETRIES) {
            scheduleRecognitionRestart(1200 * networkRetryRef.current);
            return;
          }
        }

        shouldListenRef.current = false;
        setIsListening(false);
        clearRestartTimer();

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermission('denied');
        }

        setSpeechError(mapSpeechError(event.error, preferLocalRef.current));
        setAwaitingMicTap(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result?.[0]?.transcript ?? '';
          if (!chunk) continue;
          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${chunk}`.trim();
          } else {
            interim += chunk;
          }
        }
        const combined = `${finalTranscriptRef.current}${interim}`.replace(/\s+/g, ' ').trim();
        if (!combined) return;
        if (transcriptRafRef.current !== null) cancelAnimationFrame(transcriptRafRef.current);
        transcriptRafRef.current = requestAnimationFrame(() => {
          transcriptRafRef.current = null;
          onTranscriptRef.current(combined);
        });
      };
    },
    [clearRestartTimer, scheduleRecognitionRestart],
  );

  const startListening = useCallback(async () => {
    if (listeningBusyRef.current) return;

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSpeechError('Voice input is not supported in this browser. Use Chrome or Edge on desktop.');
      return;
    }

    listeningBusyRef.current = true;
    const permitted = await ensureMicPermission();
    if (!permitted) {
      listeningBusyRef.current = false;
      setAwaitingMicTap(true);
      return;
    }

    stopSpeaking();
    clearRestartTimer();
    setSpeechError(null);

    const isFreshSession = !shouldListenRef.current;
    if (isFreshSession) {
      finalTranscriptRef.current = '';
      networkRetryRef.current = 0;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = RECOGNITION_LANG;
    recognition.continuous = true;
    recognition.interimResults = true;

    const onDevice = await enableOnDeviceIfPossible(recognition);
    if (onDevice) {
      preferLocalRef.current = true;
      setUsingOnDeviceSpeech(true);
    }

    attachRecognitionHandlers(recognition);

    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setSpeechError('Could not start the microphone. Tap Speak answer to try again.');
      setAwaitingMicTap(true);
    } finally {
      listeningBusyRef.current = false;
    }
  }, [attachRecognitionHandlers, clearRestartTimer, ensureMicPermission, stopSpeaking]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onEnd?.();
        return;
      }
      stopListening();
      stopSpeaking();
      onSpeakEndRef.current = onEnd ?? null;

      const trimmed = text.replace(/\s+/g, ' ').trim();
      if (!trimmed) {
        onEnd?.();
        return;
      }

      const voice =
        preferredVoiceRef.current ?? prepareSpeechSynthesis() ?? pickNaturalVoice(
          window.speechSynthesis.getVoices(),
        );
      if (voice) preferredVoiceRef.current = voice;

      const utterance = new SpeechSynthesisUtterance(trimmed);
      configureNaturalUtterance(utterance, voice);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        const cb = onSpeakEndRef.current;
        onSpeakEndRef.current = null;
        cb?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeechError('Could not play AI voice. Continue with text or the microphone.');
        onSpeakEndRef.current?.();
        onSpeakEndRef.current = null;
      };

      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    },
    [voiceEnabled, stopListening, stopSpeaking],
  );

  const speakThenListen = useCallback(
    (text: string, onEnd?: () => void) => {
      speak(text, () => {
        onEnd?.();
        if (!voiceEnabled || !autoListen || !speechAvailable) return;
        window.setTimeout(() => {
          void startListening();
        }, 120);
      });
    },
    [speak, voiceEnabled, autoListen, speechAvailable, startListening],
  );

  const bindTranscript = useCallback((fn: (text: string) => void) => {
    onTranscriptRef.current = fn;
  }, []);

  return {
    voiceEnabled,
    setVoiceEnabled,
    autoListen,
    setAutoListen,
    isSpeaking,
    isListening,
    speechError,
    setSpeechError,
    speechAvailable,
    micPermission,
    awaitingMicTap,
    usingOnDeviceSpeech,
    ensureMicPermission,
    speak,
    speakThenListen,
    startListening,
    stopListening,
    stopSpeaking,
    bindTranscript,
  };
}
