'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BrandScoreBadge } from '@/components/ui/BrandScoreBadge'
import { ChannelChips } from '@/components/ui/ChannelChips'
import { listCampaigns } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'

// ============================================================
// TOAST SYSTEM
// ============================================================

function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-200 animate-in fade-in slide-in-from-right-2 ${
            toast.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-200'
              : toast.type === 'warning'
              ? 'bg-amber-950 border-amber-800 text-amber-200'
              : 'bg-gray-800 border-gray-700 text-gray-200'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity duration-150 flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 focus:ring-offset-transparent rounded"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// STATUS TABS
// ============================================================

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DashboardPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const [campaigns, setCampaigns] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('')
  const [quickStats, setQuickStats] = useState({ total: 0, pending: 0, approvedThisMonth: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const initialFetchDone = useRef(false)

  const getErrorMessage = useCallback((err) => {
    if (err?.status === 401) return 'Your session has expired. Please sign in again.'
    if (err?.status === 403) return 'You do not have permission to view campaigns.'
    if (err?.status === 429) return 'Too many requests. Please wait a moment and try again.'
    return err?.message || 'Failed to load campaigns. Please try again.'
  }, [])

  const fetchCampaigns = useCallback(async (status = '') => {
    setLoading(true)
    setStatsLoading(true)
    setError(null)

    try {
      const requests = [
        listCampaigns({ status, page_size: 20 }),
        listCampaigns({ status: 'pending', page_size: 1 }),
        listCampaigns({ status: 'approved', page_size: 100 }),
      ]

      if (status !== '') {
        requests.push(listCampaigns({ status: '', page_size: 1 }))
      }

      const results = await Promise.all(requests)
      const [filteredData, pendingData, approvedData, allDataOpt] = results

      setCampaigns(filteredData?.campaigns || [])
      setPagination(filteredData?.pagination || null)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const approvedThisMonth = (approvedData?.campaigns || []).filter(c => {
        const date = new Date(c.approved_at || c.updated_at)
        return date >= startOfMonth
      }).length

      setQuickStats({
        total: status === ''
          ? (filteredData?.pagination?.total ?? 0)
          : (allDataOpt?.pagination?.total ?? 0),
        pending: pendingData?.pagination?.total ?? 0,
        approvedThisMonth,
      })
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)

      if (err?.status === 401) {
        addToast('Session expired. Redirecting to login…', 'error')
        setTimeout(() => router.push('/login'), 2000)
      } else if (err?.status === 429) {
        addToast('Rate limit reached. Please wait before retrying.', 'warning')
      } else {
        addToast(message, 'error')
      }
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [addToast, getErrorMessage, router])

  useEffect(() => {
    fetchCampaigns(activeTab)
  }, [activeTab, fetchCampaigns])

  const handleTabChange = useCallback((value) => {
    setActiveTab(value)
  }, [])

  const handleRetry = useCallback(() => {
    fetchCampaigns(activeTab)
  }, [fetchCampaigns, activeTab])

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Campaigns</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage and track your marketing campaigns</p>
            </div>
            <Link
              href="/campaigns/new"
              aria-label="Create a new campaign"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 text-white text-sm font-semibold rounded-lg transition-colors duration-150 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Campaign
            </Link>
          </div>

          {/* Quick Stats */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Campaign Statistics</h2>
            <QuickStatsBar stats={quickStats} loading={statsLoading} />
          </section>

          {/* Status filter tabs */}
          <div
            role="tablist"
            aria-label="Filter campaigns by status"
            className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 w-fit overflow-x-auto max-w-full"
          >
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                aria-controls="campaign-list"
                onClick={() => handleTabChange(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-gray-900 ${
                  activeTab === tab.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campaign list / states */}
          <section id="campaign-list" aria-label="Campaign list" aria-live="polite">
            <h2 className="sr-only">
              {activeTab ? `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Campaigns` : 'All Campaigns'}
            </h2>
            {loading ? (
              <CampaignTableSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={handleRetry} />
            ) : campaigns.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : (
              <CampaignTable campaigns={campaigns} />
            )}
          </section>
        </div>

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </Layout>
    </ProtectedRoute>
  )
}

// ============================================================
// QUICK STATS BAR
// ============================================================

function QuickStatsBar({ stats, loading }) {
  const items = [
    {
      label: 'Total Campaigns',
      value: stats.total,
      color: 'text-white',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      label: 'Pending Approval',
      value: stats.pending,
      color: 'text-amber-400',
      icon: (
        <svg className="w-5 h-5 text-amber-500/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Approved This Month',
      value: stats.approvedThisMonth,
      color: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-emerald-500/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div
          key={item.label}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            {item.icon}
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-gray-400 truncate">{item.label}</dt>
            {loading ? (
              <div className="h-7 w-14 bg-gray-800 rounded animate-pulse mt-1" aria-hidden="true" />
            ) : (
              <dd className={`text-2xl font-bold mt-0.5 ${item.color}`}>{item.value}</dd>
            )}
          </div>
        </div>
      ))}
    </dl>
  )
}

// ============================================================
// CAMPAIGN TABLE — responsive: cards on mobile, table on md+
// ============================================================

function CampaignTable({ campaigns }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Mobile card list */}
      <ul className="md:hidden divide-y divide-gray-800" aria-label="Campaign list">
        {campaigns.map(campaign => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Campaign</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Brand Score</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Channels</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Demo Metrics</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {campaigns.map(campaign => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Mobile card
function CampaignCard({ campaign }) {
  const router = useRouter()
  const metrics = getMockMetrics(campaign.id)

  return (
    <li>
      <button
        className="w-full text-left px-4 py-4 hover:bg-gray-800/60 active:bg-gray-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        onClick={() => router.push(`/campaigns/${campaign.id}`)}
        aria-label={`View campaign: ${campaign.name}`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-medium text-white leading-snug">{campaign.name}</p>
          <StatusBadge status={campaign.status} />
        </div>
        {campaign.brief && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{campaign.brief}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <BrandScoreBadge score={campaign.brand_score} />
          <ChannelChips channels={campaign.channels || []} />
          <span className="text-xs text-gray-500 ml-auto">{formatDate(campaign.created_at)}</span>
        </div>
      </button>
    </li>
  )
}

// Desktop table row
function CampaignRow({ campaign }) {
  const router = useRouter()
  const metrics = getMockMetrics(campaign.id)

  return (
    <tr
      className="hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 group focus-within:bg-gray-800/30"
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
    >
      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors duration-150">
            {campaign.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{campaign.brief}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={campaign.status} />
      </td>
      <td className="px-4 py-4">
        <BrandScoreBadge score={campaign.brand_score} />
      </td>
      <td className="px-4 py-4">
        <ChannelChips channels={campaign.channels || []} />
      </td>
      <td className="px-4 py-4 hidden xl:table-cell">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{metrics.impressions.toLocaleString()} imp</span>
            <span>{metrics.clicks.toLocaleString()} clicks</span>
            <span>{metrics.ctr} CTR</span>
          </div>
          <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">Demo</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-xs text-gray-400">{formatDate(campaign.created_at)}</p>
      </td>
    </tr>
  )
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function CampaignTableSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" aria-busy="true" aria-label="Loading campaigns">
      {/* Mobile skeletons */}
      <div className="md:hidden divide-y divide-gray-800">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-4 py-4 space-y-3 animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 bg-gray-800 rounded w-40" />
              <div className="h-5 bg-gray-800 rounded-full w-16" />
            </div>
            <div className="h-3 bg-gray-800 rounded w-full max-w-xs" />
            <div className="h-3 bg-gray-800 rounded w-3/4" />
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-800 rounded w-10" />
              <div className="h-5 bg-gray-800 rounded w-12" />
              <div className="h-5 bg-gray-800 rounded w-14" />
              <div className="h-3 bg-gray-800 rounded w-20 ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block">
        {/* Table header skeleton */}
        <div className="border-b border-gray-800 px-4 py-3 flex gap-8">
          {['w-24', 'w-16', 'w-20', 'w-20', 'w-28', 'w-20'].map((w, i) => (
            <div key={i} className={`h-3 bg-gray-800 rounded animate-pulse ${w}`} />
          ))}
        </div>
        {/* Row skeletons */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-4 py-4 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 bg-gray-800 rounded w-48 max-w-full" />
                <div className="h-3 bg-gray-800 rounded w-72 max-w-full" />
              </div>
              <div className="h-6 bg-gray-800 rounded-full w-16 flex-shrink-0" />
              <div className="h-6 bg-gray-800 rounded w-12 flex-shrink-0" />
              <div className="flex gap-1 flex-shrink-0">
                <div className="h-5 bg-gray-800 rounded w-12" />
                <div className="h-5 bg-gray-800 rounded w-14" />
              </div>
              <div className="h-4 bg-gray-800 rounded w-32 flex-shrink-0 hidden xl:block" />
              <div className="h-4 bg-gray-800 rounded w-24 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ activeTab }) {
  const isFiltered = activeTab !== ''

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center py-16 sm:py-20 px-6 sm:px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-5" aria-hidden="true">
        {isFiltered ? (
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
      </div>

      <h2 className="text-white font-semibold text-lg">
        {isFiltered
          ? `No ${activeTab} campaigns found`
          : 'No campaigns yet'}
      </h2>

      <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
        {isFiltered
          ? `There are currently no campaigns with "${activeTab}" status. Try a different filter or create a new campaign.`
          : 'Get started by creating your first campaign. The AI will help you generate brand-aligned content across channels.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        <Link
          href="/campaigns/new"
          aria-label={isFiltered ? 'Create a new campaign' : 'Create your first campaign'}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {isFiltered ? 'New Campaign' : 'Create Your First Campaign'}
        </Link>
      </div>

      {!isFiltered && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg text-left" aria-label="Getting started steps">
          {[
            { step: '1', label: 'Write a brief', desc: 'Describe your campaign goals and target audience.' },
            { step: '2', label: 'Generate content', desc: 'AI creates brand-aligned copy for all your channels.' },
            { step: '3', label: 'Review & approve', desc: 'Admins review content and approve for publishing.' },
          ].map(item => (
            <div key={item.step} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
              <div
                className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center mb-2"
                aria-hidden="true"
              >
                {item.step}
              </div>
              <h3 className="text-sm font-medium text-white">{item.label}</h3>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ERROR STATE
// ============================================================

function ErrorState({ message, onRetry }) {
  const isAuth = message?.toLowerCase().includes('session') || message?.toLowerCase().includes('permission')
  const isRateLimit = message?.toLowerCase().includes('rate limit') || message?.toLowerCase().includes('too many')

  return (
    <div className="bg-gray-900 border border-red-900/40 rounded-xl flex flex-col items-center justify-center py-14 sm:py-16 px-6 sm:px-8 text-center" role="alert">
      <div className="w-12 h-12 rounded-full bg-red-950/60 flex items-center justify-center mb-4" aria-hidden="true">
        {isRateLimit ? (
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        )}
      </div>

      <h2 className="text-red-300 font-semibold text-base">
        {isRateLimit ? 'Rate Limit Reached' : isAuth ? 'Access Error' : 'Something went wrong'}
      </h2>

      <p className="text-sm text-gray-400 mt-1.5 max-w-sm leading-relaxed">{message}</p>

      {!isAuth && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Try again
        </button>
      )}

      {isAuth && (
        <Link
          href="/login"
          className="mt-5 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
        >
          Sign in again
        </Link>
      )}
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

function getMockMetrics(campaignId) {
  const chars = (campaignId || '').replace(/-/g, '')
  let hash = 0
  for (let i = 0; i < chars.length; i++) {
    hash = ((hash << 5) - hash + parseInt(chars[i], 16)) | 0
  }
  const abs = Math.abs(hash)
  const impressions = 15000 + (abs % 85000)
  const clicks = 300 + (abs % 4700)
  const ctr = ((clicks / impressions) * 100).toFixed(2) + '%'
  return { impressions, clicks, ctr }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}