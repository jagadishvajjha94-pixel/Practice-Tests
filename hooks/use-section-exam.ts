'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TestSectionConfig } from '@/lib/exam-v2/section-timer';
import { sectionDurationSeconds } from '@/lib/exam-v2/section-timer';

type Options = {
  sections: TestSectionConfig[];
  enabled: boolean;
  onSectionTimeout: () => void;
  onAllSectionsComplete: () => void;
};

export function useSectionExam({ sections, enabled, onSectionTimeout, onAllSectionsComplete }: Options) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(0);
  const callbacksRef = useRef({ onSectionTimeout, onAllSectionsComplete });

  useEffect(() => {
    callbacksRef.current = { onSectionTimeout, onAllSectionsComplete };
  }, [onSectionTimeout, onAllSectionsComplete]);

  const currentSection = sections[sectionIndex] ?? null;

  useEffect(() => {
    if (!enabled || !currentSection) return;

    const duration = sectionDurationSeconds(currentSection);
    setSectionTimeLeft(duration);
    const end = Date.now() + duration * 1000;
    let timeoutId = 0;

    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSectionTimeLeft(left);
      if (left <= 0) {
        if (sectionIndex < sections.length - 1) {
          setSectionIndex((i) => i + 1);
          callbacksRef.current.onSectionTimeout();
        } else {
          callbacksRef.current.onAllSectionsComplete();
        }
        return;
      }
      timeoutId = window.setTimeout(tick, 1000);
    };
    tick();

    return () => clearTimeout(timeoutId);
  }, [enabled, sectionIndex, currentSection, sections.length]);

  const goToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      setSectionIndex(index);
    },
    [sections.length],
  );

  return {
    sectionIndex,
    currentSection,
    sectionTimeLeft,
    goToSection,
    isLastSection: sectionIndex >= sections.length - 1,
  };
}
