import type { Metadata } from 'next';
import { LayoutPreview } from './preview';

export const metadata: Metadata = { title: 'Commonplace | Layout preview' };

export default function DesignPage() {
  return <LayoutPreview />;
}
