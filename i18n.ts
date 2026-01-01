import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
    // For now, we only support English
    // In the future, you can detect user's locale here
    const locale = 'en';

    return {
        locale,
        messages: (await import(`./messages/${locale}.json`)).default
    };
});
