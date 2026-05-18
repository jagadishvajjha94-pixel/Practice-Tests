'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

export class InterviewErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AI Interview]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold text-foreground">Interview ran into a problem</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The live interview view could not load. You can retry or continue by typing your answers.
          </p>
          <Button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
