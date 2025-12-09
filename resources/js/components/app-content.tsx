import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'main'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({
    variant = 'header',
    children,
    ...props
}: AppContentProps) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    return (
        <div className="w-full h-full flex flex-1 flex-col bg-transparent">
            <main
                className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl bg-transparent"
                {...props}
            >
                {children}
            </main>
        </div>
    );
}
