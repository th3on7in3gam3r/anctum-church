'use client';

import { useState } from 'react';
import { church } from '@/lib/church';

export function FindUs() {
  const [open, setOpen] = useState(false);
  const query = encodeURIComponent(church.mapsQuery);
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[26px] bg-sand">
        {open ? (
          <iframe
            title="Map of Promised Land Christian Center"
            className="h-80 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${query}&output=embed`}
          />
        ) : (
          <button type="button" className="glow-tile flex h-80 w-full items-center justify-center text-on-dark" onClick={() => setOpen(true)}>
            <span className="site-button bg-gold text-ink">Show map</span>
          </button>
        )}
      </div>
      <div className="rounded-[26px] bg-forest-950 p-6 text-on-dark">
        <p className="eyebrow">Find us</p>
        <p className="font-display mt-3 text-3xl">{church.address}</p>
        {church.landmark ? <p className="mt-2 text-muted-dark">{church.landmark}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a className="site-button bg-gold text-ink" href={`https://www.google.com/maps/search/?api=1&query=${query}`}>Get directions</a>
          <a className="site-button border border-sand text-on-dark" href={church.whatsapp}>WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
