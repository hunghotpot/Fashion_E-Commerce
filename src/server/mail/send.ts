import "server-only"
import nodemailer, { type Transporter } from "nodemailer"
import { getMailStatus, type MailConfig, type MailStatus } from "./env"

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export type SendResult = { sent: true } | { sent: false; reason: string }

let cached: { key: string; transport: Transporter } | null = null

function transportFor(config: MailConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user ?? ""}`
  if (cached?.key === key) return cached.transport
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    // Hộp thư lỗi/chậm không được giữ luồng đặt hàng lâu.
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  })
  cached = { key, transport }
  return transport
}

/**
 * Gửi một email. KHÔNG BAO GIỜ ném lỗi: tắt hoặc lỗi gửi đều trả { sent: false, reason }, để người gọi (đặt đơn, đổi trạng thái)
 * không bị hỏng vì email. Lý do không chứa địa chỉ người nhận hay nội dung thư.
 */
export async function sendMail(message: MailMessage, status: MailStatus = getMailStatus()): Promise<SendResult> {
  if (!status.enabled) return { sent: false, reason: status.reason }
  try {
    await transportFor(status.config).sendMail({ from: status.config.from, ...message })
    return { sent: true }
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "Lỗi không rõ khi gửi email" }
  }
}
