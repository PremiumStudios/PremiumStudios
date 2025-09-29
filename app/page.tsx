'use client';

import { useState } from 'react';
import { Search, MapPin, Clock, Users, Shield, Star, Music, Headphones, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConciergeChat from '@/components/ai/ConciergeChat';

export default function HomePage() {
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = () => {
    if (searchLocation.trim()) {
      window.location.href = `/search?location=${encodeURIComponent(searchLocation)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-purple-400" />
              <span className="text-xl font-bold text-white">Premium Studios</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:text-purple-300">
                <a href="/auth/login">Sign In</a>
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <a href="/auth/signup">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Book Your Perfect
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {' '}Recording Session
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Connect with professional recording studios and audio engineers in your city. 
              Secure booking, escrow payments, and guaranteed quality.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter your city (e.g., Baton Rouge, New Orleans)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300 focus:border-purple-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Find Studios
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50+</div>
                <div className="text-gray-300">Professional Studios</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">100+</div>
                <div className="text-gray-300">Audio Engineers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">1000+</div>
                <div className="text-gray-300">Sessions Booked</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* How It Works */}
      <section className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-300">Book your perfect recording session in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">1. Search & Discover</h3>
              <p className="text-gray-300">
                Find studios and engineers near you. Filter by equipment, genre, price, and availability.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">2. Book & Pay Securely</h3>
              <p className="text-gray-300">
                Choose your date and time. Pay securely with escrow protection. Get instant confirmation.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">3. Create & Review</h3>
              <p className="text-gray-300">
                Show up and create amazing music. Leave reviews to help the community grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Premium Studios?</h2>
            <p className="text-xl text-gray-300">Professional features for professional results</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-400/50 transition-colors">
              <Shield className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure Payments</h3>
              <p className="text-gray-300 text-sm">
                Escrow protection ensures everyone gets paid fairly after successful sessions.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-400/50 transition-colors">
              <Star className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Verified Professionals</h3>
              <p className="text-gray-300 text-sm">
                All studios and engineers are verified with ratings and reviews from real artists.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-400/50 transition-colors">
              <Users className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Availability</h3>
              <p className="text-gray-300 text-sm">
                See who's online and available right now. Book instantly or schedule ahead.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-400/50 transition-colors">
              <Headphones className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Pro Equipment</h3>
              <p className="text-gray-300 text-sm">
                Access to industry-standard equipment and software at every studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Cities */}
      <section className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Now Available In</h2>
            <p className="text-xl text-gray-300">
              Starting in Louisiana and Texas with{' '}
              <span className="text-purple-400 font-semibold">zero platform fees</span> for the first 3 months
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-8 border border-purple-400/30">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Baton Rouge</h3>
                <p className="text-purple-300 mb-4">Louisiana • Pilot City</p>
                <div className="bg-purple-600/20 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold">0% Platform Fees</p>
                  <p className="text-gray-300 text-sm">Until June 2024</p>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Explore Studios
                </Button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-8 border border-purple-400/30">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">New Orleans</h3>
                <p className="text-purple-300 mb-4">Louisiana • Pilot City</p>
                <div className="bg-purple-600/20 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold">0% Platform Fees</p>
                  <p className="text-gray-300 text-sm">Until June 2024</p>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Explore Studios
                </Button>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Houston</h3>
                <p className="text-gray-300 mb-4">Texas • Coming Soon</p>
                <div className="bg-gray-600/20 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold">12% Platform Fee</p>
                  <p className="text-gray-300 text-sm">Standard pricing</p>
                </div>
                <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
                  Get Notified
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Create?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of artists, studios, and engineers already using Premium Studios
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8">
              <a href="/search">Find Studios Near Me</a>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <a href="/auth/signup">List Your Studio</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Music className="h-6 w-6 text-purple-400" />
                <span className="text-lg font-bold text-white">Premium Studios</span>
              </div>
              <p className="text-gray-400 text-sm">
                The professional marketplace for recording sessions.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">For Artists</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Find Studios</a></li>
                <li><a href="#" className="hover:text-white">Find Engineers</a></li>
                <li><a href="#" className="hover:text-white">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">For Professionals</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">List Your Studio</a></li>
                <li><a href="#" className="hover:text-white">Join as Engineer</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Premium Studios. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* AI Concierge Chat */}
      <ConciergeChat />
    </div>
  );
}