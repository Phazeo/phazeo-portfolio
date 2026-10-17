/**
 * MovingBorder button - inspired by Aceternity UI.
 * An animated gradient border that rotates around the button.
 */
import type { ReactNode } from "react";

export function MovingBorderButton({
  children,
  className = "",
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
  );

  const sharedClass = `relative inline-flex items-center justify-center px-8 py-4 font-display font-semibold rounded-xl overflow-hidden group ${className}`;

  const borderAnimation = (
    <span className="absolute inset-0 overflow-hidden rounded-xl">
      <span
        className="absolute inset-[-100%] animate-spin-slow"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0 340deg, var(--color-primary) 360deg)",
          animationDuration: "3s",
        }}
      />
    </span>
  );
  const bg = (
    <span className="absolute inset-[2px] rounded-[10px] bg-white group-hover:bg-slate-50 transition-colors" />
  );

  if (href) {
    return (
      <a href={href} className={sharedClass}>
        {borderAnimation}
        {bg}
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={sharedClass}>
      {borderAnimation}
      {bg}
      {inner}
    </button>
  );
}
