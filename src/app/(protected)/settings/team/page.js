import { getAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TeamSettingsPage from '@/components/settings/TeamSettingsPage'

export default async function TeamPage() {
  const { role } = await getAuthenticatedUser()

  if (role !== 'admin') {
    redirect('/dashboard')
  }

  return <TeamSettingsPage />
}