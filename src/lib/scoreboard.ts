export interface EventDateWindow {
  pastDays: number;
  futureDays: number;
}

export function formatEspnDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

/** Range scoreboards can contain stale scheduled entries during live games.
 * Replace whole events with daily data so scores, status and moments agree.
 */
export async function fetchScoreboardEvents<T extends { id: string }>(
  baseUrl: string,
  dateWindow?: EventDateWindow,
  options: { now?: Date; signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<T[]> {
  const { now = new Date(), signal, fetcher = fetch } = options;
  const read = async (url: string): Promise<T[]> => {
    const response = await fetcher(url, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Scoreboard returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error('Invalid scoreboard response');
    return data.events;
  };
  if (!dateWindow) return read(baseUrl);

  const start = new Date(now);
  const end = new Date(now);
  start.setUTCDate(start.getUTCDate() - dateWindow.pastDays);
  end.setUTCDate(end.getUTCDate() + dateWindow.futureDays);
  const urlForDates = (dates: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('dates', dates);
    return url.toString();
  };
  const dailyDates = [0, -1].filter(offset => offset >= -dateWindow.pastDays).map(offset => {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() + offset);
    return formatEspnDate(day);
  });
  // Yesterday also covers games crossing UTC midnight and their final results.
  // Fail the refresh if daily data fails; never replace live data with the stale range.
  // Share daily requests between the live overlay and a range fallback.
  const dailyRequests = new Map<string, Promise<T[]>>();
  const readDay = (day: string) => {
    let request = dailyRequests.get(day);
    if (!request) {
      request = read(urlForDates(day));
      dailyRequests.set(day, request);
    }
    return request;
  };
  const readRange = async () => {
    try {
      return await read(urlForDates(`${formatEspnDate(start)}-${formatEspnDate(end)}`));
    } catch (error) {
      if (signal?.aborted) throw error;
      // Some ESPN leagues reject all date ranges with HTTP 400, even though
      // the same dates work individually. Retain the entire fixture window.
      const days: string[] = [];
      for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
        days.push(formatEspnDate(day));
      }
      const events: T[] = [];
      // Bound fallback concurrency instead of issuing a request per day at once.
      for (let index = 0; index < days.length; index += 4) {
        if (signal?.aborted) throw error;
        events.push(...(await Promise.all(days.slice(index, index + 4).map(readDay))).flat());
      }
      return events;
    }
  };
  const [range, ...daily] = await Promise.all([
    readRange(),
    ...dailyDates.map(readDay),
  ]);
  const events = new Map(range.map(event => [event.id, event]));
  for (const event of daily.flat()) events.set(event.id, event);
  return [...events.values()];
}
