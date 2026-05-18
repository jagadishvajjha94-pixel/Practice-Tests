'use client';

const VOICE_LANG = 'en-US';

/** Prefer neural / natural system voices over default robotic ones. */
const VOICE_PATTERNS: RegExp[] = [
  /en-us.*natural/i,
  /english.*united states.*natural/i,
  /google.*english.*(us|united states).*(neural|natural)/i,
  /microsoft.*(aria|jenny|guy|sara|andrew).*(natural|online)/i,
  /samantha/i,
  /daniel/i,
  /karen/i,
  /moira/i,
  /google us english/i,
  /english \(us\)/i,
  /en-us/i,
];

const AVOID_PATTERNS: RegExp[] = [/espeak/i, /festival/i, /android.*default/i];

export function warmSpeechVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
}

export function pickNaturalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('en') && !AVOID_PATTERNS.some((p) => p.test(v.name)),
  );

  for (const pattern of VOICE_PATTERNS) {
    const match = english.find((v) => pattern.test(v.name));
    if (match) return match;
  }

  return english.find((v) => v.localService) ?? english[0] ?? null;
}

export function configureNaturalUtterance(
  utterance: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | null,
): void {
  utterance.lang = VOICE_LANG;
  utterance.rate = 1.14;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;
}

export function prepareSpeechSynthesis(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const synth = window.speechSynthesis;
  synth.cancel();
  if (synth.paused) synth.resume();
  const voices = synth.getVoices();
  return pickNaturalVoice(voices);
}
