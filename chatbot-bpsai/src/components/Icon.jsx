const paths = {
  panel:
    "M9 3v18M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  send: "M12 19V5m-6 6 6-6 6 6",
  close: "m6 6 12 12M6 18 18 6",
  moon: "M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z",
  sun: "M12 3V2m0 20v-1M3 12H2m20 0h-1M5.6 5.6l-.7-.7m14.2 14.2-.7-.7M5.6 18.4l-.7.7M19.1 4.9l-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  chevron: "m6 9 6 6 6-6",
  chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z",
  pin: "m16 3 5 5-4 1-3 6-2-2-6 6m3-7-2-2 6-3 1-4Z",
  edit: "m16 3 5 5M4 20l4-1L21 6l-4-4L4 15v5Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  check: "m5 12 4 4L19 6",
  logout: "M9 5H4v14h5m6-14 7 7-7 7m7-7H9",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  briefcase: "M8 7V4h8v3M3 12l9 3 9-3M12 12v3M3 7h18v13H3V7Z",
  people:
    "M16 21v-2a5 5 0 0 0-10 0v2m14 0v-2a5 5 0 0 0-3-4.6M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm3-3a4 4 0 0 1 0 7",
  chart: "M4 20h16M7 16v-4m5 4V8m5 8V4",
  trend: "m3 17 6-6 4 4 8-10m-6 0h6v6",
  book: "M12 5v16M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  file: "M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6",
  info: "M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3",
};

export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.chat} />
    </svg>
  );
}
