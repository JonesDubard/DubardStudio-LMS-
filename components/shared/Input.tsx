import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { fieldControl } from "@/lib/ui/styles";

type InputProps = ComponentPropsWithoutRef<"input">;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      className={`${fieldControl} ${className}`.trim()}
    />
  ),
);

Input.displayName = "Input";
