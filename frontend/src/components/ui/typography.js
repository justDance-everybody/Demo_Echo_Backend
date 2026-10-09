import React from 'react';
import { cn } from '@/lib/utils';

export const Title = ({ level = 1, className, children, ...props }) => {
	const Tag = `h${level}`;
	const size = {1:'text-3xl',2:'text-2xl',3:'text-xl',4:'text-lg',5:'text-base',6:'text-sm'}[level] || 'text-xl';
	return <Tag className={cn('font-semibold text-text', size, className)} {...props}>{children}</Tag>;
};

export const Paragraph = ({ className, children, ...props }) => (
	<p className={cn('text-text/90 leading-7', className)} {...props}>{children}</p>
);

export const Text = ({ type, className, children, ...props }) => {
	const color = type === 'success' ? 'text-green-600' : type === 'danger' ? 'text-red-600' : 'text-text';
	return <span className={cn(color, className)} {...props}>{children}</span>;
};

export default { Title, Paragraph, Text };


