import React from 'react';
import { cn } from '@/lib/utils';

const variantClasses = {
	info: 'border-blue-300 bg-blue-50 text-blue-800',
	success: 'border-green-300 bg-green-50 text-green-800',
	warning: 'border-yellow-300 bg-yellow-50 text-yellow-800',
	error: 'border-red-300 bg-red-50 text-red-800',
};

export function Alert({ className, variant = 'info', title, description, onClose }) {
	return (
		<div className={cn('w-full rounded-md border p-3 text-sm', variantClasses[variant], className)} role="alert">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1">
					{title && <div className="font-medium mb-1">{title}</div>}
					{description && <div className="opacity-90 leading-relaxed">{description}</div>}
				</div>
				{onClose && (
					<button onClick={onClose} aria-label="关闭" className="opacity-70 hover:opacity-100 transition">×</button>
				)}
			</div>
		</div>
	);
}

export default Alert;


