import type { MetadataRoute } from "next"
import { SITE_NAME } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Cửa hàng thời trang trực tuyến",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#1c1917",
    lang: "vi",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  }
}
