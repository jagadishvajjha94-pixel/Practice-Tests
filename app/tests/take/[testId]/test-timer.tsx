'use client';

import { useEffect } from 'react';
import { useTest } from './test-context';

interface TestTimerProps {
  duration: number;
}

export default function TestTimer({ duration }: TestTimerProps) {
  const { timeRemaining, setTimeRemaining } = useTest();

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0) {
          // Auto-submit test when time runs out
          // This would trigger through a callback in a production app
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, setTimeRemaining]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining < 300; // Less than 5 minutes

  return (
    <div className={`text-lg font-semibold ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
      ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
