'use client'

import { motion, Variants, Transition, useReducedMotion } from 'framer-motion'
import { useReducedMotion as useAccessibleReducedMotion } from './accessibility'

// Animation variants for consistent motion design
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const slideUp: Variants = {
  hidden: {
    y: '100%'
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    y: '100%',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

export const staggerChildren: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Horse racing specific animations
export const horseGallop: Variants = {
  idle: {
    x: 0
  },
  running: {
    x: [0, 10, -5, 8, -3, 5, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

export const finishLineWave: Variants = {
  wave: {
    pathLength: [0, 1],
    pathOffset: [0, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

export const celebrationBounce: Variants = {
  celebrate: {
    y: [0, -20, 0, -15, 0, -10, 0],
    scale: [1, 1.1, 1, 1.05, 1],
    transition: {
      duration: 1.5,
      ease: 'easeOut'
    }
  }
}

// Draw animation variants
export const drawReveal: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotateY: -180
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: [0.175, 0.885, 0.32, 1.275]
    }
  }
}

export const cardFlip: Variants = {
  front: {
    rotateY: 0
  },
  back: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: [0.175, 0.885, 0.32, 1.275]
    }
  }
}

export const winnerGlow: Variants = {
  glow: {
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0.7)',
      '0 0 0 10px rgba(59, 130, 246, 0)',
      '0 0 0 20px rgba(59, 130, 246, 0)'
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity
    }
  }
}

// Progress animations
export const progressFill: Variants = {
  empty: {
    width: 0
  },
  filling: {
    width: '100%',
    transition: {
      duration: 2,
      ease: 'easeInOut'
    }
  }
}

export const countUp: Variants = {
  start: {
    opacity: 0,
    y: 20
  },
  counting: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

// Notification animations
export const notificationSlide: Variants = {
  hidden: {
    x: '100%',
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Loading animations
export const pulseGlow: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

export const shimmer: Variants = {
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

// Interactive button animations
export const buttonPress: Variants = {
  idle: {
    scale: 1
  },
  pressed: {
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2
    }
  }
}

export const buttonRipple: Variants = {
  ripple: {
    scale: [0, 4],
    opacity: [1, 0],
    transition: {
      duration: 0.6,
      ease: 'easeOut'
    }
  }
}

// Enhanced transition presets
export const springyTransition: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20
}

export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1]
}

export const bouncyTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 10
}

export const slowTransition: Transition = {
  duration: 0.8,
  ease: [0.4, 0, 0.2, 1]
}

// Accessibility-aware motion component
export function AccessibleMotion({
  children,
  variants,
  initial = 'hidden',
  animate = 'visible',
  exit,
  transition,
  ...props
}: {
  children: React.ReactNode
  variants?: Variants
  initial?: string | boolean
  animate?: string
  exit?: string
  transition?: Transition
} & React.ComponentProps<typeof motion.div>) {
  const prefersReducedMotion = useAccessibleReducedMotion()

  // If user prefers reduced motion, provide simplified animations
  const accessibleVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }
    : variants

  const accessibleTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : transition

  return (
    <motion.div
      variants={accessibleVariants}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={accessibleTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Page transition animations
export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
      when: 'beforeChildren',
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Modal animations
export const modalBackdrop: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Complex multi-step animations
export const drawSequence: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8
  },
  preparing: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5
    }
  },
  drawing: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.8,
      times: [0, 0.5, 1],
      ease: 'easeInOut'
    }
  },
  revealed: {
    scale: 1,
    transition: {
      duration: 0.3
    }
  }
}

export const raceProgress: Variants = {
  waiting: {
    x: 0,
    transition: {
      duration: 0.3
    }
  },
  racing: {
    x: [0, 100, 200, 300],
    transition: {
      duration: 3,
      times: [0, 0.3, 0.7, 1],
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  finished: {
    x: 300,
    scale: 1.2,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

// Custom hooks for complex animations
export function useStaggeredList(itemCount: number, delay: number = 0.1) {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: delay,
          delayChildren: 0.1
        }
      }
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    }
  }
}

export function useCountUpAnimation(from: number, to: number, duration: number = 2) {
  const prefersReducedMotion = useAccessibleReducedMotion()

  return {
    from: prefersReducedMotion ? to : from,
    to,
    transition: {
      duration: prefersReducedMotion ? 0 : duration,
      ease: 'easeOut'
    }
  }
}