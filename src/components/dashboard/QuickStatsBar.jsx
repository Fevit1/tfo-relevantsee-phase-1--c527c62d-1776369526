'use client';

export default function QuickStatsBar({ totalCampaigns = 0, pendingApprovals = 0, approvedThisMonth = 0 }) {
  const stats = [
    {
      label: 'Total Campaigns',
      value: totalCampaigns,
      valueColor: 'text-white',
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      valueColor: 'text-amber-400',
      icon: (
        <svg className="w-5 h-5 text-amber-400/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Approved This Month',
      value: approvedThisMonth,
      valueColor: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-emerald-400/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          role="region"
          aria-label={`${stat.label}: ${stat.value}`}
          className={[
            'flex-1 bg-gray-900 border border-gray-700/60 rounded-xl p-4',
            'flex items-center gap-4',
            'shadow-sm shadow-black/30',
            'transition-transform duration-200 ease-out',
            'hover:scale-105',
            'motion-reduce:hover:scale-100',
            'motion-reduce:transition-none',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700/50 flex items-center justify-center flex-shrink-0">
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400 truncate">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 leading-tight ${stat.valueColor}`}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}