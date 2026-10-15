/** Card-suit paths on a 24×24 grid: the confetti, the wallpaper and the icon's ornaments. */
export const SUITS = {
  spade:
    'M12 2C9 6 3 9 3 14c0 3 2.5 5 5 5 1.5 0 2.7-.7 3.3-1.7L10 22h4l-1.3-4.7c.6 1 1.8 1.7 3.3 1.7 2.5 0 5-2 5-5 0-5-6-8-9-12z',
  heart:
    'M12 21C5 15 2 11 2 7.5 2 4.5 4.5 2.5 7 2.5c2 0 4 1.5 5 3.5 1-2 3-3.5 5-3.5 2.5 0 5 2 5 5 0 3.5-3 7.5-10 13.5z',
  diamond: 'M12 2l9 10-9 10-9-10z',
  club: 'M12 2a4.6 4.6 0 0 0-4.2 6.5A4.6 4.6 0 1 0 10.6 16L9.5 22h5l-1.1-6a4.6 4.6 0 1 0 2.8-7.5A4.6 4.6 0 0 0 12 2z',
} as const
export type Suit = keyof typeof SUITS
