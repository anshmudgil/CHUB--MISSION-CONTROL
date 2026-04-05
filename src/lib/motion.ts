import type { Variants, Transition } from 'motion/react';

// Shared transition presets
export const springTransition: Transition = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.4,
};

export const easeTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

// Fade variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// Slide variants
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

// Stagger containers
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeTransition,
  },
};

// Page transition for route changes
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15 },
  },
};

// Card hover animation (use with whileHover)
export const cardHover = {
  y: -2,
  transition: { duration: 0.2 },
};

// Scale tap (use with whileTap)
export const scaleTap = {
  scale: 0.97,
};

// Counting animation helper
export function countTo(
  target: number,
  duration: number = 1000,
  onUpdate: (value: number) => void
) {
  const start = performance.now();
  const animate = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    onUpdate(Math.round(eased * target));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
