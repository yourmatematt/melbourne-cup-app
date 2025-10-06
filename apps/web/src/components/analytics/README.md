# Analytics Dashboard & Export System

A comprehensive analytics system for Melbourne Cup events with real-time metrics, visualizations, and export capabilities.

## Features

### 📊 Analytics Dashboard
- **Event Statistics**: Total participants, conversion rates, lead capture metrics
- **Engagement Analytics**: Peak join periods, device breakdown, drop-off analysis
- **Marketing Metrics**: Email/phone consent rates, marketable leads tracking
- **Real-time Updates**: Live data refresh with Supabase subscriptions

### 📈 Visualizations (Recharts)
- **Bar Charts**: Peak join periods, join methods
- **Pie Charts**: Device breakdown, contact preferences
- **Line Charts**: Registration timeline, growth trends
- **Area Charts**: Cumulative statistics

### 📄 Export Functionality
- **Participants CSV**: Complete participant data with assignments
- **Leads CSV**: Marketing-focused export with consent data
- **Event Summary PDF**: Comprehensive event report
- **Multiple Formats**: CSV, JSON, PDF exports

## API Endpoints

### Analytics
```
GET /api/events/[eventId]/analytics
```
Returns comprehensive analytics data including:
- Event statistics (participants, conversion rates)
- Engagement metrics (device breakdown, peak periods)
- Marketing data (consent rates, lead counts)
- Timeline data for charts

### Exports
```
GET /api/events/[eventId]/export/participants?format=csv&include_assignments=true
GET /api/events/[eventId]/export/leads?format=csv&include_assignments=true
GET /api/events/[eventId]/export/summary
```

## Components

### AnalyticsWidget
Embeddable analytics component with multiple variants:

```tsx
import { AnalyticsWidget } from '@/components/analytics/analytics-widget'

// Full dashboard
<AnalyticsWidget
  eventId={eventId}
  variant="full"
  showExports={true}
  refreshInterval={30}
/>

// Compact view
<AnalyticsWidget
  eventId={eventId}
  variant="compact"
  refreshInterval={60}
/>

// Summary card
<AnalyticsWidget
  eventId={eventId}
  variant="summary"
/>
```

### Analytics Hook
Custom hook for analytics data management:

```tsx
import { useAnalytics, useAnalyticsMetrics } from '@/hooks/use-analytics'

const {
  data,
  isLoading,
  error,
  refreshAnalytics,
  exportParticipants,
  exportLeads
} = useAnalytics(eventId)

const { metrics } = useAnalyticsMetrics(eventId)
```

## Metrics Tracked

### Event Statistics
- **Total Participants**: Number of registered participants
- **Conversion Rate**: QR scans to actual joins
- **Lead Capture Rate**: Percentage providing contact info
- **Average Join Time**: Time from event start to registration

### Engagement Metrics
- **Peak Join Periods**: Hourly breakdown of registrations
- **Device Breakdown**: Mobile, tablet, desktop usage
- **Drop-off Analysis**: Where users exit the funnel
- **Join Methods**: QR code, direct link, manual entry

### Marketing Analytics
- **Email Consent Rate**: Percentage opting in for email
- **Phone Consent Rate**: Percentage providing phone numbers
- **Total Marketable Leads**: Contacts with consent
- **Contact Preferences**: Email only, phone only, both, neither

## Real-time Updates

The system includes real-time analytics updates using Supabase subscriptions:

```tsx
// Automatic refresh when participants or assignments change
useEffect(() => {
  const unsubscribe = subscribeToUpdates()
  return unsubscribe
}, [eventId])
```

## Export Formats

### Participants CSV
Complete participant data including:
- Personal information (name, email, phone)
- Consent status and join codes
- Horse assignments (if available)
- Technical data (user agent, IP)

### Leads CSV
Marketing-focused export with:
- Contact information for consented users
- Contact preferences
- Marketing tags and source attribution
- Horse assignments for engagement

### Event Summary PDF
Comprehensive report including:
- Event details and venue information
- Key performance metrics
- Visual charts and breakdowns
- Participant lists and assignments
- Winner information (if available)

## Installation

Add required dependencies:

```bash
npm install recharts papaparse pdfkit
npm install -D @types/papaparse @types/pdfkit
```

## Usage Examples

### Basic Analytics Dashboard
```tsx
import AnalyticsPage from '@/app/dashboard/events/[eventId]/analytics/page'

// Full analytics dashboard at /dashboard/events/[eventId]/analytics
```

### Embedded Analytics Widget
```tsx
import { AnalyticsWidget } from '@/components/analytics/analytics-widget'

function EventDashboard({ eventId }) {
  return (
    <div>
      <h1>Event Management</h1>
      <AnalyticsWidget
        eventId={eventId}
        variant="compact"
        showExports={false}
      />
    </div>
  )
}
```

### Custom Analytics Implementation
```tsx
import { useAnalytics } from '@/hooks/use-analytics'

function CustomAnalytics({ eventId }) {
  const { data, exportParticipants } = useAnalytics(eventId)

  const handleExport = async () => {
    await exportParticipants({
      format: 'csv',
      includeAssignments: true
    })
  }

  return (
    <div>
      <h2>Participants: {data?.eventStats.totalParticipants}</h2>
      <button onClick={handleExport}>Export Data</button>
    </div>
  )
}
```

## Performance Considerations

- **Caching**: Analytics data is cached with configurable refresh intervals
- **Real-time**: Subscription-based updates minimize unnecessary API calls
- **Chunked Exports**: Large exports are processed efficiently
- **Lazy Loading**: Charts and heavy components are loaded on demand

## Security & Privacy

- **Data Protection**: Exports respect user consent preferences
- **Access Control**: Analytics require proper event permissions
- **Audit Trail**: All export actions are logged
- **GDPR Compliance**: Lead exports only include consented contacts