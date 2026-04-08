import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Manager",
    short_name: "Life Manager",
    description: "ניהול תחומי חיים, משימות והרגלים",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ffffff",
    lang: "he",
    dir: "rtl",
    orientation: "portrait-primary",
  };
}
