import { createServerSupabaseClient } from '@/lib/supabase/server';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export type SMSTemplate = {
  id: string;
  name: string;
  body: string;
  category: 'booking_confirmation' | 'reminder' | 'reengagement' | 'winback' | 'cancellation';
};

export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: 'booking_confirmed',
    name: 'Booking Confirmation',
    body: '🎵 Your session at {studio_name} is confirmed for {date} at {time}! Address: {address}. Questions? Reply HELP',
    category: 'booking_confirmation'
  },
  {
    id: 'session_reminder_24h',
    name: '24 Hour Reminder',
    body: '⏰ Reminder: Your recording session is tomorrow at {time} at {studio_name}. Ready to create something amazing?',
    category: 'reminder'
  },
  {
    id: 'session_reminder_2h',
    name: '2 Hour Reminder',
    body: '🎤 Your session starts in 2 hours at {studio_name}! Don\'t forget your lyrics/tracks. See you soon!',
    category: 'reminder'
  },
  {
    id: 'reengagement_30d',
    name: '30 Day Re-engagement',
    body: '🎶 Miss the studio vibes? Book your next session and get $10 off with code COMEBACK10. What\'s your next track?',
    category: 'reengagement'
  },
  {
    id: 'winback_90d',
    name: '90 Day Win-back',
    body: '🎵 We miss you! Come back to Premium Sessions and get 20% off your next booking. Your sound deserves the best studios.',
    category: 'winback'
  },
  {
    id: 'cancellation_rebook',
    name: 'Cancellation Rebook',
    body: '😔 Sorry your session was cancelled. We found 3 similar studios available today. Want us to send the options?',
    category: 'cancellation'
  }
];

export async function sendSMS(
  userId: string, 
  templateId: string, 
  variables: Record<string, string> = {},
  bookingId?: string
): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Twilio credentials not configured');
    return false;
  }

  const supabase = createServerSupabaseClient();

  try {
    // Get user phone number
    const { data: user } = await supabase
      .from('users')
      .select('phone, full_name')
      .eq('id', userId)
      .single();

    if (!user?.phone) {
      console.error('User phone number not found');
      return false;
    }

    // Get template
    const template = SMS_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.error('SMS template not found:', templateId);
      return false;
    }

    // Replace variables in template
    let body = template.body;
    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    // Add user's name if not provided
    if (!variables.name && user.full_name) {
      body = body.replace('{name}', user.full_name);
    }

    // Send SMS via Twilio (mock implementation)
    const success = await sendTwilioSMS(user.phone, body);

    // Log SMS
    await supabase
      .from('sms_logs')
      .insert({
        user_id: userId,
        template_id: templateId,
        body,
        sent_at: new Date().toISOString(),
        delivered_at: success ? new Date().toISOString() : null,
        booking_id: bookingId,
        metadata: { variables, template_name: template.name }
      });

    return success;

  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

async function sendTwilioSMS(to: string, body: string): Promise<boolean> {
  try {
    // Mock Twilio implementation - replace with actual Twilio client
    console.log(`SMS to ${to}: ${body}`);
    
    // In production, use:
    // const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // const message = await client.messages.create({
    //   body,
    //   from: TWILIO_PHONE_NUMBER,
    //   to
    // });
    // return message.sid ? true : false;

    return true; // Mock success
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}

export async function handleInboundSMS(from: string, body: string): Promise<string> {
  const supabase = createServerSupabaseClient();

  try {
    // Find user by phone number
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('phone', from)
      .single();

    if (!user) {
      return "Hi! We don't recognize this number. Sign up at premiumsessions.com to get started! 🎵";
    }

    const message = body.toLowerCase().trim();

    // Handle common responses
    if (message.includes('stop') || message.includes('unsubscribe')) {
      // Mark user as unsubscribed
      await supabase
        .from('sms_logs')
        .insert({
          user_id: user.id,
          template_id: 'unsubscribe',
          body: message,
          outcome: 'unsubscribed'
        });
      
      return "You've been unsubscribed from SMS notifications. You can re-enable them in your account settings.";
    }

    if (message.includes('help')) {
      return "Premium Sessions Help:\n• Reply with booking requests like 'book 2 hours tonight'\n• Visit premiumsessions.com\n• Text STOP to unsubscribe";
    }

    // Check if it's a booking request
    if (message.includes('book') || message.includes('studio') || message.includes('session')) {
      // Use AI Concierge to process the request
      try {
        const { aiCreateBookingFromText } = await import('@/lib/ai/matchmaking');
        const result = await aiCreateBookingFromText(message, user.id);
        
        if (result.matches.length > 0) {
          const topMatch = result.matches[0];
          const studio = topMatch.studio;
          const room = studio.selectedRoom;
          
          // Log successful SMS conversion
          await supabase
            .from('sms_logs')
            .insert({
              user_id: user.id,
              template_id: 'ai_concierge_response',
              body: message,
              outcome: 'booked'
            });

          return `🎵 Found a great match!\n\n${studio.studio_name} - ${room.name}\n$${room.hourly_rate_cents/100}/hr\n\nBook now: premiumsessions.com/book/${studio.id}/${room.id}`;
        } else {
          return "I couldn't find any available studios matching your request. Try visiting premiumsessions.com to see all options! 🎤";
        }
      } catch (error) {
        console.error('AI Concierge SMS error:', error);
        return "I'm having trouble processing your request. Please visit premiumsessions.com or try again later! 🎵";
      }
    }

    // Default response
    return `Hi ${user.full_name}! I can help you book studios. Try: "book 2 hours tonight in Baton Rouge" or visit premiumsessions.com 🎵`;

  } catch (error) {
    console.error('Inbound SMS handling error:', error);
    return "Sorry, I'm having technical difficulties. Please visit premiumsessions.com or try again later! 🎵";
  }
}

export async function runWeeklyAISMSTrainer(): Promise<void> {
  const supabase = createServerSupabaseClient();

  try {
    // Check if AI SMS trainer is enabled
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'AI_SMS_TRAINER')
      .single();

    if (flag?.value !== 'true') {
      console.log('AI SMS Trainer is disabled');
      return;
    }

    // Analyze SMS performance from the last week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: smsLogs } = await supabase
      .from('sms_logs')
      .select('template_id, outcome, clicked_at, delivered_at')
      .gte('sent_at', weekAgo.toISOString());

    if (!smsLogs?.length) {
      console.log('No SMS data to analyze');
      return;
    }

    // Calculate performance metrics by template
    const templateStats: Record<string, {
      sent: number;
      delivered: number;
      clicked: number;
      booked: number;
      deliveryRate: number;
      clickRate: number;
      conversionRate: number;
    }> = {};

    smsLogs.forEach(log => {
      if (!templateStats[log.template_id]) {
        templateStats[log.template_id] = {
          sent: 0,
          delivered: 0,
          clicked: 0,
          booked: 0,
          deliveryRate: 0,
          clickRate: 0,
          conversionRate: 0
        };
      }

      const stats = templateStats[log.template_id];
      stats.sent++;
      
      if (log.delivered_at) stats.delivered++;
      if (log.clicked_at) stats.clicked++;
      if (log.outcome === 'booked') stats.booked++;
    });

    // Calculate rates
    Object.values(templateStats).forEach(stats => {
      stats.deliveryRate = stats.sent > 0 ? stats.delivered / stats.sent : 0;
      stats.clickRate = stats.delivered > 0 ? stats.clicked / stats.delivered : 0;
      stats.conversionRate = stats.sent > 0 ? stats.booked / stats.sent : 0;
    });

    // Identify low performers (conversion rate < 5%)
    const lowPerformers = Object.entries(templateStats)
      .filter(([_, stats]) => stats.conversionRate < 0.05 && stats.sent > 10)
      .map(([templateId]) => templateId);

    // Generate new template variants (mock AI generation)
    const newVariants = generateNewSMSVariants(lowPerformers);

    // Store new variants for admin approval
    for (const variant of newVariants) {
      await supabase
        .from('promo_tests')
        .insert({
          variant_name: variant.name,
          template_text: variant.body,
          impressions: 0,
          conversions: 0,
          is_active: false // Requires admin approval
        });
    }

    // Log AI training session
    await supabase
      .from('ai_logs')
      .insert({
        action: 'sms_trainer',
        input_hash: Buffer.from(JSON.stringify(templateStats)).toString('base64').slice(0, 32),
        output_ref: `${newVariants.length}_variants`,
        tokens: JSON.stringify(templateStats).length,
        success_score: newVariants.length > 0 ? 0.8 : 0.5,
        metadata: { 
          low_performers: lowPerformers,
          new_variants: newVariants.length,
          analyzed_messages: smsLogs.length
        }
      });

    console.log(`AI SMS Trainer completed: analyzed ${smsLogs.length} messages, generated ${newVariants.length} new variants`);

  } catch (error) {
    console.error('AI SMS Trainer error:', error);
  }
}

function generateNewSMSVariants(lowPerformers: string[]): Array<{name: string, body: string}> {
  // Mock AI-generated variants - in production, use OpenAI or similar
  const variants = [
    {
      name: 'booking_confirmed_v2',
      body: '🔥 Session locked in! {studio_name} on {date} at {time}. Address: {address}. Ready to make magic? 🎵'
    },
    {
      name: 'reminder_24h_v2', 
      body: '⚡ T-minus 24 hours! Your session at {studio_name} tomorrow at {time}. What masterpiece will you create?'
    },
    {
      name: 'reengagement_30d_v2',
      body: '🎤 Your next hit is waiting! Book any studio this week and save $15 with code RETURN15. What\'s cooking?'
    }
  ];

  return variants.filter(v => 
    lowPerformers.some(lp => v.name.includes(lp.split('_')[0]))
  );
}