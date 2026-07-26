/**
 * Festival Countdown Configuration
 * 
 * Centralized configuration for festival countdown timers on the homepage.
 * Update the dates here to change countdown targets without touching the UI code.
 */

export interface FestivalConfig {
  name: string;
  date: string; // ISO date string (e.g., "2026-09-14T00:00:00")
  year: number;
  emoji?: string;
  tagline?: string;
}

/**
 * Main Ganpati Festival Configuration
 * 
 * Ganpati Visarjan / Ganesh Chaturthi festival date.
 * Update the `date` field for each year's celebration.
 */
export const GANPATI_FESTIVAL: FestivalConfig = {
  name: 'Ganpati 2026',
  date: '2026-09-14T00:00:00',
  year: 2026,
  emoji: '🎉',
  tagline: 'Ganpati Bappa Morya!',
};

/**
 * Fallback festival data (used when the festival date has passed)
 * This can be updated for the next upcoming festival.
 */
export const UPCOMING_FESTIVAL: FestivalConfig = GANPATI_FESTIVAL;

/**
 * Check if a given festival date is still in the future
 */
export function isFestivalUpcoming(festival: FestivalConfig): boolean {
  return new Date(festival.date).getTime() > new Date().getTime();
}

/**
 * Get the currently active festival for countdown display
 * Returns null if no festival is upcoming (countdown complete)
 */
export function getActiveFestival(): FestivalConfig | null {
  const festival = UPCOMING_FESTIVAL;
  return isFestivalUpcoming(festival) ? festival : null;
}

