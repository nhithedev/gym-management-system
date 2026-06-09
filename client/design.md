# RoGym — Design System Reference

Tài liệu này mô tả toàn bộ ngôn ngữ thiết kế của RoGym. Mọi màn hình mới đều phải tuân theo các quy tắc này để giữ nhất quán.

---

## 0. Quy tắc bắt buộc cho mọi thay đổi UI

> **BẮT BUỘC:** Bất kỳ file UI mới nào hoặc file UI hiện có được chỉnh sửa đều phải tuân theo tài liệu này. Không xem các rule bên dưới là gợi ý tùy chọn.

- Luôn lấy màu, font, spacing, border, shadow và motion từ CSS variables / component classes trong `src/styles/globals.css`. Không tạo thêm palette riêng trong từng page khi token tương ứng đã tồn tại.
- Mọi button, bao gồm button submit, CTA, icon button và link có hình thức như button, phải có background sweep từ trái sang phải khi hover/focus.
- Button có nền sẵn dùng một sắc độ hover sáng hoặc đậm hơn làm sweep layer.
- Button ban đầu trong suốt và có viền phải có lớp nền nhẹ sweep từ trái sang phải, đồng thời viền đậm/sáng hơn khi hover, giống nút **"Tìm hiểu thêm"** trên HomePage.
- Mọi text button, nav link và inline link phải có underline chạy từ trái sang phải khi hover/focus. Không chỉ đổi màu chữ.
- Không dùng `scale`, bounce hoặc translate cho hover của button và text link.
- Ưu tiên các class `.rogym-btn*`, `.rogym-text-link*`, `.rogym-container`, `.rogym-section*`, `.rogym-card*`, `.rogym-input` thay vì lặp lại inline style hoặc tự gắn event listener để làm animation.
- Khi sửa một component cũ, phần tương tác được chạm tới cũng phải được đưa về đúng rule animation này.

---

## 1. Màu sắc (Color Tokens)

### Primary palette

| Tên               | Giá trị   | Dùng khi                                        |
| ----------------- | --------- | ----------------------------------------------- |
| `G` — Green       | `#06c384` | Nút primary, accent chính, icon highlight       |
| `G-hover`         | `#08d891` | Trạng thái hover của nút Green (sweep layer)    |
| `T` — Teal        | `#42e09e` | Text accent, underline, tag badge, border focus |
| `GD` — Green Dark | `#00492f` | Text trên nền Green (nút primary), badge text   |

### Dark backgrounds

| Tên             | Giá trị               | Dùng khi                                     |
| --------------- | --------------------- | -------------------------------------------- |
| `bg-base`       | `#080e0b`             | Nền chính của toàn trang                     |
| `bg-deep`       | `#030907` / `#040d08` | Footer, section tối nhất                     |
| `bg-card`       | `#0f1c16`             | Card, panel trên nền tối                     |
| `bg-card-hover` | `#132218`             | Card khi hover                               |
| `bg-elevated`   | `#1a2520` / `#1a3326` | Phần tử được nhấc lên (social button, input) |

### Light section (Coach section)

| Tên                   | Giá trị           | Dùng khi               |
| --------------------- | ----------------- | ---------------------- |
| `bg-light`            | `#ffffff`         | Section nền trắng      |
| `text-on-light`       | `#0a0f0e`         | Tiêu đề trên nền trắng |
| `text-on-light-muted` | `rgba(0,0,0,0.5)` | Mô tả trên nền trắng   |

### Text hierarchy (trên nền tối)

| Tên              | Giá trị                  | Dùng khi                          |
| ---------------- | ------------------------ | --------------------------------- |
| `text-primary`   | `#ffffff`                | Tiêu đề chính, chữ nổi bật        |
| `text-secondary` | `#bbcabf`                | Mô tả, body text                  |
| `text-muted`     | `#8ab89c`                | Subtext, footer links             |
| `text-dim`       | `rgba(255,255,255,0.45)` | Placeholder, label thứ yếu        |
| `text-faint`     | `rgba(255,255,255,0.25)` | Footer copyright, footnote        |
| `text-accent`    | `#42e09e` (T)            | Eyebrow label, badge, link active |

### Borders

| Tên                  | Giá trị                       | Dùng khi                       |
| -------------------- | ----------------------------- | ------------------------------ |
| `border-subtle`      | `rgba(255,255,255,0.05–0.08)` | Card, section divider          |
| `border-teal-dim`    | `rgba(66,224,158,0.1)`        | Card border mặc định trên dark |
| `border-teal-hover`  | `rgba(66,224,158,0.4)`        | Card border khi hover          |
| `border-teal-focus`  | `#42e09e`                     | Input focus border             |
| `border-white-dim`   | `rgba(255,255,255,0.1–0.2)`   | Input border mặc định          |
| `border-white-btn`   | `rgba(255,255,255,0.45)`      | Nút outline white (mặc định)   |
| `border-white-hover` | `#ffffff`                     | Nút outline white khi hover    |

---

## 2. Typography

### Font families

| Font               | Dùng khi                                                                                | Import                    |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------- |
| **Anton**          | Section titles lớn (h1, h2 — `clamp`), logo wordmark, số thống kê lớn, giá, tên section | `@import` từ Google Fonts |
| **Be Vietnam Pro** | Tất cả còn lại — body, label, button, nav, caption, input                               | `@import` từ Google Fonts |

> **Quy tắc:** Không dùng Anton cho bất kỳ thứ gì trong màn Login / form / nội dung tương tác. Anton chỉ dùng cho các tiêu đề section lớn ở homepage và logo.

### Type scale

| Role               | Font           | Size                      | Weight  | Màu                                                |
| ------------------ | -------------- | ------------------------- | ------- | -------------------------------------------------- |
| Hero H1            | Anton          | `clamp(64px, 9vw, 118px)` | regular | `#fff` + teal accent                               |
| Section H2         | Anton          | `clamp(48px, 7vw, 96px)`  | regular | `#fff` hoặc `#0a0f0e`                              |
| Card title (small) | Anton          | `34px`                    | regular | `#fff`                                             |
| Tên HLV / giá      | Anton          | `26–52px`                 | regular | theo context                                       |
| Logo wordmark      | Anton          | `18–22px`                 | regular | `#fff`, `letter-spacing: 0.12em`                   |
| Eyebrow label      | Be Vietnam Pro | `12–13px`                 | 700     | `#42e09e`, `letter-spacing: 0.25–0.3em`, uppercase |
| Body / description | Be Vietnam Pro | `14–18px`                 | 400–500 | `#bbcabf` hoặc `rgba(255,255,255,0.4)`             |
| Button text        | Be Vietnam Pro | `13–15px`                 | 600     | theo variant                                       |
| Nav link           | Be Vietnam Pro | `14px`                    | 500     | `#fff`                                             |
| Label / caption    | Be Vietnam Pro | `12–13px`                 | 500     | `rgba(255,255,255,0.55)`                           |
| Footer link        | Be Vietnam Pro | `14px`                    | 400     | `rgba(255,255,255,0.35)`                           |
| Footer category    | Be Vietnam Pro | `12px`                    | 700     | `rgba(255,255,255,0.55)`, uppercase                |

---

## 3. Layout & Spacing

### Container

```
max-width: 1280px
padding-x: 40px (px-10)
margin: 0 auto
```

### Section padding

| Section type          | Padding top/bottom             |
| --------------------- | ------------------------------ |
| Full-height hero      | `pt-24 pb-20` + `min-h-screen` |
| Dark content section  | `py-32` (128px)                |
| Light content section | `py-32` (128px)                |
| CTA banner            | `py-28` (112px)                |
| Footer                | `py-20` (80px)                 |

### Grid

- 2 cột: `grid-cols-1 md:grid-cols-2 gap-8`
- 3 cột: `grid-cols-1 md:grid-cols-3 gap-12` (coach) / `gap-6` (pricing)
- 4 cột: `grid-cols-1 md:grid-cols-4 gap-12` (footer)

---

## 4. Buttons

Tất cả nút đều dùng **pill shape** (`rounded-full`) và animation **sweep từ trái sang phải** (không zoom).

### Cách implement sweep animation

Ưu tiên dùng class global, không tự thêm `mouseenter` / `mouseleave` listener trong component:

```tsx
<button className="rogym-btn rogym-btn--primary rogym-btn--hero">
  Bắt đầu ngay
</button>

<button className="rogym-btn rogym-btn--outline-white rogym-btn--hero">
  Tìm hiểu thêm
</button>
```

Các class global dùng background image rộng gấp đôi phần tử: nửa trái là màu sweep, nửa phải trong suốt. Trạng thái mặc định đặt `background-position: 100% 0`; hover/focus chuyển về `0 0`, khiến màu chạy từ trái sang phải. Các sub-property animation được bảo vệ khỏi inline `background` và Tailwind `transition-*`, nên không cần pseudo-element hay JavaScript listener.

Với `Link`, `NavLink` hoặc phần tử có `role="button"` nhưng không dùng `.rogym-btn`, thêm class `.rogym-sweep`. Text-only control phải dùng `.rogym-text-link` để nhận underline thay vì background sweep. Chỉ dùng `data-no-sweep` cho control đặc biệt có motion riêng và phải ghi rõ lý do.

### Biến thể nút

#### BtnPrimary — Nền xanh lá

```
background:    #06c384
color:         #00492f
sweep:         #08d891
border:        none
shadow:        0 8px 24px -4px rgba(6,195,132,0.3)
padding:       px-10 py-5 (homepage) / py-4 w-full (login)
text:          uppercase, tracking-[0.12–0.15em], font-semibold
```

#### BtnOutlineWhite — Viền trắng (ref: "Tìm hiểu thêm")

```
background:    transparent
color:         #fff
border:        2px solid rgba(255,255,255,0.45)
border-hover:  #fff
sweep:         rgba(255,255,255,0.1)
padding:       px-10 py-5 (homepage) / py-4 w-full (login)
text:          uppercase, tracking-[0.12–0.15em], font-semibold
```

#### BtnOutlineGreen — Viền xanh (ref: "Xem tất cả HLV")

```
background:    transparent → rgba(6,195,132,0.16) (hover)
color:         #00492f (light section) / #06c384 (dark section)
border:        2px solid #00492f → #06c384 (light section)
sweep:         rgba(6,195,132,0.16)
padding:       px-8 py-4
text:          uppercase, tracking-[0.12em], font-semibold
```

Trên section sáng, dùng `.rogym-btn--outline-green-light`. Không đổi text sang trắng trong lúc sweep vì sẽ tạo trạng thái tương phản thấp trên phần nền chưa được phủ.

#### NavBtn Green (topbar)

```
background:    #06c384
color:         #fff
sweep:         #08d891
padding:       px-5 py-2
border-radius: rounded-full
text:          text-sm font-semibold (không uppercase)
```

#### NavBtn Outline (topbar)

```
background:    transparent → rgba(255,255,255,0.1) (hover)
color:         #fff
border:        1.5px solid rgba(255,255,255,0.6) → #fff (hover)
padding:       px-5 py-2
border-radius: rounded-full
text:          text-sm font-semibold
```

#### Pricing button (dark card)

```
background:    transparent
color:         #fff
border:        1px solid rgba(255,255,255,0.3) → rgba(66,224,158,0.4) (hover)
sweep:         rgba(255,255,255,0.1)
padding:       w-full py-4
```

#### Pricing button (highlighted green card)

```
background:    #00492f → #005a3a (hover)
color:         #fff
sweep:         #005a3a
padding:       w-full py-4
```

---

## 5. Links (Text buttons / inline links)

Không zoom, không đổi màu đột ngột. Dùng underline trượt từ trái.

### TextLink (active — trắng, dùng ở login form)

```
color:          #fff
font:           13px, weight 600
underline:      height 1.5px, color #42e09e
transition:     width 0.28s cubic-bezier(0.4,0,0.2,1)
```

```tsx
<button className="relative inline-flex group" style={{ color: "#fff", ... }}>
  {children}
  <span
    className="absolute bottom-[-2px] left-0 h-[1.5px] w-0 group-hover:w-full rounded-full"
    style={{ background: T, transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)" }}
  />
</button>
```

### MutedLink (thứ yếu — "Quên mật khẩu?")

```
color:          rgba(255,255,255,0.4)
font:           13px, weight 500
underline:      height 1.5px, color rgba(255,255,255,0.4)
```

### Nav link (topbar)

```
color:          #fff (từ đầu)
underline:      height 2px, color #fff
CSS class:      .rogym-text-link .rogym-text-link--nav
```

```css
.rogym-text-link::after {
  content: "";
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--rogym-teal);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 9999px;
}
.rogym-text-link:hover::after,
.rogym-text-link:focus-visible::after {
  transform: scaleX(1);
}
```

> **BẮT BUỘC:** Rule underline này áp dụng cho cả desktop nav, mobile nav, text button, link trong form, footer link có tương tác và mọi link mới. Với topbar HomePage, underline dùng màu trắng; inline/action link dùng `T`.

---

## 6. Input Fields

```
background:     rgba(255,255,255,0.06)
background-focus: rgba(66,224,158,0.05)
border:         1px solid rgba(255,255,255,0.1)
border-focus:   1px solid #42e09e
border-radius:  rounded-xl (12px)
color:          #fff
placeholder:    rgba(255,255,255,0.2)
padding:        py-3, pl-10 (với icon), pr-14 (với right icon)
font:           Be Vietnam Pro 14px
icon-color:     rgba(255,255,255,0.25) → #42e09e (focused)
label:          13px, weight 500, rgba(255,255,255,0.55)
```

---

## 7. Cards

### Dark content card (Training, Pricing)

```
background:     #0f1c16
border:         1px solid rgba(66,224,158,0.1) → rgba(66,224,158,0.4) hover
border-radius:  rounded-[40px]
shadow-hover:   0 24px 56px -12px rgba(6,195,132,0.2)
transition:     border 0.3s, box-shadow 0.35s
```

### Glass card (Login)

```
background:     rgba(12,22,17,0.82)
border:         1px solid rgba(255,255,255,0.08)
border-radius:  rounded-2xl (16px)
backdrop-filter: blur(28px)
shadow:         0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)
```

### Coach photo card

```
border-radius:  rounded-[40px]
border:         1px solid rgba(0,0,0,0.06) → 1px solid #42e09e hover
shadow-hover:   0 16px 40px rgba(6,195,132,0.15)
aspect-ratio:   4/5
image hover:    scale(1.05), transition 0.5s
```

### Mini feature card (extra programs)

```
background:     #0f1c16 → #132218 hover
border:         1px solid rgba(66,224,158,0.1) → rgba(66,224,158,0.4) hover
border-radius:  rounded-2xl (16px)
padding:        p-6
icon wrapper:   w-10 h-10, rounded-xl, bg rgba(66,224,158,0.12)
```

---

## 8. Backgrounds & Overlays

### Full-bleed section backgrounds

```
Dark base:       background: #080e0b
Dark deep:       background: #040d08 hoặc #030907
Light:           background: #ffffff
```

### Radial glow (subtle)

```css
/* Dùng trên dark sections để tạo depth */
background: radial-gradient(
  ellipse 50–60% 40–55% at 50% 50%,
  rgba(6, 195, 132, 0.06–0.1) 0%,
  transparent 70%
);
```

### Photo background với overlay

```
1. Ảnh: filter brightness(0.4) saturate(0.75)
2. Overlay gradient ngang: linear-gradient(95deg, rgba(8,14,11,0.95) 0%, rgba(8,14,11,0.55) 60%, transparent 100%)
3. Overlay gradient dọc (shadow đáy): linear-gradient(0deg, rgba(8,14,11,0.7) 0%, transparent 50%)
```

### Photo background mờ (Login)

```
filter: blur(10px) brightness(0.28) saturate(0.55)
transform: scale(1.06)  /* tránh viền trắng */
```

### Section divider subtle

```
border-top: 1px solid rgba(255,255,255,0.04)
border-bottom: 1px solid rgba(255,255,255,0.04)
```

---

## 9. Navbar

```
height:           h-16 (64px)
position:         fixed, top-0, z-50
default:          transparent, no border
scrolled:         rgba(8,14,11,0.92), backdrop-blur(16px), border-bottom 1px solid rgba(66,224,158,0.08)
transition:       all 500ms
max-width:        1280px, px-10
```

**Cấu trúc:** Logo | Nav links (center) | Auth buttons (right)

**Logo:** Icon 32×32 rounded-lg nền G + Anton wordmark 20px

**Nav links:** Be Vietnam Pro 14px, màu `#fff`, dùng `.rogym-text-link .rogym-text-link--nav`

**Auth buttons:** NavBtn Green (Đăng nhập) + NavBtn Outline (Đăng ký)

---

## 10. Sections & Eyebrow pattern

Mọi content section đều bắt đầu bằng **eyebrow label** rồi đến **section title**.

```tsx
{
  /* Eyebrow */
}
<div
  style={{
    fontSize: 12,
    fontWeight: 700,
    color: T,
    letterSpacing: "0.28–0.3em",
    textTransform: "uppercase",
  }}
>
  LABEL NGẮN
</div>;

{
  /* Title */
}
<h2
  style={{
    fontFamily: "'Anton',sans-serif",
    fontSize: "clamp(48px,7vw,96px)",
    color: "#fff",
    lineHeight: 0.95,
    textTransform: "uppercase",
  }}
>
  TIÊU ĐỀ SECTION
</h2>;
```

### Accent bar (section header)

```tsx
<div
  className="h-1 w-32 rounded-full"
  style={{ background: T }}
/>
```

Dùng để kết thúc phần header của section tối, đặt ở góc phải hoặc dưới tiêu đề.

---

## 11. Tags / Badges

```
background:    #42e09e (T)
color:         #080e0b
border-radius: rounded-full
padding:       px-4 py-1
font:          Be Vietnam Pro, 12px, weight 700, uppercase, tracking-[0.15em]
```

---

## 12. Feature Marquee bar

```
background:    #06c384
py-5, border-y (rgba(0,0,0,0.1))
animation:     rogym-marquee-left 22s linear infinite (2 group giống hệt nhau)
items:         icon + text, gap-3, color #00492f, tracking-[0.18em], font-bold
```

Marquee phải bọc nội dung trong hai `.rogym-marquee__group` có cùng kích thước và animate `.rogym-marquee__track` từ `translate3d(0,0,0)` đến `translate3d(-50%,0,0)`. Không trải phẳng các item rồi dịch theo `-33.333%`, vì khoảng `gap` giữa các bản sao làm điểm lặp bị lệch. Hover/focus tạm dừng track.

---

## 13. Divider (trong form / card)

```tsx
<div className="flex items-center gap-3">
  <div
    className="flex-1 h-px"
    style={{ background: "rgba(255,255,255,0.08)" }}
  />
  <span
    style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}
  >
    label
  </span>
  <div
    className="flex-1 h-px"
    style={{ background: "rgba(255,255,255,0.08)" }}
  />
</div>
```

---

## 14. Icons

Dùng **lucide-react** cho tất cả icon. Không dùng emoji.

| Context                 | Size    | strokeWidth | Color                                          |
| ----------------------- | ------- | ----------- | ---------------------------------------------- |
| Nav / logo              | 16px    | 2.2         | `#fff`                                         |
| Card icon background    | 20px    | 2           | `#42e09e`                                      |
| Input prefix            | 15px    | 2           | `rgba(255,255,255,0.25)` → `#42e09e` khi focus |
| Button icon             | 14–15px | 2           | theo màu text button                           |
| Footer social           | 14px    | 2           | `rgba(255,255,255,0.6)`                        |
| Form icon (Mail, Lock…) | 24px    | 1.5         | `#42e09e` (icon lớn trong card)                |

---

## 15. Animation & Interaction Rules

| Pattern          | Rule                                                       |
| ---------------- | ---------------------------------------------------------- |
| Nút hover        | Sweep từ trái sang phải, `0.38s cubic-bezier(0.4,0,0.2,1)` |
| Link hover       | Underline trượt từ trái, `0.28s cubic-bezier(0.4,0,0.2,1)` |
| Card hover       | Border sáng lên + box-shadow, `0.3–0.35s ease`             |
| Image trong card | `scale(1.05)` smooth, `0.5–0.7s ease`                      |
| Section fade     | Không zoom, chỉ màu + border                               |
| Navbar scroll    | `transition: all 500ms`                                    |
| **Không dùng**   | `scale` trên button / text, bounce, slide-up               |

> **Motion contract:** Mọi file mới hoặc file được chỉnh sửa phải giữ đúng hai interaction cốt lõi: button sweep trái → phải và text-link underline trái → phải. Button outline phải đồng thời tăng độ rõ của border khi hover/focus.

Media card dùng `.rogym-media-card`, ảnh dùng `.rogym-media-card__image`, và frame ảnh dùng `.rogym-media-card__frame`. Không điều khiển hover ảnh bằng React state hoặc inline `mouseenter` / `mouseleave`. Khi hover/focus trong card, ảnh scale và text action bên trong phải animate đồng thời.

### Reduced motion

Khi `prefers-reduced-motion: reduce`, dừng animation decorative không mang thông tin và smooth scroll. Feature marquee chứa thông tin quan trọng nên vẫn chạy chậm hơn ở `40s`, đồng thời cho phép pause khi hover/focus. Không được dùng rule global đặt mọi `transition-duration` về gần `0ms`, vì như vậy button sweep, text underline và feedback hover sẽ trông như bị hỏng. Interaction feedback vẫn chạy ngắn hơn; image hover giảm từ `scale(1.05)` xuống `scale(1.02)`.

---

## 16. Màn Login / Auth — quy tắc riêng

- **Không dùng Anton** cho bất kỳ text nào trong card (trừ logo wordmark)
- Tất cả heading trong card: Be Vietnam Pro 22px, weight 700
- Card: glass morphism (backdrop-blur 28px, background rgba tối)
- Logo ở trên card, ngoài card
- Nền: ảnh gym blur mờ + overlay tối
- Nút back "Trang chủ": MutedLink style với ArrowLeft icon
- Spacing giữa các field: `gap-4–5`

---

## 17. Checklist khi tạo màn mới

- [ ] File mới hoặc file vừa chỉnh sửa tuân theo toàn bộ `design.md`
- [ ] Dùng token / class trong `src/styles/globals.css`, không tạo palette cục bộ trùng lặp
- [ ] Dùng `max-w-[1280px] mx-auto px-10` cho container
- [ ] Section dark → `background: #080e0b`, section light → `bg-white`
- [ ] Tiêu đề lớn → Anton, uppercase, `lineHeight: 0.95`
- [ ] Body / UI text → Be Vietnam Pro
- [ ] Mọi nút → `rounded-full` + background sweep trái sang phải
- [ ] Nút outline → nền hover nhẹ sweep trái sang phải + border đậm/sáng hơn
- [ ] Mọi text button / nav / inline link → underline chạy trái sang phải, không zoom
- [ ] Input → `rounded-xl`, focus border `#42e09e`
- [ ] Card → `rounded-[40px]` (lớn) hoặc `rounded-2xl` (nhỏ), border `rgba(66,224,158,0.1)`
- [ ] Icons → lucide-react, không dùng emoji
- [ ] Không thêm `transform: scale` vào hover của text hay button
- [ ] Tham khảo màu từ bảng Color Tokens phía trên, không tự đặt màu mới
