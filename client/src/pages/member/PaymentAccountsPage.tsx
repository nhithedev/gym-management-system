import { useEffect, useState } from 'react'
import { Trash2, Star, Check, Wallet } from 'lucide-react'
import paymentAccountService, { type PaymentAccount, type CreatePaymentAccountPayload } from '@/services/paymentAccount.service'
import { type PaymentMethod } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from './components/MemberUI'
import {
  getPaymentMethodLabel,
  maskPaymentAccountRef,
  PAYMENT_METHOD_OPTIONS,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'

const G = '#06c384'
const T = '#42e09e'

function InputField({
  label, placeholder, value, onChange,
}: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-[var(--rogym-text-dim)] mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rogym-input w-full"
      />
    </div>
  )
}

export default function PaymentAccountsPage() {
  const { user } = useAuthStore()

  const [accounts, setAccounts]   = useState<PaymentAccount[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const [type, setType]             = useState<PaymentMethod>('bank_card')
  const [provider, setProvider]     = useState('')
  const [accountRef, setAccountRef] = useState('')
  const [label, setLabel]           = useState('')
  const [isDefault, setIsDefault]   = useState(false)

  useEffect(() => {
    if (!user?.memberId) return
    paymentAccountService.list(user.memberId)
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [user?.memberId])

  function resetForm() {
    setType('bank_card')
    setProvider('')
    setAccountRef('')
    setLabel('')
    setIsDefault(false)
    setFormError(null)
  }

  async function handleSave() {
    if (!user?.memberId) return
    const payload: CreatePaymentAccountPayload = { type, isDefault }
    if (type === 'bank_card') { payload.provider = provider; payload.accountRef = accountRef }
    if (type === 'ewallet')   { payload.provider = provider; payload.accountRef = accountRef }
    if (label.trim()) payload.label = label.trim()

    setSaving(true)
    setFormError(null)
    setFormSuccess(false)
    try {
      const created = await paymentAccountService.create(user.memberId, payload)
      if (isDefault) {
        setAccounts(prev => [created, ...prev.map(a => ({ ...a, isDefault: false }))])
      } else {
        setAccounts(prev => [...prev, created])
      }
      resetForm()
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    } catch {
      setFormError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(accountId: number) {
    if (!user?.memberId) return
    await paymentAccountService.remove(user.memberId, accountId)
    setAccounts(prev => prev.filter(a => a.accountId !== accountId))
  }

  function handleSetDefault(accountId: number) {
    if (!user?.memberId) return
    setAccounts(prev => prev.map(a => ({ ...a, isDefault: a.accountId === accountId })))
    paymentAccountService.setDefault(user.memberId, accountId).catch(() => {})
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Thanh toán"
        title="Tài khoản thanh toán"
        description="Quản lý các phương thức thanh toán đã lưu."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── LEFT: accounts list ── */}
        <div>
          {loading ? (
            <MemberSkeleton rows={3} />
          ) : accounts.length === 0 ? (
            <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center py-14 gap-3">
              <Wallet size={36} className="text-[var(--rogym-text-faint)]" />
              <p className="text-sm text-[var(--rogym-text-secondary)]">Chưa có tài khoản nào được lưu</p>
              <p className="text-xs text-[var(--rogym-text-dim)] text-center max-w-xs">
                Thêm tài khoản để điền nhanh khi thanh toán gói tập
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {accounts.map(acc => (
                <div
                  key={acc.accountId}
                  className="rogym-card rogym-card--compact px-5 py-4 flex items-center gap-4"
                  style={{ border: acc.isDefault ? `1px solid ${G}44` : undefined }}
                >
                  <div style={{ color: T, flexShrink: 0 }}>
                    <PaymentMethodIcon method={acc.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {acc.label || acc.provider || getPaymentMethodLabel(acc.type)}
                      </p>
                      {acc.isDefault && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${G}22`, color: G, border: `1px solid ${G}33` }}>
                          <Star size={9} fill="currentColor" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">
                      {getPaymentMethodLabel(acc.type)}
                      {acc.provider && acc.provider !== acc.label ? ` · ${acc.provider}` : ''}
                      {acc.accountRef ? ` · ${maskPaymentAccountRef(acc.accountRef)}` : ''}
                    </p>
                  </div>

                  {!acc.isDefault && (
                    <button
                      onClick={() => handleSetDefault(acc.accountId)}
                      title="Đặt làm mặc định"
                      className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}
                    >
                      <Star size={15} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(acc.accountId)}
                    title="Xoá"
                    className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: quick add card ── */}
        <div className="rogym-card rogym-card--compact p-6 flex flex-col gap-4 xl:self-start">
          <h3 className="text-base font-bold text-white">
            Thêm tài khoản mới
          </h3>

          {/* Type selector */}
          <div className="flex gap-2">
            {PAYMENT_METHOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all"
                style={{
                  border: type === opt.value ? `1.5px solid ${G}` : '1px solid rgba(255,255,255,0.1)',
                  background: type === opt.value ? `${G}18` : 'transparent',
                  color: type === opt.value ? G : 'var(--rogym-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <opt.Icon size={16} />{opt.label}
              </button>
            ))}
          </div>

          {type === 'bank_card' && (
            <>
              <InputField label="Tên ngân hàng" placeholder="Vietcombank, BIDV, Techcombank..." value={provider} onChange={setProvider} />
              <InputField label="Số tài khoản" placeholder="1234567890" value={accountRef} onChange={setAccountRef} />
            </>
          )}
          {type === 'ewallet' && (
            <>
              <InputField label="Ví điện tử" placeholder="MoMo, ZaloPay, VNPay..." value={provider} onChange={setProvider} />
              <InputField label="Số điện thoại" placeholder="0912 345 678" value={accountRef} onChange={setAccountRef} />
            </>
          )}

          <InputField label="Tên hiển thị (tuỳ chọn)" placeholder="VD: Thẻ chính, Ví cá nhân..." value={label} onChange={setLabel} />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setIsDefault(v => !v)}
              className="flex items-center justify-center rounded transition-all shrink-0"
              style={{
                width: 18, height: 18, borderRadius: 4,
                border: isDefault ? `1.5px solid ${G}` : '1.5px solid rgba(255,255,255,0.2)',
                background: isDefault ? `${G}22` : 'transparent',
              }}
            >
              {isDefault && <Check size={11} style={{ color: G }} />}
            </div>
            <span className="text-sm text-[var(--rogym-text-secondary)]">Đặt làm tài khoản mặc định</span>
          </label>

          {formError && <p className="text-xs text-red-300">{formError}</p>}
          {formSuccess && <p className="text-xs" style={{ color: G }}>Tài khoản đã được thêm.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rogym-btn rogym-btn--primary w-full justify-center mt-1"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
          </button>
        </div>
      </div>
    </MemberPage>
  )
}
