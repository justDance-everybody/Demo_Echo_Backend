import React from 'react';
import { cn } from '@/lib/utils';

export const Progress = ({ percent = 0, status = 'active', className }) => {
	const clamped = Math.max(0, Math.min(100, percent));
	const barColor = status === 'exception' ? 'bg-red-500' : 'bg-primary';
	return (
		<div className={cn('w-full h-3 rounded bg-border/50 overflow-hidden', className)}>
			<div
				className={cn('h-full transition-all', barColor)}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	);
};

export default Progress;


