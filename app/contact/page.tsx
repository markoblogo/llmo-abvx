"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-sm text-accent mb-2">// GET IN TOUCH</p>
            <h1 className="font-mono text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground leading-relaxed">We'd love to hear from you.</p>
          </div>

          {success && (
            <Card className="p-4 border-accent/50 bg-accent/10 mb-6">
              <p className="font-mono text-xs text-accent">
                <span className="text-muted-foreground">&gt;</span> Message sent. Thank you — we'll get back to you
                soon.
              </p>
            </Card>
          )}

          {error && (
            <Card className="p-4 border-red-500/50 bg-red-500/10 mb-6">
              <p className="font-mono text-xs text-red-500">// ERROR: {error}</p>
            </Card>
          )}

          <Card className="p-8 border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-sm">
                  Name *
                </Label>
                <Input id="name" name="name" placeholder="John Doe" className="font-mono" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-sm">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="font-mono text-sm">
                  Message *
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Tell us more..."
                  className="font-mono resize-none"
                  rows={6}
                  required
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent"
                >
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </div>

              <div className="bg-muted/30 p-4 rounded-md">
                <p className="font-mono text-xs text-muted-foreground">
                  // SYSTEM MESSAGE: We respond within 24–48 hours.
                </p>
              </div>
            </form>
          </Card>

          <div className="mt-12 text-center">
            <Card className="p-6 border-border bg-card inline-block">
              <p className="font-mono text-sm text-muted-foreground">
                Use the form above to contact us. We'll respond within 24–48 hours.
              </p>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
