export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export const capitalize = (str: string): string =>
  str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1);

export const classNames = (...classes: (string | undefined | false)[]): string =>
  classes.filter(Boolean).join(" ");
