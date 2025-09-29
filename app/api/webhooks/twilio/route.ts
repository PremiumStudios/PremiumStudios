import { NextRequest, NextResponse } from 'next/server';
import { handleInboundSMS } from '@/lib/sms/marketing';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clean phone number (remove +1 prefix if present)
    const cleanPhone = from.replace(/^\+1/, '');

    // Process the inbound SMS
    const response = await handleInboundSMS(cleanPhone, body);

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having technical difficulties. Please visit premiumsessions.com or try again later! 🎵</Message>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 500,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}