import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';

function extractPastedUrl(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  return (match ? match[0] : trimmed).replace(/[),.;]+$/g, '');
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface LogoUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  label?: string;
  hint?: string;
  previewAlt?: string;
}

export const LogoUrlField: React.FC<LogoUrlFieldProps> = ({
  value,
  onChange,
  optional = true,
  label = 'Church logo URL',
  hint = 'Paste a public https image link. The preview appears here and in your Sanctum Space.',
  previewAlt = 'Logo preview',
}) => {
  const [broken, setBroken] = useState(false);
  const previewUrl = value.trim();
  const showPreview = previewUrl.length > 0 && isHttpUrl(previewUrl) && !broken;

  return (
    <div>
      <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5">
        {label} {optional ? <span className="font-medium normal-case text-[#68736D]">(optional)</span> : null}
      </label>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] overflow-hidden flex items-center justify-center shrink-0">
          {showPreview ? (
            <img
              src={previewUrl}
              alt={previewAlt}
              className="w-full h-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-[#68736D] dark:text-[#96A39D]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => {
              setBroken(false);
              onChange(e.target.value);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              const extracted = extractPastedUrl(pasted);
              if (extracted && extracted !== pasted.trim()) {
                e.preventDefault();
                setBroken(false);
                onChange(extracted);
              }
            }}
            placeholder="Paste an image URL, e.g. https://yourchurch.org/logo.png"
            className="w-full px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold"
          />
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-1">{hint}</p>
          {previewUrl && broken ? (
            <p className="text-[11px] text-[#B94A48] mt-1">That link did not load as an image. Check it is public.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
