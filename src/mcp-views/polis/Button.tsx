import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon, type IconName } from "./icons";

type Variant = "ghost" | "outline" | "primary" | "secondary";
type Size = "icon" | "sm" | "xs";

const VARIANT_CLASSES: Record<Variant, string> = {
	ghost: "button button-ghost",
	outline: "button",
	primary: "button button-primary",
	secondary: "button button-loud",
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	children?: ReactNode;
	icon?: IconName;
	isLoading?: boolean;
	size?: Size;
	type?: "button" | "submit";
	variant?: Variant;
}

export function Button({
	children,
	className = "",
	disabled,
	icon,
	isLoading = false,
	size = "sm",
	type = "button",
	variant = "outline",
	...rest
}: ButtonProps) {
	return (
		<button
			{...rest}
			type={type}
			className={`${VARIANT_CLASSES[variant]} button-${size} ${isLoading ? "button-busy" : ""} ${className}`.trim()}
			disabled={disabled || isLoading}
			aria-busy={isLoading || undefined}
		>
			{icon ? <Icon name={icon} size={size === "icon" ? 16 : 14} /> : null}
			{children}
		</button>
	);
}
