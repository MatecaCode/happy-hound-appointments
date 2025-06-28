
import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  triggerOnce?: boolean;
  delay?: number;
}

export const useScrollAnimation = <T extends HTMLElement = HTMLDivElement>(options: UseScrollAnimationOptions = {}) => {
  const { threshold = 0.1, triggerOnce = true, delay = 0 } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          
          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, triggerOnce, delay]);

  return { ref, isVisible };
};

// Animation variant classes
export const animationClasses = {
  fadeIn: 'transition-all duration-700 ease-out',
  fadeInActive: 'opacity-100 translate-y-0',
  fadeInInactive: 'opacity-0 translate-y-4',
  
  slideUp: 'transition-all duration-700 ease-out',
  slideUpActive: 'opacity-100 translate-y-0',
  slideUpInactive: 'opacity-0 translate-y-8',
  
  scaleIn: 'transition-all duration-500 ease-out',
  scaleInActive: 'opacity-100 scale-100',
  scaleInInactive: 'opacity-0 scale-95',
  
  slideInRight: 'transition-all duration-700 ease-out',
  slideInRightActive: 'opacity-100 translate-x-0',
  slideInRightInactive: 'opacity-0 translate-x-8',
};
