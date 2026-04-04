import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { errorResponse, authError } from '@/lib/api-response';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('No se pudo obtener token de PayPal');
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { paypal_order_id } = await request.json();

    if (!paypal_order_id) return errorResponse('paypal_order_id es requerido', 400);

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const capture = await captureRes.json();

    if (!captureRes.ok || capture.status !== 'COMPLETED') {
      console.error('PayPal capture error:', capture);
      return errorResponse(capture.message || 'El pago no fue completado', 400);
    }

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];

    return Response.json({
      success: true,
      data: {
        status: capture.status,
        capture_id: captureUnit?.id,
        monto_usd: captureUnit?.amount?.value,
        currency: captureUnit?.amount?.currency_code,
        payer_email: capture.payer?.email_address,
        payer_name: `${capture.payer?.name?.given_name || ''} ${capture.payer?.name?.surname || ''}`.trim(),
      },
    });
  } catch (e) {
    const a = authError(e);
    if (a) return errorResponse(a, 403);
    console.error('PayPal capture error:', e);
    return errorResponse('Error al capturar el pago de PayPal');
  }
}
