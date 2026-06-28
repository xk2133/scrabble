import React, { Component } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { GameProvider } from './context/GameContext';
import Home from './pages/Home/Home';
import Game from './pages/Game/Game';
import WordBook from './pages/WordBook/WordBook';
import Help from './pages/Help/Help';
import { ToastContainer } from './components/ui/Toast';

// Error boundary to catch rendering errors
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '40px 20px',
          fontFamily: 'system-ui, sans-serif',
          color: '#1B4965',
          background: '#FDF6E3',
          minHeight: '100vh',
        }}>
          <h1 style={{ fontSize: '24px', color: '#FF6E61', marginBottom: '16px' }}>
            ⚠️ 应用出错
          </h1>
          <pre style={{
            background: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { toasts, removeToast } = useAppContext();
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/wordbook" element={<WordBook />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <GameProvider>
          <AppInner />
        </GameProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
