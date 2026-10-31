import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND } from '@plcc/brand/brand';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const brandRoot = path.join(process.cwd(), '../packages/brand');
  const [fraunces, manrope, mark] = await Promise.all([
    readFile(path.join(brandRoot, 'fonts/Fraunces-Medium.ttf')),
    readFile(path.join(brandRoot, 'fonts/Manrope-SemiBold.ttf')),
    readFile(path.join(brandRoot, 'assets/plcc-mark.png')),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#12231C',
          padding: 80,
        }}
      >
        <img src={`data:image/png;base64,${mark.toString('base64')}`} width={160} height={160} alt="" />
        <div
          style={{
            marginTop: 36,
            fontFamily: 'Fraunces',
            fontSize: 72,
            fontWeight: 500,
            color: '#EDE6D6',
            lineHeight: 1,
            letterSpacing: -0.72,
          }}
        >
          {BRAND.name}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: 'Manrope',
            fontSize: 28,
            fontWeight: 600,
            color: '#C9A35A',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {BRAND.subline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: fraunces, weight: 500, style: 'normal' },
        { name: 'Manrope', data: manrope, weight: 600, style: 'normal' },
      ],
    },
  );
}
