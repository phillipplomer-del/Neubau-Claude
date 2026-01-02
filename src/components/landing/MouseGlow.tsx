/**
 * Mouse-Following Glow Effect
 * Creates a soft radial gradient that follows the mouse cursor
 * Uses framer-motion for smooth spring animations
 */

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Hook to detect dark mode
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function MouseGlow() {
  const isDark = useDarkMode();

  // Mouse position with motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring-animated values for smooth following
  const springConfig = { stiffness: 50, damping: 20 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Colors from design-system.json
  const glowColor = isDark
    ? 'rgba(158, 224, 0, 0.25)' // lime with opacity
    : 'rgba(0, 222, 224, 0.25)'; // teal with opacity

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background: `radial-gradient(600px circle at ${x}px ${y}px, ${glowColor}, transparent 60%)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
}
