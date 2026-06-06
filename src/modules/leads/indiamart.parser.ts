export type ParsedIndiaMartLead = {
  name?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  serviceRequired?: string;
  city?: string;
  state?: string;
  country?: string;
};

const DATE_LINE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_LINE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LOCATION_LINE = /^(.+),\s*(.+),\s*(.+)$/;

function cleanLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function parseIndiaMartLeadText(raw: string): ParsedIndiaMartLead {
  const lines = cleanLines(raw);
  const out: ParsedIndiaMartLead = {};

  for (const line of lines) {
    if (DATE_LINE.test(line)) {
      continue;
    }
    const digits = line.replace(/\D/g, "");
    if (!out.phone && digits.length >= 10) {
      out.phone = digits.slice(-10);
      continue;
    }
    if (!out.email && EMAIL_LINE.test(line)) {
      out.email = line.match(EMAIL_LINE)?.[0];
      continue;
    }
    const loc = LOCATION_LINE.exec(line);
    if (loc) {
      out.city = loc[1].trim();
      out.state = loc[2].trim();
      out.country = loc[3].trim();
    }
  }

  const rest = lines.filter((line) => {
    if (DATE_LINE.test(line)) return false;
    const digits = line.replace(/\D/g, "");
    if (digits.length >= 10 && out.phone && digits.endsWith(out.phone)) return false;
    if (EMAIL_LINE.test(line)) return false;
    if (LOCATION_LINE.test(line)) return false;
    return true;
  });

  if (rest[0]) {
    out.name = rest[0];
  }
  if (rest[1]) {
    out.serviceRequired = rest[1];
  }
  if (rest[2]) {
    out.companyName = rest[2];
  }

  return out;
}
