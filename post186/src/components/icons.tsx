import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);

export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
    <path d="M3 10h18M8 2.5v4M16 2.5v4" />
  </Svg>
);

export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const MapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.5s7-6.1 7-11.5a7 7 0 1 0-14 0c0 5.4 7 11.5 7 11.5Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Svg>
);

export const Phone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3.5h3.2l1.6 4.2-2 1.4a12.5 12.5 0 0 0 7.1 7.1l1.4-2 4.2 1.6V19a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5Z" />
  </Svg>
);

export const Mail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="m3 6.5 9 6.5 9-6.5" />
  </Svg>
);

export const Users = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </Svg>
);

export const User = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const Building = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18M5 21V8l7-4.5L19 8v13" />
    <path d="M9.5 21v-5h5v5M9 11h.01M15 11h.01M12 11h.01" />
  </Svg>
);

export const Star = ({ size = 20, ...p }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    <path d="m12 1.8 3.1 6.5 7.1.9-5.2 5 1.3 7-6.3-3.4-6.3 3.4 1.3-7-5.2-5 7.1-.9L12 1.8Z" />
  </svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const X = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </Svg>
);

export const Alert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Svg>
);

export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </Svg>
);

export const External = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13M9 6.5H5.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V15" />
  </Svg>
);

export const LogIn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3.5h4.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H14M3.5 12H14M10 7.5l4.5 4.5-4.5 4.5" />
  </Svg>
);

export const Heart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5S3.5 15.4 3.5 9.3A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.5 2.4c0 6.1-8.5 11.2-8.5 11.2Z" />
  </Svg>
);

export const Shield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 4.5 5.5V11c0 4.7 3.1 8.6 7.5 10.2 4.4-1.6 7.5-5.5 7.5-10.2V5.5L12 2.8Z" />
  </Svg>
);

export const Flag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21.5V3.5M5 4.5c4.5-2 6.5 2 11 0 1.2-.5 2.2-.7 3-.7v9.4c-.8 0-1.8.2-3 .7-4.5 2-6.5-2-11 0" />
  </Svg>
);

export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4 18 18M18 6l-2.6 2.6M8.6 15.4 6 18" />
  </Svg>
);

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 20 1-4.5L16.5 4a2 2 0 0 1 2.9 0l.6.6a2 2 0 0 1 0 2.9L8.5 19 4 20Z" />
  </Svg>
);

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6" />
  </Svg>
);

export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="1.5" />
    <path d="M15.5 8.5v-4a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4" />
  </Svg>
);

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Gear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" />
  </Svg>
);

export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 11 9-7.5 9 7.5M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
);

export const Facebook = ({ size = 20, ...p }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    <path d="M13.6 21.5v-8h2.7l.4-3.2h-3.1V8.3c0-.9.3-1.6 1.6-1.6h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.6v3.2h2.8v8h3.2Z" />
  </svg>
);
