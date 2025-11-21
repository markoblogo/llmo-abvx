"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Link {
  id: string
  user_id: string
  url: string
  title: string
  description: string | null
  tags: string[]
  status: string
  click_count: number
  backlink_verified: boolean
  created_at: string
  profiles: { email: string }
}

export function LinksTable({ links: initialLinks }: { links: Link[] }) {
  const [links, setLinks] = useState(initialLinks)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleVerifyBacklink = async (linkId: string) => {
    setLoading(linkId)
    try {
      const response = await fetch("/api/admin/verify-backlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Backlink verified")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to verify backlink")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleForceRenew = async (linkId: string) => {
    setLoading(linkId)
    try {
      const response = await fetch("/api/admin/renew-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Link renewed")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to renew link")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleRemoveLink = async (linkId: string, url: string) => {
    if (!confirm(`Remove link ${url}? This action cannot be undone.`)) return

    setLoading(linkId)
    try {
      const response = await fetch("/api/admin/remove-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Link removed")
        setLinks(links.filter((l) => l.id !== linkId))
      } else {
        showMessage("// SYSTEM ERROR: Failed to remove link")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
        return "bg-accent/20 text-accent"
      case "expired":
      case "rejected":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md border border-accent bg-accent/10 p-3 font-mono text-sm text-accent">{message}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="p-4 text-left font-mono text-sm font-semibold">URL</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">User</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Description</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Tags</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Status</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Clicks</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Backlink</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-b border-border transition-colors hover:bg-accent/5 last:border-0">
                <td className="p-4 font-mono text-sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {link.url.length > 40 ? link.url.substring(0, 40) + "..." : link.url}
                  </a>
                </td>
                <td className="p-4 font-mono text-sm">{link.profiles?.email || "N/A"}</td>
                <td className="p-4 font-mono text-sm">
                  {link.description
                    ? link.description.length > 50
                      ? link.description.substring(0, 50) + "..."
                      : link.description
                    : "—"}
                </td>
                <td className="p-4 font-mono text-xs">
                  {link.tags?.length > 0 ? link.tags.slice(0, 2).join(", ") : "—"}
                </td>
                <td className="p-4">
                  <span className={`rounded px-2 py-1 font-mono text-xs ${getStatusColor(link.status)}`}>
                    {link.status}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm">{link.click_count || 0}</td>
                <td className="p-4">
                  <span
                    className={`rounded px-2 py-1 font-mono text-xs ${
                      link.backlink_verified ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {link.backlink_verified ? "✓" : "✗"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {!link.backlink_verified && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-mono text-xs"
                        onClick={() => handleVerifyBacklink(link.id)}
                        disabled={loading === link.id}
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs"
                      onClick={() => handleForceRenew(link.id)}
                      disabled={loading === link.id}
                    >
                      Renew
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemoveLink(link.id, link.url)}
                      disabled={loading === link.id}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
