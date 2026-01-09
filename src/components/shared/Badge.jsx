import React from 'react';

const Badge = ({ count }) => {
    if (!count || count === 0) return null;
    return (
        <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent-500 text-white text-[10px] font-bold shadow-md animate-pulse">
            {count}
        </span>
    );
};

export default Badge;
