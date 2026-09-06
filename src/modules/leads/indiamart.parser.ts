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

function splitIndiaMartFields(line: string): string[] {
  if (line.includes("\t")) {
    return line
      .split(/\t+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const parts = line
    .split(/\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [line.trim()];
}

export function parseIndiaMartLeadText(raw: string): ParsedIndiaMartLead {
  const lines = cleanLines(raw);
  const out: ParsedIndiaMartLead = {};
  const fields: string[] = [];

  if (lines.length === 1) {
    fields.push(...splitIndiaMartFields(lines[0]));
  } else {
    fields.push(...lines);
  }

  const remaining: string[] = [];

  for (const field of fields) {
    if (DATE_LINE.test(field)) {
      continue;
    }

    const emailMatch = field.match(EMAIL_LINE);
    if (!out.email && emailMatch) {
      out.email = emailMatch[0];
      continue;
    }

    const digits = field.replace(/\D/g, "");
    if (!out.phone && digits.length >= 10) {
      out.phone = digits.slice(-10);
      continue;
    }

    const loc = LOCATION_LINE.exec(field);
    if (loc) {
      out.city = loc[1].trim();
      out.state = loc[2].trim();
      out.country = loc[3].trim();
      continue;
    }

    remaining.push(field);
  }

  if (remaining.length > 0) {
    out.name = remaining[0];
  }
  if (remaining.length > 1) {
    out.serviceRequired = remaining[1];
  }
  if (remaining.length > 2) {
    out.companyName = remaining[2];
  }

  return out;
}
