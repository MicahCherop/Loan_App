import { serve } from "https://deno.land/std@0.210.0/http/server.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DAR_API_KEY = Deno.env.get('DAR_API_KEY') ?? '';
const DAR_API_SECRET = Deno.env.get('DAR_API_SECRET') ?? '';
const DAR_SHORTCODE = Deno.env.get('DAR_SHORTCODE') ?? '';
const DAR_PASSKEY = Deno.env.get('DAR_PASSKEY') ?? '';
const DAR_CALLBACK_URL = Deno.env.get('DAR_CALLBACK_URL') ?? '';
const DAR_BASE_URL = Deno.env.get('DAR_BASE_URL') ?? 'https://sandbox.safaricom.co.ke';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

async function updatePushRecord(recordId: string, payload: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/rest/v1/push_payment_requests?id=eq.${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn('Failed to update push_payment_requests record:', response.status, text);
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return errorResponse('Missing Supabase runtime configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined.');
  }

  if (!DAR_API_KEY || !DAR_API_SECRET || !DAR_SHORTCODE || !DAR_PASSKEY || !DAR_CALLBACK_URL) {
    return errorResponse('Missing Daraja API credentials. Configure DAR_API_KEY, DAR_API_SECRET, DAR_SHORTCODE, DAR_PASSKEY, and DAR_CALLBACK_URL as Supabase secrets.');
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return errorResponse('Invalid JSON body: ' + String(err), 400);
  }

  const { phone, amount, accountRef, description, recordId } = body;
  if (!phone || !amount || !accountRef || !description) {
    return errorResponse('Missing required fields: phone, amount, accountRef, description.', 400);
  }

  const auth = btoa(`${DAR_API_KEY}:${DAR_API_SECRET}`);
  const tokenRes = await fetch(`${DAR_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!tokenRes.ok) {
    const message = await tokenRes.text();
    return errorResponse(`Daraja OAuth failed: ${tokenRes.status} ${message}`, 502);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return errorResponse('Daraja OAuth response did not include access_token.', 502);
  }

  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const password = btoa(`${DAR_SHORTCODE}${DAR_PASSKEY}${timestamp}`);

  const stkBody = {
    BusinessShortCode: DAR_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: DAR_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: DAR_CALLBACK_URL,
    AccountReference: accountRef,
    TransactionDesc: description,
  };

  const stkRes = await fetch(`${DAR_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stkBody),
  });

  const stkJson = await stkRes.json();
  const responseCode = String(stkJson.ResponseCode ?? stkJson.response_code ?? '');
  const checkoutRequestId = stkJson.CheckoutRequestID ?? stkJson.checkoutRequestID ?? null;
  const status = responseCode === '0' ? 'success' : 'failed';

  if (recordId) {
    await updatePushRecord(recordId, {
      status,
      daraja_response_code: responseCode,
      daraja_checkout_request_id: checkoutRequestId,
      daraja_response: stkJson,
      updated_at: new Date().toISOString(),
    });
  }

  if (!stkRes.ok || responseCode !== '0') {
    return errorResponse('STK push failed: ' + JSON.stringify(stkJson), 502);
  }

  return jsonResponse({ success: true, data: stkJson });
});
