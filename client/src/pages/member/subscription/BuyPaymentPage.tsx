import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Banknote, CreditCard, Wallet, ArrowLeft, Landmark, Phone, WalletCards, Trash2, Check, Hash,
} from 'lucide-react'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import paymentAccountService, { type PaymentAccount } from '@/services/paymentAccount.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

const G  = '#06c384'
const T  = '#42e09e'
const BG = '#0f1c16'

function fmtVND(v: number | string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v))
}

interface PayState {
  packageId: string
  packageName: string
  price: number
  durationDays: number
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',      label: 'Tiền mặt',      icon: <Banknote size={18} /> },
  { value: 'bank_card', label: 'Thẻ ngân hàng', icon: <CreditCard size={18} /> },
  { value: 'ewallet',   label: 'Ví điện tử',    icon: <Wallet size={18} /> },
]

function methodIcon(type: PaymentMethod) {
  if (type === 'bank_card') return <CreditCard size={15} />
  if (type === 'ewallet')   return <Wallet size={15} />
  return <Banknote size={15} />
}

function maskRef(ref: string | null) {
  if (!ref) return ''
  if (ref.length <= 4) return ref
  return '••••' + ref.slice(-4)
}

function MethodBtn({
  opt, selected, onClick,
}: {
  opt: typeof METHOD_OPTIONS[number]; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 12, padding: '12px 16px',
        border: selected ? `1.5px solid ${G}` : '1px solid rgba(255,255,255,0.1)',
        background: selected ? `${G}18` : 'transparent',
        display: 'flex', alignItems: 'center', gap: 10,
        color: selected ? G : '#bbcabf',
        fontSize: 14, fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 500,
        cursor: 'pointer', transition: 'all 150ms', width: '100%',
      }}
    >
      {opt.icon}{opt.label}
    </button>
  )
}

function InputField({
  label, placeholder, value, onChange, icon,
}: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void
  icon?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused ? T : 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', borderRadius: 10,
            padding: `10px ${icon ? '12px 10px 38px' : '10px 12px'}`,
            paddingLeft: icon ? 38 : 12,
            border: focused ? `1px solid ${T}` : '1px solid rgba(255,255,255,0.1)',
            background: focused ? 'rgba(66,224,158,0.05)' : 'rgba(255,255,255,0.05)',
            color: '#fff', fontSize: 14, fontFamily: "'Be Vietnam Pro',sans-serif",
            outline: 'none', transition: 'border-color 150ms, background 150ms',
          }}
        />
      </div>
    </div>
  )
}

export default function BuyPaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as PayState | null

  const { user } = useAuthStore()
  const { setHasActiveSub } = useSubscriptionStore()

  const [method, setMethod]           = useState<PaymentMethod>('cash')
  const [bankName, setBankName]       = useState('')
  const [accountNo, setAccountNo]     = useState('')
  const [provider, setProvider]       = useState('')
  const [phoneNo, setPhoneNo]         = useState('')
  const [txRef, setTxRef]             = useState('')
  const [saveAccount, setSaveAccount] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const [accounts, setAccounts]             = useState<PaymentAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)

  useEffect(() => {
    if (!state?.packageId) navigate('/member/subscription/setup', { replace: true })
  }, [state, navigate])

  useEffect(() => {
    if (!user?.memberId) return
    paymentAccountService.list(user.memberId)
      .then(accts => {
        setAccounts(accts)
        const def = accts.find(a => a.isDefault)
        if (def) {
          setMethod(def.type)
          if (def.type === 'bank_card') { setBankName(def.provider ?? ''); setAccountNo(def.accountRef ?? '') }
          else if (def.type === 'ewallet') { setProvider(def.provider ?? ''); setPhoneNo(def.accountRef ?? '') }
        }
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [user?.memberId])

  if (!state) return null

  const today  = new Date()
  const endEst = new Date(today.getTime() + Number(state.durationDays) * 86400000)
  const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  function fillFromAccount(acc: PaymentAccount) {
    setMethod(acc.type)
    if (acc.type === 'bank_card') {
      setBankName(acc.provider ?? '')
      setAccountNo(acc.accountRef ?? '')
    } else if (acc.type === 'ewallet') {
      setProvider(acc.provider ?? '')
      setPhoneNo(acc.accountRef ?? '')
    }
  }

  async function handleDeleteAccount(accountId: number) {
    if (!user?.memberId) return
    await paymentAccountService.remove(user.memberId, accountId)
    setAccounts(prev => prev.filter(a => a.accountId !== accountId))
  }

  async function handleConfirm() {
    if (!user?.memberId) return
    setSubmitting(true)
    setError(null)
    try {
      let subId: number
      try {
        const sub = await subscriptionService.create(user.memberId, state!.packageId)
        subId = Number(sub.subscriptionId)
      } catch (subErr) {
        const e = subErr as { response?: { status?: number; data?: { code?: string } } }
        if (e?.response?.status === 409 && e?.response?.data?.code === 'SUBSCRIPTION_ALREADY_PENDING') {
          const subs = await subscriptionService.getByMember(user.memberId)
          const pending = subs.find(s => s.status === 'pending')
          if (!pending) throw subErr
          subId = Number(pending.subscriptionId)
        } else {
          throw subErr
        }
      }
      await paymentService.create({
        memberId: Number(user.memberId),
        subscriptionId: subId,
        method,
        amount: state!.price,
        ...(txRef.trim() ? { transactionReference: txRef.trim() } : {}),
      })
      if (saveAccount && method !== 'cash') {
        await paymentAccountService.create(user.memberId, {
          type: method,
          provider: method === 'bank_card' ? bankName : provider,
          accountRef: method === 'bank_card' ? accountNo : phoneNo,
        }).catch(() => {})
      }
      setHasActiveSub(true)
      navigate('/member', { replace: true })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", maxWidth: 960, margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        className="rogym-text-link rogym-text-link--accent"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Quay lại chọn gói
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">
        Thanh toán
      </h1>

      {/* Order summary bar */}
      <div
        className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
        style={{ background: BG, border: '1px solid rgba(66,224,158,0.1)' }}
      >
        <div>
          <p style={{ fontSize: 12, color: '#bbcabf', marginBottom: 2 }}>Gói đã chọn</p>
          <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: '#fff' }}>{state.packageName}</p>
          <p style={{ fontSize: 12, color: '#bbcabf', marginTop: 2 }}>
            {state.durationDays} ngày &nbsp;·&nbsp; {fmtDate(today)} → {fmtDate(endEst)}
          </p>
        </div>
        <p style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, color: G }}>{fmtVND(state.price)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card left: payment info */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}>
          <h3 className="text-base font-bold text-white">Thông tin thanh toán</h3>

          <div className="flex flex-col gap-2">
            {METHOD_OPTIONS.map(opt => (
              <MethodBtn key={opt.value} opt={opt} selected={method === opt.value} onClick={() => setMethod(opt.value)} />
            ))}
          </div>

          {method === 'bank_card' && (
            <div className="flex flex-col gap-3">
              <InputField label="Tên ngân hàng" placeholder="Vietcombank, BIDV..." value={bankName} onChange={setBankName} icon={<Landmark size={15} />} />
              <InputField label="Số tài khoản" placeholder="1234567890" value={accountNo} onChange={setAccountNo} icon={<CreditCard size={15} />} />
              <InputField label="Mã giao dịch (tuỳ chọn)" placeholder="REF-..." value={txRef} onChange={setTxRef} icon={<Hash size={15} />} />
            </div>
          )}

          {method === 'ewallet' && (
            <div className="flex flex-col gap-3">
              <InputField label="Ví điện tử" placeholder="MoMo, ZaloPay, VNPay..." value={provider} onChange={setProvider} icon={<WalletCards size={15} />} />
              <InputField label="Số điện thoại" placeholder="0912 345 678" value={phoneNo} onChange={setPhoneNo} icon={<Phone size={15} />} />
              <InputField label="Mã giao dịch (tuỳ chọn)" placeholder="REF-..." value={txRef} onChange={setTxRef} icon={<Hash size={15} />} />
            </div>
          )}

          {method !== 'cash' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => setSaveAccount(v => !v)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: saveAccount ? `1.5px solid ${G}` : '1.5px solid rgba(255,255,255,0.2)',
                  background: saveAccount ? `${G}22` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms',
                }}
              >
                {saveAccount && <Check size={11} style={{ color: G }} />}
              </div>
              <span style={{ fontSize: 13, color: '#bbcabf' }}>Lưu tài khoản này để dùng lại sau</span>
            </label>
          )}

          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="rogym-btn rogym-btn--primary rogym-btn--wide mt-auto"
            style={{
              background: submitting ? '#1a2d22' : G,
              color: submitting ? '#4a6654' : '#00492f',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Be Vietnam Pro',sans-serif",
              border: 'none',
            }}
          >
            {submitting ? 'Đang xử lý...' : `Xác nhận thanh toán ${fmtVND(state.price)}`}
          </button>
        </div>

        {/* Card right: saved accounts */}
        <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: BG, border: '1px solid rgba(66,224,158,0.08)' }}>
          <h3 className="text-base font-bold text-white">Tài khoản đã liên kết</h3>
          <p style={{ fontSize: 12, color: '#bbcabf', marginBottom: 4 }}>Chọn tài khoản đã lưu để điền nhanh thông tin</p>

          {accountsLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map(i => (
                <div key={i} className="animate-pulse rounded-xl" style={{ height: 56, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3" style={{ flex: 1 }}>
              <WalletCards size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p style={{ fontSize: 13, color: '#bbcabf', textAlign: 'center' }}>
                Chưa có tài khoản nào được lưu
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                Tích &quot;Lưu tài khoản này&quot; bên trái sau khi chọn phương thức
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map(acc => (
                <div
                  key={acc.accountId}
                  style={{
                    borderRadius: 12, padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <button
                    onClick={() => fillFromAccount(acc)}
                    style={{
                      flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 0,
                    }}
                  >
                    <div style={{ color: T, flexShrink: 0 }}>{methodIcon(acc.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 13, color: '#fff', fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                          {acc.label || acc.provider || METHOD_OPTIONS.find(m => m.value === acc.type)?.label}
                        </p>
                        {acc.isDefault && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: `${G}22`, color: G, border: `1px solid ${G}33`, flexShrink: 0 }}>
                            Mặc định
                          </span>
                        )}
                      </div>
                      {acc.accountRef && (
                        <p style={{ fontSize: 11, color: '#bbcabf', marginTop: 1 }}>{maskRef(acc.accountRef)}</p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.accountId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4, flexShrink: 0 }}
                    title="Xoá tài khoản"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
