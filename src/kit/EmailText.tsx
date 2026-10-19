import { splitEmail } from "./split-email";

export type { EmailParts } from "./split-email";
export { splitEmail } from "./split-email";

export type EmailTextProps = {
  email: string;
  className?: string;
};

/**
 * Renders an email so it can wrap at "@". Use for contact addresses on narrow viewports.
 */
export function EmailText({ email, className }: EmailTextProps) {
  const { local, domain } = splitEmail(email);
  const classes = ["break-words", className].filter(Boolean).join(" ");
  if (!domain) {
    return <span className={classes}>{local}</span>;
  }
  return (
    <span className={classes}>
      {local}
      <wbr />
      {domain}
    </span>
  );
}
