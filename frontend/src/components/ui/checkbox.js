import React from 'react';
import { cn } from '@/lib/utils';

export const Checkbox = ({ value, checked, onChange, children, className }) => {
	return (
		<label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
			<input
				type="checkbox"
				className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
				checked={checked}
				onChange={(e) => onChange?.(e.target.checked)}
			/>
			<span className="text-sm text-text">{children}</span>
		</label>
	);
};

Checkbox.Group = ({ value = [], onChange, children, direction = 'horizontal', block = false }) => {
	const items = React.Children.toArray(children).filter(Boolean);
	const handleItem = (label, index) => (checked) => {
		const labelValue = items[index]?.props?.value ?? label;
		let next = Array.isArray(value) ? [...value] : [];
		if (checked) {
			if (!next.includes(labelValue)) next.push(labelValue);
		} else {
			next = next.filter((v) => v !== labelValue);
		}
		onChange && onChange(next);
	};
	return (
		<div className={cn(block ? 'w-full' : '', direction === 'vertical' ? 'flex flex-col gap-2' : 'flex flex-row gap-3 flex-wrap')}>
			{items.map((child, idx) => (
				<label key={idx} className="inline-flex items-center gap-2 cursor-pointer select-none">
					<input
						type="checkbox"
						className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
						checked={value.includes(child.props.value)}
						onChange={(e) => handleItem(child.props.children, idx)(e.target.checked)}
					/>
					<span className="text-sm text-text">{child.props.children}</span>
				</label>
			))}
		</div>
	);
};

export default Checkbox;


