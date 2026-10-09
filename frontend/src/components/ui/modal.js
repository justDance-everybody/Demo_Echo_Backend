import React from 'react';
import { cn } from '@/lib/utils';

export const Modal = ({ open, onClose, title, footer, width = 520, children }) => {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[1050] flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className={cn('relative rounded-lg bg-surface text-text shadow-xl border border-border', '')} style={{ width }}>
				{title && <div className="px-4 py-3 border-b border-border font-medium">{title}</div>}
				<div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
				{footer && <div className="px-4 py-3 border-t border-border flex justify-end gap-2">{footer}</div>}
			</div>
		</div>
	);
};

export default Modal;


