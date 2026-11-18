import "server-only"
import { z } from "zod"

/*
 * Cấu hình gửi email đọc từ biến môi trường `MAIL_*` / `SMTP_*` qua MỘT module (cùng cách với AI_*).
 * MẶC ĐỊNH TẮT: MAIL_ENABLED khác "true", hoặc thiếu/sai cấu hình ⇒ enabled: false kèm lý do, không ném lỗi,
 * không làm hỏng build hay luồng đặt hàng. Dev dùng Mailpit (docker compose --profile mail) làm hộp thư giả, xem README.
 */

const envSchema = z
  .object({
    MAIL_FROM: z.string().min(3),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_SECURE: z.enum(["true", "false"]).default("false"),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
  })
  .refine((e) => (e.SMTP_USER === undefined) === (e.SMTP_PASS === undefined), {
    message: "SMTP_USER và SMTP_PASS phải đặt cùng nhau",
    path: ["SMTP_USER"],
  })

export interface MailConfig {
  /** Địa chỉ người gửi, ví dụ `Fashion Store <no-reply@example.com>`. */
  from: string
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
}

export type MailStatus = { enabled: true; config: MailConfig } | { enabled: false; reason: string }

type Env = Record<string, string | undefined>

/** Hàm thuần (nhận env), để test không đụng `process.env`. Chuỗi rỗng coi như chưa đặt. */
export function parseMailEnv(env: Env): MailStatus {
  if (env.MAIL_ENABLED !== "true") return { enabled: false, reason: "MAIL_ENABLED không phải true" }

  const raw = Object.fromEntries(
    Object.entries(env).filter(
      ([key, value]) => (key === "MAIL_FROM" || key.startsWith("SMTP_")) && value !== undefined && value.trim() !== "",
    ),
  )
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    return { enabled: false, reason: `Cấu hình email chưa hợp lệ (${detail})` }
  }

  const e = parsed.data
  return {
    enabled: true,
    config: { from: e.MAIL_FROM, host: e.SMTP_HOST, port: e.SMTP_PORT, secure: e.SMTP_SECURE === "true", user: e.SMTP_USER, pass: e.SMTP_PASS },
  }
}

export function getMailStatus(): MailStatus {
  return parseMailEnv(process.env)
}
