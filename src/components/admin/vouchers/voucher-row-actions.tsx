"use client"

import { useState } from "react"
import { deleteVoucherAction, setVoucherActiveAction } from "@/app/actions/admin-vouchers"
import { ConfirmDialog } from "@/components/admin/modal/confirm-dialog"
import { useAdminAction } from "@/components/admin/use-admin-action"
import type { AdminVoucherRow } from "@/server/services/admin-voucher.service"
import { VoucherFormModal, type CategoryOption } from "./voucher-form-modal"

const LINK = "rounded text-label font-semibold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"

/** Sửa / Bật-Tắt / Xoá một voucher. Xoá chỉ cho voucher chưa có đơn dùng (server kiểm tra lại và báo lỗi). */
export function VoucherRowActions({ voucher, categories }: { voucher: AdminVoucherRow; categories: CategoryOption[] }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { pending, run } = useAdminAction()

  return (
    <>
      <button type="button" className={`${LINK} mr-3 text-foreground`} aria-label={`Sửa voucher ${voucher.code}`} onClick={() => setEditing(true)}>
        Sửa
      </button>
      <button
        type="button"
        disabled={pending}
        className={`${LINK} mr-3 ${voucher.isActive ? "text-muted-foreground" : "text-success"}`}
        aria-label={`${voucher.isActive ? "Tắt" : "Bật"} voucher ${voucher.code}`}
        onClick={() => run(() => setVoucherActiveAction(voucher.id, !voucher.isActive))}
      >
        {voucher.isActive ? "Tắt" : "Bật"}
      </button>
      <button type="button" className={`${LINK} text-destructive`} aria-label={`Xoá voucher ${voucher.code}`} onClick={() => setDeleting(true)}>
        Xoá
      </button>

      {editing && <VoucherFormModal open={editing} onOpenChange={setEditing} voucher={voucher} categories={categories} />}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Xoá voucher?"
        description={`Mã ${voucher.code} sẽ bị xoá vĩnh viễn. Nếu mã đã có đơn hàng sử dụng thì không xoá được, khi đó hãy tắt mã.`}
        confirmLabel="Xoá voucher"
        pending={pending}
        onConfirm={() => run(() => deleteVoucherAction(voucher.id), { onSuccess: () => setDeleting(false) })}
      />
    </>
  )
}
