import { localDb } from '../lib/localDb'
import { supabase } from '../lib/supabaseClient'

// Table names follow the README ER diagram.
const PROMOTIONS_TABLE = 'promotions'

function raiseSupabaseError(error) {
  // Supabase returns errors as values. Throw here so UI code can use try/catch.
  if (error) {
    throw new Error(error.message)
  }
}

function normalizeProduct(product) {
  if (!product) {
    return null
  }

  return {
    id: product.id ?? product.product_id,
    name: product.name ?? '',
    category: product.category ?? '',
    thumbnail: product.thumbnail ?? '',
    picture: product.picture ?? '',
    quantityUnit: product.quantityUnit ?? product.quantity_unit ?? 'count',
    ...product,
  }
}

function normalizePromotion(promotion) {
  // Convert Supabase snake_case into the app's camelCase promotion shape.
  return {
    id: promotion.id ?? promotion.promotion_id,
    productId: promotion.productId ?? promotion.product_id,
    product: normalizeProduct(promotion.product),
    storeId: promotion.storeId ?? promotion.store_id,
    picture: promotion.picture ?? '',
    description: promotion.description ?? '',
    discountValue: promotion.discountValue ?? promotion.discount_value ?? null,
    validUntil: promotion.validUntil ?? promotion.valid_until ?? null,
  }
}

async function cachePromotions(promotions) {
  if (promotions.length === 0) {
    return
  }

  await localDb.promotions.bulkPut(promotions)
}

function getPromotionSelect(select) {
  // Default to the promotion fields plus a lightweight related product. If the
  // Supabase relationship name differs, callers can pass their own select.
  return (
    select ??
    'promotion_id, product_id, store_id, picture, description, discount_value, valid_until, product:products(product_id, name, category, thumbnail, picture, quantity_unit)'
  )
}

export const PromotionService = {
  async getPromotions({ select, limit } = {}) {
    let query = supabase.from(PROMOTIONS_TABLE).select(getPromotionSelect(select))

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      const cachedPromotions = await localDb.promotions.toArray()
      if (cachedPromotions.length > 0) return cachedPromotions
      raiseSupabaseError(error)
    }

    const promotions = (data ?? []).map(normalizePromotion).filter((promotion) => promotion.id)
    await cachePromotions(promotions)

    return promotions
  },

  async getPromotionsByStore(storeId, { select, limit } = {}) {
    if (!storeId) {
      throw new Error('Store id is required')
    }

    let query = supabase.from(PROMOTIONS_TABLE).select(getPromotionSelect(select)).eq('store_id', storeId)

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      const cachedPromotions = await localDb.promotions.where('storeId').equals(storeId).toArray()
      if (cachedPromotions.length > 0) return cachedPromotions
      raiseSupabaseError(error)
    }

    const promotions = (data ?? []).map(normalizePromotion).filter((promotion) => promotion.id)
    await cachePromotions(promotions)

    return promotions
  },

  async getPromotionById(id, { select } = {}) {
    if (!id) {
      throw new Error('Promotion id is required')
    }

    const { data, error } = await supabase
      .from(PROMOTIONS_TABLE)
      .select(getPromotionSelect(select))
      .eq('promotion_id', id)
      .single()

    if (error) {
      const cachedPromotion = await localDb.promotions.get(id)
      if (cachedPromotion) return cachedPromotion
      raiseSupabaseError(error)
    }

    const promotion = normalizePromotion(data)
    await localDb.promotions.put(promotion)

    return promotion
  },
}
