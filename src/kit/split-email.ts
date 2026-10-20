/** Split an email at the first "@". domain includes the leading "@" when present. */
export type EmailParts = { local: string; domain: string | null };

export function splitEmail(email: string): EmailParts {
  const at = email.indexOf("@");
  if (at < 0) {
    return { local: email, domain: null };
  }
  return { local: email.slice(0, at), domain: email.slice(at) };
}
