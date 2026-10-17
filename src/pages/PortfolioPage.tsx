import { type ComponentType, lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";

import type { ProfileComponentLoader, ProfileTheme } from "../../types";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { LoadingFallback } from "../components/LoadingFallback";
import { DEFAULT_THEME, getActiveProfileVersion, getProfile, isValidSlug } from "../registry";

import { NotFoundPage } from "./NotFoundPage";

const ALLOWED_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const lazyComponentCache = new Map<string, ComponentType>();

function getLazyProfileComponent(
  slug: string,
  componentLoader: ProfileComponentLoader
): ComponentType {
  const cached = lazyComponentCache.get(slug);
  if (cached) {
    return cached;
  }
  const LazyComponent = lazy(componentLoader);
  lazyComponentCache.set(slug, LazyComponent);
  return LazyComponent;
}

function isAllowedFontUrl(fontUrl: string): boolean {
  try {
    const url = new URL(fontUrl);
    if (url.protocol !== "https:") {
      return false;
    }
    return ALLOWED_FONT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function applyTheme(theme: ProfileTheme): () => void {
  const root = document.documentElement;
  const appliedVariables: string[] = [];
  for (const [key, value] of Object.entries(theme.cssVariables)) {
    root.style.setProperty(key, value);
    appliedVariables.push(key);
  }
  return () => {
    for (const key of appliedVariables) {
      root.style.removeProperty(key);
    }
  };
}

function loadFont(fontUrl: string): () => void {
  if (!isAllowedFontUrl(fontUrl)) {
    return function noop() {
      /* Untrusted font URL rejected */
    };
  }

  const linkId = `profile-font-${fontUrl.replace(/[^a-z0-9]/gi, "-")}`;
  if (document.getElementById(linkId)) {
    return function noop() {
      /* Font already loaded, nothing to clean up */
    };
  }
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = fontUrl;
  document.head.appendChild(link);
  return () => {
    const element = document.getElementById(linkId);
    if (element) {
      document.head.removeChild(element);
    }
  };
}

function applySeo(title: string, description: string, ogImage?: string): () => void {
  const originalTitle = document.title;
  const originalValues = new Map<HTMLMetaElement, string | null>();
  const created = new Set<HTMLMetaElement>();

  const updateMeta = (
    selector: string,
    attribute: string,
    value: string,
    create: () => HTMLMetaElement
  ) => {
    const existing = document.querySelector(selector);
    let element: HTMLMetaElement;
    if (existing instanceof HTMLMetaElement) {
      element = existing;
      originalValues.set(element, element.getAttribute(attribute));
    } else {
      element = create();
      document.head.appendChild(element);
      created.add(element);
      originalValues.set(element, null);
    }
    element.setAttribute(attribute, value);
  };

  document.title = title;
  updateMeta('meta[name="description"]', "content", description, () => {
    const meta = document.createElement("meta");
    meta.name = "description";
    return meta;
  });
  updateMeta('meta[name="title"]', "content", title, () => {
    const meta = document.createElement("meta");
    meta.name = "title";
    return meta;
  });
  updateMeta('meta[property="og:title"]', "content", title, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:title");
    return meta;
  });
  updateMeta('meta[property="og:description"]', "content", description, () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:description");
    return meta;
  });
  if (ogImage) {
    const baseUrl = window.location.origin;
    const imagePath = import.meta.env.BASE_URL + ogImage;
    updateMeta('meta[property="og:image"]', "content", `${baseUrl}${imagePath}`, () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      return meta;
    });
  }

  return () => {
    document.title = originalTitle;
    for (const [element, originalValue] of originalValues) {
      if (created.has(element)) {
        // Remove tags we created — do not leave empty meta behind.
        element.remove();
        continue;
      }
      if (originalValue === null) {
        element.removeAttribute("content");
      } else {
        element.setAttribute("content", originalValue);
      }
    }
  };
}

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
      fontUrl: theme.fontUrl,
    };
    cleanups.push(applyTheme(mergedTheme));
    if (mergedTheme.fontUrl) {
      cleanups.push(loadFont(mergedTheme.fontUrl));
    }
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

  const { componentLoader, Component } = profileData.activeVersion;
  const LazyComponent = componentLoader
    ? getLazyProfileComponent(profileData.slug, componentLoader)
    : null;

  if (!LazyComponent && !Component) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-background) px-4">
        <p className="text-gray-600">This profile has no renderable version.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      resetKeys={[slug]}
      onReset={() => {
        window.location.reload();
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {LazyComponent ? <LazyComponent /> : Component ? <Component /> : null}
      </Suspense>
    </ErrorBoundary>
  );
}
