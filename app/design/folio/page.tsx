import type { Metadata } from 'next';
import { LayoutPreview } from '../preview';

export const metadata: Metadata = { title: 'Commonplace | Folio layout preview' };

export default function FolioPage() {
  return <LayoutPreview variant="folio" />;
}
