import { useEffect, useState } from "react";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Education", href: "#education" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const sections = [
        "hero",
        "about",
        "projects",
        "experience",
        "education",
        "skills",
        "contact",
      ];
      const current = sections.find((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      setActiveSection(current || "");
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[var(--color-secondary)]/30"
          : "bg-white/80 backdrop-blur-md"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="#hero"
            className="group flex items-center gap-2 text-xl font-bold transition-all duration-300"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center text-white font-display font-bold shadow-lg group-hover:scale-110 transition-transform">
                S
              </div>
            </div>
            <span className="hidden sm:block text-[var(--color-primary)] font-display">
              Portfolio
            </span>
          </a>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.substring(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-display font-medium text-sm transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-lg"
                      : "text-gray-700 hover:bg-[var(--color-secondary)]/20"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
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
          <div className="md:hidden pb-4 space-y-2 animate-fadeIn">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.substring(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg transition-all duration-300 font-display ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-lg"
                      : "text-gray-700 hover:bg-[var(--color-secondary)]/20"
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
