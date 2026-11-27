import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** 스크린리더용 제목 */
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  width?: string;
}

/** 반투명 유리 패널 팝업 */
export function Modal({ open, onClose, label, header, footer, children, width = 'max-w-[620px]' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-wood-900/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`glass-strong relative flex max-h-[min(92dvh,760px)] w-full ${width} animate-rise flex-col overflow-hidden rounded-3xl`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-white/60 text-sm text-ink-soft hover:bg-white"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
        {header && <div className="border-b border-white/70 bg-white/40 py-4 pr-14 pl-5">{header}</div>}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/70 bg-white/40 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
