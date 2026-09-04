import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
	label: string;
}

interface ErrorBoundaryState {
	message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { message: "" };

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return { message: error instanceof Error ? error.message : "Something broke." };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("pashi.render_error", this.props.label, error, info.componentStack);
	}

	render() {
		if (!this.state.message) {
			return this.props.children;
		}

		return (
			<div className="render-error" role="alert">
				<h2>{this.props.label} stopped working</h2>
				<p>{this.state.message}</p>
				<button onClick={() => window.location.reload()} type="button">
					Reload
				</button>
			</div>
		);
	}
}
