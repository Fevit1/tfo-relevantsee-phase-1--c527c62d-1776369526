import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import { ApprovalQueuePage } from '@/components/approvals/ApprovalQueuePage'

export default async function ApprovalsPage() {
  const { role } = await getAuthenticatedUser()

  if (role !== 'admin') {
    redirect('/dashboard')
  }

  return <ApprovalQueuePage />
}