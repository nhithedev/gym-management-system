import { useEffect, useState } from 'react'
import { Banknote, CreditCard, Wallet, Plus, Trash2, Star, X, Check } from 'lucide-react'
import paymentAccountService, { type PaymentAccount, type CreatePaymentAccountPayload } from '@/services/paymentAccount.service'
import { type PaymentMethod } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'

const G  = '#06c384'
const T  = '#42e09e'
const BG = '#0f1c16'

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',      label: 'Tiền mặt',      icon: <Banknote size={16} /> },
  { value: 'bank_card', label: 'Thẻ ngân hàng', icon: <CreditCard size={16} /> },
  { value: 'ewallet',   label: 'Ví điện tử',    icon: <Wallet size={16} /> },
]

function methodIcon(type: PaymentMethod) {
  if (type === 'bank_card') return <CreditCard size={18} />
  if (type === 'ewallet')   return <Wallet size={18} />
  return <Banknote size={18} />
}

function methodLabel(type: PaymentMethod) {
  return METHOD_OPTIONS.find(m => m.value === type)?.label ?? type
}

function maskRef(ref: string | null) {
  if (!ref) return ''
  if (ref.length <= 4) return ref
  return '••••' + ref.slice(-4)
}

function InputField({
  label, placeholder, value, onChange,
}: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 5, display: 'block', fontFamily: "'Be Vietnam Pro',sans-serif" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', borderRadius: 10, padding: '9px 12px',
          border: focused ? `1px solid ${T}` : '1px solid rgba(255,255,255,0.1)',
          background: focused ? 'rgba(66,224,158,0.05)' : 'rgba(255,255,255,0.04)',
          color: '#fff', fontSize: 14, fontFamily: "'Be Vietnam Pro',sans-serif",
          outline: 'none', transition: 'border-color 150ms, background 150ms', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function PaymentAccountsPage() {
  const { user } = useAuthStore()

  const [accounts, setAccounts]     = useState<PaymentAccount[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  const [type, setType]         = useState<PaymentMethod>('bank_card')
  const [provider, setProvider] = useState('')
  const [accountRef, setAccountRef] = useState('')
  const [label, setLabel]       = useState('')
  const [isDefault, setIsDefault] = useState(false)

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
    try {
      const created = await paymentAccountService.create(user.memberId, payload)
      if (isDefault) {
        setAccounts(prev => [created, ...prev.map(a => ({ ...a, isDefault: false }))])
      } else {
        setAccounts(prev => [...prev, created])
      }
      setShowForm(false)
      resetForm()
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

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", maxWidth: 640 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: '#fff', marginBottom: 2 }}>
            Tài khoản thanh toán
          </h1>
          <p style={{ fontSize: 13, color: '#bbcabf' }}>Quản lý các phương thức thanh toán đã lưu</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: G, color: '#00492f', border: 'none',
              borderRadius: 999, padding: '8px 16px', fontSize: 13,
              fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif",
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Thêm mới
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div
          className="rounded-2xl p-6 mb-4 flex flex-col gap-4"
          style={{ background: BG, border: `1px solid ${G}44` }}
        >
          <div className="flex items-center justify-between">
            <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 15, color: '#fff' }}>Thêm tài khoản mới</h3>
            <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbcabf' }}>
              <X size={16} />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {METHOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                style={{
                  flex: 1, borderRadius: 10, padding: '9px 8px',
                  border: type === opt.value ? `1.5px solid ${G}` : '1px solid rgba(255,255,255,0.1)',
                  background: type === opt.value ? `${G}18` : 'transparent',
                  color: type === opt.value ? G : '#bbcabf',
                  fontSize: 12, fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 150ms',
                }}
              >
                {opt.icon}{opt.label}
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setIsDefault(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: isDefault ? `1.5px solid ${G}` : '1.5px solid rgba(255,255,255,0.2)',
                background: isDefault ? `${G}22` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
              }}
            >
              {isDefault && <Check size={11} style={{ color: G }} />}
            </div>
            <span style={{ fontSize: 13, color: '#bbcabf' }}>Đặt làm tài khoản mặc định</span>
          </label>

          {formError && <p style={{ fontSize: 12, color: '#f87171' }}>{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              style={{
                flex: 1, borderRadius: 999, padding: '9px 0', fontSize: 13, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#bbcabf', cursor: 'pointer', fontFamily: "'Be Vietnam Pro',sans-serif",
              }}
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1, borderRadius: 999, padding: '9px 0', fontSize: 13, fontWeight: 600,
                background: saving ? '#1a2d22' : G, color: saving ? '#4a6654' : '#00492f',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Be Vietnam Pro',sans-serif",
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
            </button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse rounded-2xl" style={{ height: 68, background: `${BG}99` }} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-14 gap-3"
          style={{ background: BG, border: '1px solid rgba(66,224,158,0.06)' }}
        >
          <Wallet size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
          <p style={{ fontSize: 14, color: '#bbcabf' }}>Chưa có tài khoản nào được lưu</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 280 }}>
            Thêm tài khoản để điền nhanh khi thanh toán gói tập
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map(acc => (
            <div
              key={acc.accountId}
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{
                background: BG,
                border: acc.isDefault ? `1px solid ${G}44` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ color: T, flexShrink: 0 }}>{methodIcon(acc.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                    {acc.label || acc.provider || methodLabel(acc.type)}
                  </p>
                  {acc.isDefault && (
                    <span style={{ fontSize: 10, background: `${G}22`, color: G, borderRadius: 999, padding: '1px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={9} /> Mặc định
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#bbcabf', marginTop: 2 }}>
                  {methodLabel(acc.type)}
                  {acc.provider && acc.provider !== acc.label ? ` · ${acc.provider}` : ''}
                  {acc.accountRef ? ` · ${maskRef(acc.accountRef)}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(acc.accountId)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4, flexShrink: 0, transition: 'color 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                title="Xoá"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
