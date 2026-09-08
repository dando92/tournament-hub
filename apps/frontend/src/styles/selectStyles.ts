import type { GroupBase, StylesConfig } from 'react-select';


const SURFACE = 'rgb(var(--ui-surface))';
const RAISED = 'rgb(var(--ui-raised))';
const SELECTED = 'rgb(var(--ui-selected))';
const BORDER = 'rgb(var(--ui-border))';
const BORDER_STRONG = 'rgb(var(--ui-border-strong))';
const SEPARATOR = 'rgb(var(--ui-separator))';
const ACCENT = 'rgb(var(--ui-accent))';
const TEXT = 'rgb(var(--ui-text))';
const TEXT_SOFT = 'rgb(var(--ui-text-soft))';
const TEXT_MUTE = 'rgb(var(--ui-text-mute))';
const FAILED = 'rgb(var(--state-failed))';
const RADIUS = '0.625rem';

export type SelectVariant = 'field' | 'compact' | 'inline';

type VariantMetrics = {
    fontSize: string;
    padding: string;
    color: string;
    background: string;
    borderColor: string;
};

const VARIANTS: Record<SelectVariant, VariantMetrics> = {
    field: { fontSize: '0.875rem', padding: '0.5rem 0.75rem', color: TEXT, background: SURFACE, borderColor: BORDER_STRONG },
    compact: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: TEXT_SOFT, background: SURFACE, borderColor: BORDER },
    inline: { fontSize: '0.875rem', padding: '0.125rem 0.375rem', color: TEXT, background: RAISED, borderColor: 'transparent' },
};

export function selectStyles<TOption, TMulti extends boolean = false, TGroup extends GroupBase<TOption> = GroupBase<TOption>>(
    variant: SelectVariant = 'field',
): StylesConfig<TOption, TMulti, TGroup> {
    const metrics = VARIANTS[variant];

    return {
        control: (base, state) => ({
            ...base,
            minHeight: 0,
            padding: 0,
            fontSize: metrics.fontSize,
            color: metrics.color,
            backgroundColor: metrics.background,
            borderRadius: RADIUS,
            borderColor: metrics.borderColor,
            boxShadow: state.isFocused ? `0 0 0 2px ${ACCENT}` : 'none',
            opacity: state.isDisabled ? 0.5 : 1,
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': { borderColor: metrics.borderColor },
        }),
        valueContainer: (base) => ({ ...base, padding: metrics.padding, gap: '0.25rem' }),
        indicatorsContainer: (base) => ({ ...base, padding: `0 ${metrics.padding.split(' ')[1]} 0 0` }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({ ...base, padding: 0, color: TEXT_MUTE, '&:hover': { color: TEXT_MUTE } }),
        clearIndicator: (base) => ({ ...base, padding: 0, marginRight: '0.5rem', color: TEXT_MUTE, '&:hover': { color: FAILED } }),
        singleValue: (base) => ({ ...base, margin: 0, color: metrics.color }),
        input: (base) => ({ ...base, margin: 0, padding: 0, color: TEXT }),
        placeholder: (base) => ({ ...base, margin: 0, color: TEXT_MUTE }),

        multiValue: (base) => ({ ...base, margin: 0, backgroundColor: SELECTED, borderRadius: '0.375rem' }),
        multiValueLabel: (base) => ({ ...base, color: TEXT, fontSize: '0.8125rem' }),
        multiValueRemove: (base) => ({
            ...base,
            color: TEXT_MUTE,
            borderRadius: '0 0.375rem 0.375rem 0',
            '&:hover': { backgroundColor: RAISED, color: FAILED },
        }),

        menu: (base) => ({
            ...base,
            marginTop: '0.25rem',
            marginBottom: '0.25rem',
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            boxShadow: '0 10px 15px -3px rgb(var(--ui-shadow) / var(--ui-shadow-alpha)), 0 4px 6px -4px rgb(var(--ui-shadow) / var(--ui-shadow-alpha))',
            overflow: 'hidden',
        }),
        menuList: (base) => ({ ...base, padding: '0.25rem', maxHeight: '18rem' }),
        menuPortal: (base) => ({ ...base, zIndex: 10000 }),
        option: (base, state) => ({
            ...base,
            padding: '0.5rem 0.625rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: TEXT,
            backgroundColor: state.isSelected ? SELECTED : state.isFocused ? RAISED : 'transparent',
            fontWeight: state.isSelected ? 600 : 400,
            opacity: state.isDisabled ? 0.4 : 1,
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            ':active': { backgroundColor: SELECTED },
        }),
        group: (base) => ({ ...base, padding: 0, ':not(:first-of-type)': { borderTop: `1px solid ${SEPARATOR}`, marginTop: '0.25rem', paddingTop: '0.25rem' } }),
        groupHeading: (base) => ({
            ...base,
            margin: 0,
            padding: '0.375rem 0.625rem 0.25rem',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: TEXT_MUTE,
        }),
        noOptionsMessage: (base) => ({ ...base, padding: '0.75rem', fontSize: '0.875rem', color: TEXT_MUTE }),
        loadingMessage: (base) => ({ ...base, padding: '0.75rem', fontSize: '0.875rem', color: TEXT_MUTE }),
    };
}
