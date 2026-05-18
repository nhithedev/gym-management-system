# Gym Portal UI Style Guide (All Roles)

Tai lieu nay la quy chuan UI chung cho 4 role: member, staff, trainer, owner.  
Muc tieu la de tat ca man hinh moi deu co cung mot he thong typography, spacing, sidebar, card, button va scrollbar.

---

## 1) Scope va Nguyen tac

- Mot he thong typography cho tat ca role, khong role nao tu dat size rieng.
- Sidebar, card, button, page header phai theo mot bo size co dinh.
- Uu tien class tai `globals.css` thay vi inline style cho `font-size`, `font-weight`, `border-radius`, `padding`.
- Uu tien tai su dung component chung nhu `SectionHeader`, `Sidebar`, `DashboardLayout`.
- Scrollbar cua sidebar va content area phai dong bo cung mot style.

---

## 2) Typography Scale (Bat buoc)

- Page title (H1): 2.25rem (36px) mobile, 3rem (48px) desktop
  - Class: `member-page-title`
- Page subtitle / page description: 1.125rem (18px), line-height thoang
  - Class: `member-page-subtitle`
- Card title level 1: 1.25rem (20px)
  - Class: `member-card-title`
- Card title level 2 (section quan trong): 1.5rem (24px)
  - Class: `member-card-title text-2xl`
- Body default: 1rem (16px)
- Meta text / label: 0.875rem (14px)
  - Class: `member-card-label`
- Sidebar item text: 0.875rem (14px)
  - Tat ca item Dashboard, section item, footer item phai dong nhat `text-sm`

### Quy tac

- Khong dung inline style de set font-size rieng cho tung page.
- Khong cho Dashboard item to hon cac item sidebar khac.
- Neu can title card lon hon, dung `member-card-title text-2xl` thay vi tu set size moi.

---

## 3) Section Header Pattern

Dung pattern giong homepage section 2/4.

### Cau truc

- Ben trai: title
- Ben phai: divider line + description ngan
- Desktop: header nam tren 1 hang
- Mobile: cho phep xep thanh 2 dong

### Page variant

- Title: 2.25rem / 3rem, uppercase, weight 600
- Description: 0.75rem, uppercase, tracking rong
- Divider line: `bg-outline-variant/30`
- Dung cho tieu de man hinh cap cao

### Section variant

- Title: 1.5rem (24px), uppercase, weight 600
- Description: 0.75rem, uppercase, tracking rong
- Divider line: `bg-outline-variant/95`
- Dung cho tieu de khoi con trong form hoac card lon

### Component khuyen dung

- Dung `SectionHeader` cho tat ca man hinh trong 4 role
- `variant="page"` cho header man hinh chinh
- `variant="section"` cho tieu de khoi con
- `description` la optional; page nao can thi truyen, khong can thi bo qua

---

## 4) Sidebar Rules (All Roles)

- Sidebar item text luon la `text-sm`
- Dashboard item khong duoc to hon cac nav item khac
- Section title va section items giu cung nhip spacing
- Footer item (profile, logout, account menu) cung dung scale `text-sm`
- Khi collapse:
  - Sidebar chi con icon
  - Neu dang o route con, icon cua section cha phai duoc active
- Scrollbar trong sidebar va content area phai dung cung class scrollbar chung

### Thu tu labels theo role

- Member: Dashboard, Goi tap, Lich su tap luyen, Tien do, Phan hoi
- Staff: Dashboard, Van hanh, Ho tro
- Trainer: Dashboard, Hoc vien, Lich day, Tien do, Diem danh
- Owner: Dashboard, Quan tri, Kinh doanh

---

## 5) Scrollbar System

Dung chung 1 class tai `globals.css` cho cac vung co scroll, khong viet lai tung noi.

### Class chuan

- Class: `app-scrollbar`

### Quy tac style

- Scrollbar phai mong, dong nhat cho ca vertical va horizontal
- Khong bo goc
- Khong co arrow buttons
- Mau theo tone sidebar hien tai: track toi, thumb vang-nau am
- Sidebar nav va content main deu phai gan class nay neu la scroll container

### Vi tri ap dung

- Sidebar: `nav.app-scrollbar`
- Dashboard layout: `main.app-scrollbar`
- Cac bang, panel, modal co overflow rieng neu can dong bo cung gan `app-scrollbar`

### Mau tham chieu

- Track: `#121414`
- Thumb: `#7b6a4d`
- Thumb hover: `#9a855f`

---

## 6) Card System

### Card chuan

- Class: `member-card`
- Radius: 1.75rem
- Border: `#4d4635`
- Background: `#1a1a1a`

### Inner panel trong card

- Background: `#121414`
- Radius: `xl`

### Quy tac

- Uu tien dung class card chung thay vi tu set border/radius moi
- Card title cach content ben duoi bang `mb-4` hoac `mb-6` tuy cap do
- Khong tao them he card rieng cho tung role neu khong that su can thiet

---

## 7) Button System

### Button classes

- Uu tien dung class button chung trong `globals.css`
- Co the co nhieu variant mau khac nhau, nhung tat ca button phai theo cung mot he thong state
- Font button: 600
- Text can giua
- Shape mac dinh theo class cua tung button, nhung state phai dong bo

### Quy tac chung cho tat ca button

Ap dung cho moi loai button trong he thong:
- primary
- secondary
- outline
- ghost
- destructive
- button trong form
- button trong card
- button trong sidebar dropdown hoac panel action

Tat ca button deu phai co it nhat cac state sau:
- Default
- Hover
- Focus
- Active / Pressed
- Disabled
- Loading (neu co submit async)

### Default state

- Button phai trong dang click duoc, ro rang la interactive
- Typography, spacing, radius, border va background phai on dinh
- Khong dung glow effect mac dinh
- Khong lam button qua "phang" den muc khong nhan ra la co the bam

### Hover state

- Bat buoc phai khac nhe so voi default state
- Su khac biet co the den tu mot hoac nhieu yeu to sau:
  - background doi nhe
  - border doi nhe
  - text doi nhe
  - them hoac giam shadow rat nhe
  - translate-y rat nho
  - opacity thay doi nhe
- Khong dung glow effect manh
- Khong dung animation gay mat tap trung
- Hover chi can du de nguoi dung nhan ra button dang duoc tro vao

### Focus state

- Phai co dau hieu ro rang cho keyboard navigation
- Uu tien dung focus ring hoac outline nhin thay duoc tren nen sang va toi
- Khong duoc xoa focus state neu khong co thay the tuong duong

### Active / Pressed state

- Phai cho cam giac button dang duoc bam
- Co the dung background dam hon nhe, translate xuong rat it, hoac giam shadow
- Active state phai ngan gon va khong gay nham voi disabled state

### Disabled state

- Button khong duoc trong giong hover hay active
- Giam do noi bat, giam contrast hoac opacity hop ly
- Cursor va visual feedback phai the hien rang button khong bam duoc

### Loading state

- Khong lam button nhay layout
- Neu co icon loading, icon dat truoc label va giu can chinh deu
- Loading state van phai giu dung kich thuoc button

### Interaction consistency

- Tat ca button trong he thong, bat ke mau gi, deu phai co hover state nhin khac default state
- Muc do khac biet chi can nhe, nhung phai nhan ra duoc
- Khong role nao tu dat mot kieu hover hoan toan khac he thong neu khong co ly do dac biet
- Uu tien transition nhe, ngan, nhat quan tren toan bo portal

### Quy tac implementation

- Uu tien extract thanh class nhu `btn-primary`, `btn-outline`, `btn-ghost`, `btn-danger`...
- Khong viet lai mot chuoi utility dai cho moi button neu da co class chung
- Neu button can `w-full`, `justify-center`, `px` rieng theo context thi do la layout modifier, khong phai button style goc

### Mau reference

```tsx
<button className="btn-primary">Hanh dong chinh</button>
<button className="btn-outline">Hanh dong phu</button>
<button className="btn-danger">Xoa</button>
```

```tsx
<button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
  {isSubmitting ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : null}
  Đăng nhập
</button>
```

---

## 8) Layout Grid va Spacing

### Khung trang chuan

- `p-4 sm:p-6 lg:p-8`
- `max-w-7xl mx-auto`

### Spacing chuan

- Khoang cach page header toi content: `mb-8`
- Khoang cach section lon: `mb-8`
- Khoang cach card title toi content: `mb-4` hoac `mb-6`
- Grid content uu tien layout on dinh, tranh lam page dai khong can thiet

### Quy tac

- Uu tien rut gon content de han che scroll khong can thiet
- Neu page bi trong qua, uu tien can bang bang header/description/card meta ngan thay vi tang padding vo ly
- Nen page va content area phai fill het viewport, khong de lo nen khac mau o cuoi man hinh

---

## 9) Quy tac ap dung cho file moi (4 role)

1. Dung page header theo scale o muc Typography
2. Dung `SectionHeader` thay vi tu viet title block moi
3. Dung card system chuan, khong tu set radius/border moi neu khong can thiet
4. Dung button system chuan cho hanh dong chinh/phu
5. Sidebar item text luon `text-sm`, khong co item dac biet to hon
6. Neu can title card lon hon, dung `member-card-title text-2xl`
7. Vung nao co scroll rieng thi gan `app-scrollbar`

---

## 10) Mau skeleton

```tsx
<div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
  <SectionHeader
    title="Ten man hinh"
    description="Mo ta ngan"
    variant="page"
  />

  <section className="member-card mb-6">
    <h2 className="member-card-title mb-4">Tieu de card</h2>
    <p className="member-card-label">Label</p>
    <p className="member-card-value">Gia tri</p>

    <div className="mt-6 flex gap-3">
      <button className="member-btn-outline">Hanh dong phu</button>
      <button className="member-btn-primary">Hanh dong chinh</button>
    </div>
  </section>
</div>
```



---

## 11) Checklist truoc khi merge

- Sidebar Dashboard da cung size voi cac item khac chua?
- Sidebar/footer items da dong nhat `text-sm` chua?
- Card title da dung `member-card-title` hoac `member-card-title text-2xl` chua?
- Con inline style `font-size` / `font-weight` / `radius` khong?
- Header page cua tat ca role da dung cung scale chua?
- Scrollbar cua sidebar va content da cung class `app-scrollbar` chua?
- Mobile va desktop da giu dung spacing/grid chuan chua?
- Nen content da fill het viewport, khong lo khoang mau den/cuoi trang chua?
- Tat ca button da co hover state nhin khac default state chua?