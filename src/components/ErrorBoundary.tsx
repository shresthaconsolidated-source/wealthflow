import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, Button } from '@/src/components/ui';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <Card level={2} padding="lg" className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)]">
            <AlertTriangle className="h-7 w-7 text-[var(--danger)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Something went wrong</h2>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            An unexpected error occurred. Reloading the app usually fixes it.
          </p>
          <pre className="mt-5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border-1)] bg-black/30 p-4 text-left font-mono text-xs text-[var(--text-tertiary)]">
            {error.message || String(error)}
          </pre>
          <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </Card>
      </div>
    );
  }
}
