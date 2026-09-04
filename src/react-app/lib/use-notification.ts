import { useCallback, useEffect, useRef, useState } from "react";

const NOTIFICATION_MS = 2400;

export function useNotification() {
	const [notification, setNotification] = useState("");
	const timer = useRef<number | undefined>(undefined);

	useEffect(() => {
		return () => window.clearTimeout(timer.current);
	}, []);

	const notify = useCallback((message: string) => {
		window.clearTimeout(timer.current);
		setNotification(message);
		timer.current = window.setTimeout(() => setNotification(""), NOTIFICATION_MS);
	}, []);

	const clearNotification = useCallback(() => {
		window.clearTimeout(timer.current);
		setNotification("");
	}, []);

	return { clearNotification, notification, notify };
}
