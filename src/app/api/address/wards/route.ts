import { NextResponse } from "next/server"
import { listWards } from "@/server/address/units"

// Phường/Xã của một Tỉnh/Thành: GET ?province=<tên tỉnh>. Dữ liệu tĩnh nên cho cache phía trình duyệt.
export function GET(req: Request) {
  const province = new URL(req.url).searchParams.get("province") ?? ""
  return NextResponse.json({ wards: listWards(province) }, { headers: { "Cache-Control": "public, max-age=86400" } })
}
