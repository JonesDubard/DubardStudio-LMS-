import { z } from "zod";

/** Neutral gray fallback when a school has not set colors (FR-2.3.5). */
export const DEFAULT_BRAND_PRIMARY = "#333333";
export const DEFAULT_BRAND_SECONDARY = "#666666";

const HEX_MESSAGE = "Enter a hex color like #1E40AF.";

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, HEX_MESSAGE);

export const brandingColorsSchema = z.object({
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
});

export function brandColorOrDefault(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value && hexColorSchema.safeParse(value).success) return value.trim();
  return fallback;
}

/** CSS for the HTML shell. Only hex values are interpolated. */
export function brandStyleText(primary: string, secondary: string): string {
  const safePrimary = brandColorOrDefault(primary, DEFAULT_BRAND_PRIMARY);
  const safeSecondary = brandColorOrDefault(secondary, DEFAULT_BRAND_SECONDARY);
  return `:root { --brand-primary: ${safePrimary}; --brand-secondary: ${safeSecondary}; }`;
}
