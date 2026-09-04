import { useEffect } from "react";

const DEFAULT_DESCRIPTION =
	"Pashi is the home for side projects: generators, converters and AI experiments.";

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

export function useDocumentMetadata(title: string, description = DEFAULT_DESCRIPTION) {
	useEffect(() => {
		const fullTitle = title === "Pashi" ? "Pashi" : `${title} · Pashi`;

		document.title = fullTitle;
		setMetaContent('meta[name="description"]', "name", "description", description);
		setMetaContent('meta[property="og:title"]', "property", "og:title", fullTitle);
		setMetaContent('meta[property="og:description"]', "property", "og:description", description);
		setCanonical(`${window.location.origin}${window.location.pathname}`);
	}, [description, title]);
}
