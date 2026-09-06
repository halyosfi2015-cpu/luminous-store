import { NextResponse } from 'next/server';
import { getServerProducts } from '@/src/lib/server-products';
import { createPublicSupabaseClient } from '@/src/lib/supabase-server';
export async function GET() {
  const supabase = createPublicSupabaseClient();
  const { data: brand } = await supabase.from('brands').select('id, slug, name, product_count').eq('slug','acm').single();
  const catalog = await getServerProducts();
  const acmProds = catalog.products.filter(p=> (p as any).brandSlug==='acm');
  const arProds = catalog.products.filter(p=> (p as any).brandSlug==='اي-سي-ام');
  return NextResponse.json({brand, acmCount: acmProds.length, arCount: arProds.length, sample: acmProds.slice(0,2).map(p=>p.slug)});
}
