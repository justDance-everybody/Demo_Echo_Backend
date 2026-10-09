import React from 'react';

export const Spinner = ({ size = 'md' }) => {
	const dimension = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;
	return (
		<svg
			width={dimension}
			height={dimension}
			viewBox="0 0 24 24"
			className="animate-spin text-primary"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-label="loading"
		>
			<circle cx="12" cy="12" r="10" className="opacity-25" />
			<path d="M22 12a10 10 0 0 1-10 10" className="opacity-75" />
		</svg>
	);
};

export default Spinner;


