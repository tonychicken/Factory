interface Props {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function TextField({ label, value, onChange }: Props) {
  return <input type="text" aria-label={label} value={value} onChange={(e) => { onChange(e.target.value); }} />;
}