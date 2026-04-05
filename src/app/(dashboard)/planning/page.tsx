'use client';
import dynamic from 'next/dynamic';

const PlanningView = dynamic(
  () => import('@/components/views/PlanningView').then(m => ({ default: m.PlanningView })),
  { ssr: false }
);

export default function PlanningPage() {
  return <PlanningView />;
}
