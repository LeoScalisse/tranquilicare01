import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface State { failed: boolean }

class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application render failed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className='grid min-h-screen place-items-center bg-[#eaf8fc] px-5 text-brand-ink'>
        <section className='w-full max-w-lg rounded-[28px] border border-red-200 bg-background p-7 text-center shadow-[0_30px_80px_-50px_rgba(90,22,22,0.45)]' role='alert'>
          <span className='mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-red-50 text-red-600'><AlertTriangle /></span>
          <h1 className='mt-5 font-display text-3xl font-semibold'>Não conseguimos mostrar esta tela</h1>
          <p className='mt-3 text-sm leading-6 text-muted-foreground'>Seus dados não foram apagados. Recarregue a tela; se o problema continuar, volte ao início e tente novamente.</p>
          <div className='mt-6 flex flex-col justify-center gap-3 sm:flex-row'>
            <button type='button' onClick={() => window.location.reload()} className='tc-button-3d inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white'><RotateCcw size={17} />Recarregar</button>
            <a href='/' className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-blue/20 bg-background px-5 text-sm font-bold text-brand-blue'><Home size={17} />Voltar ao início</a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
