import { components, type DropdownIndicatorProps, type GroupBase, type OptionProps } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons';

/* eslint-disable react-refresh/only-export-components */

function DropdownChevron<TOption, TMulti extends boolean, TGroup extends GroupBase<TOption>>(props: DropdownIndicatorProps<TOption, TMulti, TGroup>) {
    return (
        <components.DropdownIndicator {...props}>
            <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
        </components.DropdownIndicator>
    );
}

function OptionRow<TOption, TMulti extends boolean, TGroup extends GroupBase<TOption>>(props: OptionProps<TOption, TMulti, TGroup>) {
    return (
        <components.Option {...props}>
            <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{props.children}</span>
                {props.isSelected && <FontAwesomeIcon icon={faCheck} className="shrink-0 text-xs text-ui-accent" />}
            </span>
        </components.Option>
    );
}

export const DROPDOWN_COMPONENTS = { DropdownIndicator: DropdownChevron, Option: OptionRow };
