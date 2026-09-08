
const NOT_A_COUNTRY = new Set(['EU', 'QO', 'UN', 'XA', 'XB', 'ZZ']);

export type Country = {
    code: string;
    name: string;
};

function assignedCountries(): Country[] {
    const names = new Intl.DisplayNames(undefined, { type: 'region' });
    const countries: Country[] = [];

    for (let first = 65; first <= 90; first += 1) {
        for (let second = 65; second <= 90; second += 1) {
            const code = String.fromCharCode(first, second);
            if (NOT_A_COUNTRY.has(code)) {
                continue;
            }

            const name = safeName(names, code);
            if (name && name !== code) {
                countries.push({ code, name });
            }
        }
    }

    return countries.sort((left, right) => left.name.localeCompare(right.name));
}

function safeName(names: Intl.DisplayNames, code: string): string | undefined {
    try {
        return names.of(code);
    } catch {
        return undefined;
    }
}

export const COUNTRIES: readonly Country[] = assignedCountries();

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function countryName(code: string): string {
    return BY_CODE.get(code.toUpperCase())?.name ?? code;
}
