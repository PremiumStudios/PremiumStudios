import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { aiCreateBookingFromText } from '@/lib/ai/matchmaking';
import { z } from 'zod';

const conciergeSchema = z.object({
  message: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = conciergeSchema.parse(body);
    
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process the message with AI Concierge
    const result = await aiCreateBookingFromText(message, user.id);

    return NextResponse.json({
      success: true,
      message: result.message,
      matches: result.matches,
      searchParams: result.searchParams
    });

  } catch (error) {
    console.error('AI Concierge API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}