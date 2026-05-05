import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

export function AnimatedButton({ children, className, ...props }: Props) {
  return (
    <motion.div
      whileHover={{ y: -1.5, scale: 1.01 }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <button
        className={cn(
          'rounded-xl px-3 py-2 transition disabled:opacity-60 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </motion.div>
  );
}
