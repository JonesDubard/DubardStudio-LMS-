import type { ReactNode } from "react";
import { surfaceCard } from "@/lib/ui/styles";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <div className={`${surfaceCard} ${className}`.trim()}>{children}</div>;
}
