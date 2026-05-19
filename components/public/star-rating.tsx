"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function StarRating({ rating, count, size = "sm", className }: StarRatingProps) {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const rounded = Math.round(rating);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(starSize, s <= rounded ? "text-primary fill-primary" : "text-muted-foreground/30")}
            strokeWidth={s <= rounded ? 0 : 1.5}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
      {count !== undefined && count > 0 && (
        <span className="text-sm text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
