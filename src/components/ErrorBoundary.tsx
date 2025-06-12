import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Clear potentially corrupted localStorage data
    try {
      localStorage.removeItem('jira-credentials');
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-900">Algo deu errado</CardTitle>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado. Isso pode ser causado por dados corrompidos ou conflitos com extensões do navegador.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium mb-2">
                  Detalhes do erro:
                </p>
                <code className="text-xs text-red-600 bg-red-100 p-2 rounded block break-all">
                  {this.state.error?.message || 'Erro desconhecido'}
                </code>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={this.handleReload}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  <p>Se o problema persistir:</p>
                  <ul className="list-disc list-inside text-left mt-2 space-y-1">
                    <li>Desative extensões do navegador (especialmente GitHub-related)</li>
                    <li>Limpe o cache do navegador</li>
                    <li>Tente usar o modo incógnito</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
