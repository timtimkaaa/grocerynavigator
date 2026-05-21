import { localDb } from '../lib/localDb'
import { supabase } from '../lib/supabaseClient'

// StoreService loads Store rows.
const STORES_TABLE = 'stores'

// Fallback dimensions keep the app usable if a store row is missing dimensions
// or an invalid value is stored while the database is being edited.
const DEFAULT_MAP_WIDTH = 21
const DEFAULT_MAP_LENGTH = 17

function raiseSupabaseError(error) {
  // Supabase returns `{ data, error }` instead of throwing. Converting that
  // result to an exception keeps service callers simple.
  if (error) {
    throw new Error(error.message)
  }
}

function normalizeStore(store) {
  // Store dimensions map directly from Supabase:
  // - `width` controls the horizontal number of columns.
  // - `length` controls the vertical number of rows.
  const width = Number(store.width)
  const length = Number(store.length)

  return {
    // Accept both frontend-style `id` and database-style `store_id`.
    id: store.id ?? store.store_id,
    name: store.name,
    address: store.address ?? '',
    width: Number.isFinite(width) && width > 0 ? width : DEFAULT_MAP_WIDTH,
    length: Number.isFinite(length) && length > 0 ? length : DEFAULT_MAP_LENGTH,
  }
}

export const StoreService = {
  async getStores() {
    // Fetch every store because the current UI does not yet include a store
    // selector. `getStoreById` picks the first store when no id is provided.
    const { data, error } = await supabase.from(STORES_TABLE).select('*')

    if (error) {
      // Offline or failed Supabase reads can still use the last successful local
      // Dexie cache, which keeps the map available during intermittent failures.
      const cachedStores = await localDb.stores.toArray()
      if (cachedStores.length > 0) return cachedStores
      raiseSupabaseError(error)
    }

    const stores = (data ?? []).map(normalizeStore).filter((store) => store.id)
    await localDb.stores.bulkPut(stores)

    return stores
  },

  async getStoreById(storeId) {
    // This goes through getStores so the normalization/caching logic stays in
    // one place and supports either `id` or `store_id` source columns.
    const stores = await this.getStores()

    if (!storeId) {
      return stores[0] ?? null
    }

    return stores.find((store) => store.id === storeId) ?? null
  },
}
