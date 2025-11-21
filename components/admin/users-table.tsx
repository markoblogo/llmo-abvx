"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
  plan: string
  expiry_date: string | null
  last_login: string | null
  created_at: string
}

export function UsersTable({ users: initialUsers }: { users: User[] }) {
  const { data: session } = useSession()
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()

  // Check if current user is super-admin
  useEffect(() => {
    if (session?.user?.email === "a.biletskiy@gmail.com") {
      setIsSuperAdmin(true)
    }
  }, [session])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handlePromoteToAdmin = async (userId: string) => {
    setLoading(userId)
    try {
      const response = await fetch("/api/admin/promote-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: User promoted to admin")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to promote user")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return

    setLoading(userId)
    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: User deleted")
        setUsers(users.filter((u) => u.id !== userId))
      } else {
        showMessage("// SYSTEM ERROR: Failed to delete user")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const handleSendReminder = async (email: string) => {
    setLoading(email)
    try {
      const response = await fetch("/api/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Reminder email sent")
      } else {
        showMessage("// SYSTEM ERROR: Failed to send email")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString()
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
              <th className="p-4 text-left font-mono text-sm font-semibold">Email</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Name</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Role</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Plan</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Expiry</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Last Login</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border transition-colors hover:bg-accent/5 last:border-0">
                <td className="p-4 font-mono text-sm">{user.email}</td>
                <td className="p-4 font-mono text-sm">{user.full_name || "—"}</td>
                <td className="p-4">
                  <span
                    className={`rounded px-2 py-1 font-mono text-xs ${
                      user.role === "admin" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded px-2 py-1 font-mono text-xs ${
                      user.plan === "pro" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.plan}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm">{formatDate(user.expiry_date)}</td>
                <td className="p-4 font-mono text-sm">{formatDate(user.last_login)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {user.role !== "admin" && isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-mono text-xs"
                        onClick={() => handlePromoteToAdmin(user.id)}
                        disabled={loading === user.id}
                      >
                        Promote to Admin
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs"
                      onClick={() => handleSendReminder(user.email)}
                      disabled={loading === user.email}
                    >
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-mono text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={loading === user.id}
                    >
                      Delete
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
