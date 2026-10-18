/**
 * The prototype's 18 icons on a 24×24 stroke grid, plus extras for settings, themes, family sync
 * and the install / share / maker sheets.
 */
export const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  home: '<path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z"/>',
  scroll:
    '<path d="M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7M7 4a2 2 0 0 1 2 2v1M9 11h6M9 15h4"/>',
  volume:
    '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  flame:
    '<path d="M12 3c.8 3.6 5.5 5.4 5.5 10.2A5.5 5.5 0 0 1 6.5 13c0-2.3 1.3-3.6 1.9-5.4.9 1.4 2.1 2.1 2.1 2.1S10 6.2 12 3z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-11h-6z"/>',
  cards:
    '<rect x="3" y="7" width="11" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
  repeat:
    '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6 6 0 0 1 3.5 5.8"/>',
  gear: '<path d="M9.94 4.89L10.42 2.53L13.58 2.53L14.06 4.89A7.4 7.4 0 0 1 15.56 5.52L17.58 4.19L19.81 6.42L18.48 8.44A7.4 7.4 0 0 1 19.11 9.94L21.47 10.42L21.47 13.58L19.11 14.06A7.4 7.4 0 0 1 18.48 15.56L19.81 17.58L17.58 19.81L15.56 18.48A7.4 7.4 0 0 1 14.06 19.11L13.58 21.47L10.42 21.47L9.94 19.11A7.4 7.4 0 0 1 8.44 18.48L6.42 19.81L4.19 17.58L5.52 15.56A7.4 7.4 0 0 1 4.89 14.06L2.53 13.58L2.53 10.42L4.89 9.94A7.4 7.4 0 0 1 5.52 8.44L4.19 6.42L6.42 4.19L8.44 5.52A7.4 7.4 0 0 1 9.94 4.89Z"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  // family sync
  cloud: '<path d="M7 19a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.8 9.1 4.95 4.95 0 0 1 17 19z"/>',
  cloudOff:
    '<path d="M9.5 6.2A6 6 0 0 1 17.8 9.1 4.95 4.95 0 0 1 20.6 17M17 19H7a4.5 4.5 0 0 1-.6-8.96M3 3l18 18"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  // install, share, the maker
  share:
    '<path d="M8.5 9.5H7A1.5 1.5 0 0 0 5.5 11v8A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17 9.5h-1.5M12 3.5v10.5M8.5 7L12 3.5 15.5 7"/>',
  addSquare: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
  heart:
    '<path d="M12 20s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z"/>',
  link: '<path d="M10.5 13.5a3.8 3.8 0 0 0 5.4 0l3-3a3.8 3.8 0 0 0-5.4-5.4l-1.2 1.2M13.5 10.5a3.8 3.8 0 0 0-5.4 0l-3 3a3.8 3.8 0 0 0 5.4 5.4l1.2-1.2"/>',
  external:
    '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  more: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor"/>',
  install:
    '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 7.5v5.5M9.5 10.5L12 13l2.5-2.5"/>',
} as const
export type IconName = keyof typeof ICONS

export interface IconProps {
  name: IconName
  size?: number
  stroke?: number
  className?: string
}

/** Decorative by default; give the control around it the accessible name. */
export function Icon({ name, size = 22, stroke = 2.4, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static icon paths defined above
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
