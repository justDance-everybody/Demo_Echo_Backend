import React from 'react';
import { cn } from '@/lib/utils';

export const Space = ({ direction = 'horizontal', size = 8, wrap = false, className, children, ...props }) => {
	const isHorizontal = direction !== 'vertical';
	const gapClass = typeof size === 'number' ? `gap-[${size}px]` : '';
	return (
		<div
			className={cn(
				isHorizontal ? 'flex flex-row items-center' : 'flex flex-col',
				wrap ? 'flex-wrap' : '',
				gapClass,
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
};

export default Space;


