"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function TestPage() {
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { count, error } = await supabase.from("users").select("*", { count: "exact", head: true })
      if (!error) setUserCount(count)
    }
    fetchData()
  }, [])

  return (
    <div style={{ padding: "2rem" }}>
      <h1>LLMO Directory — Integration Test</h1>
      <p>Supabase users: {userCount ?? "Loading..."}</p>
      <form method="POST" action="/api/checkout">
        <input type="hidden" name="priceId" value="price_test_123" />
        <input type="email" name="email" placeholder="Enter email" required />
        <button type="submit">Test Stripe Checkout</button>
      </form>
    </div>
  )
}

