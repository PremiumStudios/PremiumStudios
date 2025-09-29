import { createServerSupabaseClient } from '@/lib/supabase/server';

export type SearchParams = {
  location?: string;
  lat?: number;
  lng?: number;
  date?: string;
  duration?: number;
  maxPrice?: number;
  needsEngineer?: boolean;
  genres?: string[];
  skills?: string[];
};

export type MatchResult = {
  studio: any;
  engineer?: any;
  score: number;
  reasons: string[];
  distance?: number;
};

export async function aiSuggestMatches(searchParams: SearchParams): Promise<MatchResult[]> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if AI matchmaking is enabled
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'AI_MATCHMAKING')
      .single();

    const aiEnabled = flag?.value === 'true';

    // Get available studios
    let studioQuery = supabase
      .from('studio_profiles')
      .select(`
        *,
        studio_rooms (
          id,
          name,
          hourly_rate_cents,
          capacity,
          equipment,
          photos,
          is_active
        )
      `)
      .eq('is_accepting_bookings', true)
      .eq('is_verified', true);

    // Get available engineers if needed
    let engineerQuery = null;
    if (searchParams.needsEngineer) {
      engineerQuery = supabase
        .from('engineer_profiles')
        .select(`
          *,
          users!inner (full_name, avatar_url)
        `)
        .eq('is_accepting_bookings', true)
        .eq('is_online', true);

      if (searchParams.genres?.length) {
        engineerQuery = engineerQuery.overlaps('genres', searchParams.genres);
      }
    }

    const [{ data: studios }, engineerResult] = await Promise.all([
      studioQuery,
      engineerQuery ? engineerQuery : Promise.resolve({ data: null })
    ]);

    const engineers = engineerResult?.data || [];

    if (!studios?.length) {
      return [];
    }

    // Calculate matches
    const matches: MatchResult[] = [];

    for (const studio of studios) {
      const activeRooms = studio.studio_rooms.filter((room: any) => room.is_active);
      
      for (const room of activeRooms) {
        // Basic scoring
        let score = 0;
        const reasons: string[] = [];

        // Price scoring (0-30 points)
        const roomPrice = room.hourly_rate_cents / 100;
        if (searchParams.maxPrice) {
          const priceRatio = Math.min(roomPrice / searchParams.maxPrice, 1);
          const priceScore = (1 - priceRatio) * 30;
          score += priceScore;
          if (priceScore > 20) reasons.push('Great price match');
        }

        // Rating scoring (0-25 points)
        if (studio.rating_avg) {
          const ratingScore = (studio.rating_avg / 5) * 25;
          score += ratingScore;
          if (studio.rating_avg >= 4.5) reasons.push('Highly rated studio');
        }

        // Verification bonus (10 points)
        if (studio.is_verified) {
          score += 10;
          reasons.push('Verified studio');
        }

        // Equipment matching (0-20 points)
        if (room.equipment && typeof room.equipment === 'object') {
          const equipmentCount = Object.keys(room.equipment).length;
          const equipmentScore = Math.min(equipmentCount * 2, 20);
          score += equipmentScore;
          if (equipmentScore > 15) reasons.push('Professional equipment');
        }

        // Distance scoring (0-15 points) - placeholder for now
        if (searchParams.lat && searchParams.lng && studio.lat && studio.lng) {
          // Simple distance calculation - in production use proper geospatial functions
          const distance = Math.sqrt(
            Math.pow(searchParams.lat - studio.lat, 2) + 
            Math.pow(searchParams.lng - studio.lng, 2)
          );
          const distanceScore = Math.max(0, 15 - distance * 10);
          score += distanceScore;
          if (distanceScore > 10) reasons.push('Close to you');
        }

        // Find best engineer match if needed
        let bestEngineer = null;
        if (searchParams.needsEngineer && engineers.length) {
          let bestEngineerScore = 0;
          
          for (const engineer of engineers) {
            let engineerScore = 0;
            
            // Price compatibility
            const engineerPrice = engineer.hourly_rate_cents / 100;
            const totalPrice = roomPrice + engineerPrice;
            if (searchParams.maxPrice && totalPrice <= searchParams.maxPrice) {
              engineerScore += 20;
            }

            // Genre matching
            if (searchParams.genres?.length && engineer.genres) {
              const genreMatches = searchParams.genres.filter(g => 
                engineer.genres.some((eg: string) => 
                  eg.toLowerCase().includes(g.toLowerCase())
                )
              ).length;
              engineerScore += genreMatches * 10;
            }

            // Rating
            if (engineer.rating_avg) {
              engineerScore += (engineer.rating_avg / 5) * 15;
            }

            // Experience
            if (engineer.years_experience) {
              engineerScore += Math.min(engineer.years_experience, 10);
            }

            if (engineerScore > bestEngineerScore) {
              bestEngineerScore = engineerScore;
              bestEngineer = engineer;
            }
          }

          if (bestEngineer) {
            score += bestEngineerScore * 0.3; // Weight engineer score at 30%
            reasons.push(`Great engineer match: ${bestEngineer.users.full_name}`);
          }
        }

        matches.push({
          studio: { ...studio, selectedRoom: room },
          engineer: bestEngineer,
          score: Math.round(score),
          reasons,
          distance: searchParams.lat && searchParams.lng && studio.lat && studio.lng 
            ? Math.sqrt(Math.pow(searchParams.lat - studio.lat, 2) + Math.pow(searchParams.lng - studio.lng, 2))
            : undefined
        });
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    // Log AI interaction if enabled
    if (aiEnabled) {
      await logAIInteraction('matchmaking', searchParams, matches.length);
    }

    return matches.slice(0, 20); // Return top 20 matches

  } catch (error) {
    console.error('AI Matchmaking error:', error);
    // Fallback to basic search without AI
    return [];
  }
}

export async function aiCreateBookingFromText(input: string, userId: string): Promise<any> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if AI concierge is enabled
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'AI_CONCIERGE')
      .single();

    if (flag?.value !== 'true') {
      throw new Error('AI Concierge is not enabled');
    }

    // Simple text parsing - in production, use OpenAI or similar
    const searchParams: SearchParams = {
      duration: 2, // default
      needsEngineer: false
    };

    // Extract duration
    const durationMatch = input.match(/(\d+)\s*(hour|hr|h)/i);
    if (durationMatch) {
      searchParams.duration = parseInt(durationMatch[1]);
    }

    // Extract price
    const priceMatch = input.match(/under\s*\$?(\d+)/i);
    if (priceMatch) {
      searchParams.maxPrice = parseInt(priceMatch[1]);
    }

    // Extract location
    const locationMatch = input.match(/(in|at|near)\s+([a-zA-Z\s]+)/i);
    if (locationMatch) {
      searchParams.location = locationMatch[2].trim();
    }

    // Check for engineer need
    if (input.toLowerCase().includes('engineer') || input.toLowerCase().includes('producer')) {
      searchParams.needsEngineer = true;
    }

    // Extract genres
    const genres = ['hip-hop', 'rap', 'r&b', 'pop', 'rock', 'jazz', 'electronic', 'country'];
    searchParams.genres = genres.filter(genre => 
      input.toLowerCase().includes(genre.toLowerCase())
    );

    // Get matches
    const matches = await aiSuggestMatches(searchParams);

    // Log AI interaction
    await logAIInteraction('concierge', { input, userId }, matches.length);

    return {
      searchParams,
      matches: matches.slice(0, 3), // Return top 3 for concierge
      message: matches.length > 0 
        ? `Found ${matches.length} great options for you!`
        : "I couldn't find any matches. Try adjusting your criteria."
    };

  } catch (error) {
    console.error('AI Concierge error:', error);
    await logAIInteraction('concierge', { input, userId, error: error.message }, 0);
    throw error;
  }
}

async function logAIInteraction(action: string, input: any, outputCount: number) {
  const supabase = createServerSupabaseClient();
  
  try {
    const inputHash = Buffer.from(JSON.stringify(input)).toString('base64').slice(0, 32);
    
    await supabase
      .from('ai_logs')
      .insert({
        action,
        input_hash: inputHash,
        output_ref: `${outputCount}_results`,
        tokens: JSON.stringify(input).length, // Rough estimate
        success_score: outputCount > 0 ? 0.8 : 0.2,
        metadata: { timestamp: new Date().toISOString() }
      });
  } catch (error) {
    console.error('Failed to log AI interaction:', error);
  }
}