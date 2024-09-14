// E.g. Apr 22
export function formatDayOfMonth(ts: number) {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// E.g. Monday
export function formatDayOfWeek(ts: number) {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function formatScaledPrice(price: number | null | undefined) {
  if (typeof price !== "number") {
    return "-";
  }
  return parseFloat(`${price}e-2`).toFixed(2).toString();
}

// Based on Moment's fromNow() function: https://momentjs.com/docs/#/displaying/fromnow/
export function formatTimeFromNow(ts: number) {
  // TODO use Intl.RelativeTimeFormat().format() to localize the strings

  const hoursAgo = (Date.now() - ts) / 1000 / 60 / 60;

  if (hoursAgo < 22) {
    return "Today";
  }

  // 22 to 35 hours -> a day ago
  if (hoursAgo < 36) {
    return "1 day ago";
  }

  const daysAgo = hoursAgo / 24;

  // 36 hours to 25 days -> 2 days ago ... 25 days ago
  if (daysAgo < 26) {
    return `${Math.floor(daysAgo)} days ago`;
  }

  // 26 to 45 days -> a month ago
  if (daysAgo < 45) {
    return "1 month ago";
  }

  // 45 to 319 days -> 2 months ago ... 10 months ago
  if (daysAgo < 320) {
    return `${Math.floor(daysAgo / 30)} months ago`;
  }

  // 320 to 547 days (1.5 years) -> a year ago
  if (daysAgo < 548) {
    return "1 year ago";
  }

  // 548 days+ -> 2 years ago ... N years ago
  return `${Math.floor(daysAgo / 365)} years ago`;
}
