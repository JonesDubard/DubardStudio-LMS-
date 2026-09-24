import type { Metadata } from "next";
import { BrandingPreviewPanel } from "@/components/admin/BrandingPreviewPanel";
import { FormField } from "@/components/shared/FormField";
import { UploadZone } from "@/components/shared/UploadZone";
import { getSchoolBranding } from "@/lib/stubs/get-school-branding";

export const metadata: Metadata = {
  title: "School Branding Setup",
};

export default function AdminBrandingPage() {
  const data = getSchoolBranding();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="p-8">
        <div className="grid max-w-7xl grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="border border-[#999999] bg-white p-6">
            <h2 className="text-lg font-semibold">{data.settingsTitle}</h2>

            <div className="mt-6 space-y-6">
              <FormField id="school-logo" label={data.logoLabel}>
                <UploadZone
                  title={data.logoTitle}
                  description={data.logoDescription}
                  buttonLabel={data.chooseFileLabel}
                />
              </FormField>

              <FormField id="header-logo" label={data.headerLogoLabel}>
                <UploadZone
                  title={data.headerLogoTitle}
                  description={data.headerLogoDescription}
                  buttonLabel={data.chooseFileLabel}
                />
              </FormField>

              <FormField id="favicon" label={data.faviconLabel}>
                <UploadZone
                  title={data.faviconTitle}
                  description={data.faviconDescription}
                  buttonLabel={data.chooseFileLabel}
                  variant="inline"
                />
              </FormField>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {data.colors.map((color) => (
                  <div key={color.id}>
                    <label className="mb-2 block font-medium">{color.label}</label>
                    <div className="flex items-center gap-4 border border-[#999999] p-4">
                      <div
                        className={`h-12 w-12 border border-[#666666] ${color.swatchClassName}`}
                      />
                      <div>
                        <p className="font-medium">{color.name}</p>
                        <p className="text-sm text-[#666666]">
                          {color.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-[#999999] pt-5">
              <button
                type="button"
                className="border border-[#999999] bg-[#E5E5E5] px-5 py-3"
              >
                {data.skipLabel}
              </button>

              <button
                type="button"
                className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
              >
                {data.saveLabel}
              </button>
            </div>
          </section>

          <BrandingPreviewPanel
            schoolName={data.preview.schoolName}
            portalLabel={data.preview.portalLabel}
            feedLabel={data.preview.feedLabel}
            lessonTitle={data.preview.lessonTitle}
            lessonSubtitle={data.preview.lessonSubtitle}
            ctaLabel={data.preview.ctaLabel}
          />
        </div>
      </div>
    </main>
  );
}
