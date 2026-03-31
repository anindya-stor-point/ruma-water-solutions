import React, { ErrorInfo, ReactNode } from "react";
import { safeError } from "../firebase";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    safeError("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900">Something went wrong</h1>
              <p className="text-gray-500 font-medium">
                The application encountered an internal error. Please try refreshing the page.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-gray-50 p-4 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-xs text-red-600 font-mono break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
