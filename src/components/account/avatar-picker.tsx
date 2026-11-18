"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CameraIcon, ImageUpIcon, ShuffleIcon, Trash2Icon } from "lucide-react"
import { removeAvatarAction, saveAvatarChoiceAction } from "@/app/actions/account-avatar"
import { UserAvatar } from "@/components/account/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AVATAR_COLOR_KEYS,
  AVATAR_COLORS,
  AVATAR_STYLE_KEYS,
  AVATAR_STYLES,
  DEFAULT_AVATAR_COLOR,
  generatedAvatarUrl,
  initialsOf,
  randomAvatarSeed,
  type AvatarColor,
  type AvatarData,
  type AvatarStyle,
} from "@/lib/avatar"
import { cn } from "@/lib/cn"

const OUTPUT_SIZE = 256
const MAX_UPLOAD_BYTES = 512 * 1024 // khớp AVATAR_MAX_BYTES ở server
const MAX_SOURCE_BYTES = 10 * 1024 * 1024 // ảnh gốc quá lớn thì không giải mã trong trình duyệt
const CANDIDATES = 12

type Draft =
  | { kind: "KEEP" }
  | { kind: "INITIALS"; color: AvatarColor }
  | { kind: "GENERATED"; style: AvatarStyle; seed: string }
  | { kind: "UPLOAD"; blob: Blob; previewUrl: string }

type TabKey = "initials" | "generated" | "upload"

/** Cắt vuông chính giữa rồi thu về 256×256, mã hoá WebP (JPEG nếu trình duyệt không hỗ trợ). Việc vẽ lại cũng loại bỏ dữ liệu vị trí (EXIF) trong ảnh. */
async function cropToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no-canvas")
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    return (await toBlob("image/webp", 0.85)) ?? (await toBlob("image/jpeg", 0.85)) ?? Promise.reject(new Error("no-blob"))
  } finally {
    bitmap.close()
  }
}

/**
 * Nút ảnh đại diện (bấm để đổi) và khung chọn ảnh 3 tab: chữ cái đầu (chọn màu), ảnh tạo sẵn (DiceBear, chọn kiểu + "Ngẫu nhiên") và tải ảnh
 * lên (bấm chọn, kéo thả hoặc dán). Ảnh tải lên được cắt vuông và nén ngay trong trình duyệt trước khi gửi.
 */
export function AvatarPicker({ name, avatar, className }: { name: string; avatar: AvatarData; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Đổi ảnh đại diện"
            className="group/avatar relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        }
      >
        <UserAvatar name={name} avatar={avatar} className={cn("size-28 text-4xl", className)} />
        <span
          aria-hidden
          className="absolute right-0 bottom-0 grid size-11 place-items-center rounded-full border-2 border-card bg-ink text-white transition-transform group-hover/avatar:scale-105"
        >
          <CameraIcon className="size-5" />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg [&>*]:min-w-0">
        <AvatarPickerBody name={name} avatar={avatar} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AvatarPickerBody({ name, avatar, onDone }: { name: string; avatar: AvatarData; onDone: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabKey>(avatar.kind === "GENERATED" ? "generated" : avatar.kind === "UPLOADED" ? "upload" : "initials")
  const [draft, setDraft] = useState<Draft>({ kind: "KEEP" })
  const [color, setColor] = useState<AvatarColor>(avatar.color ?? DEFAULT_AVATAR_COLOR)
  const [style, setStyle] = useState<AvatarStyle>(avatar.style ?? "shapes")
  // Phần thân chỉ được dựng khi khung mở (chỉ ở trình duyệt) nên random ở đây không gây lệch hydrate.
  const [seeds, setSeeds] = useState<string[]>(() => Array.from({ length: CANDIDATES }, randomAvatarSeed))
  const [message, setMessage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (draft.kind === "UPLOAD") URL.revokeObjectURL(draft.previewUrl)
    },
    [draft]
  )

  const selectedSeed = draft.kind === "GENERATED" ? draft.seed : null

  async function pickFile(file: File | undefined | null) {
    if (!file) return
    setMessage(null)
    if (!file.type.startsWith("image/")) return setMessage("Chọn một tệp ảnh (JPG, PNG hoặc WebP)")
    if (file.size > MAX_SOURCE_BYTES) return setMessage("Ảnh quá lớn (tối đa 10MB)")
    try {
      const blob = await cropToSquare(file)
      if (blob.size > MAX_UPLOAD_BYTES) return setMessage("Ảnh vẫn quá nặng sau khi nén, hãy chọn ảnh khác")
      setDraft({ kind: "UPLOAD", blob, previewUrl: URL.createObjectURL(blob) })
    } catch {
      setMessage("Không đọc được ảnh này. Hãy dùng ảnh JPG, PNG hoặc WebP")
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    void pickFile(e.dataTransfer.files?.[0])
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))
    if (item) void pickFile(item.getAsFile())
  }

  function done(text: string) {
    toast.success(text)
    router.refresh()
    onDone()
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      if (draft.kind === "UPLOAD") {
        const form = new FormData()
        form.append("file", draft.blob, "avatar.webp")
        const res = await fetch("/api/account/avatar", { method: "POST", body: form }).catch(() => null)
        if (res?.ok) return done("Đã đổi ảnh đại diện")
        const body = (await res?.json().catch(() => null)) as { message?: string } | null
        return setMessage(body?.message ?? "Không tải được ảnh, vui lòng thử lại")
      }
      if (draft.kind === "KEEP") return
      const res = await saveAvatarChoiceAction(draft.kind === "INITIALS" ? { kind: "INITIALS", color: draft.color } : { kind: "GENERATED", style: draft.style, seed: draft.seed })
      if (res.ok) done(res.message)
      else setMessage(res.message)
    })
  }

  function remove() {
    setMessage(null)
    startTransition(async () => {
      const res = await removeAvatarAction()
      if (res.ok) done(res.message)
      else setMessage(res.message)
    })
  }

  const previewData: AvatarData =
    draft.kind === "INITIALS"
      ? { ...avatar, kind: "INITIALS", color: draft.color }
      : draft.kind === "GENERATED"
        ? { kind: "GENERATED", color: avatar.color, style: draft.style, seed: draft.seed, url: null }
        : avatar

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ảnh đại diện</DialogTitle>
        <DialogDescription>Chọn chữ cái đầu, một ảnh tạo sẵn hoặc tải ảnh của bạn lên.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-4" aria-live="polite">
        {draft.kind === "UPLOAD" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.previewUrl} alt="Xem trước ảnh đại diện" className="size-20 rounded-full object-cover" />
        ) : (
          <UserAvatar name={name} avatar={previewData} label="Xem trước ảnh đại diện" className="size-20 text-2xl" />
        )}
        <div className="min-w-0">
          <p className="truncate text-label font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{draft.kind === "KEEP" ? "Ảnh hiện tại" : "Ảnh mới, bấm Lưu để áp dụng"}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="h-13 w-full">
          <TabsTrigger value="initials" className="min-w-0 px-1 text-xs sm:px-4 sm:text-sm">
            Chữ cái đầu
          </TabsTrigger>
          <TabsTrigger value="generated" className="min-w-0 px-1 text-xs sm:px-4 sm:text-sm">
            Tạo sẵn
          </TabsTrigger>
          <TabsTrigger value="upload" className="min-w-0 px-1 text-xs sm:px-4 sm:text-sm">
            Tải ảnh lên
          </TabsTrigger>
        </TabsList>

        <TabsContent value="initials" className="pt-2">
          <p id="avatar-color-label" className="mb-3 text-xs text-muted-foreground">
            Màu nền của chữ cái
          </p>
          <div role="radiogroup" aria-labelledby="avatar-color-label" className="flex flex-wrap gap-3">
            {AVATAR_COLOR_KEYS.map((k) => {
              const checked = draft.kind === "INITIALS" ? draft.color === k : draft.kind === "KEEP" && avatar.kind === "INITIALS" && color === k
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={AVATAR_COLORS[k].label}
                  onClick={() => {
                    setColor(k)
                    setDraft({ kind: "INITIALS", color: k })
                  }}
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    AVATAR_COLORS[k].className,
                    checked && "ring-2 ring-ink ring-offset-2 ring-offset-popover"
                  )}
                >
                  {initialsOf(name)}
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="generated" className="space-y-4 pt-2">
          <div>
            <p id="avatar-style-label" className="mb-2 text-xs text-muted-foreground">
              Kiểu ảnh
            </p>
            <div role="radiogroup" aria-labelledby="avatar-style-label" className="flex flex-wrap gap-2">
              {AVATAR_STYLE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={style === k}
                  onClick={() => {
                    setStyle(k)
                    if (selectedSeed) setDraft({ kind: "GENERATED", style: k, seed: selectedSeed })
                  }}
                  className={cn(
                    "h-11 rounded-none border px-4 text-label font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    style === k ? "border-ink bg-ink text-white" : "border-border bg-card text-sidebar-foreground hover:bg-secondary"
                  )}
                >
                  {AVATAR_STYLES[k]}
                </button>
              ))}
            </div>
          </div>

          <div role="radiogroup" aria-label="Chọn một ảnh" className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {seeds.map((seed, i) => {
              const checked = selectedSeed === seed
              return (
                <button
                  key={seed}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`Ảnh ${i + 1}`}
                  onClick={() => setDraft({ kind: "GENERATED", style, seed })}
                  className={cn(
                    "aspect-square min-h-11 overflow-hidden rounded-full bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    checked && "ring-2 ring-ink ring-offset-2 ring-offset-popover"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedAvatarUrl(style, seed)} alt="" width={128} height={128} loading="lazy" className="size-full object-cover" />
                </button>
              )
            })}
          </div>
          <Button type="button" variant="outline" size="md" onClick={() => setSeeds(Array.from({ length: CANDIDATES }, randomAvatarSeed))}>
            <ShuffleIcon aria-hidden /> Ngẫu nhiên
          </Button>
        </TabsContent>

        <TabsContent value="upload" className="space-y-3 pt-2">
          <div
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
              dragging ? "border-ink bg-brand-soft" : "border-border-strong bg-surface"
            )}
          >
            <ImageUpIcon className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-label text-muted-foreground">Kéo ảnh vào đây, dán ảnh từ bộ nhớ tạm hoặc bấm nút bên dưới.</p>
            <Button type="button" variant="outline" size="md" onClick={() => input.current?.click()}>
              Chọn ảnh
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG hoặc WebP. Ảnh được cắt vuông và thu nhỏ trước khi tải lên.</p>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Chọn ảnh đại diện"
            onChange={(e) => {
              void pickFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </TabsContent>
      </Tabs>

      {message && (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {message}
        </p>
      )}

      <DialogFooter className="items-center sm:justify-between">
        {avatar.kind !== "INITIALS" ? (
          <Button type="button" variant="ghost" size="md" onClick={remove} disabled={pending}>
            <Trash2Icon aria-hidden /> Về chữ cái đầu
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="md" onClick={onDone} disabled={pending}>
            Huỷ
          </Button>
          <Button type="button" variant="dark" size="md" onClick={save} disabled={pending || draft.kind === "KEEP"}>
            {pending ? "Đang lưu..." : "Lưu ảnh đại diện"}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
