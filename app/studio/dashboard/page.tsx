'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Settings, Users, Star, TrendingUp, Eye, Camera, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { requireAuth } from '@/lib/auth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function StudioDashboard() {
  const [studio, setStudio] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
  const [stats, setStats] = useState({ totalBookings: 0, avgRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch studio profile
      const { data: studioData } = await supabase
        .from('studio_profiles')
        .select(`
          *,
          studio_rooms (
            id,
            name,
            hourly_rate_cents,
            is_active
          )
        `)
        .eq('id', user.id)
        .single();

      setStudio(studioData);

      // Fetch recent bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          users!bookings_artist_id_fkey (full_name, avatar_url),
          studio_rooms (name),
          engineer_profiles (
            users!engineer_profiles_id_fkey (full_name)
          )
        `)
        .eq('studio_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setBookings(bookingsData || []);

      // Calculate earnings
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: earningsData } = await supabase
        .from('bookings')
        .select('studio_payout_cents, created_at')
        .eq('studio_id', user.id)
        .eq('status', 'completed');

      if (earningsData) {
        const todayEarnings = earningsData
          .filter(b => format(new Date(b.created_at), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'))
          .reduce((sum, b) => sum + b.studio_payout_cents, 0);

        const weekEarnings = earningsData
          .filter(b => new Date(b.created_at) >= weekStart && new Date(b.created_at) <= weekEnd)
          .reduce((sum, b) => sum + b.studio_payout_cents, 0);

        const monthEarnings = earningsData
          .filter(b => new Date(b.created_at) >= monthStart && new Date(b.created_at) <= monthEnd)
          .reduce((sum, b) => sum + b.studio_payout_cents, 0);

        setEarnings({
          today: todayEarnings,
          week: weekEarnings,
          month: monthEarnings
        });
      }

      // Calculate stats
      const totalBookings = bookingsData?.length || 0;
      setStats({
        totalBookings,
        avgRating: studioData?.rating_avg || 0,
        reviewCount: studioData?.rating_count || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'studio_confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">{studio?.studio_name}</h1>
              <p className="text-gray-300 flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {studio?.address}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Eye className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Today's Earnings</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(earnings.today)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(earnings.week)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.avgRating.toFixed(1)}
                    <span className="text-sm text-gray-400 ml-1">({stats.reviewCount})</span>
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="bookings" className="data-[state=active]:bg-purple-600">
              Recent Bookings
            </TabsTrigger>
            <TabsTrigger value="rooms" className="data-[state=active]:bg-purple-600">
              Rooms
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-purple-600">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Bookings</CardTitle>
                <CardDescription className="text-gray-300">
                  Manage your upcoming and recent sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={booking.users.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg'}
                          alt={booking.users.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="text-white font-medium">{booking.users.full_name}</h4>
                          <p className="text-gray-300 text-sm">
                            {booking.studio_rooms.name}
                            {booking.engineer_profiles && (
                              <span> with {booking.engineer_profiles.users.full_name}</span>
                            )}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {format(new Date(booking.start_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-white font-medium">
                          {formatPrice(booking.studio_payout_cents)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {bookings.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300">No bookings yet</p>
                      <p className="text-gray-400 text-sm">Your bookings will appear here once artists start booking</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Studio Rooms</CardTitle>
                    <CardDescription className="text-gray-300">
                      Manage your rooms and equipment
                    </CardDescription>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Add Room
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studio?.studio_rooms?.map((room: any) => (
                    <div key={room.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-white font-medium">{room.name}</h4>
                        <Badge className={room.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                          {room.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">
                        {formatPrice(room.hourly_rate_cents)}/hour
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                          <Camera className="h-4 w-4 mr-1" />
                          Photos
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Booking Calendar</CardTitle>
                <CardDescription className="text-gray-300">
                  View and manage your booking schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Calendar View Coming Soon</p>
                  <p className="text-gray-400 text-sm">
                    Full calendar integration with booking management
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Analytics & Insights</CardTitle>
                <CardDescription className="text-gray-300">
                  Track your studio's performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Analytics Dashboard Coming Soon</p>
                  <p className="text-gray-400 text-sm">
                    Detailed insights into bookings, earnings, and performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}