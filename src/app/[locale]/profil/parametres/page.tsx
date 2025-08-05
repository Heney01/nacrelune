
import { AccountSettingsClient } from '@/components/account-settings-client';
import { getStaticParams } from '@/lib/translations';

export async function generateStaticParams() {
    return getStaticParams();
}

export default async function ProfileSettingsPage({ params }: { params: { locale: string }}) {
  return <AccountSettingsClient locale={params.locale} />;
}
