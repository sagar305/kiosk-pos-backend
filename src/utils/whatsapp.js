// Sends receipt messages via the Meta WhatsApp Cloud API
// (https://developers.facebook.com/docs/whatsapp/cloud-api).
//
// Each business configures its own `phoneNumberId` + `accessToken` in
// Business.settings.whatsapp, obtained from their own Meta App + WhatsApp
// Business Account (see docs/whatsapp-receipts.md for the setup walkthrough).
//
// When the server runs with SIMULATE=1 (our dev/staging environments), sends
// are redirected to the business's test credentials (`testPhoneNumberId` /
// `testAccessToken` - Meta's free test number + temporary token) instead of
// their live ones, so receipts can be tried end-to-end without touching real
// customers or incurring production conversation charges.

const GRAPH_API_VERSION = 'v21.0';

const isSimulate = () => process.env.SIMULATE === '1';

export class WhatsAppNotConfiguredError extends Error {}

export const formatReceiptMessage = (token, business) => {
  const lines = [
    `*${business.name}*`,
    `Receipt for Order #${token.tokenNumber}`,
    '',
    ...token.items.map((i) => `${i.qty} x ${i.name} - ${business.currency} ${(i.price * i.qty).toFixed(2)}`),
    '',
    `Total: ${business.currency} ${token.total.toFixed(2)}`,
    '',
    'Thank you for your order!',
  ];
  return lines.join('\n');
};

export const sendWhatsAppReceipt = async (business, mobile, message) => {
  const wa = business.settings?.whatsapp || {};
  if (!wa.enabled) throw new WhatsAppNotConfiguredError('WhatsApp receipts are not enabled for this business');

  const simulate = isSimulate();
  const phoneNumberId = simulate ? wa.testPhoneNumberId : wa.phoneNumberId;
  const accessToken = simulate ? wa.testAccessToken : wa.accessToken;

  if (!phoneNumberId || !accessToken) {
    throw new WhatsAppNotConfiguredError(
      simulate
        ? 'WhatsApp test credentials are missing (testPhoneNumberId / testAccessToken)'
        : 'WhatsApp credentials are missing (phoneNumberId / accessToken)'
    );
  }

  const to = mobile.replace(/[^\d+]/g, '');

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.message || res.statusText;
    throw new Error(`WhatsApp send failed: ${reason}`);
  }
  return data;
};
