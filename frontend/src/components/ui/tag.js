import React from 'react';
import { cn } from '@/lib/utils';

export const Tag = ({ children, className, variant = 'outline', color = 'primary', size = 'sm' }) => {
	const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-2.5 py-1' };
	const base = 'inline-flex items-center rounded-full';
	const styles = variant === 'outline'
		? 'border border-cyan-400 text-cyan-300 bg-transparent shadow-[0_0_8px_rgba(0,229,255,.2)]'
		: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,229,255,.25)]';
	return (
		<span className={cn(base, sizes[size], styles, className)}>{children}</span>
	);
};

export default Tag;


