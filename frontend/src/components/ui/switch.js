import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
	return (
		<SwitchPrimitives.Root
			ref={ref}
			checked={checked}
			onCheckedChange={onCheckedChange}
			className={cn(
				"peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
				checked ? "bg-primary border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,.5)]" : "bg-surface border-border",
				className
			)}
			{...props}
		>
			<SwitchPrimitives.Thumb
				className={cn(
					"pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
					checked ? "translate-x-5" : "translate-x-0"
				)}
			/>
		</SwitchPrimitives.Root>
	);
});

Switch.displayName = 'Switch';

export default Switch;


