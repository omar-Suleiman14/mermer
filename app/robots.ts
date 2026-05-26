import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://mermereg.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/doctors/', '/fordoctors', '/privacy', '/terms', '/feedback/'],
        disallow: ['/dashboard/', '/admin/', '/sign-in/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
