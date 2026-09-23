import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LearnGrid",
    short_name: "LearnGrid",
    description: "White-label learning platform for Liberian schools.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#525252",
  };
}
