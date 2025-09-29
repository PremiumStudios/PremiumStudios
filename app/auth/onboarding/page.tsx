'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, MapPin, Phone, Globe, Clock, ArrowRight, CircleCheck as CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form data
  const [formData, setFormData] = useState({
    phone: '',
    city: '',
    state: '',
    country: 'US',
    timezone: 'America/Chicago',
  });

  const states = [
    { value: 'LA', label: 'Louisiana' },
    { value: 'TX', label: 'Texas' },
    { value: 'AL', label: 'Alabama' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'TN', label: 'Tennessee' },
  ];

  const timezones = [
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
    };

    getUser();
  }, [router, supabase.auth]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          phone: formData.phone || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country,
          timezone: formData.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update profile');
        console.error('Profile update error:', error);
      } else {
        toast.success('Profile completed successfully!');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Premium Studios!</h2>
              <p className="text-gray-300">Let's set up your profile to get started</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300 focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Where are you located?</h2>
              <p className="text-gray-300">This helps us show you nearby studios and engineers</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="city"
                    type="text"
                    placeholder="Baton Rouge"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300 focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white focus:border-purple-400">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white focus:border-purple-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Almost done!</h2>
              <p className="text-gray-300">Set your timezone for accurate booking times</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Timezone</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger className="pl-10 bg-white/20 border-white/30 text-white focus:border-purple-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-purple-600/20 rounded-lg p-4 border border-purple-400/30">
                <h3 className="text-white font-semibold mb-2">You're all set!</h3>
                <p className="text-gray-300 text-sm">
                  Your profile is ready. You can always update these details later in your account settings.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-6">
            <Music className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">Premium Studios</span>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  stepNumber < step 
                    ? 'bg-purple-600 text-white' 
                    : stepNumber === step 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/20 text-gray-400'
                }`}>
                  {stepNumber < step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    stepNumber < step ? 'bg-purple-600' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <div className="flex items-center space-x-2">
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Completing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Complete Setup</span>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}