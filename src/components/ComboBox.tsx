import React from 'react';

interface ComboBoxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const ComboBox: React.FC<ComboBoxProps> = ({ options, value, onChange }) => {
  return (
    <select
      className="border rounded-md p-2 w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default ComboBox;