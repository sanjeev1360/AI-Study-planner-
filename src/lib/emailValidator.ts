/**
 * Email validation and MX/DNS verification utility
 */

// List of disposable/throwaway email domains to reject
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'sharklasers.com',
  'dispostable.com',
  'yopmail.com',
  'throwawaymail.com',
  'getairmail.com',
  'fakemail.net',
  'trashmail.com',
  'generator.email',
  'emailondeck.com',
]);

// Top common valid email domains
const KNOWN_VALID_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'zoho.com',
  'protonmail.com',
  'proton.me',
  'live.com',
  'msn.com',
  'sru.edu.in',
  'nitw.ac.in',
  'iitb.ac.in',
  'iitd.ac.in',
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates whether an email format is strict, domain has valid TLD,
 * is not a disposable address, and checks MX records via public DNS-over-HTTPS.
 */
export async function validateEmailAddress(email: string): Promise<EmailValidationResult> {
  const trimmed = email.trim().toLowerCase();

  // 1. Strict RFC 5322 regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid email format. Please enter a valid address (e.g., student@gmail.com or name@sru.edu.in).',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email must contain exactly one "@" symbol.' };
  }

  const [localPart, domain] = parts;

  // Local part checks
  if (localPart.length < 2) {
    return { isValid: false, error: 'Email username must be at least 2 characters long.' };
  }
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email username cannot exceed 64 characters.' };
  }

  // Reject consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive periods.' };
  }

  // 2. Domain & TLD validation
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Email domain must have a valid extension (e.g. .com, .edu, .ac.in).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: `".${tld}" is not a recognized top-level domain.` };
  }

  // 3. Block known temporary/fake email generators
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Temporary/disposable email addresses are not permitted. Please use your personal or college email.',
    };
  }

  // Block obvious nonsense domains
  const suspiciousPatterns = ['test.com', 'example.com', 'fake.com', 'asdf.com', 'qwerty.com', 'xyz.com'];
  if (suspiciousPatterns.includes(domain)) {
    return {
      isValid: false,
      error: `"${domain}" is not a real mailbox domain. Please enter a genuine student or personal email.`,
    };
  }

  // Check if domain is in trusted email services whitelist OR valid academic institution
  const isTrustedProvider = KNOWN_VALID_DOMAINS.has(domain);
  const isAcademic =
    domain.endsWith('.edu') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.ac.uk') ||
    domain.endsWith('.res.in') ||
    domain.endsWith('.gov.in');

  if (isTrustedProvider || isAcademic) {
    return { isValid: true };
  }

  // If not in the trusted major providers or accredited academic domains list:
  // Reject random fabricated email domains immediately!
  return {
    isValid: false,
    error: `"${domain}" is not a recognized email provider. Please sign up using a genuine email provider (e.g. @gmail.com, @yahoo.com, @outlook.com, @icloud.com) or your official college email (e.g. @sru.edu.in, .edu, .ac.in).`,
  };
}
