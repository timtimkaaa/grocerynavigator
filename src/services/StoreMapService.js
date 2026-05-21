import { localDb } from '../lib/localDb'
import { supabase } from '../lib/supabaseClient'
import { StoreService } from './StoreService'

//
const SECTIONS_TABLE = 'sections'
const STORE_PRODUCTS_TABLE = 'store_products'
const DEFAULT_MAP_WIDTH = 21
const DEFAULT_MAP_LENGTH = 17

function raiseSupabaseError(error) {
  // Supabase returns errors as values. Throwing here keeps consumers from
  // needing to inspect every Supabase response manually.
  if (error) {
    throw new Error(error.message)
  }
}

function normalizeSection(section, productSectionIds = new Set()) {
  // Support both Supabase snake_case rows and local camelCase cached rows.
  const id = section.id ?? section.section_id
  const storeId = section.storeId ?? section.store_id
  const sectionType = section.sectionType ?? section.section_type ?? ''

  // `section_type`is used to detect product-sections.
  // store_products is kept as a fallback for older or incomplete rows.
  const normalizedSectionType = sectionType.toString().toLowerCase()
  const isProductSection =
    normalizedSectionType === 'product' ||
    normalizedSectionType === 'products' ||
    normalizedSectionType === 'product_section'

  return {
    id,
    storeId,
    name: section.name,
    x: Number(section.x),
    y: Number(section.y),
    sectionType,
    // The UI uses this flag to tint product sections yellow.
    hasProducts: Boolean(section.hasProducts ?? (isProductSection || productSectionIds.has(id))),
  }
}

function normalizeProductSectionId(storeProduct) {
  // store_products is a junction table. For the map, the section id is enough
  // to determine which sections contain products.
  return storeProduct.sectionId ?? storeProduct.section_id ?? storeProduct.section?.id
}

function createGrid({ width = DEFAULT_MAP_WIDTH, length = DEFAULT_MAP_LENGTH } = {}) {
  // The grid is row-major: grid[y][x].
  // Each value starts as a placeholder and buildMap attaches section objects by coordinate.
  return Array.from({ length }, () => Array.from({ length: width }, () => 0))
}

function getSectionEmoji(section) {
  // These emoji's are temporary display hints until the app has a real icon set.
  const sectionType = section.sectionType?.toLowerCase() ?? ''
  const name = section.name?.toLowerCase() ?? ''

  if (sectionType.includes('checkout') || name.includes('checkout')) return '💳'
  if (sectionType.includes('entrance') || name.includes('entrance')) return '🚪'
  if (sectionType.includes('exit') || name.includes('exit')) return '➡️'
  if (name.includes('produce') || name.includes('fruit') || name.includes('vegetable')) return '🥬'
  if (name.includes('bakery') || name.includes('bread')) return '🥖'
  if (name.includes('dairy') || name.includes('milk')) return '🥛'
  if (name.includes('meat') || name.includes('fish') || name.includes('seafood')) return '🥩'
  if (name.includes('frozen')) return '🧊'
  if (name.includes('snack') || name.includes('candy')) return '🍫'
  if (name.includes('drink') || name.includes('beverage')) return '🥤'
  if (name.includes('house') || name.includes('clean')) return '🧼'

  return '🛒'
}


export const StoreMapService = {
  async getSections(storeId) {
    // Product-section ids are loaded first so normalization can calculate
    // `hasProducts` for every section in one pass.
    const productSectionIds = await this.getProductSectionIds(storeId)
    let query = supabase.from(SECTIONS_TABLE).select('*')

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
      // If Supabase is unreachable, fall back to the latest cached sections.
      const cachedSections = storeId
        ? await localDb.sections.where('storeId').equals(storeId).toArray()
        : await localDb.sections.toArray()

      if (cachedSections.length > 0) return cachedSections
      raiseSupabaseError(error)
    }

    const sections = (data ?? [])
      .map((section) => normalizeSection(section, productSectionIds))
      // A section must have a valid coordinate to be placed on the grid.
      .filter((section) => section.id && Number.isFinite(section.x) && Number.isFinite(section.y))

    await localDb.sections.bulkPut(sections)

    return sections
  },

  async getProductSectionIds(storeId) {
    // Consults the StoreProduct junction table to help build map tint product-sections.
    let query = supabase.from(STORE_PRODUCTS_TABLE).select('*')

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query

    if (error) {
      // Missing junction data should not prevent the map from rendering.
      return new Set()
    }

    return new Set((data ?? []).map(normalizeProductSectionId).filter(Boolean))
  },

  async buildMap(sections, grid = createGrid()) {
    // Coordinate lookup keeps rendering simple:
    // every cell can ask whether a section exists at its x/y coordinate.
    const sectionByPosition = new Map(
      sections.map((section) => [`${section.x}:${section.y}`, { ...section, emoji: getSectionEmoji(section) }]),
    )

    // `cells` is the render-ready StoreMap grid.
    // Null sections become walkspaces in the UI; non-null sections render an emoji and label.
    const cells = grid.map((row, y) =>
      row.map((value, x) => ({
        x,
        y,
        value,
        section: sectionByPosition.get(`${x}:${y}`) ?? null,
      })),
    )

    const storeId = sections[0]?.storeId ?? 'default'
    const storeMap = {
      storeId,
      sections,
      grid,
      width: grid[0]?.length ?? DEFAULT_MAP_WIDTH,
      length: grid.length ?? DEFAULT_MAP_LENGTH,
      cells,
      updatedAt: new Date().toISOString(),
    }

    return storeMap
  },

  async saveStoreMap(storeMap) {
    // Persist the final StoreMap shape in Dexie. Keeping this as a dedicated
    // method makes the persistence step explicit for callers and future tests.
    await localDb.storeMaps.put(storeMap)

    return storeMap
  },

  async getStoreMap(storeId) {
    // Convenience method for screens: StoreService supplies store dimensions,
    // while StoreMapService keeps ownership of sections and map construction.
    const store = await StoreService.getStoreById(storeId)
    const resolvedStoreId = store?.id ?? storeId
    const sections = await this.getSections(resolvedStoreId)
    const grid = createGrid(store)
    const storeMap = await this.buildMap(sections, grid)

    const enrichedStoreMap = {
      ...storeMap,
      store: store ?? null,
      storeId: store?.id ?? storeMap.storeId,
    }

    return this.saveStoreMap(enrichedStoreMap)
  },
}
