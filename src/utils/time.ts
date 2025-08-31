// Time formatting utilities for consistent time handling across the app

/**
 * Converts time string to HH:MM format
 * @param t Time string (e.g., "09:00:00" or "09:00")
 * @returns Time in HH:MM format
 */
export const toHHMM = (t: string): string => {
  if (!t) return '';
  return t.slice(0, 5); // "09:00:00" -> "09:00", "09:00" -> "09:00"
};

/**
 * Converts time string to HH:MM:SS format
 * @param t Time string (e.g., "09:00" or "09:00:00")
 * @returns Time in HH:MM:SS format
 */
export const toHHMMSS = (t: string): string => {
  if (!t) return '';
  return t.length === 5 ? `${t}:00` : t; // "09:00" -> "09:00:00", "09:00:00" -> "09:00:00"
};

/**
 * Converts Date to local ISO date string (YYYY-MM-DD) without UTC conversion
 * @param date Date object
 * @returns Date in YYYY-MM-DD format using local timezone
 */
export const toLocalISO = (date: Date): string => {
  // Use local timezone formatting to avoid UTC conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
