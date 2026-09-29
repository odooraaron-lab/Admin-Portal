import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

// Home-screen icon for phones: the tab icon on a soft background with padding.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const svg = readFileSync(path.join(process.cwd(), 'src/app/icon.svg'), 'utf8');
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2E2140' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={132} height={132} alt="" />
      </div>
    ),
    size,
  );
}
