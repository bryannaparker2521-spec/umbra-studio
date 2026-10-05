import { recordSlug } from './recordSlug';

export type StructuredRecord = {
  name: string; type: string; destination: string; slug: string; canonStatus: string;
  action: string; canonicalId: string; sections: Record<string, string>; source: string;
  warnings: string[]; relationships: Array<{ label: string; target: string; type: string }>;
};
const metadata = new Set(['NAME', 'TYPE', 'DESTINATION', 'SLUG', 'CANON_STATUS', 'IMPORT_ACTION', 'ID', 'CANONICAL_ID']);
/** Explicit markers take precedence over every heuristic and manuscript parser. */
export function parseStructuredImport(source: string): StructuredRecord[] | null {
  if (!/===\s*UMBRA_RECORD_(?:BEGIN|END)\s*===/i.test(source)) return null;
  const records: StructuredRecord[] = [];
  const markers = /===\s*UMBRA_RECORD_(BEGIN|END)\s*===/gi;
  let start = -1, contentStart = -1;
  for (const marker of source.matchAll(markers)) {
    if (marker[1].toUpperCase() === 'BEGIN') {
      if (start !== -1) throw new Error('Nested UMBRA_RECORD_BEGIN: close the previous record before starting another. Nothing was saved.');
      start = marker.index!; contentStart = start + marker[0].length;
    } else {
      if (start === -1) throw new Error('UMBRA_RECORD_END has no matching BEGIN. Nothing was saved.');
      const fields: Record<string, string> = {}, sections: Record<string, string> = {};
      let section = 'DETAILS';
      for (const line of source.slice(contentStart, marker.index).replace(/\r/g, '').split('\n')) {
        const field = line.match(/^\s*(?:\*\*)?([A-Z][A-Z_ ]{1,60})(?:\*\*)?\s*:\s*(.*)$/);
        if (field) {
          const label = field[1].trim().replace(/\s+/g, '_');
          if (metadata.has(label)) { fields[label] = field[2].trim(); continue; }
          section = label;
          sections[section] = [sections[section], field[2]].filter(Boolean).join('\n');
        } else sections[section] = [sections[section], line].filter(v => v !== undefined).join('\n');
      }
      for (const label of Object.keys(sections)) { sections[label] = sections[label].trim(); if (!sections[label]) delete sections[label]; }
      if (!fields.NAME?.trim()) throw new Error(`Structured record ${records.length + 1} needs NAME. Nothing was saved.`);
      if (!fields.TYPE?.trim()) throw new Error(`Structured record ${fields.NAME} needs TYPE. Nothing was saved.`);
      const relationships = (sections.RELATIONSHIPS || '').split('\n').flatMap(line => {
        const match = line.match(/^\s*[-*•]?\s*(.+?)\s*(?:->|→)\s*(.+?)(?:\s*\|\s*TYPE:\s*(.+))?\s*$/i);
        return match ? [{ label: match[1].trim(), target: match[2].trim(), type: match[3]?.trim() || '' }] : [];
      });
      const action = (fields.IMPORT_ACTION || 'AUTO').toUpperCase();
      records.push({ name: fields.NAME.trim(), type: fields.TYPE.trim(), destination: fields.DESTINATION || '',
        slug: recordSlug(fields.SLUG || fields.NAME), canonStatus: fields.CANON_STATUS || 'PROPOSED', action,
        canonicalId: fields.CANONICAL_ID || fields.ID || '', sections,
        source: source.slice(start, marker.index! + marker[0].length), relationships,
        warnings: [...(sections.WARNINGS ? [sections.WARNINGS] : []), ...(!['AUTO', 'CREATE', 'UPDATE', 'REVIEW'].includes(action) ? [`Unknown import action ${action}; review required.`] : [])] });
      start = -1;
    }
  }
  if (start !== -1) throw new Error('An UMBRA_RECORD_BEGIN is missing its END. Nothing was saved.');
  return records;
}

const fieldHeading = /^(summary|details|identity|appearance|personality|backstory|history|nature|attributes|biology|culture|society|government|religion|geography|climate|abilities|magic|combat|equipment|forms|transformations|relationships|story|timeline|media|visual[ _]locks|visual[ _]restrictions|superseded|rejected|unresolved|warnings|source)$/i;
export function isContentHeading(heading: string) { return fieldHeading.test(heading.trim().replace(/:$/, '')); }
export function isDocumentHeading(heading: string) {
  return /^(transfer package|package\s*\d*|source metadata|import instructions|canon summary|record manifest|relationship manifest|dependency manifest|final integrity check|part\s+\d+|title|source|table of contents)(?:\b|:)/i.test(heading.trim());
}
