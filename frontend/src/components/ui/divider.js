import React from 'react';
import { cn } from '@/lib/utils';

export const Divider = ({ className, ...props }) => (
	<hr className={cn('my-4 border-t border-border', className)} {...props} />
);

export default Divider;


