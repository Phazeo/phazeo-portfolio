import { Suspense, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";

import { DEFAULT_THEME, getActiveProfileVersion, type ProfileTheme } from "#kit";
import { NotFoundPage } from "../../app/not-found";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { LoadingFallback } from "../../components/LoadingFallback";
import { getProfile, isValidSlug } from "../../registry";
import { applySeo } from "./applySeo";
import { applyTheme } from "./applyTheme";
import { getLazyProfileComponent } from "./lazyProfile";

export function PortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const cleanupRef = useRef<(() => void)[]>([]);

  const profileData = useMemo(() => {
    if (!slug || !isValidSlug(slug)) {
      return null;
    }
    const profile = getProfile(slug);
    if (!profile) {
      return null;
    }
    return {
      slug,
      profile,
      activeVersion: getActiveProfileVersion(profile),
    };
  }, [slug]);

  useEffect(() => {
    if (!profileData) {
      return;
    }
    const { activeVersion } = profileData;
    const { theme, seo } = activeVersion;
    const cleanups: (() => void)[] = [];
    const mergedTheme: ProfileTheme = {
      cssVariables: {
        ...DEFAULT_THEME.cssVariables,
        ...theme.cssVariables,
      },
    };
    cleanups.push(applyTheme(mergedTheme));
    if (seo) {
      cleanups.push(applySeo(seo.title, seo.description, seo.ogImage));
    }
    cleanupRef.current = cleanups;
    return () => {
      for (const cleanup of cleanupRef.current) {
        cleanup();
      }
      cleanupRef.current = [];
    };
  }, [profileData]);

  if (!profileData) {
    return <NotFoundPage />;
  }

  const LazyComponent = getLazyProfileComponent(
    profileData.slug,
    profileData.activeVersion.componentLoader
  );

  return (
    <ErrorBoundary resetKeys={[slug]} onReset={() => window.location.reload()}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
