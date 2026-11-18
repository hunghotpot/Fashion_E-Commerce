import { z } from "zod"
import { AVATAR_COLOR_KEYS, AVATAR_SEED_PATTERN, AVATAR_STYLE_KEYS } from "@/lib/avatar"

/*
 * Chọn ảnh đại diện KHÔNG cần tải tệp (chữ cái đầu hoặc ảnh tạo sẵn). Ảnh tải lên đi qua POST /api/account/avatar,
 * không qua schema này. Mọi giá trị nằm trong danh sách cho phép nên không thể nhét URL hay chuỗi bất kỳ vào cột.
 */
export const avatarChoiceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("INITIALS"),
    color: z.enum(AVATAR_COLOR_KEYS as [string, ...string[]], { error: "Màu không hợp lệ" }),
  }),
  z.object({
    kind: z.literal("GENERATED"),
    style: z.enum(AVATAR_STYLE_KEYS as [string, ...string[]], { error: "Kiểu ảnh không hợp lệ" }),
    seed: z.string({ error: "Ảnh không hợp lệ" }).regex(AVATAR_SEED_PATTERN, "Ảnh không hợp lệ"),
  }),
])

export type AvatarChoiceInput = z.input<typeof avatarChoiceSchema>
export type AvatarChoice = z.output<typeof avatarChoiceSchema>
