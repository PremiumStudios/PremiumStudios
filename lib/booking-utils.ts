import { createServerSupabaseClient } from './supabase/server';
import { addMinutes, isAfter, isBefore, parseISO } from 'date-fns';

export type BookingSlot = {
  start_at: string;
  end_at: string;
  room_id: string;
  engineer_id?: string | null;
};

export type AvailabilitySlot = {
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export const createBookingSlot = async (
  roomId: string,
  engineerId: string | null,
  startAt: string,
  endAt: string,
  userId: string
) => {
  const supabase = createServerSupabaseClient();
  
  // Clean up expired slots first
  await supabase
    .from('booking_slots')
    .delete()
    .lt('expires_at', new Date().toISOString());
  
  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('booking_slots')
    .select('*')
    .eq('room_id', roomId)
    .gte('end_at', startAt)
    .lte('start_at', endAt);
  
  if (conflicts && conflicts.length > 0) {
    throw new Error('Time slot is already locked by another user');
  }
  
  // Create the slot lock
  const { data, error } = await supabase
    .from('booking_slots')
    .insert({
      room_id: roomId,
      engineer_id: engineerId,
      start_at: startAt,
      end_at: endAt,
      locked_by_user: userId,
      expires_at: addMinutes(new Date(), 10).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const validateBookingSlot = async (
  roomId: string,
  engineerId: string | null,
  startAt: string,
  endAt: string,
  userId: string
) => {
  const supabase = createServerSupabaseClient();
  
  // Check if user has a valid slot lock
  const { data: slot } = await supabase
    .from('booking_slots')
    .select('*')
    .eq('room_id', roomId)
    .eq('locked_by_user', userId)
    .eq('start_at', startAt)
    .eq('end_at', endAt)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (!slot) {
    throw new Error('Booking slot has expired or is invalid');
  }
  
  // Check for booking conflicts
  const { data: bookingConflicts } = await supabase
    .from('bookings')
    .select('*')
    .eq('room_id', roomId)
    .neq('status', 'cancelled')
    .gte('end_at', startAt)
    .lte('start_at', endAt);
  
  if (bookingConflicts && bookingConflicts.length > 0) {
    throw new Error('Time slot is no longer available');
  }
  
  // Check engineer conflicts if engineer is specified
  if (engineerId) {
    const { data: engineerConflicts } = await supabase
      .from('bookings')
      .select('*')
      .eq('engineer_id', engineerId)
      .neq('status', 'cancelled')
      .gte('end_at', startAt)
      .lte('start_at', endAt);
    
    if (engineerConflicts && engineerConflicts.length > 0) {
      throw new Error('Engineer is no longer available for this time slot');
    }
  }
  
  return slot;
};

export const releaseBookingSlot = async (slotId: string, userId: string) => {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('booking_slots')
    .delete()
    .eq('id', slotId)
    .eq('locked_by_user', userId);
  
  if (error) throw error;
};

export const checkAvailability = async (
  roomId: string,
  engineerId: string | null,
  startAt: string,
  endAt: string
) => {
  const supabase = createServerSupabaseClient();
  const startDate = parseISO(startAt);
  const endDate = parseISO(endAt);
  const weekday = startDate.getDay();
  const startMinute = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinute = endDate.getHours() * 60 + endDate.getMinutes();
  
  // Check room availability
  const { data: roomAvailability } = await supabase
    .from('availabilities')
    .select('*')
    .eq('owner_type', 'room')
    .eq('owner_id', roomId)
    .eq('weekday', weekday)
    .lte('start_minute', startMinute)
    .gte('end_minute', endMinute);
  
  if (!roomAvailability || roomAvailability.length === 0) {
    return { available: false, reason: 'Room not available at this time' };
  }
  
  // Check engineer availability if specified
  if (engineerId) {
    const { data: engineerAvailability } = await supabase
      .from('availabilities')
      .select('*')
      .eq('owner_type', 'engineer')
      .eq('owner_id', engineerId)
      .eq('weekday', weekday)
      .lte('start_minute', startMinute)
      .gte('end_minute', endMinute);
    
    if (!engineerAvailability || engineerAvailability.length === 0) {
      return { available: false, reason: 'Engineer not available at this time' };
    }
  }
  
  // Check for existing bookings
  const { data: bookingConflicts } = await supabase
    .from('bookings')
    .select('*')
    .eq('room_id', roomId)
    .neq('status', 'cancelled')
    .gte('end_at', startAt)
    .lte('start_at', endAt);
  
  if (bookingConflicts && bookingConflicts.length > 0) {
    return { available: false, reason: 'Time slot already booked' };
  }
  
  if (engineerId) {
    const { data: engineerConflicts } = await supabase
      .from('bookings')
      .select('*')
      .eq('engineer_id', engineerId)
      .neq('status', 'cancelled')
      .gte('end_at', startAt)
      .lte('start_at', endAt);
    
    if (engineerConflicts && engineerConflicts.length > 0) {
      return { available: false, reason: 'Engineer already booked' };
    }
  }
  
  return { available: true };
};

export const extendBooking = async (
  bookingId: string,
  additionalMinutes: number,
  userId: string
) => {
  const supabase = createServerSupabaseClient();
  
  // Get current booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      *,
      studio_rooms!inner(hourly_rate_cents),
      engineer_profiles(hourly_rate_cents)
    `)
    .eq('id', bookingId)
    .eq('artist_id', userId)
    .eq('status', 'in_progress')
    .single();
  
  if (bookingError || !booking) {
    throw new Error('Booking not found or not in progress');
  }
  
  const newEndAt = addMinutes(parseISO(booking.end_at), additionalMinutes).toISOString();
  
  // Check availability for extended time
  const availability = await checkAvailability(
    booking.room_id,
    booking.engineer_id,
    booking.end_at,
    newEndAt
  );
  
  if (!availability.available) {
    throw new Error(`Cannot extend booking: ${availability.reason}`);
  }
  
  // Calculate overtime charges (1.5x rate)
  const roomOvertimeCost = Math.floor(
    (booking.studio_rooms.hourly_rate_cents * 1.5 * additionalMinutes) / 60
  );
  const engineerOvertimeCost = booking.engineer_profiles
    ? Math.floor((booking.engineer_profiles.hourly_rate_cents * 1.5 * additionalMinutes) / 60)
    : 0;
  
  const overtimeTotal = roomOvertimeCost + engineerOvertimeCost;
  
  // Update booking
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      end_at: newEndAt,
      overtime_minutes: booking.overtime_minutes + additionalMinutes,
      subtotal_cents: booking.subtotal_cents + overtimeTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  return {
    booking: updatedBooking,
    overtimeCost: overtimeTotal,
  };
};

export const addTip = async (
  bookingId: string,
  tipAmountCents: number,
  payerId: string
) => {
  const supabase = createServerSupabaseClient();
  
  // Verify booking is completed and user is the artist
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('artist_id', payerId)
    .eq('status', 'completed')
    .single();
  
  if (!booking) {
    throw new Error('Booking not found or not completed');
  }
  
  // Check if tip already exists
  const { data: existingTip } = await supabase
    .from('tips')
    .select('*')
    .eq('booking_id', bookingId)
    .single();
  
  if (existingTip) {
    throw new Error('Tip already added for this booking');
  }
  
  // Create tip record
  const { data: tip, error } = await supabase
    .from('tips')
    .insert({
      booking_id: bookingId,
      payer_id: payerId,
      amount_cents: tipAmountCents,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Update booking with tip amount
  await supabase
    .from('bookings')
    .update({
      tip_cents: tipAmountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  
  return tip;
};