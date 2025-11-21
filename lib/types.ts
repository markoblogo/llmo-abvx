export interface Link {
  id: string
  user_id: string
  url: string
  title: string
  description: string
  tags: string[]
  status: "active" | "expired" | "pending"
  click_count: number
  backlink_verified: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: "free" | "pro"
  links_allowed: number
  start_date: string
  expiry_date: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  payment_status: "active" | "past_due" | "canceled" | "incomplete"
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  status: "sent" | "failed"
  error_message: string | null
  sent_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface AnalyzerLog {
  id: string
  user_id: string
  link_id: string | null
  url: string
  score: number
  recommendations: string[]
  factors: Record<string, number> | null
  visibility: "high" | "medium" | "low" | null
  created_at: string
}
