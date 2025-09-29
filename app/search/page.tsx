'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Filter, Star, Clock, Users, Wifi, Car, Coffee, Mic, Music, Headphones, Calendar, DollarSign, Map, List, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import StudioMap from '@/components/map/StudioMap';
import { format } from 'date-fns';

type Studio = {
  id: string;
  studio_name: string;
  address: string;
  bio: string;
  amenities: any;
  photos: string[];
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  studio_rooms: {
    id: string;
    name: string;
    hourly_rate_cents: number;
    capacity: number;
    equipment: any;
    photos: string[];
  }[];
};

type Engineer = {
  id: string;
  headline: string;
  bio: string;
  skills: string[];
  genres: string[];
  hourly_rate_cents: number;
  years_experience: number;
  rating_avg: number;
  rating_count: number;
  is_online: boolean;
  city: string;
  users: {
    full_name: string;
    avatar_url: string;
  };
};

function SearchContent() {
  const searchParams = useSearchParams();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'studios' | 'engineers'>('studios');
  const [displayMode, setDisplayMode] = useState<'list' | 'map'>('list');
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.4515, -91.1871]); // Default to Baton Rouge
  
  // Search filters
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [duration, setDuration] = useState(parseInt(searchParams.get('duration') || '2'));
  const [needsEngineer, setNeedsEngineer] = useState(searchParams.get('needsEngineer') === 'true');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [minRating, setMinRating] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchStudios();
    if (needsEngineer || view === 'engineers') {
      fetchEngineers();
    }
    
    // Update map center based on location search
    if (location) {
      updateMapCenter(location);
    }
  }, [location, view, needsEngineer]);

  const updateMapCenter = (searchLocation: string) => {
    // Simple city-based centering - in production, use Google Geocoding API
    const cityCoords: { [key: string]: [number, number] } = {
      'baton rouge': [30.4515, -91.1871],
      'new orleans': [29.9511, -90.0715],
      'houston': [29.7604, -95.3698],
    };
    
    const normalizedLocation = searchLocation.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (normalizedLocation.includes(city)) {
        setMapCenter(coords);
        break;
      }
    }
  };

  const fetchStudios = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('studio_profiles')
        .select(`
          *,
          studio_rooms (
            id,
            name,
            hourly_rate_cents,
            capacity,
            equipment,
            photos
          )
        `)
        .eq('is_accepting_bookings', true);

      if (location) {
        // Simple text search - in production, you'd use proper geocoding
        query = query.or(`studio_name.ilike.%${location}%,address.ilike.%${location}%`);
      }

      const { data, error } = await query.order('rating_avg', { ascending: false });
      
      if (error) throw error;
      setStudios(data || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      let query = supabase
        .from('engineer_profiles')
        .select(`
          *,
          users!inner (
            full_name,
            avatar_url
          )
        `)
        .eq('is_accepting_bookings', true);

      if (location) {
        query = query.ilike('city', `%${location}%`);
      }

      const { data, error } = await query.order('rating_avg', { ascending: false });
      
      if (error) throw error;
      setEngineers(data || []);
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'parking': return <Car className="h-4 w-4" />;
      case 'wifi': return <Wifi className="h-4 w-4" />;
      case 'lounge': return <Coffee className="h-4 w-4" />;
      case 'vocal_booth': return <Mic className="h-4 w-4" />;
      case 'live_room': return <Music className="h-4 w-4" />;
      default: return <Music className="h-4 w-4" />;
    }
  };

  const filteredStudios = studios.filter(studio => {
    if (minRating > 0 && studio.rating_avg < minRating) return false;
    
    const minPrice = Math.min(...studio.studio_rooms.map(room => room.hourly_rate_cents / 100));
    if (minPrice < priceRange[0] || minPrice > priceRange[1]) return false;
    
    return true;
  });

  const filteredEngineers = engineers.filter(engineer => {
    if (minRating > 0 && engineer.rating_avg < minRating) return false;
    
    const hourlyRate = engineer.hourly_rate_cents / 100;
    if (hourlyRate < priceRange[0] || hourlyRate > priceRange[1]) return false;
    
    if (selectedGenres.length > 0) {
      const hasMatchingGenre = selectedGenres.some(genre => 
        engineer.genres.some(engineerGenre => 
          engineerGenre.toLowerCase().includes(genre.toLowerCase())
        )
      );
      if (!hasMatchingGenre) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Where do you want to record?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300"
                />
              </div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/20 border-white/30 text-white"
              />
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="3">3 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex bg-white/10 rounded-lg p-1">
              <Button
                variant={view === 'studios' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('studios')}
                className={view === 'studios' ? 'bg-purple-600' : 'text-white hover:bg-white/10'}
              >
                Studios ({filteredStudios.length})
              </Button>
              <Button
                variant={view === 'engineers' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('engineers')}
                className={view === 'engineers' ? 'bg-purple-600' : 'text-white hover:bg-white/10'}
              >
                Engineers ({filteredEngineers.length})
              </Button>
            </div>
            
            {/* Display Mode Toggle - Only show for studios */}
            {view === 'studios' && (
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant={displayMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode('list')}
                  className={displayMode === 'list' ? 'bg-purple-600' : 'text-white hover:bg-white/10'}
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={displayMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode('map')}
                  className={displayMode === 'map' ? 'bg-purple-600' : 'text-white hover:bg-white/10'}
                >
                  <Map className="h-4 w-4 mr-1" />
                  Map
                </Button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="needs-engineer"
                checked={needsEngineer}
                onCheckedChange={setNeedsEngineer}
              />
              <Label htmlFor="needs-engineer" className="text-white">
                Need an engineer
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="w-80 space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div>
                  <Label className="text-white mb-2 block">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/hour
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                </div>

                {/* Rating */}
                <div>
                  <Label className="text-white mb-2 block">Minimum Rating</Label>
                  <Select value={minRating.toString()} onValueChange={(value) => setMinRating(parseFloat(value))}>
                    <SelectTrigger className="bg-white/20 border-white/30 text-white">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="3">3+ stars</SelectItem>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="4.5">4.5+ stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Genres (for engineers) */}
                {view === 'engineers' && (
                  <div>
                    <Label className="text-white mb-2 block">Genres</Label>
                    <div className="space-y-2">
                      {['Hip-Hop', 'R&B', 'Pop', 'Rock', 'Jazz', 'Electronic', 'Country'].map(genre => (
                        <div key={genre} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={genre}
                            checked={selectedGenres.includes(genre)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGenres([...selectedGenres, genre]);
                              } else {
                                setSelectedGenres(selectedGenres.filter(g => g !== genre));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={genre} className="text-gray-300 text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Map View for Studios */}
            {view === 'studios' && displayMode === 'map' && (
              <div className="space-y-6">
                <StudioMap
                  studios={filteredStudios}
                  selectedStudio={selectedStudio}
                  onStudioSelect={setSelectedStudio}
                  center={mapCenter}
                  zoom={11}
                  className="h-[600px]"
                />
                
                {/* Selected Studio Details */}
                {selectedStudio && (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={selectedStudio.photos[0] || 'https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg'}
                          alt={selectedStudio.studio_name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white">{selectedStudio.studio_name}</h3>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">
                                {formatPrice(Math.min(...selectedStudio.studio_rooms.map(room => room.hourly_rate_cents)))}
                                <span className="text-sm text-gray-300">/hour</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-gray-300 text-sm mb-2 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {selectedStudio.address}
                          </p>
                          
                          <p className="text-gray-300 text-sm mb-4">
                            {selectedStudio.bio}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button className="bg-purple-600 hover:bg-purple-700">
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedStudio(null)}
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* List View */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-white/10 backdrop-blur-md border-white/20">
                    <div className="animate-pulse">
                      <div className="h-48 bg-gray-600 rounded-t-lg"></div>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 bg-gray-600 rounded mb-4 w-2/3"></div>
                        <div className="flex gap-2 mb-4">
                          <div className="h-6 bg-gray-600 rounded w-16"></div>
                          <div className="h-6 bg-gray-600 rounded w-16"></div>
                        </div>
                        <div className="h-8 bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (view === 'studios' && displayMode === 'list') || view === 'engineers' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {view === 'studios' ? (
                  filteredStudios.map((studio) => (
                    <Card key={studio.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors overflow-hidden group cursor-pointer">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={studio.photos[0] || 'https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg'}
                          alt={studio.studio_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          {studio.is_verified && (
                            <Badge className="bg-green-600 text-white">
                              Verified
                            </Badge>
                          )}
                          <Badge className="bg-purple-600 text-white">
                            {studio.studio_rooms.length} room{studio.studio_rooms.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4">
                          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-white text-sm font-medium">
                              {studio.rating_avg?.toFixed(1) || 'New'}
                            </span>
                            {studio.rating_count > 0 && (
                              <span className="text-gray-300 text-sm">
                                ({studio.rating_count})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-white">{studio.studio_name}</h3>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                              {formatPrice(Math.min(...studio.studio_rooms.map(room => room.hourly_rate_cents)))}
                              <span className="text-sm text-gray-300">/hour</span>
                            </div>
                            {studio.studio_rooms.length > 1 && (
                              <div className="text-sm text-gray-400">
                                from {studio.studio_rooms.length} rooms
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-3 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {studio.address}
                        </p>
                        
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {studio.bio}
                        </p>
                        
                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries(studio.amenities || {})
                            .filter(([_, value]) => value)
                            .slice(0, 4)
                            .map(([key, _]) => (
                              <Badge key={key} variant="outline" className="text-gray-300 border-gray-600">
                                <div className="flex items-center gap-1">
                                  {getAmenityIcon(key)}
                                  <span className="capitalize">{key.replace('_', ' ')}</span>
                                </div>
                              </Badge>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            Book Now
                          </Button>
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  filteredEngineers.map((engineer) => (
                    <Card key={engineer.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-colors overflow-hidden group cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <img
                              src={engineer.users.avatar_url || 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg'}
                              alt={engineer.users.full_name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            {engineer.is_online && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="text-lg font-bold text-white">{engineer.users.full_name}</h3>
                              <div className="text-right">
                                <div className="text-xl font-bold text-white">
                                  {formatPrice(engineer.hourly_rate_cents)}
                                  <span className="text-sm text-gray-300">/hour</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                  <span className="text-white text-sm">
                                    {engineer.rating_avg?.toFixed(1) || 'New'}
                                  </span>
                                  {engineer.rating_count > 0 && (
                                    <span className="text-gray-300 text-sm">
                                      ({engineer.rating_count})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-purple-300 text-sm font-medium mb-2">
                              {engineer.headline}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-300 mb-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {engineer.city}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {engineer.years_experience} years exp
                              </div>
                              {engineer.is_online && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Online Now
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {engineer.bio}
                        </p>
                        
                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {engineer.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-gray-300 border-gray-600 text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {engineer.skills.length > 3 && (
                            <Badge variant="outline" className="text-gray-300 border-gray-600 text-xs">
                              +{engineer.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                        
                        {/* Genres */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {engineer.genres.slice(0, 3).map((genre) => (
                            <Badge key={genre} className="bg-purple-600/20 text-purple-300 text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                            <Headphones className="h-4 w-4 mr-2" />
                            Book Session
                          </Button>
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            View Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
            
            {!loading && 
             ((view === 'studios' && filteredStudios.length === 0) || 
              (view === 'engineers' && filteredEngineers.length === 0)) && 
             displayMode === 'list' && (
              <div className="text-center py-12">
                <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No {view} found
                </h3>
                <p className="text-gray-300 mb-4">
                  Try adjusting your search criteria or location
                </p>
                <Button 
                  onClick={() => {
                    setLocation('');
                    setPriceRange([0, 500]);
                    setMinRating(0);
                    setSelectedGenres([]);
                  }}
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Clear Filters
                </Button>
              </div>
            )}
            
            {/* Empty state for map view */}
            {!loading && view === 'studios' && displayMode === 'map' && filteredStudios.length === 0 && (
              <div className="text-center py-12">
                <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No studios found in this area
                </h3>
                <p className="text-gray-300 mb-4">
                  Try searching in a different location or adjusting your filters
                </p>
                <Button 
                  onClick={() => {
                    setLocation('');
                    setPriceRange([0, 500]);
                    setMinRating(0);
                  }}
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}