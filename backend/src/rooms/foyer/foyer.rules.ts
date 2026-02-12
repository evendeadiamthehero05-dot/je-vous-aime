import { FoyerPhase } from '@prisma/client';

export const FOYER_PROMPT = "When I'm breaking down, I need you to say...";
export const CRISIS_SENTENCE_MAX_CHARS = 160;

const LEGAL_TRANSITIONS: Record<FoyerPhase, Set<FoyerPhase>> = {
  [FoyerPhase.DARK]: new Set([FoyerPhase.LIGHT_IN_PROGRESS]),
  [FoyerPhase.LIGHT_IN_PROGRESS]: new Set([FoyerPhase.DARK, FoyerPhase.LIT]),
  [FoyerPhase.LIT]: new Set([FoyerPhase.NOTE_ENTRY]),
  [FoyerPhase.NOTE_ENTRY]: new Set([FoyerPhase.NOTE_LOCKED]),
  [FoyerPhase.NOTE_LOCKED]: new Set([])
};

export function assertTransition(from: FoyerPhase, to: FoyerPhase): void {
  if (from === to) return;
  if (!LEGAL_TRANSITIONS[from].has(to)) {
    throw new Error(`Illegal foyer transition ${from} -> ${to}`);
  }
}

export function assertOneLine(value: string): void {
  if (/\r|\n/.test(value)) {
    throw new Error('Crisis sentence must remain one line.');
  }
}

export function sanitizeSentenceDraft(value: string): string {
  return value.trim().slice(0, CRISIS_SENTENCE_MAX_CHARS);
}

