import "server-only"
import { db } from "@/server/db"

/** Thông tin cửa hàng cho khách xem. Chưa cấu hình thì mọi trường là null (trang hiện "chưa có thông tin"). */
export interface StoreProfile {
  hotline: string | null
  email: string | null
  address: string | null
  about: string | null
}

export const STORE_PROFILE_ID = "default"

export const EMPTY_STORE_PROFILE: StoreProfile = { hotline: null, email: null, address: null, about: null }

export async function getStoreProfile(): Promise<StoreProfile> {
  const row = await db.storeProfile.findUnique({ where: { id: STORE_PROFILE_ID } })
  if (!row) return EMPTY_STORE_PROFILE
  return { hotline: row.hotline, email: row.email, address: row.address, about: row.about }
}
