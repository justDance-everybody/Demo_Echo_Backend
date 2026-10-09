import React from 'react';
import { cn } from '@/lib/utils';

export const Popup = ({ visible, onMaskClick, position = 'bottom', bodyStyle, children }) => {
	if (!visible) return null;
	return (
		<div className="fixed inset-0 z-[1040]">
			<div className="absolute inset-0 bg-black/50" onClick={onMaskClick} />
			<div
				className={cn(
					'absolute left-0 right-0 bg-surface text-text shadow-lg border-t border-border',
					position === 'bottom' ? 'bottom-0 rounded-t-xl' : 'top-0 rounded-b-xl'
				)}
				style={bodyStyle}
			>
				{children}
			</div>
		</div>
	);
};

export default Popup;


