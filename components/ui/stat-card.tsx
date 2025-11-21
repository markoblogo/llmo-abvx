import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number | string;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, delta, icon: Icon, subtitle, trend }: StatCardProps) {
  const deltaValue = typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta}%` : delta;
  const isPositive = trend === "up" || (typeof delta === "number" && delta > 0);
  const isNegative = trend === "down" || (typeof delta === "number" && delta < 0);

  return (
    <Card className="p-6 border-border hover:border-accent/50 transition-all bg-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-mono text-xs text-muted-foreground mb-1">{title}</p>
          <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
          {deltaValue && (
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : isNegative ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : null}
              <span
                className={`font-mono text-xs ${
                  isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {deltaValue}
              </span>
            </div>
          )}
          {subtitle && <p className="font-mono text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-full bg-accent/10 p-2">
            <Icon className="h-5 w-5 text-accent" />
          </div>
        )}
      </div>
    </Card>
  );
}




