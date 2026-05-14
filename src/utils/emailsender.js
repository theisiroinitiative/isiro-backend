import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email, name, otp) {
  const payload = {
    from: 'Haggle Proof Ledger <support@isiro-initiative.ddnsgeek.com>',
    to: email,
    subject: 'Your OTP Verification Code',
    html: `<h1>Haggle Proof Ledger</h1><p>Hello ${name},\n\nYour OTP verification code is: ${otp}\n\nThis code will expire in a few minutes.\n\nThank you!</p>`
  };

  const response = await resend.emails.send(payload);
  console.log(response);

  if (response.error) {
    throw new Error(`Failed to send OTP email: ${response.statusText}`);
  }

  return true;
}




export async function sendPasswordResetOTPEmail(email, otp) {
  const payload = {
    to: email,
    subject: 'Password Reset OTP',
    body: `You requested a password reset.\n\nYour OTP code is: ${otp}\n\nIf you did not request this, please ignore this email.`
  };

  const response = await resend.emails.send(payload);

  if (response.error) {
    throw new Error(`Failed to send password reset OTP email: ${response.statusText}`);
  }

  return true;
}
