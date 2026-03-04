export interface EventDateTimeFormatOptions {
  includeDate?: boolean;
  includeWeekday?: boolean;
  includeTimeZone?: boolean;
}

export function formatEventDateTimeInDeviceZone(
  isoValue: string,
  options: EventDateTimeFormatOptions = {},
) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatterOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  if (options.includeDate) {
    formatterOptions.day = 'numeric';
    formatterOptions.month = 'short';
  }

  if (options.includeWeekday) {
    formatterOptions.weekday = 'short';
  }

  if (options.includeTimeZone) {
    formatterOptions.timeZoneName = 'short';
  }

  return new Intl.DateTimeFormat(undefined, formatterOptions).format(date);
}

export function getDeviceTimeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
}
