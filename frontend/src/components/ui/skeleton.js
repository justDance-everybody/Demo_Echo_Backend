import React from 'react';
import { cn } from '@/lib/utils';

export const Skeleton = ({ className }) => (
	<div className={cn('animate-pulse rounded-md bg-border/40', className)} />
);

Skeleton.Title = ({ animated = true }) => (
	<div className={cn('h-6 w-48 rounded bg-border/50', animated ? 'animate-pulse' : '')} />
);

Skeleton.Paragraph = ({ lineCount = 3, animated = true }) => (
	<div className="space-y-2">
		{Array.from({ length: lineCount }).map((_, i) => (
			<div key={i} className={cn('h-4 w-full rounded bg-border/50', animated ? 'animate-pulse' : '')} />
		))}
	</div>
);

export default Skeleton;


