import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { allProducts } from '@/lib/products';
import { Notice } from '@/components/ui';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ProductForm } from '../ProductForm';
import { updateProduct, rotateSecret } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params, searchParams }: {
  params: { code: string }; searchParams: { ok?: string; err?: string };
}) {
  const p = (await allProducts(true)).find((x) => x.code === params.code);
  if (!p) notFound();
  const host = headers().get('host') || 'admin.yourbrand.nz';
  const admin = `https://${host}`;

  const env = `HQ_URL=${admin}\nHQ_PRODUCT=${p.code}\nHQ_SECRET=${p.hq_secret}`;
  const beacon = `<script defer src="${admin}/beacon.js" data-product="${p.code}"${p.features?.heartbeat ? '\n  data-heartbeat' : ''}></script>`;

  return (
    <>
      <div className="page-head"><div><h1>{p.name}</h1><p className="sub">{p.domain}</p></div></div>
      <Notice ok={searchParams.ok} err={searchParams.err} />
      <div className="grid two">
        <section className="panel"><ProductForm p={p} action={updateProduct} submit="Save changes" /></section>
        <div className="stack">
          <section className="panel">
            <h2>Connect the app</h2>
            <p className="small">Add these environment variables to the product’s Vercel project.</p>
            <div className="code-block">{env}</div>
            <p className="small">Add this to every page (on the TV page too{p.features?.heartbeat ? ', which keeps the screen check-in going' : ''}):</p>
            <div className="code-block">{beacon}</div>
            <p className="small">Then copy the files in <span className="mono">hq-kit/</span> into the app. INTEGRATION.md has the steps.</p>
          </section>
          <section className="panel">
            <h2>Secret</h2>
            <p className="small muted">Make a new one if the old secret was shared by mistake. The app stops reporting until you update it there.</p>
            <form action={rotateSecret}>
              <input type="hidden" name="code" value={p.code} />
              <ConfirmButton className="btn small danger" message="Make a new secret? The app will stop reporting until you paste the new one in.">Make new secret</ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
