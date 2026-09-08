import { useMemo } from 'react';
import ReactSelect from 'react-select';
import { DROPDOWN_COMPONENTS } from '@/shared/components/ui/dropdownParts';
import type { SelectOption } from '@/shared/components/ui/Select';
import { selectStyles, type SelectVariant } from '@/styles/selectStyles';


export type MultiSelectOption<TValue extends string | number = number> = SelectOption<TValue>;

type MultiSelectProps<TValue extends string | number = number> = {
    options: MultiSelectOption<TValue>[];
    value: MultiSelectOption<TValue>[];
    onChange: (selectedOptions: MultiSelectOption<TValue>[]) => void;
    variant?: SelectVariant;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputId?: string;
};

export default function MultiSelect<TValue extends string | number = number>({
    options,
    value,
    onChange,
    variant = 'field',
    placeholder = 'Select…',
    disabled = false,
    className,
    inputId,
}: MultiSelectProps<TValue>) {
    const styles = useMemo(() => selectStyles<MultiSelectOption<TValue>, true>(variant), [variant]);

    return (
        <div className={className}>
            <ReactSelect<MultiSelectOption<TValue>, true>
                isMulti
                options={options}
                value={value}
                onChange={(selected) => onChange(Array.from(selected))}
                isDisabled={disabled}
                placeholder={placeholder}
                inputId={inputId}
                hideSelectedOptions={false}
                closeMenuOnSelect={false}
                menuPortalTarget={document.body}
                menuPlacement="auto"
                styles={styles}
                components={DROPDOWN_COMPONENTS}
            />
        </div>
    );
}
