import { type ComponentType, lazy } from "react";

import type { ProfileComponentLoader } from "#kit";

const lazyComponentCache = new Map<string, ComponentType>();

export function getLazyProfileComponent(
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
