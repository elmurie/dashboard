// app/(dashboard)/_components/sidebar-links.ts
import {
    Calendar,
    Euro,
    Home
} from "lucide-react"

export const sidebarLinks = [
    {
        label: "Dashboard",
        items: [
            {
                title: "Home",
                href: "/dashboard",
                icon: Home,
            },
            {
                title: "Prezzi",
                href: "/dashboard/prices",
                icon: Euro,
            },
            {
                title: "Agenda",
                href: "/dashboard/slots",
                icon: Calendar,
            },
        ],
    }
]