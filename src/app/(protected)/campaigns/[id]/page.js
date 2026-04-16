import { CampaignDetailPage } from '@/components/campaigns/CampaignDetailPage'

export default async function CampaignDetailRoute({ params }) {
  return <CampaignDetailPage id={params.id} />
}