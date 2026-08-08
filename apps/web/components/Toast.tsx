'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  confirmModal: (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

import Portal from './Portal';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    onConfirm: () => {},
  });

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmModal = useCallback(
    (options: {
      title: string;
      description: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm: () => void;
    }) => {
      setConfirmConfig({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || 'Ya, Lanjutkan',
        cancelText: options.cancelText || 'Batal',
        onConfirm: options.onConfirm,
      });
    },
    [],
  );

  return (
    <ToastContext.Provider
      value={{
        toast: {
          success: (msg) => addToast('success', msg),
          error: (msg) => addToast('error', msg),
          info: (msg) => addToast('info', msg),
        },
        confirmModal,
      }}
    >
      {children}

      <Portal>
        {/* Toast Notifications Floating Container */}
        <div className="fixed bottom-5 right-5 z-[99999] space-y-2 max-w-sm w-full px-4 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
                t.type === 'success'
                  ? 'bg-neutral-900/95 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : t.type === 'error'
                  ? 'bg-neutral-900/95 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'bg-neutral-900/95 border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,201,0.2)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />}
                {t.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />}
                {t.type === 'info' && <Info className="w-4 h-4 flex-shrink-0 text-cyan-400" />}
                <span className="text-xs font-semibold truncate text-white">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Global Confirmation Modal */}
        {confirmConfig.isOpen && (
          <div
            className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0"
            onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
          >
            <div
              className="glass-panel p-6 max-w-sm w-full text-center space-y-4 border-rose-500/30 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{confirmConfig.title}</h3>
                <p className="text-xs text-neutral-400 mt-1">{confirmConfig.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-cyber-secondary py-2 text-xs"
                >
                  {confirmConfig.cancelText}
                </button>
                <button
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-rose-500/20"
                >
                  {confirmConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: {
        success: (msg: string) => console.log('[Success]', msg),
        error: (msg: string) => console.error('[Error]', msg),
        info: (msg: string) => console.info('[Info]', msg),
      },
      confirmModal: (opts: any) => {
        if (window.confirm(`${opts.title}\n${opts.description}`)) {
          opts.onConfirm();
        }
      },
    };
  }
  return context;
}
