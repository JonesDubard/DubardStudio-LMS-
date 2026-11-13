"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandingPreviewPanel } from "@/components/admin/BrandingPreviewPanel";
import { FormField } from "@/components/shared/FormField";
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY,
  hexColorSchema,
} from "@/lib/branding/colors";
import { resetBranding, updateBranding, uploadSchoolLogo } from "../actions";

function pickerHex(value: string, fallback: string): string {
  const parsed = hexColorSchema.safeParse(value);
  if (!parsed.success) return fallback;
  const hex = parsed.data.slice(1);
  const full =
    hex.length === 3
      ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      : hex;
  return `#${full.toLowerCase()}`;
}

export function BrandingForm({
  schoolName,
  primaryColor,
  secondaryColor,
}: {
  schoolName: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const router = useRouter();
  const [primary, setPrimary] = useState(primaryColor);
  const [secondary, setSecondary] = useState(secondaryColor);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const previewPrimary = hexColorSchema.safeParse(primary).success
    ? primary.trim()
    : primaryColor;
  const previewSecondary = hexColorSchema.safeParse(secondary).success
    ? secondary.trim()
    : secondaryColor;

  async function onLogo(kind: "logo" | "header", list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setError(null);
    setPending(true);
    const result = await uploadSchoolLogo(kind, file);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onSave() {
    setError(null);
    setPending(true);
    const result = await updateBranding(primary, secondary);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onReset() {
    setError(null);
    setPending(true);
    const result = await resetBranding();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPrimary(DEFAULT_BRAND_PRIMARY);
    setSecondary(DEFAULT_BRAND_SECONDARY);
    router.refresh();
  }

  return (
    <div className="grid max-w-7xl grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Branding Settings</h2>

        <div className="mt-6 space-y-6">
          <FormField id="school-logo" label="School Logo">
            <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-6">
              <p className="font-medium text-ink">Upload School Logo</p>
              <p className="mt-1 text-sm text-ink-secondary">
                JPEG, PNG, or WebP. 10 MB maximum. Used when no header logo is set.
              </p>
              <input
                id="school-logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                className="mt-3 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
                onChange={(event) => {
                  void onLogo("logo", event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
          </FormField>

          <FormField id="header-logo" label="Header Logo">
            <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-6">
              <p className="font-medium text-ink">Upload Header Logo</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Shown in the sidebar. JPEG, PNG, or WebP. 10 MB maximum.
              </p>
              <input
                id="header-logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                className="mt-3 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
                onChange={(event) => {
                  void onLogo("header", event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
          </FormField>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="primary-color" className="mb-2 block font-medium">
                Primary Color
              </label>
              <div className="flex items-center gap-4 border border-line p-4">
                <input
                  type="color"
                  aria-label="Primary color picker"
                  className="h-12 w-12 border border-line-strong bg-surface p-0"
                  value={pickerHex(primary, DEFAULT_BRAND_PRIMARY)}
                  onChange={(event) => setPrimary(event.target.value.toUpperCase())}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Primary</p>
                  <input
                    id="primary-color"
                    value={primary}
                    onChange={(event) => setPrimary(event.target.value)}
                    className="mt-1 w-full border border-line px-2 py-1 text-sm"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="secondary-color" className="mb-2 block font-medium">
                Secondary Color
              </label>
              <div className="flex items-center gap-4 border border-line p-4">
                <input
                  type="color"
                  aria-label="Secondary color picker"
                  className="h-12 w-12 border border-line-strong bg-surface p-0"
                  value={pickerHex(secondary, DEFAULT_BRAND_SECONDARY)}
                  onChange={(event) => setSecondary(event.target.value.toUpperCase())}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Secondary</p>
                  <input
                    id="secondary-color"
                    value={secondary}
                    onChange={(event) => setSecondary(event.target.value)}
                    className="mt-1 w-full border border-line px-2 py-1 text-sm"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-6 border border-ink bg-surface-muted px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex justify-between border-t border-line pt-5">
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="border border-line bg-surface-muted px-5 py-3 disabled:opacity-60"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="border border-brand-primary bg-brand-primary px-5 py-3 text-white disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save Branding"}
          </button>
        </div>
      </section>

      <BrandingPreviewPanel
        schoolName={schoolName}
        portalLabel="Student Portal"
        feedLabel="Learning Feed"
        lessonTitle="Mathematics — Week 3"
        lessonSubtitle="Adding and Subtracting Fractions"
        ctaLabel="Open Lesson"
        primaryColor={previewPrimary}
        secondaryColor={previewSecondary}
      />
    </div>
  );
}
