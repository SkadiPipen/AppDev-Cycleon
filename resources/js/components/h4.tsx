import React from "react";

interface H4Props {
    children: React.ReactNode;
    className?: string;
}

export function H4({ children, className = "" }: H4Props) {
    return (
        <h4
            className={`scroll-m-20 text-xl font-semibold tracking-tight ${className}`}
        >
            {children}
        </h4>
    );
}
