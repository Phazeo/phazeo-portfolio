import { Suspense, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import type { ProfileTheme } from "../../types";
import { DEFAULT_THEME, getActiveProfileVersion, getProfile, isValidSlug } from "../registry";

import { NotFoundPage } from "./NotFoundPage";

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
  const originalValues: Map<Element, string> = new Map();
  const updateMeta = (selector: string, attribute: string, value: string) => {
    const element = document.querySelector(selector);
    if (element) {
      originalValues.set(element, element.getAttribute(attribute) ?? "");
      element.setAttribute(attribute, value);
    }
  };
  document.title = title;
  updateMeta('meta[name="description"]', "content", description);
  updateMeta('meta[name="title"]', "content", title);
  updateMeta('meta[property="og:title"]', "content", title);
  updateMeta('meta[property="og:description"]', "content", description);
  if (ogImage) {
    const baseUrl = window.location.origin;
    const imagePath = import.meta.env.BASE_URL + ogImage;
    updateMeta('meta[property="og:image"]', "content", `${baseUrl}${imagePath}`);
  }
  return () => {
    document.title = originalTitle;
    for (const [element, originalValue] of originalValues) {
      element.setAttribute("content", originalValue);
    }
  };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="animate-pulse text-gray-500">Loading...</div>
    </div>
  );
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

  const { Component } = profileData.activeVersion;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
}
