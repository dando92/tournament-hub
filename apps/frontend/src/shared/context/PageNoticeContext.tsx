import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageNotice, PageNoticeTone, withNotice, withoutNotice } from '@/shared/lib/pageNotices';


type ReportOptions = {
    detail?: string;
    tone?: PageNoticeTone;
    retry?: () => void;
};

type PageNoticeContextValue = {
    notices: PageNotice[];
    report: (message: string, options?: ReportOptions) => void;
    dismiss: (message: string) => void;
};

const PageNoticeContext = createContext<PageNoticeContextValue>({
    notices: [],
    report: () => {},
    dismiss: () => {},
});

export function PageNoticeProvider({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const [notices, setNotices] = useState<PageNotice[]>([]);

    useEffect(() => {
        setNotices((current) => (current.length === 0 ? current : []));
    }, [pathname]);

    const report = useCallback((message: string, options: ReportOptions = {}) => {
        setNotices((current) => withNotice(current, { tone: options.tone ?? 'failure', message, detail: options.detail, retry: options.retry }));
    }, []);

    const dismiss = useCallback((message: string) => {
        setNotices((current) => withoutNotice(current, message));
    }, []);

    const value = useMemo(() => ({ notices, report, dismiss }), [notices, report, dismiss]);

    return <PageNoticeContext.Provider value={value}>{children}</PageNoticeContext.Provider>;
}

export function usePageNotices() {
    return useContext(PageNoticeContext);
}
