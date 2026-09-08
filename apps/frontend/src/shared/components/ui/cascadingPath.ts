
export type PathOption<TValue> = {
  value: TValue;
  label: string;
};

export type PathValue<TValue> = ReadonlyArray<TValue | null>;

export type PathLevel<TValue> = {
  key: string;
  label: string;
  getOptions: (ancestors: PathValue<TValue>) => PathOption<TValue>[];
  implicitWhenSingle?: boolean;
};

export type PathLevelView<TValue> = {
  key: string;
  label: string;
  enabled: boolean;
  visible: boolean;
  options: PathOption<TValue>[];
  selected: PathOption<TValue> | null;
};

export function describePath<TValue>(
  levels: ReadonlyArray<PathLevel<TValue>>,
  value: PathValue<TValue>,
): PathLevelView<TValue>[] {
  const views: PathLevelView<TValue>[] = [];
  const settled: (TValue | null)[] = [];
  let blocked = false;

  levels.forEach((level, index) => {
    const options = blocked ? [] : level.getOptions(settled);
    const current = value[index] ?? null;
    const selected =
      options.find((option) => option.value === current) ?? (options.length === 1 ? options[0] : null);

    views.push({
      key: level.key,
      label: level.label,
      enabled: !blocked && options.length > 0,
      visible: !level.implicitWhenSingle || options.length > 1,
      options,
      selected: selected ?? null,
    });

    settled.push(selected ? selected.value : null);
    if (!selected) blocked = true;
  });

  return views;
}

export function resolvePath<TValue>(
  levels: ReadonlyArray<PathLevel<TValue>>,
  value: PathValue<TValue>,
): PathValue<TValue> {
  return describePath(levels, value).map((view) => view.selected?.value ?? null);
}

export function selectAtLevel<TValue>(
  levels: ReadonlyArray<PathLevel<TValue>>,
  value: PathValue<TValue>,
  index: number,
  selected: TValue,
): PathValue<TValue> {
  const next = levels.map((_, level) => {
    if (level < index) return value[level] ?? null;
    return level === index ? selected : null;
  });

  return resolvePath(levels, next);
}

export function isCompletePath<TValue>(value: PathValue<TValue>): value is ReadonlyArray<TValue> {
  return value.every((entry) => entry !== null);
}

export function samePath<TValue>(left: PathValue<TValue>, right: PathValue<TValue>): boolean {
  return left.length === right.length && left.every((entry, index) => entry === (right[index] ?? null));
}
