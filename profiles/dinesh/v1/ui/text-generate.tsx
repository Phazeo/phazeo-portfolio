/**
 * TextGenerateEffect - inspired by Aceternity UI.
 * Words fade in one-by-one on scroll into view.
 */
import { motion, useInView } from "motion/react";
import { useRef } from "react";

export function TextGenerateEffect({
  words,
  className = "",
}: {
  words: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const wordArray = words.split(" ");

  return (
    <p ref={ref} className={className}>
      {wordArray.map((word, idx) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: static word list derived from string, never reorders
          key={`${word}-${idx}`}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
          transition={{
            duration: 0.3,
            delay: idx * 0.04,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}
