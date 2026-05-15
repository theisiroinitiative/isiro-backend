export function validateSignup(req, res, next) {
  const { name, email, phoneNumber, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
  }

  const trimmedEmail = email ? email.trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  req.body.email = trimmedEmail;

  const phoneRegex = /^\+?\d{7,15}$/;
  if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password is required and must be at least 8 characters.' });
  }

  next();
}

export function validateBusinessDetails(req, res, next) {
  const { businessName, businessCategory, targetMonthlyRevenue } = req.body;

  if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
    return res.status(400).json({ error: 'Business name is required and must be at least 2 characters.' });
  }

  if (!businessCategory || typeof businessCategory !== 'string' || businessCategory.trim().length < 2) {
    return res.status(400).json({ error: 'Business category is required and must be at least 2 characters.' });
  }

  if (!targetMonthlyRevenue || typeof targetMonthlyRevenue !== 'number' || targetMonthlyRevenue < 0) {
    return res.status(400).json({ error: 'Target monthly revenue is required and must be a number.' });
  }

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  const trimmedEmail = email ? email.trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  req.body.email = trimmedEmail;

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters.' });
  }

  next();
}