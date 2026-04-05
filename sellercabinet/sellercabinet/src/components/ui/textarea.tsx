import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-border bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/90 focus:border-primary focus:ring-4 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
