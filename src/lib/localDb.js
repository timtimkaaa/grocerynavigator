import Dexie from 'dexie'

// Dexie wraps IndexedDB with a friendlier API. This database stores local copies
// of remote Supabase data so the app can reuse the last loaded store map.
export const localDb = new Dexie('groceryNavigator')

// Version 1 is the original local schema used when the project first added map
// caching. Keeping it declared lets Dexie upgrade older browsers cleanly.
localDb.version(1).stores({
  stores: '&id, name',
  sections: '&id, storeId, name, x, y, hasProducts',
  storeMaps: '&storeId',
})

// Version 2 added `sectionType`, mirroring the Supabase `section_type` column.
// The value is used to decide whether a section should be treated as product
// space, checkout, entrance, etc.
localDb.version(2).stores({
  stores: '&id, name',
  sections: '&id, storeId, name, x, y, sectionType, hasProducts',
  storeMaps: '&storeId',
})

// Version 3 added store dimensions. These let StoreMapService build maps from
// the store row instead of relying on a hardcoded grid size.
localDb.version(3).stores({
  stores: '&id, name, width, length',
  sections: '&id, storeId, name, x, y, sectionType, hasProducts',
  storeMaps: '&storeId',
})

// Version 4 adds product caching. ProductService writes full product rows here
// after fetching them from Supabase so details can be reused locally.
localDb.version(4).stores({
  stores: '&id, name, width, length',
  sections: '&id, storeId, name, x, y, sectionType, hasProducts',
  storeMaps: '&storeId',
  products: '&id, name, category',
})
