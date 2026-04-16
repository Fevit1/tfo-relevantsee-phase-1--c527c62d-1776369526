export function StatusBadge({ status, 'aria-label': ariaLabel }) {
  const styles = {
    draft: 'bg-gray-800 text-gray-200 border-gray-600',
    pending: 'bg-amber-950 text-amber-200 border-amber-700',
    approved: 'bg-emerald-950 text-emerald-200 border-emerald-700',
    rejected: 'bg-red-950 text-red-200 border-red-700',
  }

  const dotStyles = {
    draft: 'bg-gray-400',
    pending: 'bg-amber-400',
    approved: 'bg-emerald-400',
    rejected: 'bg-red-400',
  }

  const labels = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }

  if (!status) return null

  const normalizedStatus = status.toLowerCase()
  const baseStyle = styles[normalizedStatus] || styles.draft
  const dotStyle = dotStyles[normalizedStatus] || dotStyles.draft
  const label = labels[normalizedStatus] || status

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-150 ${baseStyle}`}
      aria-label={ariaLabel || label}
      role="status"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyle}`}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}