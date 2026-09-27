// Put this at app/api/hq/action/route.ts in each product app.
// Replace the TODO lines with that app's own database calls — I'll wire these in when you send the repo.
import { verifyHQRequest, reportToHQ } from '@/lib/hq';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const msg = await verifyHQRequest(req);
  if (!msg) return new Response('Unauthorized', { status: 401 });

  switch (msg.action) {
    case 'disable':
      // TODO: mark the site as disabled so guests + TV see an "unavailable" page
      break;
    case 'enable':
      // TODO: mark the site live again
      break;
    case 'extend':
      // TODO: set the site's expiry to msg.expires_at
      break;
    case 'resend_email':
      // TODO: call the same function that sends the welcome email after checkout
      break;
    default:
      return new Response('Unknown action', { status: 400 });
  }
  return Response.json({ ok: true, slug: msg.slug });
}
