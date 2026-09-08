import { useMemo } from 'react';
import ReactSelect from 'react-select';
import { DROPDOWN_COMPONENTS } from '@/shared/components/ui/dropdownParts';
import { selectStyles, type SelectVariant } from '@/styles/selectStyles';


export type { SelectVariant };

export type SelectOption<TValue extends string | number = string> = {
    value: TValue;
    label: string;
    isDisabled?: boolean;
};

export type SelectOptionGroup<TValue extends string | number = string> = {
    label: string;
    options: SelectOption<TValue>[];
};

export type SelectOptions<TValue extends string | number = string> = (SelectOption<TValue> | SelectOptionGroup<TValue>)[];

const SEARCHABLE_FROM = 8;

function isGroup<TValue extends string | number>(entry: SelectOption<TValue> | SelectOptionGroup<TValue>): entry is SelectOptionGroup<TValue> {
    return 'options' in entry;
}

function flattenOptions<TValue extends string | number>(options: SelectOptions<TValue>): SelectOption<TValue>[] {
    return options.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));
}

type SelectProps<TValue extends string | number> = {
    options: SelectOptions<TValue>;
    value: TValue | null | undefined;
    onChange: (value: TValue) => void;
    variant?: SelectVariant;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    title?: string;
    'aria-label'?: string;
    inputId?: string;
};

export default function Select<TValue extends string | number = string>({
    options,
    value,
    onChange,
    variant = 'field',
    placeholder = 'Select…',
    disabled = false,
    className,
    title,
    'aria-label': ariaLabel,
    inputId,
}: SelectProps<TValue>) {
    const styles = useMemo(() => selectStyles<SelectOption<TValue>, false, SelectOptionGroup<TValue>>(variant), [variant]);
    const flat = useMemo(() => flattenOptions(options), [options]);
    const selected = useMemo(() => flat.find((option) => option.value === value) ?? null, [flat, value]);

    const box = [variant === 'field' ? 'block' : 'inline-block align-middle', className ?? ''].filter(Boolean).join(' ');

    return (
        <span className={box} title={title}>
            <ReactSelect<SelectOption<TValue>, false, SelectOptionGroup<TValue>>
                options={options}
                value={selected}
                onChange={(option) => option && onChange(option.value)}
                isDisabled={disabled}
                isSearchable={flat.length >= SEARCHABLE_FROM}
                placeholder={placeholder}
                aria-label={ariaLabel}
                inputId={inputId}
                menuPortalTarget={document.body}
                menuPlacement="auto"
                styles={styles}
                components={DROPDOWN_COMPONENTS}
            />
        </span>
    );
}
