'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Music, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthClient } from '@/lib/auth';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { resetPassword } = useAuthClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast.error(error.message);
      } else {
        setIsEmailSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <Music className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">Premium Studios</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isEmailSent ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p className="text-gray-300">
            {isEmailSent 
              ? 'We\'ve sent a password reset link to your email address'
              : 'Enter your email address and we\'ll send you a link to reset your password'
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          {!isEmailSent ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300 focus:border-purple-400"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Send Reset Link</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-purple-400" />
              </div>
              
              <div className="space-y-2">
                <p className="text-white">
                  We've sent a password reset link to:
                </p>
                <p className="text-purple-300 font-semibold">{email}</p>
              </div>

              <div className="text-sm text-gray-300 space-y-2">
                <p>Click the link in the email to reset your password.</p>
                <p>Didn't receive the email? Check your spam folder.</p>
              </div>

              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 py-3 rounded-xl"
              >
                Try Different Email
              </Button>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-8 text-center">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center space-x-2 text-purple-300 hover:text-purple-200 font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}