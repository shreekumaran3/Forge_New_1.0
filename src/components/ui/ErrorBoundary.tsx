import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-[#E4E3E0] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#111111] border border-[#282828] rounded-xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="font-serif text-lg font-bold tracking-wider text-[#E4E3E0] uppercase">
                System Interface Recovered
              </h2>
              <p className="text-xs text-[#8E9299] mt-1 font-mono">
                An unexpected state occurred. The interface remains secure.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-[#0A0A0A] border border-[#222] rounded p-3 text-left">
                <p className="text-[11px] font-mono text-amber-300/80 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#c2a030] text-black font-semibold text-xs rounded uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
