import { Suspense } from 'react'
import { Skeleton } from '@/components/ui'
import { getRows } from '@/lib/data'
import { ProvinsiView } from './provinsi-view'

export default function Page() {
  return (
    <Suspense fallback={<Skeleton h={760} />}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  return <ProvinsiView rows={await getRows()} />
}
