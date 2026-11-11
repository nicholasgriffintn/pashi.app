import { useEffect } from "react";

import {
	DEFAULT_PAGE_DESCRIPTION,
	fullPageTitle,
	STATIC_PAGES,
	type StaticPagePath,
} from "../../shared/pages";

function setMetaContent(selector: string, attribute: string, name: string, content: string) {
	let element = document.head.querySelector<HTMLMetaElement>(selector);

	if (!element) {
		element = document.createElement("meta");
		element.setAttribute(attribute, name);
		document.head.append(element);
	}

	element.setAttribute("content", content);
}

function setCanonical(href: string) {
	let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

	if (!link) {
		link = document.createElement("link");
		link.rel = "canonical";
		document.head.append(link);
	}

	link.href = href;
}

export function useDocumentMetadata(title: string, description = DEFAULT_PAGE_DESCRIPTION) {
	useEffect(() => {
		const fullTitle = fullPageTitle(title);

		document.title = fullTitle;
		setMetaContent('meta[name="description"]', "name", "description", description);
		setMetaContent('meta[property="og:title"]', "property", "og:title", fullTitle);
		setMetaContent('meta[property="og:description"]', "property", "og:description", description);
		setMetaContent(
			'meta[property="og:image"]',
			"property",
			"og:image",
			`${window.location.origin}/og?path=${encodeURIComponent(window.location.pathname)}`,
		);
		setMetaContent(
			'meta[name="twitter:image"]',
			"name",
			"twitter:image",
			`${window.location.origin}/og?path=${encodeURIComponent(window.location.pathname)}`,
		);
		setCanonical(`${window.location.origin}${window.location.pathname}`);
	}, [description, title]);
}

export function useStaticPageMetadata(path: StaticPagePath) {
	useDocumentMetadata(STATIC_PAGES[path].title, STATIC_PAGES[path].description);
}
