'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export type PrettySelectOption = {
  value: string;
  label: string;
};

type PrettySelectProps = {
  value: string;
  options: PrettySelectOption[];
  onChange: (value: string) => void;
  className?: string;
  menuClassName?: string;
  variant?: 'default' | 'dark';
  disabled?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function PrettySelect({
  value,
  options,
  onChange,
  className,
  menuClassName,
  variant = 'default',
  disabled = false,
}: PrettySelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('mousedown', handleOutsideClick);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex min-h-10 shrink-0 items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60',
          variant === 'dark'
            ? 'border-white/25 bg-slate-900 text-slate-100'
            : 'border-[var(--border-main)] bg-[color:color-mix(in_srgb,var(--bg-glass-strong)_90%,transparent)] text-main',
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <span className={cn('ml-2 text-xs transition-transform', open && 'rotate-180')}>
          ▾
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              'fixed z-[80] max-h-56 overflow-auto rounded-xl border p-1 shadow-2xl',
              variant === 'dark'
                ? 'border-white/20 bg-black text-slate-100'
                : 'border-[var(--border-main)] bg-[var(--bg-glass-strong)] text-main backdrop-blur-xl',
              menuClassName,
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
          >
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full rounded-lg px-2 py-2 text-left text-sm transition',
                    isActive
                      ? 'bg-blue-500/30 text-slate-100'
                      : variant === 'dark'
                        ? 'text-slate-100 hover:bg-white/10'
                        : 'text-main hover:bg-white/25',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
