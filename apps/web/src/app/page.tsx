import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Melbourne Cup</span>{' '}
                  <span className="block text-yellow-600 xl:inline">Sweeps Made Easy</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Run professional Melbourne Cup sweeps at your venue with real-time draws,
                  custom branding, and seamless participant management.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <a
                      href="/signup"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 md:py-4 md:text-lg md:px-10"
                    >
                      Start Your Venue
                    </a>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a
                      href="/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 md:py-4 md:text-lg md:px-10"
                    >
                      Sign In
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-yellow-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for the perfect sweep
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white">
                          🎲
                        </div>
                      </div>
                      <div className="ml-4">
                        <CardTitle>Live Draw System</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Real-time horse assignments with fair, transparent draws that everyone can watch live.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white">
                          🎨
                        </div>
                      </div>
                      <div className="ml-4">
                        <CardTitle>Custom Branding</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Customize colors, logos, and themes to match your venue's brand and atmosphere.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white">
                          📱
                        </div>
                      </div>
                      <div className="ml-4">
                        <CardTitle>Mobile Friendly</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Participants can join and follow the action from their phones with QR codes and simple links.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white">
                          🏆
                        </div>
                      </div>
                      <div className="ml-4">
                        <CardTitle>Results Management</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Instant winner announcements and prize distribution tracking for seamless event management.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-yellow-50">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            <span className="block">Ready to run your sweep?</span>
            <span className="block">Start setting up your venue today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-gray-500">
            Join venues across Australia already using our platform for their Melbourne Cup events.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <a href="/signup">Get Started Free</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
