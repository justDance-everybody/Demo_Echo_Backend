import React, { Children, isValidElement } from 'react';
import { cn } from '@/lib/utils';

export const Tabs = ({ activeKey, onChange, children, className }) => {
	const items = Children.toArray(children).filter(isValidElement);
	const current = items.find(child => child.props && child.props.key === activeKey);
	return (
		<div className={cn('w-full', className)}>
			<div className="flex items-center gap-4 border-b border-border mb-3">
				{items.map(child => {
					const key = child.props.key;
					const title = child.props.title;
					const isActive = key === activeKey;
					return (
						<button
							key={key}
							onClick={() => onChange && onChange(key)}
							className={cn(
								'px-2 py-2 text-sm border-b-2',
								isActive ? 'border-primary text-primary' : 'border-transparent text-text/70 hover:text-text'
							)}
						>
							{title}
						</button>
					);
				})}
			</div>
			<div>{current?.props?.children}</div>
		</div>
	);
};

Tabs.Tab = ({ children }) => children ?? null;

export default Tabs;


