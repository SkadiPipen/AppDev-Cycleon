import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { growAGarden, stealABrainrot, plantsVsBrainrots } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Grow a Garden',
        href: growAGarden(),
        icon: "/icons/grow-a-garden.webp",
    },
    {
        title: 'Steal a Brainrot',
        href: stealABrainrot(),
        icon: "/icons/steal-a-brainrot.webp",
    },
    {
        title: 'Plants vs Brainrots',
        href: plantsVsBrainrots(),
        icon: "/icons/plants-vs-brainrots.webp",
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Notifications',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Bell,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
