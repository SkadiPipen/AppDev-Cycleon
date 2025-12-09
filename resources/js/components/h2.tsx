import React from "react";

interface H2Props {
    children: React.ReactNode;
    className?: string;
}

export function H2({ children, className = "" }: H2Props) {
    return (
        <h2
            className={`scroll-m-20 py-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}
        >
            {children}
        </h2>
    );
}
