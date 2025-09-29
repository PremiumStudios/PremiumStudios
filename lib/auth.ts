import { createServerSupabaseClient } from './supabase/server';
import { createClient } from './supabase/client';
import { Database } from './supabase/types';
import { redirect } from 'next/navigation';

type User = Database['public']['Tables']['users']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

// Server-side authentication functions
export async function getAuthUser() {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting auth user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getAuthUser:', error);
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

export async function getAuthUserProfile(): Promise<User | null> {
  const user = await getAuthUser();
  
  if (!user) {
    return null;
  }
  
  return await getUserProfile(user.id);
}

export async function requireAuth(): Promise<User> {
  const profile = await getAuthUserProfile();
  
  if (!profile) {
    redirect('/auth/login');
  }
  
  return profile;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const profile = await requireAuth();
  
  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized');
  }
  
  return profile;
}

// Client-side authentication functions
export function useAuthClient() {
  const supabase = createClient();
  
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  };
  
  const signUpWithEmail = async (email: string, password: string, userData?: {
    full_name?: string;
    role?: UserRole;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    return { data, error };
  };
  
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    return { data, error };
  };
  
  const signInWithApple = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    return { data, error };
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };
  
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    return { data, error };
  };
  
  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    
    return { data, error };
  };
  
  return {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
  };
}

// Profile management functions
export async function createUserProfile(userId: string, profileData: {
  role: UserRole;
  full_name?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      ...profileData,
    })
    .select()
    .single();
  
  return { data, error };
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
}

// Utility functions for role checking
export function isArtist(user: User): boolean {
  return user.role === 'artist';
}

export function isEngineer(user: User): boolean {
  return user.role === 'engineer';
}

export function isStudioOwner(user: User): boolean {
  return user.role === 'studio_owner';
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function canManageStudio(user: User, studioId: string): boolean {
  return isAdmin(user) || (isStudioOwner(user) && user.id === studioId);
}

export function canManageBooking(user: User, booking: {
  artist_id: string;
  studio_id: string;
  engineer_id?: string | null;
}): boolean {
  return (
    isAdmin(user) ||
    user.id === booking.artist_id ||
    user.id === booking.studio_id ||
    (booking.engineer_id && user.id === booking.engineer_id)
  );
}