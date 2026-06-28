import { Resend } from 'resend';

let resend = null;

function getResend() {
  if (resend) return resend;
  if (!process.env.RESEND_API_KEY) return null;
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// Falls back to logging the OTP to the console when Resend isn't configured,
// so signup keeps working in local/dev environments without mail setup.
export const sendOtpEmail = async (email, otp, name) => {
  const client = getResend();
  if (!client) {
    console.log(`[OTP] Signup verification code for ${email}: ${otp}`);
    return;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: email,
    subject: 'Your verification code',
    text: `Hi ${name},\n\nYour verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
  });
};
