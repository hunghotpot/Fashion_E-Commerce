# Chức năng của cửa hàng

Mô tả từng trang và chức năng của cửa hàng, **khách hàng và Admin** (gom từ README và hai file `status-customer.md`, `admin-ui.md`, cả hai đã gộp vào đây và bị xoá; xem lại bằng lịch sử git nếu cần). Cài đặt và chạy dự án: `README.md`. Kiến trúc: `docs/architecture.md`. Trợ lý AI: `docs/ai/00-overview.md`.

| Mục | Nội dung |
| --- | --- |
| [Bảng trạng thái](#bảng-trạng-thái) | Tính năng khách hàng đã xong/chưa, giỏ khách đã bỏ |
| [Xác thực](#xác-thực) | Đăng ký/đăng nhập tự xây (`jose` + `bcryptjs`), token, middleware, trang và API tài khoản |
| [Danh sách sản phẩm](#danh-sách-sản-phẩm) | `/products`, `/categories/[slug]`: bộ lọc nằm trong URL, facet, tìm không dấu, kiểm tra N+1 |
| [Trang chủ và điều hướng](#trang-chủ-và-điều-hướng) | Menu header, nút ba gạch, hero, liên kết "Xem tất cả", `/hang-moi-ve`, cuộn, focus, chuyển động |
| [Trang chi tiết sản phẩm](#trang-chi-tiết-sản-phẩm) | `/products/[slug]`: chọn biến thể, thêm giỏ/mua ngay, bảng size, chăm sóc |
| [Giỏ hàng](#giỏ-hàng) | `cart.service`, tồn kho, cảnh báo giá/hàng, API và giao diện giỏ |
| [Thanh toán & đơn hàng](#thanh-toán--đơn-hàng) | `createOrder` trong một transaction, huỷ đơn, mã đơn, phí ship, VietQR |
| [Đơn hàng của tôi](#đơn-hàng-của-tôi) | `/account/orders`: lịch sử trạng thái, huỷ đơn, mua lại, quyền truy cập |
| [Trang Admin](#trang-admin) | `/admin`: quyền, màn hình, tải ảnh, khoá tài khoản khách, trạng thái từng màn hình |
| [Quy ước dựng màn hình Admin](#quy-ước-dựng-màn-hình-admin) | Bộ phận giao diện dùng chung, cấu trúc một màn hình, Server Action và test quyền |
| [Nguyên tắc kiến trúc đã kiểm](#nguyên-tắc-kiến-trúc-đã-kiểm) | Kết quả kiểm bảy nguyên tắc kiến trúc |
| [Nợ kỹ thuật](#nợ-kỹ-thuật) | Rollup WASM, cảnh báo Edge, rate limit đăng nhập, hạn chuyển khoản, hoàn tiền |
| [Việc nên làm trước khi lên production](#việc-nên-làm-trước-khi-lên-production) | Checklist trước khi triển khai thật |

## Bảng trạng thái

Cập nhật 2026-11-18.

| Tính năng (khách hàng) | TT | Ghi chú |
|---|---|---|
| Xác thực (đăng ký, đăng nhập, đăng xuất, refresh, đổi mật khẩu) | ✅ | JWT access + refresh xoay vòng (lưu hash, có `familyId`), bcrypt, chống dò email bằng hash giả. Rate limit đăng nhập đang là `Map` trong bộ nhớ (xem nợ kỹ thuật) |
| Danh sách sản phẩm, bộ lọc | ✅ | Bộ lọc nằm trong URL; một schema Zod dùng chung cho server và client |
| Trang chủ và điều hướng | ✅ | Menu header + nút ba gạch, hero hai nút, mỗi mục một liên kết "Xem tất cả" riêng, `/hang-moi-ve`, bộ lọc nổi bật: xem mục "Trang chủ và điều hướng" |
| Chi tiết sản phẩm | ✅ | Chọn size/màu, bảng size, sản phẩm liên quan, chăm sóc |
| Giỏ hàng (người đã đăng nhập) | ✅ | Kiểm tồn kho, cảnh báo đổi giá/hết hàng |
| Giỏ khách (guest) | — đã bỏ | Quyết định 2026-11-10: giỏ hàng và trợ lý AI đều cần tài khoản; bỏ cột `Cart.sessionId` bằng migration |
| Thanh toán (COD, VietQR) | ✅ | Trừ kho nguyên tử trong transaction, snapshot giá/tên/size/màu vào `OrderItem` |
| Lịch sử đơn hàng | ✅ | Lọc, phân trang, timeline, huỷ đơn (hoàn kho), mua lại; mọi truy vấn ràng buộc `userId` |
| Tài khoản và địa chỉ | ✅ | Hồ sơ, ảnh đại diện, đổi mật khẩu (thu hồi mọi refresh token), sổ địa chỉ + mặc định |
| Trợ lý AI | ✅ | Tìm kiếm ngữ nghĩa, tư vấn size, phối đồ, thêm vào giỏ có xác nhận: xem `docs/ai/00-overview.md` |

**Tổng: ✅ 9 · đã bỏ 1 (giỏ khách).** Trạng thái các màn hình Admin: mục "Trang Admin" bên dưới.

## Xác thực

Tự xây bằng `jose` + `bcryptjs`, không dùng thư viện auth ngoài.

- **Token:** access token (JWT, 15 phút) và refresh token (chuỗi ngẫu nhiên, 7 ngày) nằm trong cookie `httpOnly`, `sameSite=lax`. `secure` chỉ bật ở production.
- **Refresh token** chỉ lưu SHA-256 trong bảng `RefreshToken`, rotate mỗi lần refresh. Token đã thu hồi mà bị dùng lại thì cả chuỗi phiên bị thu hồi.
- **Middleware** (`src/middleware.ts`): `/account/*` cần đăng nhập, `/admin/*` cần role `ADMIN`. Access token hết hạn mà còn refresh token thì tự đi qua `/api/auth/refresh`.
- **Rate limit đăng nhập:** in-memory, khoá 15 phút sau 5 lần sai theo cặp IP + email (chạy nhiều instance thì chuyển sang Redis).
- **Biến môi trường:** `JWT_SECRET` tối thiểu 32 ký tự.
- **Code:** logic ở `src/server/services/auth.service.ts` và `address.service.ts`; helper `getCurrentUser()`, `requireUser()`, `requireAdmin()` ở `src/server/auth/session.ts`; Server Actions ở `src/app/actions/`.
- **Trang:** `/login`, `/register`, `/account/profile` (thông tin tài khoản xem/sửa tại chỗ, đơn hàng gần đây, đổi mật khẩu), `/account/addresses` (sổ địa chỉ). "Đơn hàng của tôi" xem mục bên dưới.
- **API:** `GET /api/auth/me` (user hiện tại), `GET /api/auth/refresh` (do middleware gọi).

## Danh sách sản phẩm

- **Trang:** `/products` (tìm kiếm, tất cả sản phẩm) và `/categories/[slug]` (category cha gồm cả sản phẩm của category con).
- **Bộ lọc nằm hoàn toàn trong URL**, ví dụ `?size=M&size=L&color=Đen&minPrice=100000&inStock=1&sort=price_asc&page=2`. Một schema Zod duy nhất `src/lib/validators/product-filter.ts` dùng để parse URL và gọi service; giá trị sai tự rơi về mặc định. Phía client đọc/ghi URL qua hook `useProductFilters()`.
- **Service:** `listProducts(filters)` trong `catalog.service.ts` trả `items`, `total`, `pageCount` và `facets` (đếm theo size, màu, chất liệu, phong cách, dịp, giới tính, khoảng giá). Facet bỏ qua chính bộ lọc của chiều đó nên chọn Size M vẫn thấy số lượng của L, XL.
- **Tìm kiếm không dấu** dùng extension PostgreSQL `unaccent` (đã bật trong migration `enable_unaccent`).
- **Sắp xếp `popular`** hiện dùng cờ `isFeatured` làm tín hiệu thay thế vì chưa có dữ liệu bán hàng.
- **Bộ lọc `featured=1`:** chỉ sản phẩm được Admin gắn nổi bật (`isFeatured`), có chip "Nổi bật" xoá được; có trong `serializeProductFilters` và `clearAll`. Tiêu đề và breadcrumb của `/products` theo bộ lọc qua `listingTitle()` (`src/lib/listing-title.ts`): từ khoá > "Sản phẩm nổi bật" > "Bộ sưu tập Thu Đông" (khi lọc đúng hai mùa thu và đông) > "Tất cả sản phẩm".
- **Kiểm tra N+1:** chạy `PRISMA_QUERY_LOG=1 npm run dev` để in mọi câu SQL; số câu SQL mỗi trang cố định (14) dù `pageSize` là 1, 12 hay 48.

## Trang chủ và điều hướng

- **Header** (`SiteHeader`): logo, menu chính, ô tìm kiếm và cụm biểu tượng. Menu chính (`NAV_LINKS` trong `src/components/layout/nav-links.ts`): **Hàng mới về**, **Bộ sưu tập**, **Nổi bật** (cuộn tới `/#san-pham-moi`, `/#bo-suu-tap`, `/#noi-bat`; từ trang khác thì về trang chủ rồi cuộn) và **Giới thiệu** (`/gioi-thieu`). Menu hiện giữa header từ màn xl (≥1280px); nhỏ hơn dùng nút ba gạch (`MobileMenu`) mở ngăn kéo bên trái. Dưới 640px chuông thông báo nằm trong ngăn kéo (dòng "Thông báo" kèm số chưa đọc, nút ba gạch có chấm báo) vì header không đủ chỗ.
- **Chưa đăng nhập:** không hiện tài khoản, giỏ hay chuông, chỉ có liên kết "Đăng nhập" gạch chân (đăng ký đi từ trang đăng nhập). Đã đăng nhập: chuông, `AccountMenu`, `CartButton`.
- **Hero:** hai nút "Mua theo danh mục" (cuộn tới `#danh-muc`) và "Xem bộ sưu tập" (cuộn tới `#bo-suu-tap`). Dải nền kem **tràn hết bề ngang màn hình** (từ 2026-11-19), nối liền thanh header, **cao bằng phần màn hình còn lại dưới header** (máy tính: `100dvh` trừ header 78px; điện thoại: `85dvh` trừ header 65px để hé ra phần bên dưới; tối thiểu 30rem/26rem); chữ nằm trong khung nội dung nên thẳng hàng với logo. Hình trang trí bên phải (hai hình tròn và chữ "2026") vẫn là hình giữ chỗ bằng CSS cho tới khi có ảnh thật; hai hình tròn ẩn trên điện thoại. Cách tràn mép: lớp nền rộng `100vw` đặt giữa phần tử, nên `<body>` có `overflow-x-clip` để 100vw (gồm cả thanh cuộn) không sinh thanh cuộn ngang; header dính và các phần tử `sticky` khác vẫn hoạt động.
- **Các mục và liên kết "Xem tất cả →"** (liên kết nhỏ gạch chân, vùng bấm 44px), mỗi mục một đích riêng:

| Mục (id) | Liên kết | Đích |
|---|---|---|
| Danh mục sản phẩm (`danh-muc`) | Xem tất cả → | `/products` |
| Lookbook (`bo-suu-tap`) | Xem bộ sưu tập Thu Đông → | `/products?season=thu&season=đông` |
| Sản phẩm nổi bật (`noi-bat`) | Xem tất cả → | `/products?featured=1` |
| Sản phẩm mới (`san-pham-moi`) | Xem tất cả → | `/hang-moi-ve` |

- **`/hang-moi-ve`:** 24 sản phẩm mới nhất (`getNewProducts(24)`), thẻ có nhãn NEW, không phân trang, có breadcrumb và liên kết "Xem tất cả sản phẩm →"; có trong `sitemap.ts`.
- **Cuộn và focus:** CSS `scroll-behavior: smooth` (tắt khi giảm chuyển động); mỗi mục có `scroll-mt-24` để không bị header che. `HashFocus` (trong layout cửa hàng) đưa focus vào tiêu đề mục sau khi cuộn và chỉ tự cuộn khi vừa chuyển từ trang khác (mục tải theo luồng nên Next chưa cuộn được); cuộn thêm lúc đang cuộn mượt sẽ làm giật. `SkipLink` "Bỏ qua tới nội dung chính" (đích `#main-content`) có ở cửa hàng và Admin.
- **Chuyển động:** KHÔNG dùng hiệu ứng chuyển trang (`experimental.viewTransition`/`ViewTransition` trong `template.tsx`) và KHÔNG dùng `loading.tsx`: cả hai đã thử và làm điều hướng bị kẹt ở bản production (bấm liên kết hoặc nút lọc không phản hồi, Next không gửi request, chỉ "thức" lại khi có thao tác khác như mở chuông). Đừng thêm lại. Phản hồi khi chờ máy chủ dùng `PendingFrame` (`src/components/layout/pending-frame.tsx`) + trạng thái nút đổi ngay (optimistic). Các hiệu ứng khác: `FadeImage` (ảnh mờ dần khi tải xong, không chạy nếu ảnh tải lúc đang cuộn), khung chờ `Skeleton` ánh sáng lướt (dùng trong `Suspense` của trang chủ), giỏ nảy và số đếm bật ra khi thêm hàng, vùng kết quả mờ 70% kèm thanh tiến độ khi đổi bộ lọc, ngăn kéo trượt 0,3 giây và hộp thoại 0,2 giây. Mọi hiệu ứng tắt khi `prefers-reduced-motion: reduce`.
- **Vùng bấm:** trên thiết bị cảm ứng (`pointer: coarse`) nút, ô nhập và liên kết chữ lên 44px bằng biến thể `pointer-coarse:`; trên chuột, Admin dùng tối thiểu 24px.
- **Test:** `src/lib/listing-title.test.ts`, bộ lọc `featured` trong `product-filter.test.ts` và `catalog.service.integration.test.ts`.

## Trang chi tiết sản phẩm

- **Route:** `/products/[slug]`; slug không tồn tại hoặc `isActive = false` trả 404. Có `generateMetadata` và JSON-LD `schema.org/Product` (AggregateOffer theo giá thấp/cao nhất của biến thể).
- **Chọn biến thể:** logic thuần hàm ở `src/lib/product-variants.ts` (có test). Chỉ chọn được tổ hợp màu × size tồn tại và còn hàng; option hết hàng mờ + gạch chéo, tổ hợp không tồn tại chỉ mờ. Giá và tồn kho theo biến thể đang chọn.
- **Bố cục (từ 2026-11-19, theo mục tiêu "màn hình đầu tiên có đủ ảnh, giá, màu, size và nút mua"):**
  - Máy tính: dải ảnh nhỏ dọc bên trái + MỘT ảnh chính tỷ lệ 4:5, cao tối đa 78% khung nhìn (`78dvh`), hai cột bằng nhau (`1fr 1fr`). Bấm ảnh chính để xem lớn (hộp có mũi tên, phím ← →, bộ đếm, thumbnail). Tối đa 8 ảnh.
  - Điện thoại: ảnh 4:5 vuốt ngang (`scroll-snap`, vuốt hoặc phím mũi tên khi đang focus), bộ đếm "1/N", không mũi tên và không thumbnail; trái tim nằm cạnh giá; hai nút mua dính đáy màn hình.
  - Chỉ hiện dòng tồn kho khi có ý nghĩa ("Chỉ còn N sản phẩm" từ 5 trở xuống, hoặc hết hàng); không còn dòng "Còn N sản phẩm" và SKU.
- **Giỏ hàng:** `ProductDetailMain` KHÔNG có ô số lượng (quyết định của chủ dự án): "Thêm vào giỏ" và "Mua ngay" luôn là 1 sản phẩm, khách chỉnh số lượng trong giỏ hàng. Hai nút nhận prop `onAddToCart` và `onBuyNow` (`{ variantId, quantity: 1 }`); `ProductDetailConnected` nối chúng với giỏ hàng (xem mục "Giỏ hàng"). Hai nút luôn bấm được trừ khi hết hàng; bấm khi chưa chọn đủ thì hiện nhắc ngay dưới nhóm còn thiếu ("Chọn màu và size / màu / size để tiếp tục", `role="alert"`) và đưa focus tới ô đầu tiên của nhóm đó (`missingAxes` ở `product-variants.ts`). Không hiện nhắc sẵn khi vừa vào trang.
- **Bảng size:** lấy từ `SizeChart` của category (ưu tiên bảng riêng của brand), ẩn nút nếu category chưa có bảng.
- **Chăm sóc:** DB chưa có trường riêng nên `src/lib/care.ts` gợi ý chung theo chất liệu.
- **Thẻ sản phẩm** (danh sách, trang chủ): không hiện dải chấm màu (ẩn từ 2026-11-19 cho gọn; dữ liệu màu vẫn có trong `ProductCardData.colors`); màu chỉ chọn ở trang chi tiết và lọc ở bộ lọc danh sách.
- **Ảnh theo màu:** `imagesForColor()` đã sẵn, nhưng bảng `ProductImage` chưa có cột màu nên hiện chưa tác dụng. Cần thêm cột `color` (nullable) vào `ProductImage` để bật.

## Giỏ hàng

- **Service:** `src/server/services/cart.service.ts` — `getCart`, `addItem`, `updateQuantity` (số lượng 0 = xoá dòng), `removeItem`, `clearCart`. Mọi hàm nhận `ctx` (`{ userId }`) và không đọc cookie/headers, nên Route Handler và AI tool-calling dùng lại được.
- **Chỉ cho user đã đăng nhập:** khách không thêm/sửa/xoá được (API trả 401 `UNAUTHENTICATED`), `/cart` chuyển sang `/login?next=/cart`, icon giỏ và nút "Thêm vào giỏ hàng" dẫn khách sang đăng nhập rồi quay lại đúng trang. Không có giỏ khách (đã bỏ khỏi code và DB); trợ lý AI cũng chỉ dành cho người đã đăng nhập.
- **Tồn kho:** thêm/sửa không được vượt `stock`, lỗi có mã (`INSUFFICIENT_STOCK`, `OUT_OF_STOCK`...) và thông báo tiếng Việt. Chỉ kiểm tra, không giữ chỗ; trừ kho nằm ở bước đặt hàng.
- **Cảnh báo:** giỏ trả kèm cảnh báo khi giá đã đổi so với lúc thêm (`CartItem.priceAtAdd`), tồn kho giảm dưới số lượng, hết hàng hoặc sản phẩm ngừng bán.
- **API:** `GET /api/cart`, `POST /api/cart/items`, `PATCH|DELETE /api/cart/items/[variantId]`.
- **Giao diện:** TanStack Query với optimistic update (`src/hooks/use-cart.ts`), cart drawer chỉ mở khi khách bấm icon giỏ (thêm sản phẩm chỉ hiện toast và hiệu ứng nảy ở icon, không tự mở), trang `/cart`. Ô nhập mã giảm giá dùng được (xem mục Voucher bên dưới), nút "Tiến hành thanh toán" sang `/checkout`.

## Thanh toán & đơn hàng

- **Luồng:** giỏ → `/checkout` (bắt buộc đăng nhập) → COD: `/orders/[id]/success`; chuyển khoản: `/orders/[id]/payment` (mã VietQR) → `/orders/[id]/success`.
- **`createOrder` (src/server/services/order.service.ts)** chạy trong MỘT `prisma.$transaction`: đọc giỏ, kiểm tra địa chỉ, trừ kho bằng `updateMany({ stock >= qty })` (nguyên tử, chống oversell khi nhiều người mua cùng lúc), tạo `Order` + `OrderItem` (snapshot giá/tên/size/màu), cấp mã đơn, xoá giỏ. Thiếu hàng ở bất kỳ dòng nào thì rollback toàn bộ và báo rõ từng sản phẩm.
- **`cancelOrder`:** chỉ khi `PENDING`/`CONFIRMED`, hoàn tồn kho trong cùng transaction.
- **Mã đơn:** `FS-YYYYMMDD-0001`, số thứ tự theo ngày (giờ Việt Nam) lấy từ bảng `OrderSequence` bằng upsert increment nên không trùng.
- **Phí vận chuyển:** `src/lib/shipping.ts` — miễn phí từ 500.000đ, dưới mức đó 30.000đ.
- **VietQR:** `src/lib/vietqr.ts` tự sinh payload chuẩn NAPAS 247 (có test CRC; dùng được cả ở client để Admin xem trước). Tài khoản nhận tiền do **Admin cập nhật ở Cài đặt > Cổng thanh toán** (chọn ngân hàng từ `src/lib/banks.ts`, số tài khoản, tên chủ tài khoản, có xem trước QR); lưu ở bảng `PaymentAccount` (`payment-account.service.ts`). Chưa lưu thì dùng `BANK_NAME`, `BANK_BIN`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME` trong `.env` (dữ liệu MẪU).
- **Chưa có:** tự động đối soát tiền chuyển khoản (Admin xác nhận tay đã nhận tiền ở `/admin/orders/[id]`; trước đó đơn vẫn chờ thanh toán). **Hạn thanh toán:** chuyển khoản 24 giờ (`BANK_TRANSFER_WINDOW_HOURS`, `paymentDeadline` trong `src/lib/order.ts`). Đơn chuyển khoản còn `PENDING` mà Admin chưa xác nhận đã nhận tiền quá hạn thì tự huỷ, hoàn kho và lượt voucher (`expireUnpaidBankTransferOrders`; cron `/api/cron/expire-orders` (kèm header `Authorization: Bearer <CRON_SECRET>`, đồng thời dọn thông báo Admin cũ), và các trang đơn của khách/Admin cũng dọn khi mở). Đơn Admin đã duyệt tay thì không tự huỷ. Khi Admin xác nhận tiền, khách được báo qua chuông (và email nếu bật). Admin có bộ lọc "Chờ xác nhận chuyển khoản" (`?status=TRANSFER`) kèm hạn xác nhận; chi tiết đơn của khách và Admin hiện banner chờ xác nhận.
- **Test:** `order.service.integration.test.ts` chạy trên PostgreSQL thật (cần `npm run db:up`), gồm 2 đơn cùng mua biến thể còn 1 sản phẩm và 5 người tranh 2 sản phẩm.

## Thanh toán từng món và Mua ngay

- **Nguồn hàng** (`src/lib/order-source.ts`): bỏ trống = cả giỏ; `items` = chỉ các dòng giỏ được chọn; `buyNow` = một biến thể + số lượng, không đọc và không đụng giỏ. Dùng chung cho trang thanh toán, xem trước voucher và `createOrder` (qua `loadOrderLines` ở `order-lines.ts`) nên ba nơi luôn khớp. Số tiền, phí ship, voucher và trừ kho chỉ tính trên phần được chọn.
- **Giỏ `/cart`:** tick chọn từng món (mặc định chọn hết, "Chọn tất cả"); tạm tính, phí ship và voucher theo phần đã chọn; nút thanh toán dẫn tới `/checkout?items=a,b` (cả giỏ thì `/checkout`). Sau khi đặt, chỉ các dòng đã mua bị xoá khỏi giỏ, dòng không chọn ở lại.
- **Mua ngay** (trang chi tiết sản phẩm): sang `/checkout?buyNow=<variantId>&qty=N`, không thêm vào giỏ; chưa đăng nhập thì chuyển sang đăng nhập rồi quay lại trang sản phẩm.
- **Test:** `order-source.integration.test.ts`, `src/lib/order-source.test.ts`.

## Trang QR chuyển khoản (`/orders/[id]/payment`)

- Bố cục mobile-first: tiêu đề + số tiền, thanh 3 bước (Đặt đơn, Chuyển khoản, Cửa hàng xác nhận), đếm ngược tới hạn 24 giờ (`PaymentCountdown`), mã QR lớn (tải về được), thông tin chuyển khoản thủ công với nút sao chép cao 44px (`CopyRow`), hướng dẫn 3 bước.
- **Tự cập nhật:** `PaymentStatusWatcher` làm mới trang mỗi ~8 giây (chỉ khi tab đang hiện); khi Admin xác nhận đã nhận tiền, trang tự chuyển sang `/orders/[id]/success`. Đơn quá hạn/bị huỷ hiện màn "hết hạn thanh toán".
- **"Tôi đã chuyển khoản"** (`reportBankTransferAction` → `reportBankTransferPaid`): ghi `Order.customerReportedPaidAt` và báo Admin qua chuông (loại PAYMENT), idempotent, KHÔNG đổi `paymentStatus` (chỉ Admin xác nhận). Admin thấy "Khách báo đã chuyển lúc …" ở danh sách và chi tiết đơn; bộ lọc "Chờ xác nhận chuyển khoản" xếp đơn đã báo lên đầu.
- Voucher dùng được với chuyển khoản (số tiền QR là tổng sau giảm).

## Địa chỉ (sau sáp nhập)

- Chỉ còn **Tỉnh/Thành phố** và **Phường/Xã** (không còn quận/huyện): bỏ cột `Address.district` và khoá `district` trong bản chụp địa chỉ của đơn. Chọn từ danh sách chuẩn 34 tỉnh/thành, 3.321 phường/xã (`src/data/vn-address/*`, nguồn quangtam/vietnam-address-database, MIT, theo Nghị quyết 202/2025/QH15; `src/lib/vn-address.ts` cho client, `src/server/address/units.ts` kiểm phường thuộc đúng tỉnh ở server; phường tải theo tỉnh qua `GET /api/address/wards?province=`).
- **Số nhà, tên đường** gõ tự do (không có dữ liệu đường phố) nhưng chỉ nhận chữ, số, khoảng trắng và `, . / - ' # ( )`, phải có chữ cái (`isPlausibleStreet`), nên chuỗi như `,.:` bị chặn.
- Ô chọn dùng chung `AddressUnitFields` (sổ địa chỉ và thanh toán); server action kiểm lại cả schema lẫn cặp tỉnh–phường.

## Voucher

- **Mô hình:** `Voucher` (mã IN HOA duy nhất; loại `CASH` giảm số tiền, `PERCENT` giảm % có trần `maxDiscount`, `FREESHIP` trừ vào phí ship; đơn tối thiểu, danh mục áp dụng (gồm danh mục con), chỉ đơn đầu tiên, hạn mức `usageLimit`/`usedCount`, ngày bắt đầu/hết hạn giờ Việt Nam, bật/tắt) và `VoucherRedemption` (một dòng mỗi đơn, unique `(voucherId, userId)` nên mỗi khách dùng một mã tối đa một lần). `Order` có thêm `discount` và `voucherCode` (snapshot); `total = subtotal + shippingFee - discount`.
- **Hai nhóm mã dùng cùng lúc:** một mã GIẢM GIÁ (`CASH`/`PERCENT`, trừ vào tiền hàng) và một mã VẬN CHUYỂN (`FREESHIP`, trừ vào phí ship); nhóm suy ra từ loại (`voucherSlot` trong `src/lib/voucher.ts`). Hai mã cùng nhóm không dùng chung được (`SLOT_CONFLICT`). `Order` lưu riêng `discount`/`voucherCode` (giảm giá) và `shippingDiscount`/`shippingVoucherCode` (vận chuyển); `total = subtotal + shippingFee - discount - shippingDiscount`. Mỗi đơn có tối đa 2 `VoucherRedemption`. Mã freeship khi đơn đã miễn phí ship bị từ chối.
- **Áp mã:** `createOrder` nhận `voucherCodes` (tối đa 2), gọi `resolveVoucherSet` rồi `consumeVoucher` từng mã trong CÙNG transaction đặt đơn (tăng `usedCount` bằng câu UPDATE có điều kiện còn lượt, nên hai đơn tranh lượt cuối chỉ một đơn thắng). Số tiền giảm luôn do server tính; client chỉ gửi mã. Lỗi voucher (`VoucherError`) làm đơn không được tạo, kho và giỏ giữ nguyên.
- **Huỷ đơn:** `cancelOrderCore` gọi `releaseVoucher` để hoàn lượt của cả hai mã (xoá redemption, giảm `usedCount`), khách dùng lại được mã.
- **Phương thức thanh toán:** COD và chuyển khoản (`VOUCHER_PAYMENT_METHODS` trong `src/lib/voucher.ts`).
- **Xem trước:** `POST /api/vouchers/preview` (body `{ code, paymentMethod? }`) trả `{ ok, preview | message }` cho ô nhập mã ở `/cart` và `/checkout` (`useVoucher`, `VoucherBox`; mã nhớ trong sessionStorage qua `src/stores/voucher.ts`). Đổi phương thức thanh toán sang không phải COD thì mã báo lỗi và không được gửi khi đặt đơn.
- **Voucher dành cho bạn:** dưới ô nhập mã (giỏ và thanh toán) hiện danh sách voucher đang chạy mà khách chưa dùng (`POST /api/vouchers/available`, `listAvailableVouchers`), kiểm tra trên đúng phần hàng đang thanh toán. Chia hai nhóm "Voucher giảm giá" và "Voucher vận chuyển", mỗi nhóm có "Tiết kiệm nhất" riêng và áp được cùng lúc (ô nhập tự xếp mã vào đúng nhóm, chọn mã khác cùng nhóm thì thay mã cũ). Dùng được xếp trước, bấm "Áp dụng" là áp; chưa dùng được vẫn hiện mờ kèm lý do (thiếu đơn tối thiểu, chỉ COD, sai danh mục). Hiện 3 voucher, "Xem thêm" mở hết (tối đa 20, cuộn trong khung). Voucher công khai (`audience = ALL`) hiện cho mọi khách; voucher theo hạng hoặc gán riêng chỉ hiện với khách đủ điều kiện (xem mục "Hạng thành viên và ưu đãi"). Trang "Voucher của tôi" (`/account/vouchers`) gom tất cả voucher của khách.
- **Admin:** `/admin/vouchers` (`admin-voucher.service.ts`, `src/app/actions/admin-vouchers.ts`): tạo, sửa, bật/tắt, xoá. Không xoá được mã đã có đơn dùng (hãy tắt); không xoá được danh mục đang được voucher áp riêng. Thống kê tính theo đơn chưa huỷ. Form có mục "Đối tượng" (xem mục "Hạng thành viên và ưu đãi").
- **Hiển thị:** hai khoản giảm hiện riêng ở giỏ, thanh toán, chi tiết đơn (khách và Admin) và email đơn hàng.
- **Test:** `voucher.integration.test.ts` (đặt đơn, hạn mức, đua nhau, huỷ hoàn lượt, danh mục, đơn đầu tiên, Admin), `src/lib/voucher.test.ts`, `src/app/actions/admin-vouchers.test.ts`.

## Hạng thành viên và ưu đãi

- **4 hạng** (không lưu cột, suy ra từ tổng chi tiêu; `src/lib/customer-tier.ts`): Thành viên (từ 0), Bạc, Vàng, Kim cương. **Chi tiêu** chỉ tính đơn đã thanh toán (`paymentStatus = PAID`) hoặc đã giao, loại đơn huỷ (`PAID_SPEND_WHERE`, `src/server/services/customer-spend.ts`). Mức mặc định: Bạc 3 triệu, Vàng 10 triệu, Kim cương 25 triệu; Admin chỉnh được (xem "Quy tắc cửa hàng").
- **Freeship theo hạng:** ngưỡng miễn phí vận chuyển giảm dần theo hạng (mặc định 500.000 / 400.000 / 300.000 / 0 đ, 0 = luôn miễn phí). `getShippingFee` / `getShippingTerms` (`customer-spend.ts`) tính theo hạng của khách và dùng ở giỏ, thanh toán, xem trước voucher và `createOrder`. Khách chưa đăng nhập và trang chủ, chính sách, FAQ dùng ngưỡng của hạng Thành viên.
- **Voucher theo đối tượng:** `Voucher.audience` = `ALL` (mọi khách), `TIER` (từ `minTier` trở lên, hạng thấp hơn bị `TIER_REQUIRED`) hoặc `USERS` (chỉ khách có dòng trong `VoucherAssignment`; khách khác nhận `NOT_FOUND`). `Voucher.welcomeTier` đặt voucher thành **quà chào mừng**: khi khách đạt hạng đó, `syncTierPerks` tự gán (`VoucherAssignment.auto = true`) và gửi thông báo loại `VOUCHER`. Gọi lười khi khách mở giỏ hoặc "Voucher của tôi", và sau mỗi đơn chuyển sang đã thanh toán/đã giao (`syncTierPerksForOrder`). Idempotent, an toàn khi chạy đồng thời. Khi Admin sửa danh sách khách gán tay thì dòng tự cấp (`auto`) giữ nguyên.
- **Voucher của tôi** (`/account/vouchers`, `listMyVouchers`): 3 tab Dùng được / Đã dùng / Hết hạn (`?tab=`). Voucher theo hạng chưa đủ điều kiện nằm cuối tab "Dùng được" kèm lý do; mã gán riêng cho người khác không bao giờ hiện. Có thanh tiến độ lên hạng (`TierProgress`, cũng hiện ở sidebar tài khoản).
- **Admin:** form voucher có đối tượng (Tất cả / Theo hạng / Khách cụ thể, chọn khách bằng ô tìm `searchCustomersForVoucherAction`, chỉ trả id, tên, email); danh sách khách có bộ lọc theo 4 hạng và thẻ "Hạng Vàng trở lên".
- **Test:** `voucher-audience.integration.test.ts`, `src/lib/customer-tier.test.ts`, `admin-customer.service.integration.test.ts`.

## Quy tắc cửa hàng (Cài đặt hệ thống)

- **Dữ liệu:** bảng `ShopSettings`, MỘT dòng (id `default`): ngưỡng tồn thấp, phí vận chuyển đồng giá, mức chi tiêu Bạc/Vàng/Kim cương và ngưỡng freeship của 4 hạng. Chưa có dòng thì dùng mặc định trong code (`DEFAULT_SHOP_SETTINGS` ở `src/lib/shop-settings.ts`, lấy từ `LOW_STOCK_THRESHOLD`, `FLAT_SHIPPING_FEE`, `CUSTOMER_TIER_CONFIG`), nên không cần seed.
- **Đọc:** `getShopSettings(client?)` (`shop-settings.service.ts`, không cache; truyền `tx` để chạy trong transaction). Nơi dùng: tồn kho và Tổng quan Admin (`stockStatus(stock, threshold)`), `notifyLowStock`, phí ship (`calculateShippingFee(subtotal, threshold, flatFee)`), hạng khách (`customerTier(spend, rules)`), hero trang chủ, `/chinh-sach/van-chuyen`, FAQ, sidebar và menu tài khoản.
- **Sửa:** Admin > Cài đặt, tab "Vận chuyển & Kho" (`updateShippingStockSettingsAction`) và tab "Hạng thành viên" (`updateTierSettingsAction`). Hai nhóm lưu riêng, không ghi đè nhau; kiểm `getAdminUser()` trước, validate bằng `shippingStockSettingsSchema` / `tierSettingsSchema` (số nguyên không âm; mức chi tiêu tăng dần; ngưỡng freeship không tăng theo hạng). Tab hạng có xem trước số khách sẽ đổi hạng (`previewTierImpactAction`, debounce 400ms) và cột voucher chào mừng chỉ đọc.
- **Chưa có:** tab "Phân quyền Admin" vẫn là minh hoạ (schema chỉ có CUSTOMER/ADMIN); tên thương hiệu (`SITE_NAME`) chưa sửa được; bảng phí theo vùng.
- **Test:** `shop-settings.integration.test.ts` (mặc định, lưu hai nhóm, phí ship theo hạng, xem trước tác động, validate).

## Thông báo cho Admin

- **Chuông trang quản trị** (`AdminNotificationBell`) là hộp thư sự kiện: chip lọc Tất cả/Đơn hàng/Thanh toán/Kho, chấm chưa đọc, "Đánh dấu đã đọc" (tất cả) và nút "Đã đọc" ở từng dòng chưa đọc, liên kết tới đúng đơn/trang (bấm dòng có liên kết thì tự đánh dấu đã đọc); xem đủ có phân trang ở `/admin/notifications?category=`.
- **Mô hình:** bảng `AdminNotification` (một luồng chung) + mốc `User.adminNotificationsSeenAt` ("đọc tất cả") + bảng `AdminNotificationRead` (đã đọc từng dòng, theo từng Admin, xoá theo khi thông báo hoặc Admin bị xoá). Chưa đọc = mới hơn mốc VÀ chưa có dòng trong `AdminNotificationRead`.
- **Sự kiện** (tạo trong cùng transaction với sự kiện, qua `notifyAdmins`): đơn mới (ORDER); đơn chuyển khoản chờ xác nhận tiền kèm nội dung chuyển khoản và hạn 24 giờ (PAYMENT); khách huỷ hoặc hệ thống huỷ vì quá hạn (ORDER, Admin tự huỷ thì không báo); biến thể vừa tụt xuống ngưỡng sắp hết hàng (`ShopSettings.lowStockThreshold`, mặc định 10) (STOCK) do khách đặt hàng, Admin kiểm kê/đặt lại tồn (`adjustStock`) hoặc sửa tay tồn trong form sản phẩm (`updateProduct`), qua hàm chung `notifyLowStock` (báo một lần khi vừa tụt xuống ngưỡng, chỉ cho sản phẩm đang bán). **Dọn dẹp:** cron `/api/cron/expire-orders` xoá thông báo cũ hơn 30 ngày (`ADMIN_NOTIFICATION_RETENTION_DAYS`, kèm trạng thái đọc của chúng).
- **Code:** `src/server/services/admin-notification.service.ts`, `src/lib/admin-notification.ts`, Server Action `markAdminNotificationsSeenAction` và `markAdminNotificationReadAction`, dòng thông báo dùng chung `AdminNotificationRow`. Test: `admin-notification.integration.test.ts` (đọc từng dòng, báo sắp hết hàng khi kiểm kê, dọn cũ), `admin-catalog.integration.test.ts` (sửa tay tồn), `src/app/actions/admin-notifications.test.ts`.

## Đơn hàng của tôi

- **Trang:** `/account/orders` (lọc theo trạng thái, tìm theo mã đơn/tên sản phẩm, phân trang; tất cả nằm trong URL `?status=&q=&page=`) và `/account/orders/[id]` (timeline trạng thái, sản phẩm, địa chỉ, thanh toán, hủy đơn, mua lại). Hai trang này không có sidebar nên `profile`/`addresses` nằm trong nhóm route `(panel)` (có sidebar), còn `orders` đứng riêng.
- **Lịch sử trạng thái:** bảng `OrderStatusHistory` ghi mỗi lần đổi trạng thái (từ → sang, thời gian, người đổi `CUSTOMER`/`ADMIN`/`SYSTEM`, ghi chú/lý do) và luôn được ghi **trong cùng transaction** với lần đổi: tạo đơn, huỷ đơn (người dùng hoặc job hết hạn) và `changeOrderStatus()`. Timeline dựng từ bảng này (`src/lib/order-timeline.ts`). Đơn cũ trước khi có bảng được backfill trong migration.
- **`changeOrderStatus(orderId, to, actor, note)`** chuyển đơn tuần tự `PENDING → CONFIRMED → SHIPPING → DELIVERED` (không nhảy cóc, không đi lùi). Admin đổi trạng thái qua trang `/admin/orders` (xem mục "Trang Admin"), bọc bởi `adminChangeOrderStatus`.
- **Quyền:** mọi hàm của `order.service` (`listOrders`, `getOrderDetail`, `cancelOrder`, `reorder`) ràng buộc `userId` ngay trong câu truy vấn; đơn của người khác không tìm thấy (trang trả 404, kể cả với tài khoản admin), không phụ thuộc vào UI.
- **Hủy đơn:** chỉ khi `PENDING`/`CONFIRMED`; khoá dòng đơn rồi hoàn tồn kho, ghi lịch sử kèm lý do (tuỳ chọn) trong một transaction.
- **Mua lại:** thêm các biến thể còn hàng của đơn cũ vào giỏ (cắt theo tồn kho, không vượt số còn lại, bỏ dòng hết hàng/ngừng bán và báo lý do) qua `cart.service.addItemsClamped`.
- **Chạy test:** `order-history.integration.test.ts` chạy trên PostgreSQL thật (cần `npm run db:up`).

## Ảnh đại diện

- **Ba loại** (`User.avatarKind`, enum `AvatarKind`): `INITIALS` (mặc định: chữ cái đầu của tên trên nền màu chọn trong 6 màu token), `GENERATED` (ảnh DiceBear sinh từ `avatarStyle` + `avatarSeed`) và `UPLOADED` (`avatarUrl`). Cột không dùng của loại khác luôn là null; `avatarFromRow` (`src/lib/avatar.ts`) rơi về chữ cái đầu nếu dữ liệu hỏng nên không bao giờ hiện URL lạ.
- **Ảnh tạo sẵn:** route `GET /avatars/<kiểu>?seed=...` (`src/app/avatars/[style]/route.ts`) sinh SVG ngay trong code bằng `@dicebear/core` + `@dicebear/collection` (không gọi dịch vụ ngoài, không gửi dữ liệu khách ra ngoài), cache dài và immutable. Chỉ 8 kiểu giấy phép CC0 (không cần ghi công: Hình khối, Vòng tròn, Mặt cười, Kính mờ, Lưới, Chân dung, Phác hoạ, Điểm ảnh); nền theo tông kem của cửa hàng. Kiểu phải nằm trong danh sách, seed chỉ chữ và số (6–32 ký tự, ngẫu nhiên, không dùng email hay tên thật), nếu không trả 404.
- **Ảnh tải lên:** `POST /api/account/avatar` (multipart, trường `file`, đúng 1 ảnh; chỉ người đăng nhập, chỉ ảnh của chính mình): trình duyệt tự cắt vuông giữa và nén còn 256×256 WebP (cũng bỏ dữ liệu vị trí EXIF) trước khi gửi; server vẫn kiểm lại tối đa 512KB, magic bytes JPEG/PNG/WebP, chặn Origin khác host, tên file UUID do server sinh. Lưu ở `public/uploads/avatars/`, phục vụ qua `/uploads/avatars/<tên>` (cache immutable). Đổi hoặc gỡ ảnh thì file cũ bị xoá khỏi đĩa; ghi DB lỗi thì file vừa ghi cũng bị xoá.
- **Chọn ảnh:** Server Action `saveAvatarChoiceAction` (chữ cái đầu + màu, hoặc ảnh tạo sẵn) và `removeAvatarAction` (về chữ cái đầu, giữ màu), cùng service `avatar.service.ts`; `userId` luôn lấy từ phiên. Giao diện `AvatarPicker`: bấm vào ảnh ở sidebar tài khoản mở khung 3 tab (Chữ cái đầu, Tạo sẵn có "Ngẫu nhiên", Tải ảnh lên bằng bấm chọn, kéo thả hoặc dán).
- **Hiện ở đâu** (component `UserAvatar`): sidebar và menu tài khoản trên header, đầu khung chuông thông báo của khách, header Admin, danh sách và chi tiết khách ở Admin (khách chưa chọn gì thì Admin giữ chữ cái đầu tô màu theo hạng). Email đơn hàng KHÔNG hiện ảnh đại diện (dự án chưa có địa chỉ gốc của website để nhúng ảnh và email không hiển thị tốt SVG).
- **Thư mục tải lên:** `public/uploads/products` (ảnh sản phẩm của Admin), `public/uploads/avatars` (ảnh đại diện) và `public/uploads/reviews` (ảnh kèm đánh giá, xem mục "Đánh giá sản phẩm"); route phục vụ `/uploads/[name]/[file]` chỉ nhận thư mục trong danh sách. `public/uploads/` trên ổ đĩa máy chủ: chạy nhiều máy chủ hoặc hosting không giữ ổ đĩa thì cần chuyển sang dịch vụ lưu trữ ngoài.
- **Test:** `src/lib/avatar.test.ts`, `src/app/avatars/[style]/route.test.ts`, `src/app/api/account/avatar/route.test.ts`, `src/app/actions/account-avatar.test.ts`, `src/server/services/avatar.service.integration.test.ts`, `src/app/uploads/[name]/[file]/route.test.ts`.

## Đánh giá sản phẩm

- **Quy tắc:** chỉ khách có đơn **đã giao** (`DELIVERED`) chứa sản phẩm đó mới được đánh giá (`hasDeliveredProduct`, dòng đơn có `variantId` null không tính). Mỗi khách một đánh giá cho mỗi sản phẩm (ràng buộc duy nhất `userId + productId`); gửi lần hai là sửa chính đánh giá đó, khách cũng tự xoá được. Đánh giá **hiện ngay**, Admin ẩn sau. Sửa đánh giá đang bị ẩn thì nó VẪN bị ẩn (sửa không phải cách để hiện lại).
- **Dữ liệu:** bảng `Review` (rating 1–5, `content` ≤1000 ký tự không bắt buộc, `status` `VISIBLE`/`HIDDEN`, `hiddenAt`, `hiddenById`, `hiddenReason`) và `ReviewImage` (`url` duy nhất, `position`; xoá theo đánh giá). Sao trung bình KHÔNG lưu sẵn: tính bằng truy vấn tổng hợp chỉ trên đánh giá `VISIBLE` (`getReviewSummary` cho một sản phẩm, `getRatingsForProducts` gộp một truy vấn cho cả danh sách thẻ sản phẩm, nên không N+1). Chưa lọc/sắp xếp sản phẩm theo sao.
- **Khách:** khối "Đánh giá từ khách hàng" ở cuối trang chi tiết sản phẩm (`ProductReviews`, neo `#danh-gia`): sao trung bình, phân bố 5 mức, danh sách phân trang bằng liên kết thật `?rpage=N`, tên người viết đã che (`maskReviewerName`: "Nguyễn Văn An" → "N. V. An"). Ba trạng thái cho khách: chưa đăng nhập (mời đăng nhập), chưa nhận hàng (lời giải thích), hoặc form `ReviewForm` (chọn sao bằng nhóm radio gốc, nhận xét, ảnh; xoá cần xác nhận hai bước). Thẻ sản phẩm và dòng dưới tên sản phẩm hiện "★ 4,5 (12)" khi đã có đánh giá.
- **Ảnh kèm theo (tối đa 3):** trình duyệt thu nhỏ (cạnh dài ≤1280px) và nén WebP rồi tải lên NGAY qua `POST /api/account/reviews/images` (chỉ người đăng nhập; ≤600KB, magic bytes JPEG/PNG/WebP, chặn Origin khác host, tên UUID do server sinh; trả `{ url }`, CHƯA gắn vào đánh giá nào). Khi bấm gửi, `saveReview` nhận danh sách URL (đúng dạng `/uploads/reviews/<uuid>.<đuôi>`, không trùng, ≤3) và thay trọn bộ ảnh trong cùng transaction; vắng `images` thì giữ nguyên ảnh. Ảnh bị bỏ hoặc đánh giá bị xoá thì xoá file khỏi đĩa. `url` duy nhất nên ảnh đã gắn vào đánh giá này không dùng lại cho đánh giá khác.
- **Dọn file mồ côi tự động:** ảnh đã tải lên mà không được gửi đi (hoặc còn sót khi người dùng/sản phẩm bị xoá) bị xoá khi **cũ hơn 24 giờ** và không có dòng `ReviewImage` nào trỏ tới (`pruneOrphanReviewImages`), nên ảnh đang soạn dở không bị xoá nhầm. Chạy nền sau mỗi lần tải ảnh (tối đa mỗi giờ một lần mỗi tiến trình) và kèm cron `/api/cron/expire-orders`. Chưa giới hạn tốc độ tải ảnh theo người dùng.
- **Admin:** `/admin/reviews` (mục "Đánh giá sản phẩm" trong menu): thẻ số liệu, tìm theo sản phẩm/khách/email/nội dung, lọc Đang hiện/Đã ẩn kèm số đếm, bảng có thumbnail ảnh (mở ảnh lớn ở tab mới), **Ẩn** (hộp thoại ghi lý do tuỳ chọn, chỉ Admin thấy) và **Hiện lại**. Chỉ ẩn được cả đánh giá, chưa ẩn riêng từng ảnh. `hideReviewAction`/`showReviewAction` gọi `getAdminUser()` trước; service `admin-review.service.ts` không tự kiểm quyền.
- **Code:** `src/server/services/review.service.ts` (khách), `review-image.service.ts` (file trên đĩa), `admin-review.service.ts`; Server Action `src/app/actions/review.ts` (`saveReviewAction`, `deleteReviewAction`) và `admin-reviews.ts`; validator `src/lib/validators/review.ts`, `admin-review.ts`; phần thuần `src/lib/review.ts`; giao diện `src/components/review/*` và `src/components/admin/reviews/*`.
- **Test:** `src/lib/review.test.ts`, `src/app/actions/review.test.ts`, `src/app/api/account/reviews/images/route.test.ts`, và (cần PostgreSQL) `review.service.integration.test.ts`, `review-images.integration.test.ts`, `review-image.service.integration.test.ts`, `admin-review.service.integration.test.ts`.

## Sản phẩm yêu thích (wishlist)

- **Dữ liệu:** bảng `WishlistItem` (userId, productId, createdAt), ràng buộc duy nhất `userId + productId`, xoá theo khi người dùng hoặc sản phẩm bị xoá. Chỉ dành cho người đã đăng nhập (giống giỏ hàng). Sản phẩm bị ẩn (`isActive = false`) GIỮ dòng yêu thích nhưng không hiện trong danh sách; bán lại thì hiện lại; không thêm được sản phẩm đang ẩn.
- **Service** (`wishlist.service.ts`, `userId` luôn lấy từ phiên): `addToWishlist` (upsert, idempotent; sản phẩm không có hoặc đang ẩn báo `PRODUCT_NOT_FOUND`), `removeFromWishlist` (deleteMany, idempotent: bấm nhanh hoặc bỏ khi chưa có không lỗi), `getWishlistedIds(userId, productIds)` (một truy vấn cho cả danh sách), `listWishlist` (mới thêm trước, phân trang 12/trang, trả `ProductCardData` kèm sao trung bình qua `catalog.getProductCardsByIds`). Lỗi `WishlistError.code`: `INVALID_INPUT`, `PRODUCT_NOT_FOUND`.
- **Server Action** (`src/app/actions/wishlist.ts`): `addToWishlistAction`, `removeFromWishlistAction`; chưa đăng nhập trả thông báo, không gọi service.
- **Nút yêu thích CHỈ ở trang chi tiết sản phẩm** (quyết định của chủ dự án, không đặt ở thẻ sản phẩm): máy tính nằm cạnh "Thêm vào giỏ" và "Mua ngay" (52px); điện thoại nằm cạnh giá (44px) vì hàng nút mua dính đáy không đủ chỗ cho nút thứ ba (từng gây cuộn ngang). Hai nút dùng chung trạng thái trong hook `useWishlist`, chỉ một nút hiện. Cập nhật lạc quan (tim đổi ngay, lỗi thì quay lại và có thông báo); `aria-pressed`, nhãn nêu tên sản phẩm, tim đã thích có tô đặc và màu đỏ. Chưa đăng nhập: bấm thì chuyển `/login?next=` rồi quay lại đúng trang.
- **Trang Yêu thích:** `/account/wishlist` (mục "Sản phẩm yêu thích" ở thanh bên tài khoản và menu tài khoản của khách): lưới thẻ sản phẩm, nút "Bỏ yêu thích" dưới mỗi thẻ (ngoài vùng liên kết của thẻ), phân trang bằng liên kết `?page=`, trạng thái rỗng có lời mời "Xem sản phẩm".
- **Chưa làm (cố ý, để gọn):** trái tim ở thẻ sản phẩm, số lượng trên header, báo khi món yêu thích sắp hết hoặc giảm giá, "Thêm tất cả vào giỏ".
- **Test:** `src/app/actions/wishlist.test.ts` và (cần PostgreSQL) `src/server/services/wishlist.service.integration.test.ts`.

## Thông tin cửa hàng
- **Dữ liệu:** bảng `StoreProfile`, MỘT dòng (id `default`): hotline, email, địa chỉ, giới thiệu (các đoạn cách nhau bằng dòng trống). Chưa cấu hình thì mọi trường là null và trang hiện "chưa có thông tin".
- **Sửa:** Admin > Cài đặt > "Cửa hàng & Brand" (Server Action `updateStoreProfileAction`, kiểm `getAdminUser()` trước; validate bằng `storeProfileSchema`: hotline chỉ số và `+ ( ) . -`, email hợp lệ, độ dài tối đa). Tên thương hiệu vẫn là hằng số `SITE_NAME`, chưa sửa được ở Admin.
- **Hiện ở đâu:** trang `/lien-he`, `/gioi-thieu` và chân trang mọi trang cửa hàng (`getStoreProfile()` ở layout cửa hàng).
- **Bố cục chân trang** (`site-footer.tsx`, từ 2026-11-19): máy tính MỘT hàng năm cột (giới thiệu và liên hệ, Danh mục, Tài khoản, Chính sách, Hỗ trợ), không cột nào xếp chồng lên cột khác nên chân trang chỉ cao bằng cột dài nhất; máy tính bảng: giới thiệu một hàng riêng rồi bốn cột; điện thoại: hai cột. Nền ink, chữ trắng như trước; không có khối đăng ký email (cửa hàng chưa có chức năng gom email).
- **Code:** `store-profile.service.ts` (đọc), `admin-store-profile.service.ts` (ghi, upsert), `src/lib/validators/admin-settings.ts`, `src/app/actions/admin-settings.ts`. Test: `store-profile.integration.test.ts` (DB test), `admin-settings.test.ts` (mock quyền/input).

## Thông báo
- **Dữ liệu:** bảng `Notification` (userId, type `ORDER_STATUS`, title, body, href, `readAt`). Thông báo được tạo trong `recordStatusChange()` (cùng transaction với lần đổi trạng thái) khi đơn được đặt ("Đặt hàng thành công") và khi trạng thái đổi sang Đã xác nhận, Đang giao, Đã giao hoặc Đã huỷ; nội dung kèm tổng tiền và số sản phẩm. Dòng ghi chú không đổi trạng thái (from = to, vd Admin xác nhận đã nhận tiền) không tạo thông báo. Nội dung do `orderStatusMessage()` (`src/lib/notification.ts`) dựng.
- **API:** `GET /api/notifications` (20 thông báo mới nhất + số chưa đọc) và `POST /api/notifications/read` (body `{ ids? }`, không có `ids` = tất cả). Cả hai đọc session, chỉ trả/sửa thông báo của chính người gọi (ràng buộc `userId` trong truy vấn); chưa đăng nhập trả 401.
- **Giao diện:** chuông trên header (`NotificationButton`, chỉ hiện khi đã đăng nhập) tải lại mỗi phút và khi quay lại tab; bấm một thông báo đánh dấu đã đọc và chuyển tới chi tiết đơn; nút "Đánh dấu đã đọc" cho cả danh sách.
- **Email (tuỳ chọn, MẶC ĐỊNH TẮT):** cùng các sự kiện trên còn có email cho chủ đơn (đặt đơn, xác nhận, giao đi, giao xong, huỷ), gửi SAU khi transaction commit và không chờ kết quả nên email lỗi/chậm không làm hỏng đơn. Bật bằng `MAIL_ENABLED=true` + `SMTP_*`; dev dùng Mailpit (`npm run mail:up`, xem README). Mẫu email dùng chung câu chữ với chuông (`orderStatusMessage`). Chưa gửi email cho luồng chuyển khoản/QR (đang chờ thiết kế lại).
- **Chưa có:** thông báo cho sự kiện khác (khuyến mãi, hàng mới), đẩy tức thời (SSE/WebSocket), xoá thông báo cũ. Trang đầy đủ `/account/notifications` (phân trang 10/trang, nút "Đánh dấu tất cả đã đọc") đã có; chuông có liên kết "Xem tất cả thông báo".
- **Test:** `notification.integration.test.ts` (tạo khi đổi trạng thái/huỷ, quyền chủ sở hữu, đánh dấu đã đọc) và `src/lib/notification.test.ts`.

## Trang Admin

- **Vào:** đăng nhập bằng tài khoản ADMIN (xem bảng tài khoản demo) rồi mở `/admin` (menu tài khoản có mục "Trang quản trị"). Middleware chặn theo role, `layout` đọc lại DB bằng `requireAdmin()`; **mọi Server Action và route Admin còn phải tự kiểm quyền bằng `getAdminUser()`** (`src/server/auth/admin.ts`).
- **Màn hình:** Tổng quan, Đơn hàng (+ chi tiết), Tồn kho & Sản phẩm, Danh mục, Bảng size, Khách hàng (+ chi tiết), **Voucher** và **Đánh giá sản phẩm** chạy thật; **Cài đặt hệ thống** lưu được 4 tab (Cửa hàng & Brand, Cổng thanh toán: tài khoản nhận tiền, Vận chuyển & Kho, Hạng thành viên); tab Phân quyền Admin là giao diện minh hoạ.
- **Ảnh sản phẩm:** tải lên qua `POST /api/admin/uploads` (chỉ Admin; JPG/PNG/WebP kiểm bằng chữ ký file, tối đa 5MB và 4 ảnh/lần, tên file do server sinh), lưu ở `public/uploads/products/` (đã nằm trong `.gitignore`) và phục vụ qua `/uploads/products/<tên>`. (Ảnh sản phẩm tải từ trước khi chia thư mục nằm ở gốc `public/uploads/` và vẫn phục vụ qua `/uploads/<tên>`.) Ảnh seed là ảnh tạm từ picsum.photos (ngẫu nhiên, không liên quan quần áo).
- **Khoá tài khoản khách:** `User.status` (ACTIVE/LOCKED); tài khoản bị khoá không đăng nhập hay refresh được, phiên cũ mất hiệu lực ngay.
- **Code:** nghiệp vụ ở `src/server/services/admin-*.service.ts`; giao diện ở `src/app/(admin)/admin/` và `src/components/admin/`; quy ước dựng màn hình mới ở mục "Quy ước dựng màn hình Admin" bên dưới.
- **Test:** test Server Action Admin dùng mock (quyền, input, lỗi); test service `admin-*.integration.test.ts` cần PostgreSQL (`npm run db:up`).

### Trạng thái các màn hình Admin
| Màn hình (`/admin/…`) | Backend | Giao diện | Ghi chú |
|---|---|---|---|
| Khung + header + sidebar | ✅ quyền, khoá tài khoản | ✅ | Route group `(admin)`, chặn quyền hai lớp |
| Tổng quan `/` | ✅ `getDashboardStats` | ✅ | Nút **Duyệt** đơn chạy thật |
| Đơn hàng `orders` (+ `orders/[id]`) | ✅ | ✅ | Duyệt/Giao đi/Hoàn thành, Huỷ, xác nhận chuyển khoản. Chưa có: xuất file, đổi trả, hoàn tiền thật |
| Tồn kho & Sản phẩm `products` | ✅ | ✅ | Có tải ảnh. Thiếu backend: giá gốc, phiếu nhập, ngưỡng tồn riêng |
| Danh mục `categories` | ✅ | ✅ | Tự thiết kế theo hệ thống chung |
| Bảng size `size-charts` | ✅ | ✅ | Tự thiết kế theo hệ thống chung |
| Khách hàng `customers` (+ `customers/[id]`) | ✅ | ✅ | Tạo tài khoản, Khoá/Mở, lọc theo 4 hạng. Bỏ hạng "Tiềm năng" và xuất Excel |
| Voucher `vouchers` | ✅ `admin-voucher.service` | ✅ | Tạo/sửa/bật-tắt/xoá (không xoá được mã đã có đơn dùng). Thống kê tính theo đơn chưa huỷ |
| Đánh giá sản phẩm `reviews` | ✅ `admin-review.service` | ✅ | Xem, lọc, tìm; Ẩn (kèm lý do)/Hiện lại. Chưa ẩn riêng từng ảnh (xem mục "Đánh giá sản phẩm") |
| Cài đặt hệ thống `settings` | ◐ một phần: `StoreProfile`, `PaymentAccount`, `ShopSettings` lưu thật; chưa có vai trò nhân viên | ◐ | 4 tab lưu được (xem mục "Quy tắc cửa hàng"); tab Phân quyền Admin là minh hoạ |

**Việc Admin còn tồn:**
- Ô tìm kiếm ở header hiện chỉ chuyển sang `/admin/orders?q=`; chuông chỉ trỏ tới đơn chờ xác nhận.
- Voucher áp cho thanh toán COD và chuyển khoản (hằng `VOUCHER_PAYMENT_METHODS` trong `src/lib/voucher.ts`). Một đơn dùng tối đa 2 mã (một giảm giá, một vận chuyển). Voucher theo hạng và cho từng khách đã có (xem "Hạng thành viên và ưu đãi").
- Vai trò nhân viên (Quản lý Kho, CSKH) ảnh hưởng auth: tab Phân quyền Admin còn là minh hoạ. (Bảng cấu hình tồn kho, ship, hạng đã làm.)
- Phiếu nhập và lịch sử nhập kho (`adjustStock` hiện chỉ đổi số), giá gốc/gạch chân, ngưỡng tồn riêng từng biến thể.
- Xuất Excel/xuất file, luồng đổi trả, hoàn tiền thật.
- Hạng "Tiềm năng" của khách (đã bỏ vì chưa có quy tắc).
- Hạng thành viên: 4 hạng, ưu đãi (freeship theo hạng, voucher theo hạng, voucher chào mừng) đã làm; còn để ngỏ: ưu đãi khác như điểm thưởng, quà sinh nhật.
- Chưa thử trên trình duyệt: tải ảnh thật qua modal (mới thử route bằng fetch), sửa sản phẩm `?edit=`, nút Nhập kho, ẩn/xoá sản phẩm, modal Sửa bảng size lưu thành công, đăng nhập thật bằng tài khoản vừa bị khoá.

**Quyết định mặc định cần xem lại:**
- Mức mặc định: hạng Bạc **3.000.000 đ**, Vàng **10.000.000 đ**, Kim cương **25.000.000 đ** (`src/lib/customer-tier.ts`); ngưỡng tồn thấp **10** (`src/lib/inventory.ts`); phí ship **30.000 đ**. Admin đã chỉnh được ở Cài đặt, đây chỉ là giá trị khi chưa cấu hình.
- Doanh thu = đơn đã `PAID` hoặc COD đã giao, loại huỷ/hoàn tiền; tính theo ngày tạo đơn (schema chưa có ngày thanh toán/giao).
- Admin có thể chuyển đơn chuyển khoản sang Hoàn thành khi chưa xác nhận đã nhận tiền; mọi lỗi của `markBankTransferPaid` dùng chung mã `CANNOT_PAY`.
- Trang chủ cửa hàng hiện 4 thẻ danh mục gốc (Nam, Nữ, Unisex, Phụ kiện); slug cũ như `/categories/ao-thun` không còn.

### Quy ước dựng màn hình Admin
**Thiết kế:** màu, font, cỡ chữ, bo góc theo token hiện hành trong `globals.css` (hệ thống "Ấm áp tinh tế" từ 2026-11-17); nội dung thật lấy từ DB và tên cửa hàng từ `SITE_NAME`. Màn **Danh mục** và **Bảng size** tự thiết kế: dựng bằng đúng các bộ phận dưới đây, không tạo kiểu mới. Màu, cỡ chữ, bo góc dùng token trong `src/app/globals.css` (`bg-ink`, `text-brand`, `bg-brand-soft`, `text-label`, `rounded-3xl`…), không viết mã màu cứng.

**Bộ phận dùng chung** (dùng lại, đừng viết lại; thiếu gì thì bổ sung vào bộ chung):

| Cần | Dùng | File |
|---|---|---|
| Hàng 4 thẻ số liệu | `StatGrid` + `StatCard` (+ `formatDelta`) | `components/admin/dashboard/stat-card.tsx` |
| Tiêu đề khối danh sách | `ListSection` | `components/admin/list/admin-table.tsx` |
| Ô tìm kiếm + nút lọc + nút hành động | `ListToolbar` (state trong URL `?q=&status=`) | `components/admin/list/list-toolbar.tsx` |
| Thẻ chứa bảng | `ListCard` | `admin-table.tsx` |
| Bảng | `AdminTable` + `AdminTr` (ô viết thẳng `<td>`), `AdminEmpty` | `admin-table.tsx` |
| Phân trang | `AdminPagination` (nhận `searchParams` thô) | `components/admin/list/admin-pagination.tsx` |
| Pill trạng thái | `StatusPill tone=success\|warning\|info\|danger\|neutral\|dark` | `components/admin/status-pill.tsx` |
| Modal | `AdminModal` + `ModalActions` (nút Lưu nối form qua `formId`) | `components/admin/modal/admin-modal.tsx` |
| Ô form | `FormField` (nhãn, dấu *, gợi ý, lỗi) + `Input`/`Select`/`Textarea`/`Switch` trong `components/ui` | `components/admin/modal/form-field.tsx` |
| Xác nhận thao tác nguy hiểm | `ConfirmDialog` | `components/admin/modal/confirm-dialog.tsx` |
| Chạy Server Action + toast + làm mới | `useAdminAction()` | `components/admin/use-admin-action.ts` |
| URL/phân trang (hàm thuần) | `buildListHref`, `pageWindow`, `pageRange` | `lib/admin-list.ts` |
| Kiểu kết quả action | `AdminActionResult` | `lib/admin-action.ts` |
| Nhãn/màu trạng thái đơn | `ADMIN_ORDER_STATUS_LABEL`, `ADMIN_ORDER_STATUS_TONE` | `components/admin/admin-nav.ts` |

Mẫu ghép đầy đủ: trang Tổng quan (`src/app/(admin)/admin/page.tsx`, `components/admin/dashboard/pending-orders-card.tsx`).

**Cấu trúc một màn hình:**
```
src/app/(admin)/admin/<màn>/page.tsx        Server Component: đọc searchParams, gọi service, ghép bộ phận dùng chung
src/components/admin/<màn>/*.tsx            Component riêng của màn (client chỉ khi cần tương tác: modal, nút hành động)
src/app/actions/admin-<màn>.ts              Server Action của màn
src/lib/validators/admin-<màn>.ts           Zod (đã có cho đơn/catalog/khách hàng); chỉ thêm nếu thiếu
```
- `page.tsx` không tự gọi `requireAdmin` ngoài layout đã làm; nhưng mọi **Server Action và route handler** phải tự kiểm quyền (bên dưới).
- Bộ lọc, trang, tìm kiếm nằm trong URL. Trang truyền `searchParams` thô cho hàm `list...` của service (đã tự validate và rơi về mặc định khi sai).
- Tiêu đề trang, breadcrumb và sidebar lấy từ `components/admin/admin-nav.ts`.
- Service chỉ nhận `{ userId }` của Admin và dữ liệu đã parse; `Date` phải chuyển sang chuỗi/số khi truyền xuống component client.

**Server Action Admin (bắt buộc):**
```ts
"use server"
export async function xAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()                       // src/server/auth/admin.ts
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }
  // 1) validate input bằng Zod  2) gọi service với { userId: admin.id }  3) bắt lỗi nghiệp vụ → { ok:false, message }
  revalidatePath("/admin", "layout")                       // hoặc đường dẫn cụ thể
  return { ok: true, message: "…" }
}
```
- Bắt đúng lớp lỗi của service (`OrderError`, `AdminCatalogError`, `AdminCustomerError`…) và trả `message` tiếng Việt; lỗi lạ thì ném lại.
- **Test quyền cho từng action** theo mẫu `src/app/actions/admin-orders.test.ts` (mock `@/server/auth/admin` và service): khách/chưa đăng nhập bị từ chối và service **không** được gọi; Admin hợp lệ truyền đúng `{ userId }`; input sai không gọi service.
- Giao diện ẩn nút theo trạng thái chỉ để tiện dùng; server (service) luôn là chốt cuối.

## Nguyên tắc kiến trúc đã kiểm

| Nguyên tắc | Kết quả |
|---|---|
| Logic nghiệp vụ trong `src/server/services/*`; route/action chỉ validate rồi gọi service | ✅ Route chỉ validate rồi gọi service |
| Client component không import `src/server/` | ✅ Không có file `"use client"` nào import `@/server/*`; mọi service và `db` có `import "server-only"` |
| Service giỏ/đơn nhận context thuần, không phụ thuộc cookie hay request | ✅ Cầu nối request → context nằm ở `server/cart/context.ts` và `server/auth/session.ts` |
| Bộ lọc sản phẩm hoàn toàn trong URL, một schema chung | ✅ `productFilterSchema` dùng ở `catalog.service` và `use-product-filters` |
| Trừ kho trong `prisma.$transaction`, chống oversell | ✅ `createOrder` dùng `updateMany({ stock >= qty })` nguyên tử, thứ tự id cố định tránh deadlock; huỷ đơn hoàn kho có khoá `FOR UPDATE`; có test tích hợp đồng thời |
| Service dữ liệu người dùng kiểm quyền sở hữu ở server | ✅ Địa chỉ, đơn, giỏ đều ràng buộc `userId`; người khác nhận NOT_FOUND |
| Response không lộ `passwordHash`, token, dữ liệu nhạy cảm | ✅ `PublicUser` chỉ gồm id/email/name/phone/role; refresh token chỉ lưu hash SHA-256; IPN không log tham số giao dịch |

## Nợ kỹ thuật

1. **Rollup dùng bản WASM** (`@rollup/wasm-node`, chậm hơn bản native một chút) vì Windows Application Control chặn file native. Máy/CI không bị chặn có thể gỡ alias và `overrides` trong `package.json`.
2. **Cảnh báo build:** `middleware.ts` import `server/auth/jwt.ts` (`jose`), Next cảnh báo `DecompressionStream` không hỗ trợ Edge Runtime. Build vẫn qua vì middleware chỉ verify chữ ký; nên tách module verify chỉ dùng `jose/jwt/verify` hoặc kiểm tra trên môi trường edge thật.
3. **Rate limit đăng nhập dùng `Map` trong bộ nhớ** (`server/auth/rate-limit.ts`): mất khi khởi động lại và không dùng chung giữa nhiều instance. Redis đã có (limiter của AI dùng); chuyển sang Redis (INCR + EXPIRE) trước khi chạy nhiều instance.
4. **Chuyển khoản chưa có đối soát tự động:** đơn có hạn 24 giờ và tự huỷ khi quá hạn mà Admin chưa xác nhận (xem "Thanh toán & đơn hàng"), nhưng việc xác nhận đã nhận tiền vẫn do Admin làm tay. Đối soát tự động (webhook ngân hàng) để sau.
5. **Huỷ đơn đã thanh toán chỉ đổi `paymentStatus` sang `REFUNDED`**, chưa hoàn tiền thật (chuyển khoản lại thủ công). Cần quy trình hoàn tiền thủ công cho Admin.
6. **Không dùng `viewTransition` và `loading.tsx`** (đã bỏ 2026-11-19): hai thứ này gây kẹt điều hướng ở production, xem mục "Chuyển động" ở trên. Kiểm lại bằng `npm run build` + `npm start` nếu muốn thêm hiệu ứng chuyển trang.

## Việc nên làm trước khi lên production

- Đặt `JWT_SECRET` mạnh, `CRON_SECRET`, thông tin ngân hàng thật (`BANK_*` hiện là dữ liệu mẫu) và lịch gọi `/api/cron/expire-orders` (route này huỷ đơn quá hạn, xoá thông báo Admin cũ hơn 30 ngày và dọn ảnh đánh giá mồ côi cũ hơn 24 giờ).
- Chạy toàn bộ test (kể cả test tích hợp cần PostgreSQL thật) trong CI.
- Chuyển rate limit đăng nhập sang Redis; đánh giá cảnh báo Edge của `jose`.
- Cookie `secure` và HTTPS, kiểm tra header bảo mật, thêm quy trình hoàn tiền thủ công cho Admin.
- Đổi mật khẩu 2 tài khoản seed trước khi dùng thật (`prisma/seed-data/users.ts`), không seed trên production.
