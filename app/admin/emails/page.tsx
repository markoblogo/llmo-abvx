import { supabase } from "@/lib/supabaseClient"
import { EmailsTable } from "@/components/admin/emails-table"

async function getEmailLogs() {
  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[v0] Error fetching email logs:", error)
    return []
  }

  return logs
}

export default async function AdminEmailsPage() {
  const logs = await getEmailLogs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-bold">// EMAILS MANAGEMENT</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          // SYSTEM MESSAGE: {logs.length} email logs loaded
        </p>
      </div>

      <EmailsTable logs={logs} />
    </div>
  )
}
