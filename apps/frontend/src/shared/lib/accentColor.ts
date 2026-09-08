
export const DEFAULT_ACCENT_COLOR = '#5F858E';

export const STORAGE_KEY = 'accent_color';

export const ACCENT_PRESETS: { name: string; value: string }[] = [
    { name: 'Teal', value: DEFAULT_ACCENT_COLOR },
    { name: 'Blue', value: '#5B7FA8' },
    { name: 'Violet', value: '#8A6FA6' },
    { name: 'Rose', value: '#A96F80' },
    { name: 'Amber', value: '#A8834F' },
    { name: 'Green', value: '#5F8E6E' },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function normalizeAccentColor(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return HEX_COLOR.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function accentChannels(color: string): string {
    const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
    return channels.join(' ');
}

export function accentContrastChannels(color: string): string {
    const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
    const [red, green, blue] = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance > 0.4 ? '0 0 0' : '255 255 255';
}

export function readAccentColor(): string {
    try {
        return normalizeAccentColor(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_ACCENT_COLOR;
    } catch {
        return DEFAULT_ACCENT_COLOR;
    }
}

export function writeAccentColor(color: string): void {
    try {
        if (color === DEFAULT_ACCENT_COLOR) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, color);
        }
    } catch {
        // Storage can be unavailable or full; a stored preference is not worth failing a render over.
    }
}

export function applyAccentColor(color: string): void {
    const root = document.documentElement;
    if (color === DEFAULT_ACCENT_COLOR) {
        root.style.removeProperty('--ui-accent');
        root.style.removeProperty('--ui-accent-contrast');
    } else {
        root.style.setProperty('--ui-accent', accentChannels(color));
        root.style.setProperty('--ui-accent-contrast', accentContrastChannels(color));
    }
}
