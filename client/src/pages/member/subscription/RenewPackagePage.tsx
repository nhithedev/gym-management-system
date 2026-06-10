import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '../components/MemberUI'
import { PackagePicker, PackagePickerSkeleton } from './components/PackagePicker'

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000)
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function RenewPackagePage() {
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [currentPackage, setCurrentPackage] = useState<Package | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    Promise.allSettled([
      subscriptionService.getByMember(user.memberId),
      packageService.list({ status: 'active' }),
    ])
      .then(([subscriptionResult, packageResult]) => {
        if (subscriptionResult.status === 'fulfilled') {
          const current = subscriptionResult.value
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .find((item) => item.status === 'active' || item.status === 'expired')
          if (!current) {
            navigate('/member/subscription/setup', { replace: true })
            return
          }
          setCurrentSubscription(current)
          setSelectedId(current.packageId)
          packageService.get(current.packageId).then(setCurrentPackage).catch(() => {})
        } else if (subscriptionResult.reason?.response?.status === 401) {
          clearAuth()
          navigate('/login')
        }
        if (packageResult.status === 'fulfilled') setPackages(packageResult.value.data)
      })
      .finally(() => setLoading(false))
  }, [clearAuth, navigate, user?.memberId])

  const selectedPackage =
    packages.find((item) => item.packageId === selectedId) ?? currentPackage
  const today = new Date()
  const renewStart = currentSubscription
    ? new Date(currentSubscription.endDate) > today
      ? addDays(new Date(currentSubscription.endDate), 1)
      : today
    : today
  const renewEnd = selectedPackage
    ? addDays(renewStart, Number(selectedPackage.durationDays))
    : null

  function continueToPayment() {
    if (!selectedPackage) return
    navigate('/member/subscription/renew/payment', {
      state: {
        packageId: selectedPackage.packageId,
        packageName: selectedPackage.name,
        price: Number(selectedPackage.price),
        durationDays: Number(selectedPackage.durationDays),
        renewStart: renewStart.toISOString(),
      },
    })
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Gia hạn gói tập"
        description="Cuộn để chọn gói gia hạn."
        actions={
          <button
            type="button"
            onClick={() => navigate('/member/subscription/current')}
            className="rogym-btn rogym-btn--outline-white"
          >
            ← Gói hiện tại
          </button>
        }
      />
      {loading ? (
        <PackagePickerSkeleton />
      ) : (
        <>
          {currentSubscription && (
            <div className="rogym-card rogym-card--compact flex items-center justify-between px-5 py-4">
              <div>
                <p className="mb-0.5 text-xs text-[var(--rogym-text-secondary)]">
                  Gói đang dùng
                </p>
                <span className="text-base font-bold text-white">
                  {currentSubscription.packageName ?? currentPackage?.name ?? 'Gói tập'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--rogym-text-secondary)]">
                  Hết hạn{' '}
                  <strong className="text-white">
                    {formatDate(currentSubscription.endDate)}
                  </strong>
                </p>
                <p className="mt-0.5 text-xs text-[var(--rogym-teal)]">
                  Gia hạn từ: <strong>{formatDate(renewStart)}</strong>
                </p>
              </div>
            </div>
          )}
          <PackagePicker
            packages={packages}
            selectedId={selectedId}
            onSelect={setSelectedId}
            fallbackPackage={currentPackage}
            currentPackageId={currentPackage?.packageId}
            startDate={renewStart}
            endDate={renewEnd}
            endDateLabel="Hết hạn mới"
            onContinue={continueToPayment}
          />
        </>
      )}
    </MemberPage>
  )
}
