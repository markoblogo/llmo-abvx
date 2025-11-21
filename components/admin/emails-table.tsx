"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  status: "sent" | "failed"
  error_message: string | null
  sent_at: string
}

export function EmailsTable({ logs: initialLogs }: { logs: EmailLog[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const router = useRouter()

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      showMessage("// SYSTEM ERROR: Email address required")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      })

      if (response.ok) {
        showMessage("// SYSTEM MESSAGE: Test email sent")
        setTestEmail("")
        router.refresh()
      } else {
        showMessage("// SYSTEM ERROR: Failed to send test email")
      }
    } catch (error) {
      showMessage("// SYSTEM ERROR: Request failed")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    return status === "sent" ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-md border border-accent bg-accent/10 p-3 font-mono text-sm text-accent">{message}</div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-mono text-xl font-bold">// SEND TEST EMAIL</h2>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="font-mono"
          />
          <Button onClick={handleSendTestEmail} disabled={loading} className="font-mono">
            {loading ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="p-4 text-left font-mono text-sm font-semibold">Recipient</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Subject</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Status</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Timestamp</th>
              <th className="p-4 text-left font-mono text-sm font-semibold">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border transition-colors hover:bg-accent/5 last:border-0">
                <td className="p-4 font-mono text-sm">{log.recipient_email}</td>
                <td className="p-4 font-mono text-sm">{log.subject}</td>
                <td className="p-4">
                  <span className={`rounded px-2 py-1 font-mono text-xs ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm">{formatDate(log.sent_at)}</td>
                <td className="p-4 font-mono text-xs text-muted-foreground">
                  {log.error_message ? log.error_message.substring(0, 50) + "..." : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
