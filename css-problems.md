# CSS Problems — client/src/styles

> Tài liệu này ghi lại toàn bộ vấn đề được phát hiện trong `client/src/styles/`.
> Cập nhật khi vấn đề được xử lý.

---

## Mức độ: CAO

### P1. `!important` overuse trong button sweep — `globals.css:151-179`

**Vấn đề:**
Sweep animation contract dùng `!important` trên 7 property cùng lúc:

```css
button:not(.rogym-text-link):not([data-no-sweep]),
.rogym-btn, .rogym-sweep, .btn-primary, .btn-secondary {
  background-image: ... !important;
  background-repeat: ... !important;
  background-size: ... !important;
  background-position: ... !important;
  transition-property: ... !important;
  transition-duration: ... !important;
  transition-timing-function: ... !important;
}
```

**Nguyên nhân gốc:**
CSS `@layer` cascade order: `base` < `components` < `utilities`. Tailwind utilities thắng component layer, nên `transition-*` và `bg-*` utilities sẽ override sweep nếu không có `!important`. Đây là trade-off có chủ đích.

**Tác động:**
- Mọi Tailwind `transition-*` utility trên `<button>` bị override silently — không có lỗi, không có cảnh báo.
- Component-level `background` shorthand không thắng được.
- Selector `button:not(...)` là opt-out thay vì opt-in — áp dụng toàn bộ app.
- API escape hatch `data-no-sweep` không được document ở bất kỳ đâu.

**Fix đề xuất:**
- Thêm comment khối giải thích lý do `!important` (layer ordering)
- Document `data-no-sweep` là public API
- Xem xét chuyển button sweep thành opt-in (yêu cầu đổi React components)

---

### P2. `globals.css` 2350+ dòng không có cấu trúc phân tách — `globals.css`

**Vấn đề:**
Toàn bộ component library nằm trong một file duy nhất với hai `@layer components` block tách biệt:

- Block 1 (line 12–845): Layout, navbar, auth, buttons, forms, cards, badge, marquee
- Block 2 (line 1010–2329): Dashboard, sidebar, sessions, package picker, owner table, misc

Không có section headers nhất quán. Không có quy tắc block nào được dùng cho class mới.

**Tác động:**
- Tìm kiếm class mất thời gian ngay cả với IDE search.
- Developer không biết block 1 hay block 2 khi thêm component mới.
- Review diff khó do file quá dài.
- React-day-picker overrides (third-party) nhúng trong file global.

**Fix đề xuất:**
Tách thành `client/src/styles/components/` với 10–12 file theo domain.

---

## Mức độ: TRUNG BÌNH

### P3. Generated `rogym-sx-*` không có tooling — `utilities.css:86-328`

**Vấn đề:**
240+ class `rogym-sx-{hash}` được chú thích là `GENERATED REACT STATIC STYLES` nhưng:
- Không có script generate trong `package.json`.
- Không có documentation về công cụ nào sinh ra chúng.
- Hard-code giá trị màu trực tiếp thay vì dùng CSS token (ví dụ: `rgba(8,14,11,0.92)` thay vì `var(--rogym-bg-base)`).
- Class cũ không được xóa khi component thay đổi (dead code tích lũy).

**Tác động:**
- Developer không biết có nên sửa tay hay không.
- Nếu sửa tay, bị ghi đè lần regenerate tiếp theo (hoặc ngược lại: không bao giờ được regenerate).
- File phình to theo thời gian.

**Fix đề xuất:**
- Thêm comment block giải thích rõ nguồn gốc và cách regenerate.
- Tách `rogym-sx-*` block ra file riêng `generated.css`.

---

### P4. State convention không nhất quán — `globals.css` (nhiều nơi)

**Vấn đề:**
Ba pattern khác nhau dùng đan xen mà không có quy tắc:

```css
/* Pattern A: class modifier */
.rogym-filter-chip.is-active { ... }
.rogym-sidebar.is-expanded { ... }

/* Pattern B: data-state (Radix UI) */
.rogym-select[data-state="open"] { ... }

/* Pattern C: custom data attribute */
[data-tone='success'] { ... }
[data-status='completed'] { ... }
```

**Tác động:**
Developer mới không biết dùng pattern nào khi viết component mới, dẫn đến tiếp tục inconsistency.

**Fix đề xuất:**
Thêm comment block quy ước ở đầu mỗi section liên quan, hoặc tạo file `client/src/styles/CONVENTIONS.md`.

---

## Mức độ: THẤP

### P5. Typography phân tán — `typography.css` + `globals.css`

**Vấn đề:**
`typography.css` chỉ có 5 class. Phần lớn typography thực sự nằm trong `globals.css` dưới dạng magic number:

```css
/* globals.css — font-size hardcoded trong từng component */
.rogym-pricing-card__price { font-size: 52px; line-height: 1; }
.rogym-sidebar__brand { font-size: 18px; }
.rogym-topbar__title { font-size: 16px; }
```

Không có type scale tập trung. `font-size` và `line-height` xuất hiện dưới dạng magic number khắp file.

**Tác động:**
Thay đổi type scale yêu cầu tìm kiếm toàn bộ file thay vì sửa một chỗ.

**Fix đề xuất:**
Di chuyển typography pattern có tên rõ ràng từ `globals.css` sang `typography.css`. Magic number trong component styles giữ nguyên (không refactor component CSS).

---

### P6. Scrollbar định nghĩa trùng lặp — `reset.css:67-88` và `utilities.css:47-79`

**Vấn đề:**
Hai định nghĩa scrollbar với màu khác nhau:

```css
/* reset.css — global */
* { scrollbar-color: var(--rogym-border-teal-hover) var(--rogym-bg-deep); }

/* utilities.css — .app-scrollbar utility */
.app-scrollbar { scrollbar-color: rgba(66,224,158,0.55) var(--rogym-bg-base); }
```

`--rogym-border-teal-hover` và `rgba(66,224,158,0.55)` có thể khác nhau tùy token value. Không rõ `.app-scrollbar` override global ở đâu và tại sao màu khác.

**Tác động:**
Visual inconsistency tiềm ẩn giữa scrollbar toàn cục và scrollbar của các container dùng `.app-scrollbar`.

**Fix đề xuất:**
Căn chỉnh `rgba` value với token tương đương. Thêm comment giải thích khi nào dùng `.app-scrollbar` thay vì dựa vào global.

---

## Trạng thái xử lý

| ID  | Vấn đề                            | Mức độ    | Trạng thái |
|-----|-----------------------------------|-----------|------------|
| P1  | `!important` trong button sweep   | Cao       | Đã xử lý |
| P2  | globals.css 2350 dòng             | Cao       | Đã xử lý |
| P3  | rogym-sx-* không có tooling       | Trung bình | Đã xử lý |
| P4  | State convention inconsistent     | Trung bình | Đã xử lý |
| P5  | Typography phân tán               | Thấp      | Đã xử lý (partial) |
| P6  | Scrollbar duplicate               | Thấp      | Đã xử lý |
