interface FolderIconProps {
  size?: number;
  open?: boolean;
}

export default function FolderIcon({ size = 16, open = false }: FolderIconProps) {
  return open ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 13.5V3.5C2 2.95 2.45 2.5 3 2.5H6.17L7.59 3.91C7.77 4.1 8.02 4.2 8.29 4.2H13C13.55 4.2 14 4.65 14 5.2V6.5" />
      <path d="M2 13.5L3.54 8.38C3.72 7.84 4.23 7.5 4.8 7.5H14.2C14.96 7.5 15.5 8.23 15.27 8.95L13.73 13.62C13.56 14.16 13.05 14.5 12.47 14.5H3C2.45 14.5 2 14.05 2 13.5Z" />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 13.5H2C1.45 13.5 1 13.05 1 12.5V3.5C1 2.95 1.45 2.5 2 2.5H5.67L7.09 3.91C7.27 4.1 7.52 4.2 7.79 4.2H14C14.55 4.2 15 4.65 15 5.2V12.5C15 13.05 14.55 13.5 14 13.5Z" />
    </svg>
  );
}
