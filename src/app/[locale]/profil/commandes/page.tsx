
import { MyOrdersClient } from '@/components/my-orders-client';
import { getStaticParams } from '@/lib/translations';

export async function generateStaticParams() {
    return getStaticParams();
}

export default async function MyOrdersPage({ params }: { params: { locale: string }}) {
  return <MyOrdersClient locale={params.locale} />;
}
