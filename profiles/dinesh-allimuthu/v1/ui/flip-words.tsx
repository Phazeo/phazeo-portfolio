/**
 * FlipWords - inspired by Aceternity UI.
 * Cycles through words with a flip animation.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

export function FlipWords({
  words,
  duration = 3000,
  className = "",
}: {
  words: string[];
  duration?: number;
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    const interval = setInterval(next, duration);
    return () => clearInterval(interval);
  }, [next, duration]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[currentIndex]}
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`inline-block ${className}`}
      >
        {words[currentIndex]}
      </motion.span>
    </AnimatePresence>
  );
}
