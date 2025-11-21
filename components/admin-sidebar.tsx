"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Users, LinkIcon, CreditCard, Mail } from "lucide-react"

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/links", label: "Links", icon: LinkIcon },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/emails", label: "Emails", icon: Mail },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card p-6">
      <div className="mb-8">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold text-accent">&gt;_</span>
          <span className="font-mono text-lg font-semibold">Admin</span>
        </Link>
        <p className="mt-2 font-mono text-xs text-muted-foreground">// SYSTEM CONTROL</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 font-mono text-sm transition-all ${
                isActive
                  ? "bg-accent/10 text-accent glow-accent"
                  : "text-muted-foreground hover:bg-accent/5 hover:text-accent"
              }`}
            >
              <span className="text-accent">&gt;</span>
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 border-t border-border pt-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-accent"
        >
          <span className="text-accent">←</span>
          <span>Back to Site</span>
        </Link>
      </div>
    </aside>
  )
}
