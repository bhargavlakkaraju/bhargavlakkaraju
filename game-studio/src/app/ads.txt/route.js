// ads.txt authorizes the companies allowed to sell our ad inventory.
//   NEXT_PUBLIC_ADSENSE_CLIENT  adds the Google AdSense line
//   ADS_TXT_EXTRA               extra lines from other partners (newline or \n separated)
//   ADS_TXT_REDIRECT            full URL of a hosted ads.txt (Ezoic's ads.txt manager asks
//                               for a 301 to https://srv.adstxtmanager.com/<id>/<domain>)
export const dynamic = 'force-static';

export function GET() {
  const redirect = process.env.ADS_TXT_REDIRECT || '';
  if (/^https:\/\//.test(redirect)) return Response.redirect(redirect, 301);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  const pub = client.replace(/^ca-/, '');
  const lines = [];
  if (pub) lines.push(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`);
  if (process.env.ADS_TXT_EXTRA) lines.push(...process.env.ADS_TXT_EXTRA.split(/\\n|\n/).map((l) => l.trim()).filter(Boolean));
  if (!lines.length) lines.push('# ads.txt: set NEXT_PUBLIC_ADSENSE_CLIENT to publish seller records');
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain' } });
}
