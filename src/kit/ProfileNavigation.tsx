import { useEffect, useState } from "react";

export type ProfileNavItem = {
  label: string;
  href: string;
};

export type ProfileNavigationProps = {
  brandInitial: string;
  brandLabel?: string;
  items: ProfileNavItem[];
  /**
   * When true, the bar also styles for dark mode (html.dark). Default false keeps
   * the existing light-only classes so team profiles look unchanged.
   */
  adaptToColorScheme?: boolean;
};

export function ProfileNavigation({
  brandInitial,
  brandLabel = "Portfolio",
  items,
  adaptToColorScheme = false,
}: ProfileNavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const menuId = "profile-mobile-menu";

  useEffect(() => {
    let frame = 0;
    const sections = ["hero", ...items.map((item) => item.href.replace(/^#/, ""))];

    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 20);
        const current = sections.find((section) => {
          const element = document.getElementById(section);
          if (!element) {
            return false;
          }
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        });
        setActiveSection(current ?? "");
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [items]);

  const navSurface = isScrolled
    ? `bg-white/95 backdrop-blur-md shadow-lg border-b border-(--color-secondary)/30${
        adaptToColorScheme ? " dark:bg-zinc-950/95 dark:border-white/10" : ""
      }`
    : `bg-white/80 backdrop-blur-md${adaptToColorScheme ? " dark:bg-zinc-950/80" : ""}`;

  const brandLabelClass = `hidden sm:block text-(--color-primary) font-display${
    adaptToColorScheme ? " dark:text-zinc-100" : ""
  }`;

  const inactiveLink = `text-gray-700 hover:bg-(--color-secondary)/20${
    adaptToColorScheme ? " dark:text-zinc-200 dark:hover:bg-white/10" : ""
  }`;

  const menuButton = `md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors${
    adaptToColorScheme ? " dark:hover:bg-white/10" : ""
  }`;

  const menuIcon = `w-6 h-6 text-gray-700${adaptToColorScheme ? " dark:text-zinc-200" : ""}`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navSurface}`}
      aria-label="Profile"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="#hero"
            className="group flex items-center gap-2 text-xl font-bold transition-all duration-300"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-(--color-primary) to-(--color-accent) rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-10 h-10 bg-linear-to-br from-(--color-primary) to-(--color-accent) rounded-lg flex items-center justify-center text-white font-display font-bold shadow-lg group-hover:scale-110 transition-transform">
                {brandInitial}
              </div>
            </div>
            <span className={brandLabelClass}>{brandLabel}</span>
          </a>

          <div className="hidden md:flex items-center space-x-1">
            {items.map((item) => {
              const sectionId = item.href.substring(1);
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`px-4 py-2 rounded-lg font-display font-medium text-sm transition-all duration-300 ${
                    isActive ? "bg-(--color-primary) text-white shadow-lg" : inactiveLink
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <button
            type="button"
            className={menuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls={menuId}
          >
            <svg
              className={menuIcon}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div id={menuId} className="md:hidden pb-4 space-y-2">
            {items.map((item) => {
              const sectionId = item.href.substring(1);
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`block px-4 py-3 rounded-lg transition-all duration-300 font-display ${
                    isActive ? "bg-(--color-primary) text-white shadow-lg" : inactiveLink
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
