import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Falls back to logging the OTP to the console when SMTP isn't configured,
// so signup keeps working in local/dev environments without mail setup.
export const sendOtpEmail = async (email, otp, name) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[OTP] Signup verification code for ${email}: ${otp}`);
    return;
  }
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your verification code',
    text: `Hi ${name},\n\nYour verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
  });
};
