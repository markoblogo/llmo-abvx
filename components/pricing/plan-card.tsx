"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PlanCardProps {
  title: string;
  price: string;
  priceSubtext?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  variant?: "default" | "highlighted" | "outline";
  badge?: string;
  className?: string;
}

export function PlanCard({
  title,
  price,
  priceSubtext,
  description,
  features,
  ctaText,
  ctaHref,
  ctaOnClick,
  ctaLoading = false,
  ctaDisabled = false,
  variant = "default",
  badge,
  className = "",
}: PlanCardProps) {
  const cardClasses = {
    default: "border-border",
    highlighted: "border-accent/50",
    outline: "border-border",
  };

  const buttonClasses = {
    default: "bg-accent text-accent-foreground hover:bg-accent/90 glow-accent",
    highlighted: "bg-accent text-accent-foreground hover:bg-accent/90 glow-accent",
    outline: "bg-transparent",
  };

  return (
    <Card className={`p-8 ${cardClasses[variant]} flex flex-col relative ${className}`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-mono font-semibold">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-mono text-2xl font-bold mb-2">{title}</h3>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-mono text-4xl font-bold text-accent">{price}</span>
          {priceSubtext && (
            <span className="text-muted-foreground font-mono text-sm">{priceSubtext}</span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {ctaHref ? (
          <Link href={ctaHref}>
            <Button
              variant={variant === "outline" ? "outline" : "default"}
              className={`w-full font-mono ${buttonClasses[variant]}`}
            >
              {ctaText}
            </Button>
          </Link>
        ) : (
          <Button
            onClick={ctaOnClick}
            disabled={ctaLoading || ctaDisabled}
            variant={variant === "outline" ? "outline" : "default"}
            className={`w-full font-mono ${buttonClasses[variant]}`}
          >
            {ctaLoading ? "Processing..." : ctaText}
          </Button>
        )}
      </div>
    </Card>
  );
}

