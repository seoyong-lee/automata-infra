import { cookies } from 'next/headers';

import { adminLocaleCookieName, defaultAdminLocale, isAdminLocale, type AdminLocale } from './config';
import { enMessages } from './messages/en';
import { koMessages } from './messages/ko';

export async function getAdminLocale(): Promise<AdminLocale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(adminLocaleCookieName)?.value;

  return isAdminLocale(locale) ? locale : defaultAdminLocale;
}

export function getAdminMessages(locale: AdminLocale) {
  return locale === 'en' ? enMessages : koMessages;
}
