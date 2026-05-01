import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { NAV_LINKS } from '@/consts';
import { Menu } from 'lucide-react';
const MobileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        const handleViewTransitionStart = () => {
            setIsOpen(false);
        };
        document.addEventListener('astro:before-swap', handleViewTransitionStart);
        return () => {
            document.removeEventListener('astro:before-swap', handleViewTransitionStart);
        };
    }, []);
    return (_jsxs(DropdownMenu, { open: isOpen, onOpenChange: (val) => setIsOpen(val), children: [_jsx(DropdownMenuTrigger, { asChild: true, onClick: () => {
                    setIsOpen((val) => !val);
                }, children: _jsxs(Button, { variant: "ghost", size: "icon", className: "size-8 sm:hidden", title: "Menu", children: [_jsx(Menu, { className: "size-5" }), _jsx("span", { className: "sr-only", children: "Toggle menu" })] }) }), _jsx(DropdownMenuContent, { align: "end", className: "bg-background", children: NAV_LINKS.map((item) => (_jsx(DropdownMenuItem, { asChild: true, children: _jsx("a", { href: item.href, className: "w-full text-lg font-medium capitalize", onClick: () => setIsOpen(false), children: item.label }) }, item.href))) })] }));
};
export default MobileMenu;
