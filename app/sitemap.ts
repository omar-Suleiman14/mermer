import { MetadataRoute } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mermereg.com'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/doctors`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fordoctors`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  let doctorRoutes: MetadataRoute.Sitemap = []
  try {
    const doctors = await fetchQuery(api.doctors.listPublishedDoctors)
    doctorRoutes = doctors
      .filter((d) => d.qrSlug)
      .map((d) => ({
        url: `${baseUrl}/doctors/${d.qrSlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch {
    // If Convex is unavailable, return static routes only
  }

  return [...staticRoutes, ...doctorRoutes]
}
