import React, { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import logger from "../lib/logger.js";
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Readonly<Props>;
  state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("ErrorBoundary caught an error", error, {
      componentStack: errorInfo.componentStack,
    });
  }
 handleReload = () => {
    window.location.reload();
  };
  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return (
        fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-6 transition-colors">
            <div className="  p-8 max-w-md text-center ">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                  <AlertTriangle className="text-red-600 dark:text-red-400 w-8 h-8" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {error?.message ?? "An unexpected error occurred. Please try again."}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-sm"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              If the issue persists, please contact support.
            </p>
          </div>
        )
      );
    }

    return children;
  }
}
export default ErrorBoundary;
