import { useEffect, useMemo, useState } from 'react'
import {
  AppFrame,
  BottomNav,
  Content,
  IconButton,
  InlineState,
  ListIcon,
  MoreButton,
  PlusIcon,
  Screen,
  SearchBox,
  SearchIcon,
  SectionHeading,
  TopBar,
  TopBarActions,
} from './components/design-system.jsx'
import './components/design-system.css'
import { supabase } from './lib/supabaseClient'
import { ProductService } from './services/ProductService'
import { PromotionService } from './services/PromotionService'
import { ShoppingListService } from './services/ShoppingListService'
import { StoreMapService } from './services/StoreMapService'
import { StoreService } from './services/StoreService'
import './App.css'

const PROMOTION_SLOTS = 3
const LIST_SLOTS = 3
const LIST_ITEM_PREVIEW_LIMIT = 3
const ROUTES = {
  home: '#/',
  lists: '#/lists',
  newList: '#/lists/new',
  search: '#/search',
}

function getRouteFromHash() {
  if (window.location.hash === ROUTES.newList) {
    return 'newList'
  }

  if (window.location.hash === ROUTES.search) {
    return 'search'
  }

  return window.location.hash === ROUTES.lists ? 'lists' : 'home'
}

function formatDate(value) {
  if (!value) {
    return 'Limited time'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Limited time'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatListItem(item, productNamesById) {
  const productName = productNamesById[item.productId] ?? `Product ${item.productId}`

  return `${productName} x ${item.quantity}`
}

function formatLastEditDate(value) {
  if (!value) {
    return 'Last edited date unavailable'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Last edited date unavailable'
  }

  return `Last edited ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)}`
}

function PromotionCard({ promotion }) {
  const imageUrl = promotion.picture || promotion.product?.thumbnail

  return (
    <article className="promotion-card">
      <div className="promo-art">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span className="promo-symbol">%</span>}
      </div>
      <div className="promo-copy">
        <span className="card-kicker">{formatDate(promotion.validUntil)}</span>
        <h3>{promotion.product?.name || 'Store promotion'}</h3>
        <p>{promotion.discountValue ?? promotion.description ?? 'Special offer'}</p>
      </div>
    </article>
  )
}

function PromotionsSection({ isLoading, promotions }) {
  const visiblePromotions = promotions.slice(0, PROMOTION_SLOTS)

  return (
    <section className="section-block" aria-labelledby="promotions-title">
      <SectionHeading
        actionLabel="View all"
        eyebrow="Best prices"
        title="Hot promotions"
        titleId="promotions-title"
      />
      {isLoading ? (
        <InlineState>Loading promotions...</InlineState>
      ) : visiblePromotions.length > 0 ? (
        <div className="promotion-strip">
          {visiblePromotions.map((promotion) => (
            <PromotionCard promotion={promotion} key={promotion.id} />
          ))}
        </div>
      ) : (
        <InlineState>No promotions available for this store.</InlineState>
      )}
    </section>
  )
}

function ListRow({ list, productNamesById }) {
  const name = list.name || 'Untitled list'
  const itemPreview = list.items
    .slice(0, LIST_ITEM_PREVIEW_LIMIT)
    .map((item) => formatListItem(item, productNamesById))
    .join(', ')

  return (
    <article className="list-row">
      <ListIcon />
      <div>
        <h3>{name}</h3>
        <p>{itemPreview || `${list.items.length} items`}</p>
      </div>
      <MoreButton label={`More options for ${name}`} />
    </article>
  )
}

function AddListRow({ isCard = false, onCreate }) {
  return (
    <button className={`add-list-button ${isCard ? 'add-list-card' : ''}`.trim()} type="button" onClick={onCreate}>
      <span className="add-list-icon" aria-hidden="true">
        +
      </span>
      <span>Add new list</span>
    </button>
  )
}

function ListsSection({ isLoading, lists, onCreateList, onViewAll, productNamesById, session }) {
  const visibleLists = lists.slice(0, LIST_SLOTS)

  return (
    <section className="section-block" aria-labelledby="lists-title">
      <SectionHeading
        actionLabel="View all"
        eyebrow="Planning"
        onAction={onViewAll}
        title="Your lists"
        titleId="lists-title"
      />

      {isLoading ? (
        <InlineState>Loading shopping lists...</InlineState>
      ) : !session ? (
        <InlineState>Sign in to load your saved shopping lists.</InlineState>
      ) : (
        <div className="list-panel">
          {visibleLists.length > 0 ? (
            visibleLists.map((list) => (
              <ListRow list={list} key={list.id} productNamesById={productNamesById} />
            ))
          ) : (
            <article className="list-row empty-list-row">
              <ListIcon variant="muted" />
              <div>
                <h3>No shopping lists yet</h3>
                <p>Create your first list below</p>
              </div>
            </article>
          )}
          <AddListRow onCreate={onCreateList} />
        </div>
      )}
    </section>
  )
}

function StoreMapPreview({ isLoading, storeMap }) {
  return (
    <section className="section-block map-block" aria-labelledby="map-title">
      <SectionHeading actionLabel="Open" eyebrow="In store" title="Store map" titleId="map-title" />
      <div className="map-preview" aria-label="Store map preview">
        {storeMap ? <MiniMap storeMap={storeMap} /> : <MapEmptyState isLoading={isLoading} />}
      </div>
    </section>
  )
}

function SearchEntry({ onOpenSearch }) {
  return (
    <button className="search-entry" type="button" onClick={onOpenSearch}>
      <SearchIcon />
      <span>Search products, aisles, lists</span>
    </button>
  )
}

function MiniMap({ storeMap }) {
  return (
    <div className="mini-map" style={{ gridTemplateColumns: `repeat(${storeMap.width}, minmax(0, 1fr))` }}>
      {storeMap.cells.flatMap((row) =>
        row.map((cell) => (
          <span
            className={[
              'mini-cell',
              cell.section ? 'section-cell' : '',
              cell.section?.hasProducts ? 'product-cell' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={`${cell.x}-${cell.y}`}
            title={cell.section?.name ?? 'Walkspace'}
          />
        )),
      )}
    </div>
  )
}

function MapEmptyState({ isLoading }) {
  return (
    <div className="map-empty">
      <span />
      <p>{isLoading ? 'Map loading' : 'No store map available'}</p>
    </div>
  )
}

function HomeScreen({
  isHomeLoading,
  isListLoading,
  message,
  onNavigate,
  productNamesById,
  promotions,
  session,
  shoppingLists,
  storeMap,
  userEmail,
}) {
  return (
    <Screen label="Home">
      <TopBar title="Home" userEmail={userEmail} />

      <Content>
        <SearchEntry onOpenSearch={() => onNavigate('search')} />
        {message ? <p className="data-message">{message}</p> : null}
        <PromotionsSection isLoading={isHomeLoading} promotions={promotions} />
        <ListsSection
          isLoading={isListLoading}
          lists={shoppingLists}
          onCreateList={() => onNavigate('newList')}
          onViewAll={() => onNavigate('lists')}
          productNamesById={productNamesById}
          session={session}
        />
        <StoreMapPreview isLoading={isHomeLoading} storeMap={storeMap} />
      </Content>

      <BottomNav activeView="home" onNavigate={onNavigate} />
    </Screen>
  )
}

function ListContextMenu({ onDelete, onRename }) {
  return (
    <div className="list-context-menu" role="menu">
      <button type="button" role="menuitem" onClick={onRename}>
        Rename list
      </button>
      <button className="danger-menu-item" type="button" role="menuitem" onClick={onDelete}>
        Delete list
      </button>
    </div>
  )
}

function AllListCard({ isMenuOpen, list, onDelete, onMenuToggle, onRename }) {
  const name = list.name || 'Untitled list'

  return (
    <article className="all-list-card">
      <div className="all-list-card-copy">
        <h3>{name}</h3>
        <p>{formatLastEditDate(list.updatedAt ?? list.createdAt)}</p>
      </div>
      <MoreButton label={`More options for ${name}`} onClick={onMenuToggle} />
      {isMenuOpen ? <ListContextMenu onDelete={onDelete} onRename={onRename} /> : null}
    </article>
  )
}

function AllListsGroup({ children, title }) {
  return (
    <section className="all-lists-section" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}>
      <h2 className="all-lists-title" id={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}>
        {title}:
      </h2>
      <div className="all-lists-group">{children}</div>
    </section>
  )
}

function AllListsScreen({
  activeListMenuId,
  deleteDialogList,
  isListLoading,
  message,
  onCancelDeleteList,
  onCancelRenameList,
  onConfirmDeleteList,
  onConfirmRenameList,
  onDeleteList,
  onNavigate,
  onRenameList,
  onRenameDraftChange,
  onToggleListMenu,
  renameDialogList,
  renameDraft,
  session,
  shoppingLists,
}) {
  return (
    <Screen label="All lists">
      <TopBar
        actions={
          <TopBarActions>
            <IconButton label="Add list" onClick={() => onNavigate('newList')}>
              <PlusIcon />
            </IconButton>
            <IconButton label="Search lists" onClick={() => onNavigate('search')}>
              <SearchIcon />
            </IconButton>
          </TopBarActions>
        }
        title="All lists"
      />

      <Content>
        <div className="all-lists-content">
          {message ? <p className="data-message">{message}</p> : null}

          {isListLoading ? (
            <InlineState>Loading shopping lists...</InlineState>
          ) : !session ? (
            <InlineState>Sign in to load your saved shopping lists.</InlineState>
          ) : (
            <AllListsGroup title="Your lists">
              {shoppingLists.length > 0 ? (
                shoppingLists.map((list) => (
                  <AllListCard
                    isMenuOpen={activeListMenuId === list.id}
                    list={list}
                    key={list.id}
                    onDelete={() => onDeleteList(list)}
                    onMenuToggle={() => onToggleListMenu(list.id)}
                    onRename={() => onRenameList(list)}
                  />
                ))
              ) : (
                <div className="shared-empty">No shopping lists yet.</div>
              )}
              <AddListRow isCard onCreate={() => onNavigate('newList')} />
            </AllListsGroup>
          )}

        </div>
      </Content>

      <BottomNav activeView="lists" onNavigate={onNavigate} />

      {renameDialogList ? (
        <RenameListDialog
          list={renameDialogList}
          name={renameDraft}
          onCancel={onCancelRenameList}
          onChange={onRenameDraftChange}
          onConfirm={onConfirmRenameList}
        />
      ) : null}

      {deleteDialogList ? (
        <DeleteListDialog
          list={deleteDialogList}
          onCancel={onCancelDeleteList}
          onConfirm={onConfirmDeleteList}
        />
      ) : null}
    </Screen>
  )
}

function RenameListDialog({ list, name, onCancel, onChange, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog-panel" onSubmit={onConfirm} role="dialog" aria-modal="true" aria-labelledby="rename-title">
        <div>
          <p className="eyebrow">Edit list</p>
          <h2 id="rename-title">Rename list</h2>
        </div>

        <label>
          <span>List name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(event) => onChange(event.target.value)}
            placeholder={list.name || 'Untitled list'}
          />
        </label>

        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-action" type="submit">
            Rename
          </button>
        </div>
      </form>
    </div>
  )
}

function DeleteListDialog({ list, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div>
          <p className="eyebrow">Delete list</p>
          <h2 id="delete-title">Delete "{list.name || 'Untitled list'}"?</h2>
        </div>

        <p className="dialog-copy">This removes the list and its items from your account.</p>

        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="danger-action" type="button" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchScreen({ onNavigate }) {
  const [expandedResultId, setExpandedResultId] = useState('2')
  const results = [
    {
      id: '1',
      name: 'Milk UHT 2,0% Milktown',
      price: '$5',
      unitPrice: '$5/L',
    },
    {
      id: '2',
      name: 'Milk fresh 2,0% MeinMilch',
      price: '$7',
      unitPrice: '$7/L',
    },
    {
      id: '3',
      name: 'Milk HealthFarm',
      price: '$10',
      unitPrice: '$10/L',
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `placeholder-${index}`,
      name: '',
      price: '',
      unitPrice: '',
    })),
  ]

  return (
    <Screen label="Search">
      <header className="search-top-bar">
        <button className="back-button" type="button" aria-label="Back" onClick={() => onNavigate('home')}>
          <span />
        </button>
        <h1>Search</h1>
      </header>

      <Content>
        <div className="search-screen-content">
          <div className="search-field">
            <SearchIcon />
            <span>Milk</span>
            <button type="button" aria-label="Clear search">
              <span />
            </button>
          </div>

          <div className="search-controls" aria-label="Search controls">
            <button type="button">Sort</button>
            <button type="button">Filter</button>
          </div>

          <h2 className="search-results-title">Results for “Product” (7)</h2>

          <div className="search-results-list">
            {results.map((result) => (
              <SearchResultRow
                isExpanded={expandedResultId === result.id}
                onToggle={() => setExpandedResultId((currentId) => (currentId === result.id ? '' : result.id))}
                result={result}
                key={result.id}
              />
            ))}
          </div>
        </div>
      </Content>

      <BottomNav activeView="home" onNavigate={onNavigate} />
    </Screen>
  )
}

function SearchResultRow({ isExpanded, onToggle, result }) {
  const isPlaceholder = !result.name

  return (
    <article className={`search-result-row ${isExpanded ? 'expanded' : ''}`.trim()}>
      <div className="search-result-main">
        <div className="result-image" aria-hidden="true">
          <span />
        </div>
        <div className="result-copy">
          {isPlaceholder ? (
            <>
              <span className="result-line long" />
              <span className="result-line short" />
            </>
          ) : (
            <>
              <h3>{result.name}</h3>
              <p>
                <strong>{result.price}</strong>
                <span>{result.unitPrice}</span>
              </p>
            </>
          )}
        </div>
        <button className="result-add-button" type="button" aria-label="Add product">
          <span />
        </button>
        <button
          className="result-expand-button"
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse product actions' : 'Expand product actions'}
          onClick={onToggle}
        >
          <span />
        </button>
      </div>
      {isExpanded ? <SearchResultMenu /> : null}
    </article>
  )
}

function SearchResultMenu() {
  return (
    <div className="search-result-menu">
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua...
      </p>
      <div className="search-result-actions">
        <button type="button">
          <span className="search-action-icon details-action-icon" aria-hidden="true" />
          Details
        </button>
        <button type="button">
          <span className="search-action-icon add-action-icon" aria-hidden="true" />
          Add to list
        </button>
        <button type="button">
          <span className="search-action-icon navigate-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 21s6-5.7 6-11a6 6 0 0 0-12 0c0 5.3 6 11 6 11Z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
          </span>
          Navigate
        </button>
        <button type="button">
          <span className="search-action-icon more-action-icon" aria-hidden="true" />
          More options
        </button>
      </div>
    </div>
  )
}

function CreateListScreen({ error, isSubmitting, listName, onCancel, onCreate, onListNameChange, onNavigate }) {
  return (
    <Screen label="Create new list">
      <TopBar title="New list" userEmail={null} />

      <Content>
        <form className="create-list-form" onSubmit={onCreate}>
          <label>
            <span>List name</span>
            <input
              autoFocus
              type="text"
              value={listName}
              onChange={(event) => onListNameChange(event.target.value)}
              placeholder="Weekly groceries"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button className="secondary-action" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Content>

      <BottomNav activeView="lists" onNavigate={onNavigate} />
    </Screen>
  )
}

function AuthScreen({
  authMode,
  email,
  error,
  isLoading,
  isSubmitting,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password,
}) {
  return (
    <Screen label="Authentication">
      <div className="auth-screen-content">
        <div className="auth-heading">
          <p className="eyebrow">Grocery Navigator</p>
          <h1>{authMode === 'sign-in' ? 'Welcome back' : 'Create account'}</h1>
          <p>Sign in to manage your shopping lists, promotions, and store maps.</p>
        </div>

        {isLoading ? (
          <InlineState>Loading session...</InlineState>
        ) : (
          <>
            <div className="auth-mode-toggle" aria-label="Authentication mode">
              <button
                className={authMode === 'sign-in' ? 'active' : ''}
                type="button"
                onClick={() => onAuthModeChange('sign-in')}
              >
                Sign in
              </button>
              <button
                className={authMode === 'sign-up' ? 'active' : ''}
                type="button"
                onClick={() => onAuthModeChange('sign-up')}
              >
                Sign up
              </button>
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={6}
                  placeholder="At least 6 characters"
                  required
                />
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button className="primary-action" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? authMode === 'sign-in'
                    ? 'Signing in...'
                    : 'Creating...'
                  : authMode === 'sign-in'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>
          </>
        )}
      </div>
    </Screen>
  )
}

function StoreSelectionScreen({ error, isLoading, onSelectStore, stores }) {
  return (
    <Screen label="Select store">
      <div className="store-selection-content">
        <div className="auth-heading">
          <p className="eyebrow">Choose store</p>
          <h1>Select your store</h1>
          <p>Promotions, product lookups, and the store map will be loaded for this store.</p>
        </div>

        {isLoading ? (
          <InlineState>Loading stores...</InlineState>
        ) : error ? (
          <InlineState>{error}</InlineState>
        ) : stores.length > 0 ? (
          <div className="store-list">
            {stores.map((store) => (
              <button className="store-option" type="button" key={store.id} onClick={() => onSelectStore(store.id)}>
                <span className="store-option-icon" aria-hidden="true" />
                <span>
                  <strong>{store.name || 'Unnamed store'}</strong>
                  <small>{store.address || `${store.width} x ${store.length} map`}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <InlineState>No stores are available.</InlineState>
        )}
      </div>
    </Screen>
  )
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash)
  const [session, setSession] = useState(null)
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [storeMap, setStoreMap] = useState(null)
  const [shoppingLists, setShoppingLists] = useState([])
  const [promotions, setPromotions] = useState([])
  const [productNamesById, setProductNamesById] = useState({})
  const [isHomeLoading, setIsHomeLoading] = useState(true)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [isStoreLoading, setIsStoreLoading] = useState(false)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [authMode, setAuthMode] = useState('sign-in')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListError, setNewListError] = useState('')
  const [activeListMenuId, setActiveListMenuId] = useState(null)
  const [renameDialogList, setRenameDialogList] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteDialogList, setDeleteDialogList] = useState(null)
  const [storeError, setStoreError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!isCurrent) {
        return
      }

      if (error) {
        setAuthError(error.message)
      }

      setSession(session)
      setIsAuthLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsAuthLoading(false)

      if (!session) {
        setSelectedStoreId('')
        setStores([])
        setStoreMap(null)
        setPromotions([])
      }
    })

    return () => {
      isCurrent = false
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setStores([])
      setSelectedStoreId('')
      return
    }

    let isCurrent = true

    async function loadStores() {
      setIsStoreLoading(true)
      setStoreError('')

      try {
        const stores = await StoreService.getStores()

        if (isCurrent) {
          setStores(stores)
        }
      } catch (error) {
        if (isCurrent) {
          setStoreError(error.message)
        }
      } finally {
        if (isCurrent) {
          setIsStoreLoading(false)
        }
      }
    }

    loadStores()

    return () => {
      isCurrent = false
    }
  }, [session])

  useEffect(() => {
    if (!session || !selectedStoreId) {
      setStoreMap(null)
      setPromotions([])
      setIsHomeLoading(false)
      return
    }

    let isCurrent = true

    async function loadHomeData() {
      setIsHomeLoading(true)
      setMessage('')

      try {
        const map = await StoreMapService.getStoreMap(selectedStoreId)

        if (!isCurrent) {
          return
        }

        setStoreMap(map)

        const loadedPromotions = await PromotionService.getPromotionsByStore(selectedStoreId, {
          limit: PROMOTION_SLOTS,
        })

        if (isCurrent) {
          setPromotions(loadedPromotions)
        }
      } catch (error) {
        if (isCurrent) {
          setMessage(error.message)
        }
      } finally {
        if (isCurrent) {
          setIsHomeLoading(false)
        }
      }
    }

    loadHomeData()

    return () => {
      isCurrent = false
    }
  }, [selectedStoreId, session])

  useEffect(() => {
    if (!session) {
      setShoppingLists([])
      setProductNamesById({})
      return
    }

    let isCurrent = true

    async function loadShoppingLists() {
      setIsListLoading(true)

      try {
        const lists = await ShoppingListService.getShoppingLists()

        if (isCurrent) {
          setShoppingLists(lists)
        }
      } catch (error) {
        if (isCurrent) {
          setMessage(error.message)
        }
      } finally {
        if (isCurrent) {
          setIsListLoading(false)
        }
      }
    }

    loadShoppingLists()

    return () => {
      isCurrent = false
    }
  }, [session])

  useEffect(() => {
    if (shoppingLists.length === 0) {
      return
    }

    let isCurrent = true
    const productIds = [
      ...new Set(
        shoppingLists
          .flatMap((list) => list.items)
          .map((item) => item.productId)
          .filter((productId) => productId && !productNamesById[productId]),
      ),
    ]

    if (productIds.length === 0) {
      return
    }

    async function loadProductNames() {
      const entries = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const product = await ProductService.getProductById(productId, {
              select: 'product_id, name',
              storeId: storeMap?.storeId,
            })

            return [productId, product.name || `Product ${productId}`]
          } catch {
            return [productId, `Product ${productId}`]
          }
        }),
      )

      if (isCurrent) {
        setProductNamesById((currentNames) => ({
          ...currentNames,
          ...Object.fromEntries(entries),
        }))
      }
    }

    loadProductNames()

    return () => {
      isCurrent = false
    }
  }, [productNamesById, shoppingLists, storeMap?.storeId])

  const navigate = useMemo(
    () => (view) => {
      if (view === 'promotions') {
        return
      }

      window.location.hash = ROUTES[view] ?? ROUTES.home
      setRoute(view)
    },
    [],
  )
  const userEmail = session?.user?.email
  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setIsAuthSubmitting(true)

    const credentials = {
      email: authEmail,
      password: authPassword,
    }

    try {
      const { error } =
        authMode === 'sign-in'
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials)

      if (error) {
        setAuthError(error.message)
      } else if (authMode === 'sign-up') {
        setAuthError('Check your email to confirm your account.')
      }
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  function handleAuthModeChange(nextMode) {
    setAuthMode(nextMode)
    setAuthError('')
  }

  function handleSelectStore(storeId) {
    setSelectedStoreId(storeId)
    setMessage('')
    navigate('home')
  }

  async function handleCreateList(event) {
    event.preventDefault()
    setNewListError('')

    const trimmedName = newListName.trim()

    if (!trimmedName) {
      setNewListError('Enter a list name.')
      return
    }

    setIsCreatingList(true)

    try {
      const list = await ShoppingListService.createList(trimmedName)
      setShoppingLists((currentLists) => [list, ...currentLists])
      setNewListName('')
      navigate('lists')
    } catch (error) {
      setNewListError(error.message)
    } finally {
      setIsCreatingList(false)
    }
  }

  function handleCancelCreateList() {
    setNewListError('')
    setNewListName('')
    navigate('lists')
  }

  function handleToggleListMenu(listId) {
    setActiveListMenuId((currentListId) => (currentListId === listId ? null : listId))
  }

  function handleRequestDeleteList(list) {
    setActiveListMenuId(null)
    setDeleteDialogList(list)
  }

  function handleCancelDeleteList() {
    setDeleteDialogList(null)
  }

  async function handleConfirmDeleteList() {
    if (!deleteDialogList) {
      return
    }

    const list = deleteDialogList
    setDeleteDialogList(null)

    try {
      await ShoppingListService.removeList(list.id)
      setShoppingLists((currentLists) => currentLists.filter((currentList) => currentList.id !== list.id))
    } catch (error) {
      setMessage(error.message)
    }
  }

  function handleRequestRenameList(list) {
    setActiveListMenuId(null)
    setRenameDialogList(list)
    setRenameDraft(list.name || 'Untitled list')
  }

  function handleCancelRenameList() {
    setRenameDialogList(null)
    setRenameDraft('')
  }

  async function handleConfirmRenameList(event) {
    event.preventDefault()

    if (!renameDialogList) {
      return
    }

    const trimmedName = renameDraft.trim()

    if (!trimmedName) {
      setMessage('List name is required')
      return
    }

    try {
      const renamedList = await ShoppingListService.renameList(renameDialogList.id, trimmedName)
      setShoppingLists((currentLists) =>
        currentLists.map((currentList) =>
          currentList.id === renamedList.id
            ? {
                ...currentList,
                ...renamedList,
                items: currentList.items,
              }
            : currentList,
        ),
      )
      setRenameDialogList(null)
      setRenameDraft('')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <AppFrame>
      {!session ? (
        <AuthScreen
          authMode={authMode}
          email={authEmail}
          error={authError}
          isLoading={isAuthLoading}
          isSubmitting={isAuthSubmitting}
          onAuthModeChange={handleAuthModeChange}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onSubmit={handleAuthSubmit}
          password={authPassword}
        />
      ) : !selectedStoreId ? (
        <StoreSelectionScreen
          error={storeError}
          isLoading={isStoreLoading}
          onSelectStore={handleSelectStore}
          stores={stores}
        />
      ) : route === 'search' ? (
        <SearchScreen onNavigate={navigate} />
      ) : route === 'newList' ? (
        <CreateListScreen
          error={newListError}
          isSubmitting={isCreatingList}
          listName={newListName}
          onCancel={handleCancelCreateList}
          onCreate={handleCreateList}
          onListNameChange={setNewListName}
          onNavigate={navigate}
        />
      ) : route === 'lists' ? (
        <AllListsScreen
          activeListMenuId={activeListMenuId}
          deleteDialogList={deleteDialogList}
          isListLoading={isListLoading}
          message={message}
          onCancelDeleteList={handleCancelDeleteList}
          onCancelRenameList={handleCancelRenameList}
          onConfirmDeleteList={handleConfirmDeleteList}
          onConfirmRenameList={handleConfirmRenameList}
          onDeleteList={handleRequestDeleteList}
          onNavigate={navigate}
          onRenameDraftChange={setRenameDraft}
          onRenameList={handleRequestRenameList}
          onToggleListMenu={handleToggleListMenu}
          renameDialogList={renameDialogList}
          renameDraft={renameDraft}
          session={session}
          shoppingLists={shoppingLists}
        />
      ) : (
        <HomeScreen
          isHomeLoading={isHomeLoading}
          isListLoading={isListLoading}
          message={message}
          onNavigate={navigate}
          productNamesById={productNamesById}
          promotions={promotions}
          session={session}
          shoppingLists={shoppingLists}
          storeMap={storeMap}
          userEmail={userEmail}
        />
      )}
    </AppFrame>
  )
}

export default App
