import { localDb } from '../lib/localDb'
import { supabase } from '../lib/supabaseClient'

// The ProductService is a thin data-access layer. Components import this
// service to get the products.
const PRODUCTS_TABLE = 'products'
const STORE_PRODUCTS_TABLE = 'store_products'
const SECTIONS_TABLE = 'sections'

function raiseSupabaseError(error) {
  // Convert Supabase's explicit error return shape into an exception so UI code
  // can handle failures with try/catch.
  if (error) {
    throw new Error(error.message)
  }
}

function normalizeProduct(product) {
  // The app stores products locally with a stable `id` key for Dexie and UI code.
  return {
    id: product.id ?? product.product_id,
    name: product.name,
    category: product.category ?? '',
    description: product.description ?? '',
    thumbnail: product.thumbnail ?? '',
    picture: product.picture ?? '',
    quantityUnit: product.quantityUnit ?? product.quantity_unit ?? 'count',
    ...product,
  }
}

function normalizeProductPreview(product, priceByProductId = new Map()) {
  // Search screens need a smaller product shape than details screens. Keep the
  // preview intentionally narrow while still including `id` for rendering keys.
  const id = product.id ?? product.product_id

  return {
    id,
    name: product.name ?? '',
    thumbnail: product.thumbnail ?? '',
    price: priceByProductId.get(id) ?? null,
    quantityUnit: product.quantityUnit ?? product.quantity_unit ?? 'count',
  }
}

async function getStoreProductRows(productIds, storeId) {
  if (productIds.length === 0) {
    return []
  }

  let query = supabase.from(STORE_PRODUCTS_TABLE).select('product_id, price').in('product_id', productIds)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    return []
  }

  return data ?? []
}

async function getStoreProductRowsForStore(storeId) {
  if (!storeId) {
    return []
  }

  const { data, error } = await supabase
    .from(STORE_PRODUCTS_TABLE)
    .select('product_id, price')
    .eq('store_id', storeId)

  if (error) {
    return []
  }

  return data ?? []
}

function getPriceByProductId(storeProductRows) {
  return new Map(storeProductRows.map((storeProduct) => [storeProduct.product_id, storeProduct.price ?? null]))
}

async function cacheProductPreviews(previews) {
  // Dexie `put` replaces an object, so merge previews with any existing cached
  // full product details to avoid losing fields like description or location.
  const mergedProducts = await Promise.all(
    previews.map(async (preview) => {
      const cachedProduct = await localDb.products.get(preview.id)
      return {
        ...(cachedProduct ?? {}),
        ...preview,
      }
    }),
  )

  await localDb.products.bulkPut(mergedProducts)
}

function normalizeProductLocation(storeProduct, section) {
  // Product location is derived through StoreProduct -> Section. The product
  // itself does not own coordinates; its section does.
  if (!section) {
    return null
  }

  const x = Number(section.x)
  const y = Number(section.y)

  return {
    storeId: storeProduct.store_id ?? storeProduct.storeId ?? null,
    sectionId: section.section_id ?? section.id,
    sectionName: section.name ?? '',
    x: Number.isFinite(x) ? x : null,
    y: Number.isFinite(y) ? y : null,
  }
}

async function getProductLocation(productId, storeId) {
  // Product location should be scoped to the chosen store when one is supplied,
  // because the same product can be placed differently in different stores.
  let query = supabase
    .from(STORE_PRODUCTS_TABLE)
    .select('*')
    .eq('product_id', productId)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: storeProduct, error: storeProductError } = await query.limit(1).maybeSingle()

  if (storeProductError || !storeProduct) {
    return null
  }

  const sectionId = storeProduct.section_id ?? storeProduct.sectionId

  if (!sectionId) {
    return null
  }

  const { data: section, error: sectionError } = await supabase
    .from(SECTIONS_TABLE)
    .select('*')
    .eq('section_id', sectionId)
    .single()

  if (sectionError) {
    return null
  }

  return normalizeProductLocation(storeProduct, section)
}

export const ProductService = {
  async getProducts({ select = '*', from, to, filters = {} } = {}) {
    // Start with a flexible select so screens can request either full rows or a
    // smaller projection when they only need product previews.
    let query = supabase.from(PRODUCTS_TABLE).select(select)

    // Filters are intentionally generic: `{ category: 'dairy' }` becomes
    // `.eq('category', 'dairy')`. Empty values are ignored to keep form-driven
    // filters from producing accidental queries.
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(column, value)
      }
    })

    // Ranges are inclusive: 0 to 2 = 0,1,2
    if (Number.isInteger(from) && Number.isInteger(to)) {
      query = query.range(from, to)
    }

    const { data, error } = await query
    raiseSupabaseError(error)

    return data ?? []
  },

  async getProductById(id, { select = '*', storeId } = {}) {
    // Fail early for caller mistakes instead of issuing an ambiguous database
    // query that could return the wrong thing or a less helpful Supabase error.
    if (!id) {
      throw new Error('Product id is required')
    }

    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select(select)
      .eq('product_id', id)
      .single()

    if (error) {
      const cachedProduct = await localDb.products.get(id)
      if (cachedProduct) return cachedProduct
      raiseSupabaseError(error)
    }

    const product = {
      ...normalizeProduct(data),
      location: await getProductLocation(id, storeId),
    }
    await localDb.products.put(product)

    return product
  },

  async getProductPreviewsForSearch(searchTerm, { limit = 20, storeId } = {}) {
    // Empty search bar input should not scan the product table.
    if (!searchTerm?.trim()) {
      return []
    }

    if (storeId) {
      // Store-scoped search starts from StoreProduct so results include only
      // products offered by the chosen store.
      const storeProductRows = await getStoreProductRowsForStore(storeId)
      const storeProductIds = storeProductRows.map((storeProduct) => storeProduct.product_id).filter(Boolean)

      if (storeProductIds.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select('product_id, name, thumbnail, quantity_unit')
        .in('product_id', storeProductIds)
        .ilike('name', `%${searchTerm.trim()}%`)
        .limit(limit)

      raiseSupabaseError(error)

      const priceByProductId = getPriceByProductId(storeProductRows)
      const previews = (data ?? []).map((product) => normalizeProductPreview(product, priceByProductId))

      await cacheProductPreviews(previews)

      return previews
    }

    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select('product_id, name, thumbnail, quantity_unit')
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(limit)

    raiseSupabaseError(error)

    const products = data ?? []
    const productIds = products.map((product) => product.product_id).filter(Boolean)
    const priceByProductId = getPriceByProductId(await getStoreProductRows(productIds, storeId))
    const previews = products.map((product) => normalizeProductPreview(product, priceByProductId))

    await cacheProductPreviews(previews)

    return previews
  },

  async searchProducts(searchTerm, { column = 'name', select = '*', limit = 20 } = {}) {
    // Empty searches should not scan the products table. Returning an empty list
    // makes search boxes easy to wire directly to this method.
    if (!searchTerm?.trim()) {
      return []
    }

    // `ilike` gives case-insensitive partial matching in Postgres/Supabase.
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select(select)
      .ilike(column, `%${searchTerm.trim()}%`)
      .limit(limit)

    raiseSupabaseError(error)

    return data ?? []
  },
}
