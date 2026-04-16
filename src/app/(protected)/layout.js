import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'

export default async function ProtectedLayout({ children }) {
  let authContext

  try {
    authContext = await getAuthenticatedUser()
  } catch (err) {
    redirect('/login')
  }

  const { user } = authContext

  return (
    <Layout user={user}>
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        {children}
      </ErrorBoundary>
    </Layout>
  )
}