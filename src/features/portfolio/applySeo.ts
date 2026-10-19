export function applySeo(title: string, description: string, ogImage?: string): () => void {
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
