export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateCustomerIdentifier() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

