import { useCallback, useEffect, useState } from 'react';
import { applyAccentColor, readAccentColor, writeAccentColor } from '@/shared/lib/accentColor';

export function useAccentColor(): [string, (next: string) => void] {
    const [accent, setAccent] = useState<string>(readAccentColor);

    const choose = useCallback((next: string) => {
        setAccent(next);
        writeAccentColor(next);
        applyAccentColor(next);
    }, []);

    useEffect(() => {
        function onStorage() {
            const stored = readAccentColor();
            setAccent(stored);
            applyAccentColor(stored);
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return [accent, choose];
}
