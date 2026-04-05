import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-white/85 px-4 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/90 focus:border-primary focus:ring-4 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
