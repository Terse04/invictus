import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#070b14] text-slate-200 select-none">
          <div className="glass-panel max-w-lg w-full p-6 border-t-4 border-t-red-500 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-cinzel font-bold text-red-400 tracking-wider">
              QUANTUM CONDUIT INTERRUPTED
            </h2>

            <p className="text-xs font-tech text-slate-400 leading-relaxed">
              A runtime anomaly was intercepted in the neural rendering pipeline.
            </p>

            <div className="p-3 bg-black/60 rounded border border-red-900/40 text-left overflow-auto max-h-32">
              <code className="text-xs font-mono text-red-300 break-words">
                {this.state.error?.message || 'Unknown WebGL / Render Error'}
              </code>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 rounded bg-red-500 hover:bg-red-600 text-slate-950 font-tech font-bold text-xs flex items-center space-x-2 transition-all shadow-lg"
              >
                <RefreshCw className="w-4 h-4 animate-spin-reverse" />
                <span>REBOOT NEURAL LINK</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
