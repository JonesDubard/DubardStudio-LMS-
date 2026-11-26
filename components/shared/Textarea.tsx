import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { fieldControl } from "@/lib/ui/styles";

type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", rows = 4, ...props }, ref) => (
    <textarea
      {...props}
      ref={ref}
      rows={rows}
      className={`${fieldControl} min-h-32 resize-y ${className}`.trim()}
    />
  ),
);

Textarea.displayName = "Textarea";
