import React from 'react';
import { cn } from '@/lib/utils';

const baseClasses =
	"inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none";

const sizeClasses = {
	sm: "h-8 px-3 text-xs",
	md: "h-10 px-4 text-sm",
	lg: "h-11 px-6 text-base",
};

const variantClasses = {
	default:
		"bg-primary text-white hover:bg-primary-dark",
	secondary:
		"bg-surface text-text border border-border hover:bg-surface/80",
	outline:
		"bg-transparent text-text border border-border hover:bg-surface",
	ghost:
		"bg-transparent text-text hover:bg-surface",
	destructive:
		"bg-red-600 text-white hover:bg-red-700",
	geek:
		"font-mono tracking-wide border border-cyan-500 text-cyan-300 bg-transparent hover:bg-cyan-500/10 shadow-[0_0_0_1px_rgba(0,255,255,.2),0_0_12px_rgba(0,255,255,.2)]",
};

function mapMobilePropsToVariant({ color, fill }) {
	// 兼容 antd-mobile Button 的 color/fill 属性
	if (fill === 'none') return 'ghost';
	if (fill === 'outline') return 'outline';
	if (color === 'danger') return 'destructive';
	return 'default';
}

export function Button({
	className,
	variant,
	size = 'md',
	asChild = false,
	color,
	fill,
	block,
	loading,
	children,
	...rest
}) {
	const Comp = asChild ? 'span' : 'button';
	const effectiveVariant = variant || mapMobilePropsToVariant({ color, fill }) || 'geek';
	return (
		<Comp
			className={cn(
				baseClasses,
				sizeClasses[size] || sizeClasses.md,
				variantClasses[effectiveVariant] || variantClasses.geek,
				block ? 'w-full' : '',
				loading ? 'opacity-80 cursor-wait' : '',
				className
			)}
			disabled={rest.disabled || loading}
			aria-busy={loading ? 'true' : undefined}
			{...rest}
		>
			{loading ? (
				<svg
					className="mr-2 h-4 w-4 animate-spin"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" className="opacity-25" />
					<path d="M22 12a10 10 0 0 1-10 10" className="opacity-75" />
				</svg>
			) : null}
			{children}
		</Comp>
	);
}

export default Button;


