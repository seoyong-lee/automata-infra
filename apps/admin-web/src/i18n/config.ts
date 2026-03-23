export const adminLocales = ['ko', 'en'] as const;

export type AdminLocale = (typeof adminLocales)[number];

export const defaultAdminLocale: AdminLocale = 'ko';
export const adminLocaleCookieName = 'admin-locale';

export function isAdminLocale(value: string | null | undefined): value is AdminLocale {
  return Boolean(value && adminLocales.includes(value as AdminLocale));
}
