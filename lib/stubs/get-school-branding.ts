export interface ColorPreview {
  id: string;
  label: string;
  name: string;
  description: string;
  swatchClassName: string;
}

export interface BrandingPreview {
  schoolName: string;
  portalLabel: string;
  feedLabel: string;
  lessonTitle: string;
  lessonSubtitle: string;
  ctaLabel: string;
}

export interface SchoolBranding {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  settingsTitle: string;
  logoLabel: string;
  logoTitle: string;
  logoDescription: string;
  headerLogoLabel: string;
  headerLogoTitle: string;
  headerLogoDescription: string;
  faviconLabel: string;
  faviconTitle: string;
  faviconDescription: string;
  chooseFileLabel: string;
  skipLabel: string;
  saveLabel: string;
  colors: ColorPreview[];
  preview: BrandingPreview;
}

export function getSchoolBranding(): SchoolBranding {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "Setup / Branding",
    title: "School Branding",
    subtitle: "Configure the visual identity students and teachers will see.",
    settingsTitle: "Branding Settings",
    logoLabel: "School Logo",
    logoTitle: "Upload School Logo",
    logoDescription: "PNG, JPG or SVG",
    headerLogoLabel: "Header Logo",
    headerLogoTitle: "Upload Header Logo",
    headerLogoDescription: "Used in the application header.",
    faviconLabel: "Favicon",
    faviconTitle: "Upload Favicon",
    faviconDescription: "Small browser tab image.",
    chooseFileLabel: "Choose File",
    skipLabel: "Skip for Now",
    saveLabel: "Save Branding",
    colors: [
      {
        id: "primary",
        label: "Primary Color",
        name: "Primary",
        description: "Neutral preview swatch",
        swatchClassName: "bg-[#E5E5E5]",
      },
      {
        id: "secondary",
        label: "Secondary Color",
        name: "Secondary",
        description: "Neutral preview swatch",
        swatchClassName: "bg-[#999999]",
      },
    ],
    preview: {
      schoolName: "Pilot School #1",
      portalLabel: "Student Portal",
      feedLabel: "Learning Feed",
      lessonTitle: "Mathematics — Week 3",
      lessonSubtitle: "Adding and Subtracting Fractions",
      ctaLabel: "Open Lesson",
    },
  };
}
