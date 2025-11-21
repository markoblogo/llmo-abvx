"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const initialTheme = savedTheme || (prefersDark ? "dark" : "light")

        setTheme(initialTheme)
        document.documentElement.classList.toggle("dark", initialTheme === "dark")
      } catch (e) {
        console.warn("Theme detection failed", e)
        // Fallback to light theme
        setTheme("light")
        document.documentElement.classList.remove("dark")
      }
    }
  }, [])

  const toggleTheme = () => {
    try {
      const newTheme = theme === "light" ? "dark" : "light"
      setTheme(newTheme)
      localStorage.setItem("theme", newTheme)
      document.documentElement.classList.toggle("dark", newTheme === "dark")
    } catch (error) {
      console.warn("Theme toggle error:", error)
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 transition-colors hover:text-accent"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  )
}
