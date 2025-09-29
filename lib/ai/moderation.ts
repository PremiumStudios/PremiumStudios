import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ModerationResult = {
  isBlocked: boolean;
  flags: string[];
  score: number;
  filteredContent?: string;
};

export async function aiModerateMessage(message: string, userId?: string): Promise<ModerationResult> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if AI leakage guard is enabled
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'AI_LEAKAGE_GUARD')
      .single();

    if (flag?.value !== 'true') {
      return { isBlocked: false, flags: [], score: 0 };
    }

    const flags: string[] = [];
    let score = 0;
    let filteredContent = message;

    // Phone number detection
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    if (phoneRegex.test(message)) {
      flags.push('phone_number');
      score += 0.8;
      filteredContent = filteredContent.replace(phoneRegex, '[PHONE REDACTED]');
    }

    // Email detection
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(message)) {
      flags.push('email');
      score += 0.8;
      filteredContent = filteredContent.replace(emailRegex, '[EMAIL REDACTED]');
    }

    // Social media handles
    const socialRegex = /@[a-zA-Z0-9_]+|instagram\.com|twitter\.com|facebook\.com|tiktok\.com/gi;
    if (socialRegex.test(message)) {
      flags.push('social_media');
      score += 0.6;
      filteredContent = filteredContent.replace(socialRegex, '[SOCIAL REDACTED]');
    }

    // Off-platform payment mentions
    const paymentRegex = /venmo|cashapp|paypal|zelle|cash\s+app/gi;
    if (paymentRegex.test(message)) {
      flags.push('external_payment');
      score += 0.9;
      filteredContent = filteredContent.replace(paymentRegex, '[PAYMENT REDACTED]');
    }

    // External booking platforms
    const platformRegex = /airbnb|booking\.com|vrbo|peerspace/gi;
    if (platformRegex.test(message)) {
      flags.push('external_platform');
      score += 0.7;
      filteredContent = filteredContent.replace(platformRegex, '[PLATFORM REDACTED]');
    }

    // Profanity and inappropriate content (basic)
    const profanityWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole'];
    const profanityRegex = new RegExp(profanityWords.join('|'), 'gi');
    if (profanityRegex.test(message)) {
      flags.push('profanity');
      score += 0.3;
      filteredContent = filteredContent.replace(profanityRegex, '[REDACTED]');
    }

    // Spam indicators
    const spamPhrases = ['make money fast', 'click here', 'limited time', 'act now'];
    const hasSpam = spamPhrases.some(phrase => 
      message.toLowerCase().includes(phrase.toLowerCase())
    );
    if (hasSpam) {
      flags.push('spam');
      score += 0.5;
    }

    const isBlocked = score >= 0.7; // Block if score is 70% or higher

    // Log moderation result
    if (userId) {
      await supabase
        .from('content_moderation')
        .insert({
          content_type: 'message',
          content_id: crypto.randomUUID(),
          user_id: userId,
          ai_score: score,
          ai_flags: flags,
          human_review_status: isBlocked ? 'pending' : 'approved'
        });
    }

    // Log AI interaction
    await logAIModerationInteraction('message_moderation', message, flags.length, score);

    return {
      isBlocked,
      flags,
      score,
      filteredContent: isBlocked ? '[MESSAGE BLOCKED]' : filteredContent
    };

  } catch (error) {
    console.error('AI Moderation error:', error);
    // Fail open - don't block on errors
    return { isBlocked: false, flags: ['error'], score: 0 };
  }
}

export async function aiDisputeRecommendation(bookingId: string): Promise<{
  recommendation: string;
  refundPercent: number;
  reasoning: string[];
}> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if AI dispute helper is enabled
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'AI_DISPUTE_HELPER')
      .single();

    if (flag?.value !== 'true') {
      return {
        recommendation: 'manual_review',
        refundPercent: 0,
        reasoning: ['AI dispute helper is disabled']
      };
    }

    // Get booking and dispute details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        disputes!inner (*),
        users!bookings_artist_id_fkey (full_name),
        studio_profiles (studio_name, rating_avg),
        engineer_profiles (users!inner (full_name), rating_avg)
      `)
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    const dispute = booking.disputes[0];
    const reasoning: string[] = [];
    let refundPercent = 0;

    // Analyze dispute reason
    const reason = dispute.reason.toLowerCase();
    
    if (reason.includes('no show') || reason.includes('didn\'t show')) {
      if (reason.includes('artist')) {
        refundPercent = 0;
        reasoning.push('Artist no-show - no refund warranted');
      } else {
        refundPercent = 100;
        reasoning.push('Studio/engineer no-show - full refund');
      }
    } else if (reason.includes('equipment') || reason.includes('technical')) {
      refundPercent = 50;
      reasoning.push('Technical issues - partial refund appropriate');
    } else if (reason.includes('quality') || reason.includes('unprofessional')) {
      // Check ratings to determine credibility
      const studioRating = booking.studio_profiles.rating_avg || 0;
      const engineerRating = booking.engineer_profiles?.rating_avg || 0;
      
      if (studioRating < 3.0 || engineerRating < 3.0) {
        refundPercent = 75;
        reasoning.push('Low-rated provider with quality complaint - significant refund');
      } else {
        refundPercent = 25;
        reasoning.push('Quality complaint against well-rated provider - minimal refund');
      }
    } else if (reason.includes('cancel') || reason.includes('reschedule')) {
      const hoursUntilSession = Math.abs(
        new Date(booking.start_at).getTime() - new Date().getTime()
      ) / (1000 * 60 * 60);
      
      if (hoursUntilSession >= 24) {
        refundPercent = 100;
        reasoning.push('Cancelled 24+ hours in advance - full refund');
      } else if (hoursUntilSession >= 2) {
        refundPercent = 50;
        reasoning.push('Cancelled 2-24 hours in advance - partial refund');
      } else {
        refundPercent = 0;
        reasoning.push('Last-minute cancellation - no refund');
      }
    } else {
      refundPercent = 25;
      reasoning.push('General dispute - minimal refund pending investigation');
    }

    // Check for photos as evidence
    if (dispute.photos && dispute.photos.length > 0) {
      refundPercent = Math.min(refundPercent + 10, 100);
      reasoning.push('Photo evidence provided - slight increase in refund');
    }

    const recommendation = refundPercent >= 75 ? 'full_refund' : 
                          refundPercent >= 25 ? 'partial_refund' : 'reject';

    // Log AI interaction
    await logAIModerationInteraction('dispute_analysis', bookingId, reasoning.length, refundPercent / 100);

    return {
      recommendation,
      refundPercent,
      reasoning
    };

  } catch (error) {
    console.error('AI Dispute Recommendation error:', error);
    return {
      recommendation: 'manual_review',
      refundPercent: 0,
      reasoning: ['Error in AI analysis - requires manual review']
    };
  }
}

async function logAIModerationInteraction(action: string, input: any, flagCount: number, score: number) {
  const supabase = createServerSupabaseClient();
  
  try {
    const inputHash = Buffer.from(JSON.stringify(input)).toString('base64').slice(0, 32);
    
    await supabase
      .from('ai_logs')
      .insert({
        action,
        input_hash: inputHash,
        output_ref: `${flagCount}_flags`,
        tokens: JSON.stringify(input).length,
        success_score: score,
        metadata: { timestamp: new Date().toISOString() }
      });
  } catch (error) {
    console.error('Failed to log AI moderation interaction:', error);
  }
}