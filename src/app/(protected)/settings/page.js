import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import BrandSettingsPage from '@/components/settings/BrandSettingsPage'

export default async function SettingsPage() {
  const { user, role } = await getAuthenticatedUser()

  if (role !== 'admin') {
    redirect('/dashboard')
  }

  return <BrandSettingsPage />
}