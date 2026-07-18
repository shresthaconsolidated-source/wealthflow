import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Keep the last options around while the modal animates out.
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise<boolean>(resolve => {
      // Settle any dangling request before starting a new one.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOpts(options);
      setOpen(true);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onClose={() => settle(false)}
        title={opts?.title}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {opts?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        }
      >
        {opts?.description ? (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{opts.description}</p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
