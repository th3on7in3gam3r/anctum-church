import React, { useMemo, useState } from 'react';
import { listTimeZones } from '../../../shared/prayerRoom.ts';

interface TimezoneSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export const TimezoneSelect: React.FC<TimezoneSelectProps> = ({ id, value, onChange }) => {
  const zones = useMemo(() => listTimeZones(), []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = needle ? zones.filter((zone) => zone.toLowerCase().includes(needle)) : zones;
    return source.slice(0, 80);
  }, [query, zones]);

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        value={open ? query : value}
        placeholder="Search timezones"
        onFocus={() => {
          setQuery(value);
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        className="w-full px-3 py-2 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-xs"
      />
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#17221D] shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[#68736D]">No matching timezone</li>
          ) : (
            filtered.map((zone) => (
              <li key={zone}>
                <button
                  type="button"
                  role="option"
                  aria-selected={zone === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(zone);
                    setQuery(zone);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs cursor-pointer hover:bg-[#203C32]/5 dark:hover:bg-[#C9A35A]/10 ${
                    zone === value ? 'text-[#203C32] dark:text-[#E8D8B2] font-bold' : 'text-[#16251F] dark:text-[#F8F7F3]'
                  }`}
                >
                  {zone}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
