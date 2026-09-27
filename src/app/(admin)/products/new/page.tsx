import { Notice } from '@/components/ui';
import { ProductForm } from '../ProductForm';
import { createProduct } from '../actions';

export default function NewProduct({ searchParams }: { searchParams: { err?: string } }) {
  return (
    <>
      <div className="page-head"><div><h1>Add product</h1><p className="sub">Starts hidden so nothing goes on sale until you’re ready.</p></div></div>
      <Notice err={searchParams.err} />
      <section className="panel"><ProductForm action={createProduct} submit="Add product" /></section>
    </>
  );
}
