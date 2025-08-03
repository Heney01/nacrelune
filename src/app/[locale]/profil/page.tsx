
import { ProfileClient } from '@/components/profile-client';
import { getStaticParams } from '@/lib/translations';

export async function generateStaticParams() {
    return getStaticParams();
}

export default async function ProfilePage({ params }: { params: { locale: string }}) {
  return <ProfileClient locale={params.locale} />;
}
