import type { MetadataRoute } from "next";

/** Lets people add Clouta to their phone's home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clouta",
    short_name: "Clouta",
    description: "Brand deals for creators: clear prices, payment held until the work is approved.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#5B3DF5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
