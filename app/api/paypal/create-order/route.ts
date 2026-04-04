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
    const { monto_lempiras, id_pedido_temp } = await request.json();

    if (!monto_lempiras || monto_lempiras <= 0) {
      return errorResponse('Monto inválido', 400);
    }

    // Convertir Lempiras a USD (tasa aproximada, en producción usar API de cambio)
    const TASA_HNL_USD = 0.040; // 1 HNL ≈ 0.040 USD
    const monto_usd = (monto_lempiras * TASA_HNL_USD).toFixed(2);

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `techhn-${Date.now()}-${id_pedido_temp || 'new'}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: id_pedido_temp ? String(id_pedido_temp) : 'checkout',
            description: 'Compra en TechHN',
            amount: {
              currency_code: 'USD',
              value: monto_usd,
            },
          },
        ],
        application_context: {
          brand_name: 'TechHN',
          locale: 'es-HN',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout?paypal=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout?paypal=cancel`,
        },
      }),
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      console.error('PayPal error:', order);
      return errorResponse(order.message || 'Error al crear orden en PayPal', 400);
    }

    return Response.json({ success: true, data: { id: order.id, monto_usd } });
  } catch (e) {
    const a = authError(e);
    if (a) return errorResponse(a, 403);
    console.error('PayPal create-order error:', e);
    return errorResponse('Error al crear la orden de PayPal');
  }
}
