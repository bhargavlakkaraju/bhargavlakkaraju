// ads.txt is required by AdSense and ad exchanges to authorize sellers of our inventory.
// Generated from NEXT_PUBLIC_ADSENSE_CLIENT, plus any extra lines in ADS_TXT_EXTRA
// (newline-separated, e.g. from other ad partners).
export const dynamic = 'force-static';

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  const pub = client.replace(/^ca-/, '');
  const lines = [];
  if (pub) lines.push(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`);
  if (process.env.ADS_TXT_EXTRA) lines.push(...process.env.ADS_TXT_EXTRA.split('\\n'));
  if (!lines.length) lines.push('# ads.txt: set NEXT_PUBLIC_ADSENSE_CLIENT to publish seller records');
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain' } });
}
