import { z } from "zod"

/** Đánh dấu đã đọc: có `ids` thì chỉ các thông báo đó, không có thì tất cả thông báo của người dùng. */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(50).optional(),
})

export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>
