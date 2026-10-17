import { Link } from "react-router-dom";
import { getExperienceYearsDisplay, getListedProfiles } from "../registry";

function SocialLinks({
  socials,
}: {
  socials?: { linkedin?: string; github?: string; twitter?: string; website?: string };
}) {
  if (!socials) {
    return null;
  }
  const links: { href: string; label: string }[] = [];
  if (socials.linkedin) {
    links.push({ href: socials.linkedin, label: "LinkedIn" });
  }
  if (socials.github) {
    links.push({ href: socials.github, label: "GitHub" });
  }
  if (socials.twitter) {
    links.push({ href: socials.twitter, label: "X" });
  }
  if (socials.website) {
    links.push({ href: socials.website, label: "Website" });
  }
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
          title={link.label}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function HomePage() {
  const profiles = getListedProfiles().sort((a, b) =>
    (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Phazeo Portfolio Profiles
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Dev preview. Add and edit profiles locally before merging to the main site.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {profiles.map((profile) => {
            const initials = profile.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2);
            const gradient = profile.avatarGradient ?? "from-violet-500 to-fuchsia-500";
            const expYears = getExperienceYearsDisplay(profile);

            return (
              <Link
                key={profile.slug}
                to={`/${profile.slug}`}
                className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {profile.displayName}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-gray-500 truncate">
                          {profile.role ?? "Professional Portfolio"}
                        </p>
                        {expYears && (
                          <span className="inline-flex items-center justify-center min-w-[2rem] h-5 px-2 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {expYears}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                  <SocialLinks socials={profile.socials} />
                  <span className="text-gray-400 group-hover:text-blue-600 transition-colors inline-flex">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No portfolios available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
