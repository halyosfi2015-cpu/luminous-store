import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { createAdminClient } from '@/src/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const supabase = createAdminClient() as any

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    let query = supabase.from('products').select('*')

    if (productId) {
      query = query.eq('id', productId)
    }

    query = query.order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data: products, error } = await query

    if (error) throw error

    // Generate merchandising recommendations based on product data
    const recommendations = (products || []).map((product: any) => {
      const price = product.pricing?.price ?? 0
      const originalPrice = product.pricing?.originalPrice ?? product.basePrice ?? 0
      const discount = product.has_real_discount ? Math.round((1 - price / originalPrice) * 100) : 0
      const status = product.status ?? 'draft'

      const rec: any = {
        productId: product.id,
        productName: product.nameAr || product.nameEn || 'Unknown',
        currentPrice: price,
        originalPrice,
        discountPercent: discount,
        status,
        suggestions: [] as string[],
      }

      // Add pricing recommendations
      if (discount === 0 && status === 'published') {
        rec.suggestions.push('Consider adding a promotional discount to increase visibility')
      }
      if (discount > 0 && discount < 10) {
        rec.suggestions.push('Discount is minimal - consider increasing for better conversion')
      }
      if (discount >= 10 && discount < 20) {
        rec.suggestions.push('Moderate discount - performing well, maintain current level')
      }
      if (discount >= 20) {
        rec.suggestions.push('High discount - monitor margins and competitor pricing')
      }

      // Add visibility recommendations
      if (status !== 'published') {
        rec.suggestions.push('Product is not published - consider publishing to increase sales')
      }
      if (product.is_featured ?? false) {
        rec.suggestions.push('Product is featured - ensure it appears in highlighted sections')
      }

      // Add inventory recommendations
      if (product.stock_quantity ?? product.in_stock ?? 0 < 10) {
        rec.suggestions.push('Low stock - consider restocking soon')
      }

      return rec
    })

    return NextResponse.json({ recommendations })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    )
  }
}