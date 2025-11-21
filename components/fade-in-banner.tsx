"use client"

import type { ReactNode } from "react"
import { useFadeIn } from "@/hooks/use-fade-in"

interface FadeInBannerProps {
  children: ReactNode
  id?: string
}

export function FadeInBanner({ children, id }: FadeInBannerProps) {
  const ref = useFadeIn()

  return (
    <div ref={ref} id={id}>
      {children}
    </div>
  )
}
