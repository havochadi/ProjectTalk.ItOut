/**
 * Pseudonymization utilities for PDPA/GDPR compliance
 * Removes or masks PII before sending data to external AI services
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /\b(\+65\s?)?[689]\d{7}\b/g;
const NRIC_REGEX = /\b[STFG]\d{7}[A-Z]\b/g;

/**
 * Pseudonymizes text by replacing PII with placeholders
 */
export function pseudonymizeText(text: string, allowExternal: boolean = false): string {
  if (allowExternal) {
    return text;
  }

  let pseudonymized = text;

  // Replace emails
  pseudonymized = pseudonymized.replace(EMAIL_REGEX, '[EMAIL]');

  // Replace Singapore phone numbers
  pseudonymized = pseudonymized.replace(PHONE_REGEX, '[PHONE]');

  // Replace NRIC/FIN numbers
  pseudonymized = pseudonymized.replace(NRIC_REGEX, '[ID]');

  // Replace common name patterns (simple heuristic)
  // This is basic - in production, consider NER models
  pseudonymized = pseudonymized.replace(/\bmy name is [A-Z][a-z]+( [A-Z][a-z]+)?\b/gi, 'my name is [NAME]');
  pseudonymized = pseudonymized.replace(/\bI'm [A-Z][a-z]+( [A-Z][a-z]+)?\b/gi, "I'm [NAME]");

  return pseudonymized;
}

/**
 * Extracts and masks PII from user data
 */
export function maskUserData(userData: {
  email?: string;
  name?: string;
  phone?: string;
}): { email?: string; name?: string; phone?: string } {
  return {
    email: userData.email ? '[EMAIL]' : undefined,
    name: userData.name ? '[NAME]' : undefined,
    phone: userData.phone ? '[PHONE]' : undefined,
  };
}

/**
 * Checks if text contains potential PII
 */
export function containsPII(text: string): boolean {
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text) || NRIC_REGEX.test(text);
}
