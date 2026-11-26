import { BiomarkerStatus, ParsedRefRange } from '@/types/domain';

/**
 * Parses reference range strings commonly found on Indian lab reports:
 * "<50", "< 50", "<=50", "≤50", ">40", ">=40", "≥40", "70 - 100", "30–120", "0.30-1.20"
 */
export function parseReferenceRange(raw: string | null | undefined): ParsedRefRange {
  const cleaned = (raw ?? '').trim().replace(/,/g, '');
  if (!cleaned) {
    return { raw: '', operator: 'unknown', low: null, high: null };
  }

  // Range: "70 - 100", "30–120", "0.30 to 1.20"
  const rangeMatch = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (rangeMatch) {
    return {
      raw: cleaned,
      operator: 'range',
      low: parseFloat(rangeMatch[1]),
      high: parseFloat(rangeMatch[2]),
    };
  }

  // Less than or equal: "<= 50", "≤50"
  const lteMatch = cleaned.match(/^(?:<=|≤)\s*(-?\d+(?:\.\d+)?)$/);
  if (lteMatch) {
    return {
      raw: cleaned,
      operator: '<=',
      low: null,
      high: parseFloat(lteMatch[1]),
    };
  }

  // Less than: "< 50", "<50"
  const ltMatch = cleaned.match(/^<\s*(-?\d+(?:\.\d+)?)$/);
  if (ltMatch) {
    return {
      raw: cleaned,
      operator: '<',
      low: null,
      high: parseFloat(ltMatch[1]),
    };
  }

  // Greater than or equal: ">= 40", "≥40"
  const gteMatch = cleaned.match(/^(?:>=|≥)\s*(-?\d+(?:\.\d+)?)$/);
  if (gteMatch) {
    return {
      raw: cleaned,
      operator: '>=',
      low: parseFloat(gteMatch[1]),
      high: null,
    };
  }

  // Greater than: "> 40", ">40"
  const gtMatch = cleaned.match(/^>\s*(-?\d+(?:\.\d+)?)$/);
  if (gtMatch) {
    return {
      raw: cleaned,
      operator: '>',
      low: parseFloat(gtMatch[1]),
      high: null,
    };
  }

  return { raw: cleaned, operator: 'unknown', low: null, high: null };
}

export interface StatusComputation {
  status: BiomarkerStatus;
  severity: number; // e.g., 2.0 for 2x ULN; 0 for normal
  isFlagged: boolean;
}

/**
 * Deterministic status & severity calculation (Section 2.1.5 & 8.1.4).
 * Borderline = outside the limit by <= 10% (e.g. LDL 106.9 vs <100 -> borderline_high; non-HDL 132 vs <130 -> borderline_high).
 */
export function computeBiomarkerStatus(
  value: number,
  range: ParsedRefRange
): StatusComputation {
  if (range.operator === 'unknown') {
    return { status: 'normal', severity: 0, isFlagged: false };
  }

  const checkHigh = (limit: number, strictLt: boolean): StatusComputation | null => {
    const isOver = strictLt ? value >= limit : value > limit;
    if (!isOver) return null;
    const ratio = limit > 0 ? Number((value / limit).toFixed(2)) : 1;
    const pctOver = limit > 0 ? (value - limit) / limit : 1;
    return {
      status: pctOver <= 0.1 ? 'borderline_high' : 'high',
      severity: ratio,
      isFlagged: true,
    };
  };

  const checkLow = (limit: number, strictGt: boolean): StatusComputation | null => {
    const isUnder = strictGt ? value <= limit : value < limit;
    if (!isUnder) return null;
    const ratio = value > 0 ? Number((limit / value).toFixed(2)) : 2;
    const pctUnder = limit > 0 ? (limit - value) / limit : 1;
    return {
      status: pctUnder <= 0.1 ? 'borderline_low' : 'low',
      severity: ratio,
      isFlagged: true,
    };
  };

  if (range.operator === '<' && range.high !== null) {
    return checkHigh(range.high, true) ?? { status: 'normal', severity: 0, isFlagged: false };
  }
  if (range.operator === '<=' && range.high !== null) {
    return checkHigh(range.high, false) ?? { status: 'normal', severity: 0, isFlagged: false };
  }
  if (range.operator === '>' && range.low !== null) {
    return checkLow(range.low, true) ?? { status: 'normal', severity: 0, isFlagged: false };
  }
  if (range.operator === '>=' && range.low !== null) {
    return checkLow(range.low, false) ?? { status: 'normal', severity: 0, isFlagged: false };
  }
  if (range.operator === 'range') {
    if (range.low !== null && value < range.low) {
      return checkLow(range.low, false)!;
    }
    if (range.high !== null && value > range.high) {
      return checkHigh(range.high, false)!;
    }
    return { status: 'normal', severity: 0, isFlagged: false };
  }

  return { status: 'normal', severity: 0, isFlagged: false };
}
