import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ── Global error boundary ────────────────────────────────────────────────────
// Catches unhandled render errors so users see a friendly message instead of
// a blank white screen. Only needed at this top level — per-page boundaries
// can be added later for finer-grained recovery.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
              <span className="text-rose-500 text-2xl">!</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800">Something went wrong</h1>
            <p className="text-sm text-slate-500">
              An unexpected error occurred. Try refreshing the page — if the problem
              persists, contact the administrator.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Refresh page
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-4 text-left text-[10px] text-rose-600 bg-rose-50 rounded-xl p-4 overflow-auto max-h-48 border border-rose-100">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Mount ────────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);