'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, LogOut, User, Settings, Calendar, Star, MapPin, Clock, Mic, Building, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useAuthClient } from '@/lib/auth';
import LoyaltyWidget from '@/components/loyalty/LoyaltyWidget';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { signOut } = useAuthClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        setUser(user);

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          // If no profile exists, redirect to onboarding
          if (profileError.code === 'PGRST116') {
            router.push('/auth/onboarding');
            return;
          }
        } else {
          setProfile(profile);
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, [router, supabase]);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error('Error signing out');
      } else {
        router.push('/');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'artist':
        return <Mic className="h-5 w-5" />;
      case 'engineer':
        return <Headphones className="h-5 w-5" />;
      case 'studio_owner':
        return <Building className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'artist':
        return 'bg-purple-100 text-purple-800';
      case 'engineer':
        return 'bg-blue-100 text-blue-800';
      case 'studio_owner':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWelcomeMessage = (role: string) => {
    switch (role) {
      case 'artist':
        return 'Ready to book your next recording session?';
      case 'engineer':
        return 'Ready to help artists create amazing music?';
      case 'studio_owner':
        return 'Ready to welcome artists to your studio?';
      default:
        return 'Welcome to Premium Studios!';
    }
  };

  const getQuickActions = (role: string) => {
    switch (role) {
      case 'artist':
        return [
          { label: 'Find Studios', href: '/search', icon: MapPin },
          { label: 'My Bookings', href: '/bookings', icon: Calendar },
          { label: 'Browse Engineers', href: '/engineers', icon: Headphones },
        ];
      case 'engineer':
        return [
          { label: 'My Profile', href: '/profile', icon: User },
          { label: 'My Bookings', href: '/bookings', icon: Calendar },
          { label: 'Availability', href: '/availability', icon: Clock },
        ];
      case 'studio_owner':
        return [
          { label: 'My Studio', href: '/studio', icon: Building },
          { label: 'Bookings', href: '/bookings', icon: Calendar },
          { label: 'Room Management', href: '/rooms', icon: Settings },
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const quickActions = getQuickActions(profile.role);

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
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-white hover:text-purple-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-purple-600 text-white text-xl">
                {profile.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {profile.full_name || 'there'}!
              </h1>
              <p className="text-gray-300">{getWelcomeMessage(profile.role)}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getRoleColor(profile.role)}>
                  <div className="flex items-center space-x-1">
                    {getRoleIcon(profile.role)}
                    <span className="capitalize">{profile.role.replace('_', ' ')}</span>
                  </div>
                </Badge>
                {profile.city && profile.state && (
                  <Badge variant="outline" className="text-gray-300 border-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    {profile.city}, {profile.state}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Card key={index} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <IconComponent className="h-5 w-5 text-purple-400" />
                    <span>{action.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => router.push(action.href)}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Loyalty Widget */}
          <div className="md:col-span-1">
            <LoyaltyWidget />
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-300">
              Your latest bookings and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">No recent activity yet</p>
              <p className="text-sm text-gray-400">
                {profile.role === 'artist' 
                  ? 'Start by booking your first recording session!'
                  : profile.role === 'engineer'
                  ? 'Complete your profile to start receiving bookings!'
                  : 'Set up your studio to start receiving bookings!'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-2xl font-bold text-white">-</p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Hours Recorded</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Profile Views</p>
                  <p className="text-2xl font-bold text-white">0</p>
                </div>
                <User className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}