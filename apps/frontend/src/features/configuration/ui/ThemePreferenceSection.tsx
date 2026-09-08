import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop, faMoon, faPalette, faSun } from '@fortawesome/free-solid-svg-icons';
import { useAccentColor } from '@/shared/hooks/useAccentColor';
import { useThemePreference } from '@/shared/hooks/useThemePreference';
import { ACCENT_PRESETS, DEFAULT_ACCENT_COLOR, normalizeAccentColor } from '@/shared/lib/accentColor';
import { THEME_PREFERENCES, type ThemePreference } from '@/shared/lib/themePreference';

const THEME_ICON: Record<ThemePreference, typeof faSun> = {
    light: faSun,
    dark: faMoon,
    system: faDesktop,
};

export default function ThemePreferenceSection() {
    const [theme, chooseTheme] = useThemePreference();
    const [accent, chooseAccent] = useAccentColor();

    return (
        <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
            <div className="flex items-center gap-2 border-b border-ui-border bg-ui-selected px-4 py-2 text-sm font-semibold text-ui-text">
                <FontAwesomeIcon icon={faMoon} />
                <h2>Appearance</h2>
            </div>
            <div className="flex flex-col gap-4 px-4 py-3">
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-ui-text-mute">
                        Applies to this device only. &ldquo;System&rdquo; follows the setting of your operating system.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {THEME_PREFERENCES.map((option) => (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={theme === option}
                                onClick={() => chooseTheme(option)}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                                    theme === option
                                        ? 'border-ui-border-strong bg-ui-selected font-semibold text-ui-text'
                                        : 'border-ui-border text-ui-text-soft hover:bg-ui-raised hover:text-ui-text'
                                }`}
                            >
                                <FontAwesomeIcon icon={THEME_ICON[option]} className="text-xs" />
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-ui-separator pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ui-text">
                        <FontAwesomeIcon icon={faPalette} className="text-xs text-ui-text-mute" />
                        <h3>Accent colour</h3>
                    </div>
                    <p className="text-xs text-ui-text-mute">
                        The one colour the interface carries: selection bars and the ring around whatever the keyboard is on. The rest of the chrome stays
                        neutral, which is what keeps this colour readable as a choice.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {ACCENT_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                title={preset.name}
                                aria-label={preset.name}
                                aria-pressed={accent === preset.value}
                                onClick={() => chooseAccent(preset.value)}
                                style={{ backgroundColor: preset.value }}
                                className={`h-7 w-7 rounded-full border transition-colors ${
                                    accent === preset.value ? 'border-ui-text' : 'border-ui-border-strong hover:border-ui-text-soft'
                                }`}
                            />
                        ))}
                        <span className="mx-1 h-6 w-px bg-ui-separator" aria-hidden />
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ui-border px-2 py-1 text-sm text-ui-text-soft transition-colors hover:bg-ui-raised hover:text-ui-text">
                            <input
                                type="color"
                                value={accent.toLowerCase()}
                                aria-label="Custom accent colour"
                                onChange={(event) => chooseAccent(normalizeAccentColor(event.target.value) ?? DEFAULT_ACCENT_COLOR)}
                                className="h-5 w-5 cursor-pointer appearance-none rounded-full border-none bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                            />
                            Custom
                        </label>
                        <span className="font-mono text-xs uppercase text-ui-text-mute">{accent}</span>
                        {accent !== DEFAULT_ACCENT_COLOR && (
                            <button
                                type="button"
                                onClick={() => chooseAccent(DEFAULT_ACCENT_COLOR)}
                                className="text-xs text-ui-text-soft underline-offset-2 hover:text-ui-text hover:underline"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
