'use client';
import dynamic from 'next/dynamic';

const IntegrationsView = dynamic(
  () => import('@/components/views/IntegrationsView').then((m) => ({ default: m.IntegrationsView })),
  { ssr: false }
);

export default function IntegrationsPage() {
  return <IntegrationsView />;
}
