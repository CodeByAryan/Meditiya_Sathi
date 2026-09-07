import { useEffect } from "react";

const SITE_URL = "https://www.medtiyasathi.in";
const DEFAULT_DESCRIPTION =
  "Meditiya Sathi — the official digital platform for Medtiya Nagar society. Stay connected with events, notices, donations, and community services.";

export type SEOProps = {
  title: string;
  description?: string;
  path?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  robots?: string;
};

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${normalizedPath}`;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  ogTitle = title,
  ogDescription = description,
  ogType = "website",
  robots = "index, follow",
}: SEOProps) {
  const canonicalUrl = getCanonicalUrl(path);

  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", ogTitle);
    setMeta("property", "og:description", ogDescription);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", "Meditiya Sathi");
    setMeta("name", "twitter:title", ogTitle);
    setMeta("name", "twitter:description", ogDescription);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }, [canonicalUrl, description, ogDescription, ogTitle, ogType, robots, title]);

  return null;
}

export { DEFAULT_DESCRIPTION, SITE_URL };
