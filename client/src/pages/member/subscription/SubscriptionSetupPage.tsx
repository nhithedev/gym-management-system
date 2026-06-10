import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '../components/MemberUI'
import { PackagePicker, PackagePickerSkeleton } from './components/PackagePicker'

export default function SubscriptionSetupPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) return
    subscriptionService
      .getByMember(user.memberId)
      .then((subscriptions) => {
        const now = Date.now()
        const hasCurrentSubscription = subscriptions.some(
          (item) =>
            item.status === 'active' &&
            new Date(item.endDate).getTime() >= now,
        )
        if (hasCurrentSubscription) {
          navigate('/member/subscription/current', { replace: true })
        }
      })
      .catch(() => {})
    packageService
      .list({ status: 'active' })
      .then(({ data }) => {
        setPackages(data)
        const defaultPackage = data[2] ?? data[data.length - 1]
        if (defaultPackage) setSelectedId(defaultPackage.packageId)
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [navigate, user?.memberId])

  const selectedPackage = packages.find((item) => item.packageId === selectedId) ?? null
  const startDate = new Date()
  const endDate = selectedPackage
    ? new Date(startDate.getTime() + Number(selectedPackage.durationDays) * 86_400_000)
    : null

  function continueToPayment() {
    if (!selectedPackage) return
    navigate('/member/subscription/buy/payment', {
      state: {
        packageId: selectedPackage.packageId,
        packageName: selectedPackage.name,
        price: Number(selectedPackage.price),
        durationDays: Number(selectedPackage.durationDays),
      },
    })
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Gói tập"
        title="Chọn gói tập"
        description="Cuộn để chọn gói phù hợp với mục tiêu của bạn."
      />
      {loading ? (
        <PackagePickerSkeleton />
      ) : packages.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex items-center justify-center py-16 text-sm text-[var(--rogym-text-secondary)]">
          Hiện tại chưa có gói tập nào khả dụng. Vui lòng liên hệ gym.
        </div>
      ) : (
        <PackagePicker
          packages={packages}
          selectedId={selectedId}
          onSelect={setSelectedId}
          startDate={startDate}
          endDate={endDate}
          endDateLabel="Hết hạn dự kiến"
          onContinue={continueToPayment}
        />
      )}
    </MemberPage>
  )
}
