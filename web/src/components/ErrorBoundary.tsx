import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const subject = encodeURIComponent('Bug Report - Science AI');
    const body = encodeURIComponent(`Страница: ${window.location.pathname}\nВремя: ${new Date().toLocaleString('ru-RU')}\nОписание проблемы: `);
    window.open(`mailto:support@science-ai.app?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 text-center max-w-lg">
            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle size={48} className="text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-text-primary mb-4">
              Упс! Что-то пошло не так
            </h1>
            <p className="text-text-secondary mb-8">
              Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
            </p>

            {/* Error code for support reference */}
            <p className="text-text-muted text-xs mb-8">
              Код ошибки: {Date.now().toString(36).toUpperCase()}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={20} />
                Перезагрузить
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-bg-tertiary border border-border-secondary text-text-primary font-semibold flex items-center justify-center gap-2 hover:bg-bg-secondary transition-colors"
              >
                <Home size={20} />
                На главную
              </button>
            </div>

            {/* Report Bug */}
            <button
              onClick={this.handleReportBug}
              className="mt-6 text-sm text-text-muted hover:text-text-secondary flex items-center justify-center gap-2 mx-auto"
            >
              <Bug size={16} />
              Сообщить об ошибке
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
