import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import { testDatabaseUrl } from "./src/test/test-db-url"

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": src(""),
      // "server-only" ném lỗi khi chạy ngoài môi trường react-server; test thì bỏ qua.
      "server-only": src("test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Các test tích hợp dùng chung một DB và bộ đếm mã đơn (OrderSequence): chạy song song sẽ đụng nhau → trùng mã đơn.
    fileParallelism: false,
    // DB test RIÊNG (fashion_test): dựng và seed trong src/test/global-setup.ts, không đụng DB dev.
    globalSetup: ["./src/test/global-setup.ts"],
    env: {
      ...loadEnv("test", process.cwd(), ""),
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "test-secret-test-secret-test-secret-123456",
      // Giá trị giả cố định: test không bao giờ dùng secret VNPay thật trong .env.
      VNP_TMN_CODE: "TESTTMN1",
      VNP_HASH_SECRET: "test-vnpay-hash-secret-0123456789",
      VNP_URL: "https://sandbox.test/vpcpay.html",
      VNP_RETURN_URL: "http://localhost:3000/api/payment/vnpay/return",
    },
  },
})


