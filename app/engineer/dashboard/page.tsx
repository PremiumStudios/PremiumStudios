'use client';

import { useState, useEffect } from 'react';
import { Headphones, Clock, DollarSign, Settings, Users, Star, TrendingUp, Wifi, WifiOff, Calendar, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function EngineerDashboard() {
  const [engineer, setEngineer] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
  const [stats, setStats] = useState({ totalBookings: 0, avgRating: 0, reviewCount: 0 });
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch engineer profile
      const { data: engineerData } = await supabase
        .from('engineer_profiles')
        .select(`
          *,
          users!inner (full_name, avatar_url)
        `)
        .eq('id', user.id)
        .single();

      setEngineer(engineerData);
      setIsOnline(engineerData?.is_online || false);

      // Fetch recent bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          users!bookings_artist_id_fkey (full_name, avatar_url),
          studio_profiles (studio_name),
          studio_rooms (name)
        `)
        .eq('engineer_id', user.id)
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
        .select('engineer_payout_cents, created_at')
        .eq('engineer_id', user.id)
        .eq('status', 'completed');

      if (earningsData) {
        const todayEarnings = earningsData
          .filter(b => format(new Date(b.created_at), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'))
          .reduce((sum, b) => sum + b.engineer_payout_cents, 0);

        const weekEarnings = earningsData
          .filter(b => new Date(b.created_at) >= weekStart && new Date(b.created_at) <= weekEnd)
          .reduce((sum, b) => sum + b.engineer_payout_cents, 0);

        const monthEarnings = earningsData
          .filter(b => new Date(b.created_at) >= monthStart && new Date(b.created_at) <= monthEnd)
          .reduce((sum, b) => sum + b.engineer_payout_cents, 0);

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
        avgRating: engineerData?.rating_avg || 0,
        reviewCount: engineerData?.rating_count || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !isOnline;
      
      const { error } = await supabase
        .from('engineer_profiles')
        .update({ is_online: newStatus })
        .eq('id', user.id);

      if (!error) {
        setIsOnline(newStatus);
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'engineer_confirmed': return 'bg-blue-100 text-blue-800';
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
            <div className="flex items-center gap-4">
              <img
                src={engineer?.users?.avatar_url || 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg'}
                alt={engineer?.users?.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">{engineer?.users?.full_name}</h1>
                <p className="text-gray-300">{engineer?.headline}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isOnline}
                      onCheckedChange={toggleOnlineStatus}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <Label className="text-white flex items-center gap-1">
                      {isOnline ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-gray-400" />}
                      {isOnline ? 'Online' : 'Offline'}
                    </Label>
                  </div>
                  <Badge className={isOnline ? 'bg-green-600' : 'bg-gray-600'}>
                    {isOnline ? 'Available for bookings' : 'Not accepting bookings'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                View Profile
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
                  <p className="text-sm text-gray-400">Total Sessions</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                </div>
                <Headphones className="h-8 w-8 text-purple-400" />
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
              Recent Sessions
            </TabsTrigger>
            <TabsTrigger value="availability" className="data-[state=active]:bg-purple-600">
              Availability
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600">
              Profile
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-purple-600">
              Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Sessions</CardTitle>
                <CardDescription className="text-gray-300">
                  Your upcoming and completed recording sessions
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
                            {booking.studio_profiles.studio_name} • {booking.studio_rooms.name}
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
                          {formatPrice(booking.engineer_payout_cents)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {bookings.length === 0 && (
                    <div className="text-center py-8">
                      <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300">No sessions yet</p>
                      <p className="text-gray-400 text-sm">
                        {isOnline ? 'Artists will find you when they search for engineers' : 'Go online to start receiving booking requests'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Availability Schedule</CardTitle>
                <CardDescription className="text-gray-300">
                  Set your weekly availability for bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Availability Editor Coming Soon</p>
                  <p className="text-gray-400 text-sm">
                    Set your weekly schedule and availability preferences
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Profile Management</CardTitle>
                <CardDescription className="text-gray-300">
                  Update your skills, portfolio, and rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-white font-medium mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {engineer?.skills?.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-gray-300 border-gray-600">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-3">Genres</h4>
                      <div className="flex flex-wrap gap-2">
                        {engineer?.genres?.map((genre: string) => (
                          <Badge key={genre} className="bg-purple-600/20 text-purple-300">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Current Rate</h4>
                    <p className="text-2xl font-bold text-white">
                      {formatPrice(engineer?.hourly_rate_cents || 0)}/hour
                    </p>
                  </div>

                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Earnings Overview</CardTitle>
                <CardDescription className="text-gray-300">
                  Track your income and payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Detailed Earnings Coming Soon</p>
                  <p className="text-gray-400 text-sm">
                    View detailed breakdowns of your earnings and payout history
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