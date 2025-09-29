export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: 'artist' | 'engineer' | 'studio_owner' | 'admin';
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'artist' | 'engineer' | 'studio_owner' | 'admin';
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'artist' | 'engineer' | 'studio_owner' | 'admin';
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      studio_profiles: {
        Row: {
          id: string;
          studio_name: string;
          address: string;
          lat: number | null;
          lng: number | null;
          bio: string | null;
          amenities: any;
          stripe_connect_id: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          is_verified: boolean | null;
          is_accepting_bookings: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          studio_name: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          bio?: string | null;
          amenities?: any;
          stripe_connect_id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          is_verified?: boolean | null;
          is_accepting_bookings?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          studio_name?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          bio?: string | null;
          amenities?: any;
          stripe_connect_id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          is_verified?: boolean | null;
          is_accepting_bookings?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      studio_rooms: {
        Row: {
          id: string;
          studio_id: string;
          name: string;
          hourly_rate_cents: number;
          capacity: number | null;
          equipment: any;
          photos: string[] | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          studio_id: string;
          name: string;
          hourly_rate_cents: number;
          capacity?: number | null;
          equipment?: any;
          photos?: string[] | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          studio_id?: string;
          name?: string;
          hourly_rate_cents?: number;
          capacity?: number | null;
          equipment?: any;
          photos?: string[] | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      engineer_profiles: {
        Row: {
          id: string;
          headline: string | null;
          bio: string | null;
          skills: string[] | null;
          genres: string[] | null;
          hourly_rate_cents: number;
          years_experience: number | null;
          portfolio_urls: string[] | null;
          stripe_connect_id: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          is_online: boolean | null;
          is_accepting_bookings: boolean | null;
          city: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          headline?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          genres?: string[] | null;
          hourly_rate_cents: number;
          years_experience?: number | null;
          portfolio_urls?: string[] | null;
          stripe_connect_id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          is_online?: boolean | null;
          is_accepting_bookings?: boolean | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          headline?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          genres?: string[] | null;
          hourly_rate_cents?: number;
          years_experience?: number | null;
          portfolio_urls?: string[] | null;
          stripe_connect_id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          is_online?: boolean | null;
          is_accepting_bookings?: boolean | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          artist_id: string;
          studio_id: string;
          room_id: string;
          engineer_id: string | null;
          start_at: string;
          end_at: string;
          status: 'pending' | 'studio_confirmed' | 'engineer_confirmed' | 'in_progress' | 'completed' | 'cancelled';
          subtotal_cents: number;
          app_fee_cents: number;
          studio_payout_cents: number;
          engineer_payout_cents: number | null;
          stripe_payment_intent_id: string | null;
          stripe_transfer_ids: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          studio_id: string;
          room_id: string;
          engineer_id?: string | null;
          start_at: string;
          end_at: string;
          status?: 'pending' | 'studio_confirmed' | 'engineer_confirmed' | 'in_progress' | 'completed' | 'cancelled';
          subtotal_cents: number;
          app_fee_cents?: number;
          studio_payout_cents: number;
          engineer_payout_cents?: number | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_ids?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          studio_id?: string;
          room_id?: string;
          engineer_id?: string | null;
          start_at?: string;
          end_at?: string;
          status?: 'pending' | 'studio_confirmed' | 'engineer_confirmed' | 'in_progress' | 'completed' | 'cancelled';
          subtotal_cents?: number;
          app_fee_cents?: number;
          studio_payout_cents?: number;
          engineer_payout_cents?: number | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_ids?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          state: string;
          country: string;
          lat: number | null;
          lng: number | null;
          is_pilot_city: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          state: string;
          country?: string;
          lat?: number | null;
          lng?: number | null;
          is_pilot_city?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          state?: string;
          country?: string;
          lat?: number | null;
          lng?: number | null;
          is_pilot_city?: boolean | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'artist' | 'engineer' | 'studio_owner' | 'admin';
      booking_status: 'pending' | 'studio_confirmed' | 'engineer_confirmed' | 'in_progress' | 'completed' | 'cancelled';
      owner_type: 'room' | 'engineer';
      reviewee_type: 'studio' | 'engineer';
    };
  };
};