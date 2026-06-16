import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FileDown,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  WalletCards,
} from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { getPaymentMethodLabel } from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerModal,
  OwnerPage,
  OwnerPageHeader,
  OwnerPagination,
  OwnerSelect,
  OwnerSkeleton,
  OwnerStatCard,
} from '@/components/OwnerUI'
import { formatVnd } from '@/lib/currency'
import { formatDateTime, monthStart, todayInput } from '@/lib/date'
import { getApiError } from '@/lib/api-error'
import paymentService, {
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '@/services/payment.service'

const PAGE_SIZE = 12

const PAYMENT_METHOD_OPTIONS: Array<{ value: '' | PaymentMethod; label: string }> = [
  { value: '', label: 'Mọi phương thức' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Thẻ ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

const PAYMENT_STATUS_OPTIONS: Array<{ value: '' | PaymentStatus; label: string }> = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
]

const SORT_OPTIONS = [
  { value: 'paid_at:desc', label: 'Mới nhất' },
  { value: 'paid_at:asc', label: 'Cũ nhất' },
  { value: 'amount:desc', label: 'Số tiền giảm dần' },
  { value: 'amount:asc', label: 'Số tiền tăng dần' },
]

function paymentStatusLabel(status: PaymentStatus): string {
  return status === 'success' ? 'Thành công' : 'Thất bại'
}

function paymentStatusTone(status: PaymentStatus): 'success' | 'danger' {
  return status === 'success' ? 'success' : 'danger'
}

function transactionCode(payment: Payment): string {
  return payment.transactionReference || `PAY-${payment.paymentId.padStart(6, '0')}`
}

function memberName(payment: Payment): string {
  return payment.member?.fullName ?? `Hội viên #${payment.memberId}`
}

function memberCode(payment: Payment): string {
  return payment.member?.memberCode ?? `ID ${payment.memberId}`
}

function serviceName(payment: Payment): string {
  return payment.service?.name ?? payment.packageName
}

function staffName(payment: Payment): string {
  return payment.staff?.fullName ?? 'Chưa phân công'
}

function staffCode(payment: Payment): string {
  return payment.staff?.staffCode ?? '—'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function invoiceHtml(payment: Payment): string {
  const rows = [
    ['Mã giao dịch', transactionCode(payment)],
    ['Ngày thanh toán', formatDateTime(payment.paidAt)],
    ['Hội viên', `${memberName(payment)} (${memberCode(payment)})`],
    ['Dịch vụ/gói', serviceName(payment)],
    ['Số tiền', formatVnd(payment.amount)],
    ['Phương thức', getPaymentMethodLabel(payment.method)],
    ['Trạng thái', paymentStatusLabel(payment.status)],
    ['Nhân viên phụ trách', `${staffName(payment)} (${staffCode(payment)})`],
  ]

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hóa đơn ${escapeHtml(transactionCode(payment))}</title>
  <style>
    body { margin: 0; background: #f4f7f5; color: #102018; font-family: Arial, sans-serif; }
    main { width: min(720px, calc(100% - 32px)); margin: 32px auto; background: #ffffff; border: 1px solid #d9e4dd; border-radius: 12px; padding: 32px; }
    h1 { margin: 0; font-size: 28px; }
    .brand { color: #057a52; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .code { margin-top: 8px; color: #5f7168; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th, td { padding: 14px 0; border-bottom: 1px solid #e4ece7; text-align: left; }
    th { width: 34%; color: #5f7168; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    td { font-size: 15px; font-weight: 600; }
    .total td { border-bottom: 0; color: #057a52; font-size: 22px; }
    footer { margin-top: 28px; color: #6d7b73; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <div class="brand">RoGym</div>
    <h1>Hóa đơn thanh toán</h1>
    <p class="code">${escapeHtml(transactionCode(payment))}</p>
    <table>
      <tbody>
        ${rows
          .map(([label, value]) => {
            const rowClass = label === 'Số tiền' ? ' class="total"' : ''
            return `<tr${rowClass}><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
          })
          .join('')}
      </tbody>
    </table>
    <footer>Hóa đơn được xuất từ hệ thống quản lý RoGym.</footer>
  </main>
</body>
</html>`
}

function downloadInvoice(payment: Payment) {
  const blob = new Blob([invoiceHtml(payment)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hoa-don-${transactionCode(payment).replace(/[^a-z0-9-]/gi, '_')}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rogym-detail-item">
      <span className="rogym-detail-item__label">{label}</span>
      <span className="rogym-detail-item__value">{value}</span>
    </div>
  )
}

export default function TransactionInvoicesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [method, setMethod] = useState<'' | PaymentMethod>('')
  const [status, setStatus] = useState<'' | PaymentStatus>('')
  const [sort, setSort] = useState('paid_at:desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      setError(null)
      try {
        const result = await paymentService.list({
          page: targetPage,
          pageSize: PAGE_SIZE,
          from,
          to,
          method: method || undefined,
          status: status || undefined,
          sort,
        })
        setPayments(result.data)
        setTotalItems(result.meta.totalItems)
        setTotalPages(result.meta.totalPages)
      } catch (err) {
        setError(getApiError(err, 'Không thể tải danh sách hóa đơn giao dịch.'))
      } finally {
        setLoading(false)
      }
    },
    [from, method, page, sort, status, to],
  )

  useEffect(() => {
    load(page)
  }, [load, page])

  function resetToFirstPage() {
    setPage(1)
  }

  const pageTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  )
  const refundableCount = payments.filter((payment) => payment.canRefund).length

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Báo cáo"
        title="Danh sách hóa đơn giao dịch"
        description="Theo dõi chi tiết thanh toán, xuất hóa đơn và kiểm tra điều kiện hoàn tiền."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <OwnerStatCard
          icon={<ReceiptText size={18} />}
          label="Tổng giao dịch"
          value={String(totalItems)}
          hint="Theo bộ lọc hiện tại"
          accent
        />
        <OwnerStatCard
          icon={<WalletCards size={18} />}
          label="Tổng tiền trang này"
          value={formatVnd(pageTotal)}
          hint={`${payments.length} giao dịch đang hiển thị`}
        />
        <OwnerStatCard
          icon={<RotateCcw size={18} />}
          label="Có thể hoàn tiền"
          value={String(refundableCount)}
          hint="Giao dịch thành công trong trang này"
        />
      </div>

      <div className="rogym-card rogym-card--compact rogym-report-filter p-5">
        <label className="block space-y-2">
          <span className="rogym-field-label">Từ ngày</span>
          <DatePickerInput
            value={from}
            max={to}
            onChange={(value) => {
              setFrom(value)
              resetToFirstPage()
            }}
            aria-label="Từ ngày"
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Đến ngày</span>
          <DatePickerInput
            value={to}
            min={from}
            max={todayInput()}
            onChange={(value) => {
              setTo(value)
              resetToFirstPage()
            }}
            aria-label="Đến ngày"
          />
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Phương thức</span>
          <OwnerSelect
            value={method}
            onValueChange={(value) => {
              setMethod(value as '' | PaymentMethod)
              resetToFirstPage()
            }}
            ariaLabel="Phương thức thanh toán"
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Trạng thái</span>
          <OwnerSelect
            value={status}
            onValueChange={(value) => {
              setStatus(value as '' | PaymentStatus)
              resetToFirstPage()
            }}
            ariaLabel="Trạng thái thanh toán"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <label className="block space-y-2">
          <span className="rogym-field-label">Sắp xếp</span>
          <OwnerSelect
            value={sort}
            onValueChange={(value) => {
              setSort(value)
              resetToFirstPage()
            }}
            ariaLabel="Sắp xếp giao dịch"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </OwnerSelect>
        </label>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary self-end"
          onClick={() => load(page)}
          disabled={loading}
        >
          {loading && <LoaderCircle size={15} className="animate-spin" />}
          Tải lại
        </button>
      </div>

      {loading && payments.length === 0 ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => load(page)} />
      ) : payments.length === 0 ? (
        <OwnerEmptyState
          title="Không có giao dịch"
          description="Thử thay đổi khoảng ngày, phương thức hoặc trạng thái thanh toán."
        />
      ) : (
        <>
          <div className="rogym-owner-table-wrap">
            <table className="rogym-owner-table">
              <thead>
                <tr>
                  <th>Ngày thanh toán</th>
                  <th>Mã giao dịch</th>
                  <th>Hội viên</th>
                  <th>Dịch vụ/gói</th>
                  <th className="is-right">Số tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Nhân viên phụ trách</th>
                  <th className="is-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.paymentId}>
                    <td>
                      <span className="rogym-owner-table__primary">
                        {formatDateTime(payment.paidAt)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__mono">{transactionCode(payment)}</span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{memberName(payment)}</span>
                      <span className="rogym-owner-table__secondary">{memberCode(payment)}</span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{serviceName(payment)}</span>
                      <span className="rogym-owner-table__secondary">
                        Gói {payment.service?.packageCode ?? payment.subscriptionId}
                      </span>
                    </td>
                    <td className="is-right">
                      <span className="rogym-owner-table__amount">
                        {formatVnd(payment.amount)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-method-pill">
                        <PaymentMethodIcon method={payment.method} size={15} />
                        {getPaymentMethodLabel(payment.method, true)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="rogym-tone-badge is-compact"
                        data-tone={paymentStatusTone(payment.status)}
                      >
                        {paymentStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td>
                      <span className="rogym-owner-table__primary">{staffName(payment)}</span>
                      <span className="rogym-owner-table__secondary">{staffCode(payment)}</span>
                    </td>
                    <td className="is-right">
                      <div className="rogym-owner-table__actions">
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                          onClick={() => setSelectedPayment(payment)}
                          aria-label={`Xem chi tiết giao dịch ${transactionCode(payment)}`}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                          onClick={() => downloadInvoice(payment)}
                          aria-label={`Xuất hóa đơn giao dịch ${transactionCode(payment)}`}
                          title="Xuất hóa đơn"
                        >
                          <FileDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--icon rogym-btn--danger"
                          onClick={() => setRefundTarget(payment)}
                          disabled={!payment.canRefund}
                          aria-label={`Hoàn tiền giao dịch ${transactionCode(payment)}`}
                          title={
                            payment.canRefund
                              ? 'Hoàn tiền'
                              : 'Chỉ giao dịch thành công mới đủ điều kiện hoàn tiền'
                          }
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OwnerPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <OwnerModal
        open={selectedPayment !== null}
        title="Chi tiết giao dịch"
        onClose={() => setSelectedPayment(null)}
        size="2xl"
        footer={
          selectedPayment && (
            <>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={() => setSelectedPayment(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="rogym-btn rogym-btn--primary"
                onClick={() => downloadInvoice(selectedPayment)}
              >
                <FileDown size={16} />
                Xuất hóa đơn
              </button>
            </>
          )
        }
      >
        {selectedPayment && (
          <div className="rogym-detail-grid">
            <DetailItem label="Ngày thanh toán" value={formatDateTime(selectedPayment.paidAt)} />
            <DetailItem label="Mã giao dịch" value={transactionCode(selectedPayment)} />
            <DetailItem
              label="Hội viên"
              value={`${memberName(selectedPayment)} (${memberCode(selectedPayment)})`}
            />
            <DetailItem label="Dịch vụ/gói" value={serviceName(selectedPayment)} />
            <DetailItem label="Số tiền" value={formatVnd(selectedPayment.amount)} />
            <DetailItem
              label="Phương thức"
              value={getPaymentMethodLabel(selectedPayment.method)}
            />
            <DetailItem label="Trạng thái" value={paymentStatusLabel(selectedPayment.status)} />
            <DetailItem
              label="Nhân viên phụ trách"
              value={`${staffName(selectedPayment)} (${staffCode(selectedPayment)})`}
            />
            <DetailItem
              label="Subscription"
              value={`#${selectedPayment.service?.subscriptionId ?? selectedPayment.subscriptionId}`}
            />
          </div>
        )}
      </OwnerModal>

      <OwnerModal
        open={refundTarget !== null}
        title="Hoàn tiền giao dịch"
        onClose={() => setRefundTarget(null)}
        size="md"
        footer={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => setRefundTarget(null)}
          >
            Đã hiểu
          </button>
        }
      >
        {refundTarget && (
          <div className="space-y-3 text-sm rogym-text-secondary">
            <p>
              Giao dịch {transactionCode(refundTarget)} đủ điều kiện hiển thị hành động hoàn tiền.
            </p>
            <p>
              Hệ thống hiện chưa có endpoint xử lý hoàn tiền, nên thao tác này chưa thay đổi dữ
              liệu thanh toán.
            </p>
          </div>
        )}
      </OwnerModal>
    </OwnerPage>
  )
}
