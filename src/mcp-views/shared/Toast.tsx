import { useCallback, useEffect, useState } from "react";

export type ToastTone = "error" | "success";

interface ToastMessage {
	id: number;
	text: string;
	tone: ToastTone;
}

const TOAST_MS = 3200;

export function useToast() {
	const [toast, setToast] = useState<ToastMessage | null>(null);

	useEffect(() => {
		if (!toast) {
			return undefined;
		}

		const timer = setTimeout(() => setToast(null), TOAST_MS);

		return () => clearTimeout(timer);
	}, [toast]);

	const show = useCallback((text: string, tone: ToastTone = "success") => {
		setToast({ id: Date.now(), text, tone });
	}, []);

	return { show, toast };
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
	return (
		<output className="toast-region" aria-live="polite">
			{toast ? (
				<p key={toast.id} className={`toast toast-${toast.tone}`}>
					{toast.text}
				</p>
			) : null}
		</output>
	);
}
