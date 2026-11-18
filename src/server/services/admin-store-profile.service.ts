import "server-only"
import { storeProfileSchema, type StoreProfileInput } from "@/lib/validators/admin-settings"
import { adminContextSchema, type AdminContext } from "@/lib/validators/admin-catalog"
import { db } from "@/server/db"
import { parseInput } from "./admin-catalog.service"
import { getStoreProfile, STORE_PROFILE_ID, type StoreProfile } from "./store-profile.service"

/*
 * Admin: sửa thông tin cửa hàng. Service không tự kiểm quyền (Server Action gọi getAdminUser() trước, xem quy ước Admin).
 * Chỉ có MỘT dòng cấu hình (id "default"): upsert, ghi đè toàn bộ các trường.
 */
export async function updateStoreProfile(admin: AdminContext, input: StoreProfileInput): Promise<StoreProfile> {
  parseInput(adminContextSchema, admin)
  const data = parseInput(storeProfileSchema, input)
  await db.storeProfile.upsert({
    where: { id: STORE_PROFILE_ID },
    create: { id: STORE_PROFILE_ID, ...data },
    update: data,
  })
  return getStoreProfile()
}
