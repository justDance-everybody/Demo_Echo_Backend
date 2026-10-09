import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ title, children, className, onClick, ...props }) => {
	return (
		<div
			className={cn(
				"rounded-lg border border-border bg-surface text-text shadow-sm relative overflow-hidden",
				"before:absolute before:inset-0 before:pointer-events-none before:opacity-[0.08] before:shadow-[0_0_0_1px_var(--neon-cyan)_inset]",
				className
			)}
			onClick={onClick}
			{...props}
		>
			{title ? (
				<div className="px-4 py-3 border-b border-border font-medium">
					<span className="font-mono tracking-wide text-cyan-300 drop-shadow-[0_0_6px_rgba(0,229,255,.5)]">{title}</span>
				</div>
			) : null}
			<div className="p-4">{children}</div>
		</div>
	);
};

export default Card;


