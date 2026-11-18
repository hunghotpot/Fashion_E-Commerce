"use client"

import { useState } from "react"
import { updateStoreProfileAction } from "@/app/actions/admin-settings"
import { FormField } from "@/components/admin/modal/form-field"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SITE_NAME } from "@/lib/site"
import type { StoreProfile } from "@/server/services/store-profile.service"

// Chỉ import KIỂU từ server (bị xoá khi build), không kéo mã server vào client.
export function StoreProfileForm({ profile }: { profile: StoreProfile }) {
  const [hotline, setHotline] = useState(profile.hotline ?? "")
  const [email, setEmail] = useState(profile.email ?? "")
  const [address, setAddress] = useState(profile.address ?? "")
  const [about, setAbout] = useState(profile.about ?? "")
  const { pending, run } = useAdminAction()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateStoreProfileAction({ hotline, email, address, about }))
  }

  return (
    <form onSubmit={submit} aria-labelledby="brand-title" className="space-y-5 border border-border bg-card p-6">
      <h2 id="brand-title" className="font-sans text-base font-semibold">
        Thông tin cửa hàng
      </h2>
      <FormField label="Tên thương hiệu (Logo text)" htmlFor="brand-name" hint="Giá trị lấy từ hằng số trong code, chưa sửa được ở đây.">
        <Input id="brand-name" value={SITE_NAME} readOnly className="bg-secondary/60" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hotline hỗ trợ" htmlFor="brand-hotline">
          <Input id="brand-hotline" inputMode="tel" maxLength={30} value={hotline} onChange={(e) => setHotline(e.target.value)} placeholder="VD: 0901 234 567" />
        </FormField>
        <FormField label="Email liên hệ" htmlFor="brand-email">
          <Input id="brand-email" type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="VD: cskh@cuahang.vn" />
        </FormField>
      </div>
      <FormField label="Địa chỉ cửa hàng" htmlFor="brand-address" hint="Hiện ở trang Liên hệ và chân trang của cửa hàng. Để trống nếu chưa có.">
        <Input id="brand-address" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường, quận, thành phố" />
      </FormField>
      <FormField label="Giới thiệu cửa hàng" htmlFor="brand-about" hint="Hiện ở trang Giới thiệu. Các đoạn cách nhau bằng một dòng trống.">
        <Textarea id="brand-about" rows={6} maxLength={4000} value={about} onChange={(e) => setAbout(e.target.value)} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="dark" size="md" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  )
}
