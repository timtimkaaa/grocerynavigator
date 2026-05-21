## Grocery Navigator
This is an app that helps users plan their shopping and navigate the store quickly and efficiently.
It allows to CRUD lists of products for a store on Lists screen, see prices with promotions, set quantity (or weight), sort the products. It let's users see promotions on Promotions screen. Users can search, sort and filter products on Search screen, see details about these products on Details screen and add them to different lists. The app has a Locate function to show the product's location on Locate screen with a map and a pin for the product (it doesn't show user's location). Lastly the app has a Navigation screen, where the user can see the optimal route for a list and check off an item they just got (thus letting the app know where they are in the store right now).

## Technology stack
- Frontend: React + Vite
- Local DB: IndexedDB (via Dexie.js)
- State: Zustand (State)
- Backend: Supabase
- Architecture: MVVM

## Class Diagram

### Classes and attributes
#### Store
##### Attributes
- `id`
- `name`

---

#### Section
##### Attributes
- `id`
- `storeId`
- `name`
- `x`
- `y`

##### Relationships
- Belongs to a `Store` via `storeId`

---

#### StoreMap
##### Attributes
- `sections: Section[]`
- `grid: number[][]`

##### Relationships
- Aggregates multiple `Section` objects

---

#### StoreMapService
##### Methods
- `getSections()`
- `buildMap(sections, grid)`

##### Relationships
- Builds a `StoreMap`

---

#### Product
*(Product + StoreProduct)*

##### Attributes
- `id`
- `name`
- `category`
- `description`
- `thumbnail`
- `picture`
- `price`
- `discount`
- `section`

##### Relationships
- Belongs to a `Section`

---

#### ProductService
##### Methods
- `getProductPreviews()`
- `getProductPreviewsByStore(store)`
- `getProductById(id)`

##### Relationships
- Provides access to `Product` data

---

#### RoutePlanner
##### Methods
- `calculateRoute(products)`
- `findPath(start, end)`

##### Relationships
- Uses `Product` data to calculate shopping routes

---

#### ShoppingListItem
##### Attributes
- `shoppingListId`
- `ShoppingListItemId`
- `product`
- `quantity`
- `isCollected`

##### Relationships
- References a `Product`
- Belongs to a `ShoppingList`

---

#### ShoppingList
##### Attributes
- `id`
- `userId`
- `items: ShoppingListItem[]`
- `updatedAt`
- `finished`

##### Relationships
- Composed of multiple `ShoppingListItem` objects

---

#### ShoppingListService
##### Methods
- `getLists()`
- `createList()`
- `removeList()`
- `addItem(list: ShoppingList)`
- `removeItem(list: ShoppingList)`
- `sort(list: ShoppingList)`
- `markCollected(productId)`
- `markFinished()`

##### Relationships
- Manages `ShoppingList`
- Interacts with `Product`

---

#### SyncService
##### Methods
- `syncShoppingLists()`
- `pushLocalChanges()`
- `fetchRemoteLists()`
- `resolveConflicts()`

##### Relationships
- Synchronizes `ShoppingList` data

---

#### AuthService
##### Methods
- `login(email, password)`
- `logout()`
- `getCurrentUser()`
- `isAuthenticated()`

---

#### Promotion
##### Attributes
- `id`
- `product`
- `storeId`
- `picture`
- `description`
- `discountValue`
- `validUntil`

##### Relationships
- Linked to a `Product`
- Belongs to a `Store`

---

#### PromotionService
##### Methods
- `getPromotions()`
- `getPromotionsByStore()`
- `getPromotionById(id)`

##### Relationships
- Provides access to `Promotion` data

---

## Main Associations Summary

- A `Store` contains many `Section`s.
- A `Section` contains many `Product`s.
- A `StoreMap` aggregates `Section`s and map grid data.
- A `ShoppingList` is composed of many `ShoppingListItem`s.
- A `ShoppingListItem` references a `Product`.
- `RoutePlanner` calculates optimized routes through products/sections.
- `Promotion` connects products with stores and discounts.
- Service classes (`ProductService`, `ShoppingListService`, `PromotionService`, etc.) manage business logic for their related entities.


## ER Diagram

#### Store
##### Attributes
- `store_id` (PK)
- `name`
- `address`
- `width`
- `height`

##### Relationships
- One `Store` has many `Section`s
- One `Store` has many `StoreProduct`s
- One `Store` has many `Promotion`s

---

#### Section
##### Attributes
- `section_id` (PK)
- `store_id` (FK → Store.store_id)
- `name`
- `x`
- `y`

##### Relationships
- Belongs to a `Store`
- One `Section` contains many `StoreProduct`s

---

#### User
##### Attributes
- `user_id` (PK)
- `email`
- `first_name`
- `last_name`
- `password_hash`

##### Relationships
- One `User` has many `ShoppingList`s

---

#### ShoppingList
##### Attributes
- `shopping_list_id` (PK)
- `name`
- `user_id` (FK → User.user_id)
- `created_at`
- `updated_at`
- `is_finished`

##### Relationships
- Belongs to a `User`
- One `ShoppingList` contains many `ShoppingListItem`s

---

#### ShoppingListItem
##### Attributes
- `shopping_list_item_id` (PK)
- `shopping_list_id` (FK → ShoppingList.shopping_list_id)
- `product_id` (FK → Product.product_id)
- `quantity`

##### Relationships
- Belongs to a `ShoppingList`
- References a `Product`

---

#### Product
##### Attributes
- `product_id` (PK)
- `name`
- `category`
- `description`
- `thumbnail`
- `picture`

##### Relationships
- One `Product` appears in many `ShoppingListItem`s
- One `Product` appears in many `StoreProduct`s
- One `Product` has many `Promotion`s

---

#### StoreProduct
##### Attributes
- `product_id` (FK → Product.product_id)
- `section_id` (FK → Section.section_id)
- `store_id` (FK → Store.store_id)
- `price`

##### Relationships
- Links `Product` to `Store`
- Associates a `Product` with a `Section`
- Represents store-specific product data (e.g., price)

---

#### Promotion
##### Attributes
- `promotion_id` (PK)
- `product_id` (FK → Product.product_id)
- `store_id` (FK → Store.store_id)
- `picture`
- `description`
- `discount_value`
- `valid_until`

##### Relationships
- Belongs to a `Product`
- Belongs to a `Store`

---

## Main Relationships Summary

- A `Store` contains many `Section`s.
- A `Store` offers many `Product`s through `StoreProduct`.
- A `Section` organizes products inside a store.
- A `User` owns multiple `ShoppingList`s.
- A `ShoppingList` contains multiple `ShoppingListItem`s.
- A `ShoppingListItem` references a specific `Product`.
- `StoreProduct` is a junction entity between `Store`, `Section`, and `Product`.
- `Promotion` connects discounts/promotions to products within stores.
```
