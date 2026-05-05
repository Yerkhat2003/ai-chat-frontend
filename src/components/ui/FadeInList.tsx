import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

type Props = {
  items: { id: string; node: ReactNode }[];
  className?: string;
};

export function FadeInList({ items, className }: Props) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.12) }}
          >
            {item.node}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
