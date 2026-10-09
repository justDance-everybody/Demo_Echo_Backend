import React from 'react';
import { cn } from '@/lib/utils';

export const SearchBar = ({ placeholder = '搜索', value = '', onChange, onCancel, className }) => {
	const handleChange = (e) => {
		const next = e?.target ? e.target.value : e;
		onChange && onChange(next);
	};

  return (
		<div className={cn('flex items-center gap-2 rounded-md border border-cyan-500/30 bg-surface p-2 shadow-[0_0_0_1px_rgba(0,229,255,.1),0_0_14px_rgba(0,229,255,.08)] focus-within:shadow-[0_0_0_1px_rgba(0,229,255,.25),0_0_20px_rgba(0,229,255,.15)] transition-shadow', className)}>
			<input
				className="flex-1 bg-transparent outline-none text-text placeholder:text-text/60 font-mono tracking-wide"
				placeholder={placeholder}
				value={value}
				onChange={handleChange}
			/>
			{value ? (
				<button
					className="text-text/70 hover:text-text"
					onClick={() => onChange && onChange('')}
					aria-label="清空"
				>
					×
				</button>
			) : null}
			{onCancel && (
				<button className="text-primary" onClick={() => onCancel('')}>取消</button>
			)}
		</div>
	);
};

export default SearchBar;


