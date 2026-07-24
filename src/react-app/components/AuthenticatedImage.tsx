import { useEffect, useState, type ImgHTMLAttributes } from "react";

import { useApiKey } from "../lib/api-key-context";
import { apiFetch } from "../lib/api-request";

interface AuthenticatedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
	src: string;
}

export function AuthenticatedImage({ alt, src, ...props }: AuthenticatedImageProps) {
	const { apiKey } = useApiKey();
	const [objectUrl, setObjectUrl] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		let nextObjectUrl = "";

		void apiFetch(src, apiKey, { signal: controller.signal })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Image could not be loaded.");
				}
				return response.blob();
			})
			.then((blob) => {
				nextObjectUrl = URL.createObjectURL(blob);
				setObjectUrl(nextObjectUrl);
			})
			.catch((error: unknown) => {
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					setObjectUrl("");
				}
			});

		return () => {
			controller.abort();
			if (nextObjectUrl) {
				URL.revokeObjectURL(nextObjectUrl);
			}
		};
	}, [apiKey, src]);

	return objectUrl ? <img {...props} alt={alt} src={objectUrl} /> : null;
}
