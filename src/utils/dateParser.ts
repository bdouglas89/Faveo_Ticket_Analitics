const SPANISH_MONTHS: Record<string, number> = {
  enero: 1, ene: 1,
  febrero: 2, feb: 2,
  marzo: 3, mar: 3,
  abril: 4, abr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6,
  julio: 7, jul: 7,
  agosto: 8, ago: 8,
  septiembre: 9, sep: 9, set: 9,
  octubre: 10, oct: 10,
  noviembre: 11, nov: 11,
  diciembre: 12, dic: 12
};

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
};

export interface ParsedDate {
  year: number;
  month: number; // 1-12
  day: number;
  formatted: string; // YYYY-MM-DD or DD/MM/YYYY
  timestamp: number;
}

export function parseExcelDate(val: any): ParsedDate | null {
  if (val === null || val === undefined || val === '') return null;

  // 1. If it's an Excel Serial Number (e.g., 46136.4)
  if (typeof val === 'number') {
    // Excel epoch starts Jan 1 1900
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return {
        year: dateObj.getUTCFullYear(),
        month: dateObj.getUTCMonth() + 1,
        day: dateObj.getUTCDate(),
        formatted: `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`,
        timestamp: dateObj.getTime()
      };
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // 2. Format: "abril 23, 2026 11:51 AM" or "julio 28, 2026 10:24 AM"
  const monthNameRegex = /^([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+.*)?$/i;
  const monthMatch = str.match(monthNameRegex);
  if (monthMatch) {
    const rawMonth = monthMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const day = parseInt(monthMatch[2], 10);
    const year = parseInt(monthMatch[3], 10);
    const month = SPANISH_MONTHS[rawMonth] || ENGLISH_MONTHS[rawMonth];

    if (month && day >= 1 && day <= 31 && year > 2000) {
      const dt = new Date(year, month - 1, day);
      return {
        year,
        month,
        day,
        formatted: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        timestamp: dt.getTime()
      };
    }
  }

  // 3. Format: "30-04-2026, 2:00 pm" or "30-04-2026" or "28-07-2026" or "2026-04-30"
  // DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const datePartsRegex = /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})(?:\s*,?\s*.*)?$/;
  const partsMatch = str.match(datePartsRegex);
  if (partsMatch) {
    let part1 = parseInt(partsMatch[1], 10);
    let part2 = parseInt(partsMatch[2], 10);
    let part3 = parseInt(partsMatch[3], 10);

    let year = 0;
    let month = 0;
    let day = 0;

    if (part1 > 1000) {
      // YYYY-MM-DD
      year = part1;
      month = part2;
      day = part3;
    } else if (part3 > 1000) {
      // Could be DD-MM-YYYY or MM-DD-YYYY
      // In Spanish logs: 30-04-2026 -> part1=30, part2=4 (month=4)
      if (part1 > 12) {
        day = part1;
        month = part2;
      } else if (part2 > 12) {
        month = part1;
        day = part2;
      } else {
        // Default DD-MM-YYYY for LatAm/Spanish format
        day = part1;
        month = part2;
      }
      year = part3;
    }

    if (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dt = new Date(year, month - 1, day);
      return {
        year,
        month,
        day,
        formatted: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        timestamp: dt.getTime()
      };
    }
  }

  // 4. Fallback JS Date parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
      formatted: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`,
      timestamp: fallback.getTime()
    };
  }

  return null;
}

export function formatDateToDDMMYYYY(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const parsed = parseExcelDate(val);
  if (parsed) {
    const day = String(parsed.day).padStart(2, '0');
    const month = String(parsed.month).padStart(2, '0');
    const year = parsed.year;
    return `${day}/${month}/${year}`;
  }

  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return '';

  // Match YYYY-MM-DD or YYYY/MM/DD pattern directly
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const m = String(dmyMatch[2]).padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  return str;
}

export function getFormattedDateStr(val: any): string {
  return formatDateToDDMMYYYY(val);
}

export function formatSpanishMonthName(monthNum: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return names[monthNum - 1] || `Mes ${monthNum}`;
}

export function isTicketOverdue(deadlineDate: any, finishedDate: any): boolean {
  if (!deadlineDate || !finishedDate) return false;
  const dl = parseExcelDate(deadlineDate);
  const fn = parseExcelDate(finishedDate);
  if (!dl || !fn) return false;
  // Finished after deadline date
  return fn.timestamp > dl.timestamp + 24 * 3600 * 1000; // allow same-day leeway
}

export function isTicketUncompleted(finishedDate: any, status?: string): boolean {
  if (!finishedDate) return true;
  const str = String(finishedDate).trim();
  return str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null';
}
