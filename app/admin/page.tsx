'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Building, Headphones, DollarSign, TriangleAlert as AlertTriangle, Settings, TrendingUp, Eye, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudios: 0,
    totalEngineers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingDisputes: 0
  });
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userProfile?.role !== 'admin') {
        // Redirect non-admin users
        window.location.href = '/dashboard';
        return;
      }

      // Fetch stats
      const [
        { count: totalUsers },
        { count: totalStudios },
        { count: totalEngineers },
        { count: totalBookings },
        { data: completedBookings },
        { count: pendingDisputes }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('studio_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('engineer_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('app_fee_cents').eq('status', 'completed'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open')
      ]);

      const totalRevenue = completedBookings?.reduce((sum, booking) => sum + booking.app_fee_cents, 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalStudios: totalStudios || 0,
        totalEngineers: totalEngineers || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        pendingDisputes: pendingDisputes || 0
      });

      // Fetch pending verifications
      const { data: pendingStudios } = await supabase
        .from('studio_profiles')
        .select(`
          *,
          users!inner (full_name, email)
        `)
        .eq('is_verified', false)
        .limit(10);

      const { data: pendingEngineers } = await supabase
        .from('engineer_profiles')
        .select(`
          *,
          users!inner (full_name, email)
        `)
        .eq('is_accepting_bookings', false)
        .limit(10);

      setPendingVerifications([
        ...(pendingStudios || []).map(s => ({ ...s, type: 'studio' })),
        ...(pendingEngineers || []).map(e => ({ ...e, type: 'engineer' }))
      ]);

      // Fetch disputes
      const { data: disputesData } = await supabase
        .from('disputes')
        .select(`
          *,
          bookings!inner (
            id,
            users!bookings_artist_id_fkey (full_name),
            studio_profiles (studio_name)
          )
        `)
        .eq('status', 'open')
        .limit(10);

      setDisputes(disputesData || []);

      // Fetch recent bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          users!bookings_artist_id_fkey (full_name),
          studio_profiles (studio_name),
          studio_rooms (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentBookings(bookingsData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStudio = async (studioId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('studio_profiles')
        .update({ is_verified: approve })
        .eq('id', studioId);

      if (!error) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating studio verification:', error);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'open': return 'bg-red-100 text-red-800';
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
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Shield className="h-8 w-8 text-purple-400" />
                Admin Dashboard
              </h1>
              <p className="text-gray-300">Manage Premium Studios marketplace</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Studios</p>
                  <p className="text-2xl font-bold text-white">{stats.totalStudios}</p>
                </div>
                <Building className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Engineers</p>
                  <p className="text-2xl font-bold text-white">{stats.totalEngineers}</p>
                </div>
                <Headphones className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Bookings</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Disputes</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingDisputes}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="verifications" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="verifications" className="data-[state=active]:bg-purple-600">
              Pending Verifications
            </TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:bg-purple-600">
              Disputes
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-purple-600">
              Recent Bookings
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              Platform Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Pending Verifications</CardTitle>
                <CardDescription className="text-gray-300">
                  Review and approve studio and engineer applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingVerifications.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                          {item.type === 'studio' ? (
                            <Building className="h-6 w-6 text-purple-400" />
                          ) : (
                            <Headphones className="h-6 w-6 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            {item.type === 'studio' ? item.studio_name : item.users.full_name}
                          </h4>
                          <p className="text-gray-300 text-sm">{item.users.email}</p>
                          <Badge className={item.type === 'studio' ? 'bg-green-600/20 text-green-300' : 'bg-blue-600/20 text-blue-300'}>
                            {item.type === 'studio' ? 'Studio' : 'Engineer'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVerifyStudio(item.id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVerifyStudio(item.id, false)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingVerifications.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300">No pending verifications</p>
                      <p className="text-gray-400 text-sm">All applications have been reviewed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Open Disputes</CardTitle>
                <CardDescription className="text-gray-300">
                  Resolve booking disputes and issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {disputes.map((dispute) => (
                    <div key={dispute.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">{dispute.reason}</h4>
                          <p className="text-gray-300 text-sm">
                            {dispute.bookings.users.full_name} vs {dispute.bookings.studio_profiles.studio_name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {format(new Date(dispute.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <Badge className={getStatusColor(dispute.status)}>
                          {dispute.status}
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{dispute.message}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                          View Details
                        </Button>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {disputes.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300">No open disputes</p>
                      <p className="text-gray-400 text-sm">All disputes have been resolved</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Bookings</CardTitle>
                <CardDescription className="text-gray-300">
                  Monitor platform activity and transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-gray-300">Artist</TableHead>
                      <TableHead className="text-gray-300">Studio</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking) => (
                      <TableRow key={booking.id} className="border-white/10">
                        <TableCell className="text-white">{booking.users.full_name}</TableCell>
                        <TableCell className="text-gray-300">
                          {booking.studio_profiles.studio_name}
                          <br />
                          <span className="text-xs text-gray-400">{booking.studio_rooms.name}</span>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {format(new Date(booking.start_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {formatPrice(booking.app_fee_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Platform Settings</CardTitle>
                <CardDescription className="text-gray-300">
                  Configure platform-wide settings and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Platform Settings Coming Soon</p>
                  <p className="text-gray-400 text-sm">
                    Configure fees, pilot cities, feature flags, and more
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