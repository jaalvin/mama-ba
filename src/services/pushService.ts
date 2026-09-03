/**
 * src/services/pushService.ts
 *
 * Web Push (VAPID) service for Mama Ba.
 * - Manages PushSubscription storage in Supabase
 * - Sends push notifications via web-push library
 * - Runs a cron-based scheduler for medication & ANC reminders
 */
import webpush from 'web-push';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// ── VAPID Configuration ────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || 'BNkA8cWC_3YBIF9pg1DIjc2UW3jbfhALZW0vklh2mbRDm-G6FThzKyd-P4k5OsxXXFVf8aHgAfLEt8oYWKHHgMQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'JqnAVGdxwnU6ZAU8lQm8dQClwtEOGJB0VIaEvfzx-g8';
const VAPID_MAILTO      = process.env.VAPID_MAILTO      || 'mailto:support@mamaba.app';

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export { VAPID_PUBLIC_KEY };

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export interface ScheduledPushEvent {
  userId: string;
  eventId: string;         // unique, e.g. "med-abc123-daily"
  title: string;
  body: string;
  scheduledTime: string;   // "HH:MM" 24h format for daily, or ISO datetime
  recurrence: 'daily' | 'once';
  tag?: string;
}

// ── Save Push Subscription ────────────────────────────────────────────────────
export async function saveSubscription(userId: string, subscription: PushSubscriptionPayload): Promise<void> {
  await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
}

// ── Remove Push Subscription ──────────────────────────────────────────────────
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
}

// ── Send Push to a User (all their subscriptions) ────────────────────────────
export async function sendPushToUser(userId: string, title: string, body: string, tag?: string): Promise<void> {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: tag || `mama-ba-${Date.now()}`,
    data: { url: '/app' },
  });

  const sendPromises = subs.map(async (sub) => {
    const pushSub: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSub, payload);
    } catch (err: any) {
      // 410 = subscription expired/invalid — clean it up
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}

// ── Schedule a Push Event ──────────────────────────────────────────────────────
export async function scheduleReminder(event: ScheduledPushEvent): Promise<void> {
  await supabaseAdmin
    .from('push_scheduled_events')
    .upsert({
      event_id: event.eventId,
      user_id: event.userId,
      title: event.title,
      body: event.body,
      scheduled_time: event.scheduledTime,
      recurrence: event.recurrence,
      tag: event.tag || event.eventId,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id' });
}

// ── Delete a Scheduled Event ───────────────────────────────────────────────────
export async function cancelReminder(eventId: string): Promise<void> {
  await supabaseAdmin
    .from('push_scheduled_events')
    .update({ is_active: false })
    .eq('event_id', eventId);
}

// ── Cron Worker: fires every minute, checks for due events ────────────────────
export async function runPushSchedulerTick(): Promise<void> {
  const now = new Date();
  const hours   = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  const todayStr = now.toISOString().split('T')[0];

  try {
    // Fetch all active scheduled events
    const { data: events } = await supabaseAdmin
      .from('push_scheduled_events')
      .select('*')
      .eq('is_active', true);

    if (!events || events.length === 0) return;

    for (const ev of events) {
      let shouldFire = false;

      if (ev.recurrence === 'daily') {
        // Fire if current HH:MM matches
        shouldFire = ev.scheduled_time === currentTimeStr;
      } else if (ev.recurrence === 'once') {
        // Fire if ISO datetime is within this minute
        const targetDate = new Date(ev.scheduled_time);
        const targetStr = `${String(targetDate.getHours()).padStart(2,'0')}:${String(targetDate.getMinutes()).padStart(2,'0')}`;
        const targetDay = targetDate.toISOString().split('T')[0];
        shouldFire = targetDay === todayStr && targetStr === currentTimeStr;
      }

      if (shouldFire) {
        // Prevent double-fire: check last_fired
        if (ev.last_fired) {
          const lastFired = new Date(ev.last_fired);
          const msSinceFired = now.getTime() - lastFired.getTime();
          if (msSinceFired < 50_000) continue; // already fired within last 50s
        }

        // Send the push
        await sendPushToUser(ev.user_id, ev.title, ev.body, ev.tag);

        // Update last_fired
        await supabaseAdmin
          .from('push_scheduled_events')
          .update({ last_fired: now.toISOString() })
          .eq('event_id', ev.event_id);

        // If once-off, deactivate it
        if (ev.recurrence === 'once') {
          await supabaseAdmin
            .from('push_scheduled_events')
            .update({ is_active: false })
            .eq('event_id', ev.event_id);
        }
      }
    }
  } catch (err) {
    console.error('[PushScheduler] Error in tick:', err);
  }
}
