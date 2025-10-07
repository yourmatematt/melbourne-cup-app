import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export async function GET() {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://melbournecup.app'
      : 'http://localhost:3000'

    const urls: SitemapUrl[] = []

    // Static pages
    const staticPages = [
      {
        loc: '/',
        changefreq: 'daily' as const,
        priority: 1.0,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/about',
        changefreq: 'monthly' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/how-it-works',
        changefreq: 'monthly' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/contact',
        changefreq: 'monthly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/privacy',
        changefreq: 'yearly' as const,
        priority: 0.3,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/terms',
        changefreq: 'yearly' as const,
        priority: 0.3,
        lastmod: new Date().toISOString()
      }
    ]

    urls.push(...staticPages)

    // Dynamic pages - public events
    try {
      const supabase = createClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, updated_at')
        .eq('visibility', 'public')
        .in('status', ['lobby', 'drawing', 'complete'])
        .order('updated_at', { ascending: false })
        .limit(1000) // Reasonable limit for sitemap

      if (events) {
        events.forEach(event => {
          urls.push({
            loc: `/join/${event.id}`,
            changefreq: 'hourly',
            priority: 0.9,
            lastmod: event.updated_at
          })

          urls.push({
            loc: `/event/${event.id}`,
            changefreq: 'hourly',
            priority: 0.8,
            lastmod: event.updated_at
          })

          urls.push({
            loc: `/spectator/${event.id}`,
            changefreq: 'hourly',
            priority: 0.7,
            lastmod: event.updated_at
          })
        })
      }
    } catch (error) {
      console.error('Error fetching events for sitemap:', error)
      // Continue without dynamic events if there's an error
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)

    // Return a basic sitemap if there's an error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NODE_ENV === 'production' ? 'https://melbournecup.app' : 'http://localhost:3000'}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new NextResponse(basicSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    })
  }
}