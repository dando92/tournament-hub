export function toLocalDateTimeValue(iso: string): string {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function defaultScheduleStartValue(): string {
    const date = new Date();
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return toLocalDateTimeValue(date.toISOString());
}

export function localDateTimeToIso(value: string): string {
    return new Date(value).toISOString();
}

export function formatClock(value: string | number): string {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatDayLabel(value: string | number): string {
    return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}
