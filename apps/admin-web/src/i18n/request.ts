/* eslint-disable import/no-default-export */
import { getRequestConfig } from 'next-intl/server';

import { getAdminLocale, getAdminMessages } from './get-messages';

const adminRequestConfig = getRequestConfig(async () => {
  const locale = await getAdminLocale();

  return {
    locale,
    messages: getAdminMessages(locale),
  };
});

export { adminRequestConfig };
export default adminRequestConfig;
