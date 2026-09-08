
export type PageNoticeTone = 'failure' | 'warning';

export type PageNotice = {
    tone: PageNoticeTone;
    message: string;
    detail?: string;
    retry?: () => void;
    count: number;
};

export const MAX_PAGE_NOTICES = 3;

export function withNotice(current: PageNotice[], reported: Omit<PageNotice, 'count'>): PageNotice[] {
    if (current.some((notice) => notice.message === reported.message)) {
        return current.map((notice) => (notice.message === reported.message ? { ...notice, count: notice.count + 1 } : notice));
    }

    return [{ ...reported, count: 1 }, ...current].slice(0, MAX_PAGE_NOTICES);
}

export function withoutNotice(current: PageNotice[], message: string): PageNotice[] {
    return current.filter((notice) => notice.message !== message);
}
