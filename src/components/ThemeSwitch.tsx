import { useTheme } from "../app/providers/ThemeProvider";
import "./theme-switch.css";

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-switch"
      aria-pressed={isDark}
      aria-label="Dark mode"
      onClick={toggleTheme}
    >
      <span className="theme-switch__hit" aria-hidden="true" />
      <span className="theme-switch__clip" aria-hidden="true">
        <span className="theme-switch__track" />
        <span className="theme-switch__rim" />
        <span className="theme-switch__clouds">
          <span className="theme-switch__cloud theme-switch__cloud--a" />
          <span className="theme-switch__cloud theme-switch__cloud--b" />
          <span className="theme-switch__cloud theme-switch__cloud--c" />
        </span>
        <span className="theme-switch__stars">
          <span className="theme-switch__star theme-switch__star--1" />
          <span className="theme-switch__star theme-switch__star--2" />
          <span className="theme-switch__star theme-switch__star--3" />
          <span className="theme-switch__star theme-switch__star--4" />
          <span className="theme-switch__star theme-switch__star--5" />
          <span className="theme-switch__star theme-switch__star--6" />
        </span>
        <span className="theme-switch__knob-wrap">
          <span className="theme-switch__halo theme-switch__halo--1" />
          <span className="theme-switch__halo theme-switch__halo--2" />
          <span className="theme-switch__halo theme-switch__halo--3" />
          <span className="theme-switch__sun" />
          <span className="theme-switch__moon">
            <span className="theme-switch__crater theme-switch__crater--1" />
            <span className="theme-switch__crater theme-switch__crater--2" />
            <span className="theme-switch__crater theme-switch__crater--3" />
          </span>
        </span>
      </span>
    </button>
  );
}
