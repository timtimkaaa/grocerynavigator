import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { ProductService } from './services/ProductService'
import { StoreMapService } from './services/StoreMapService'
import './App.css'

function App() {
  // Supabase keeps auth state in a session object. A non-null session means the
  // user is signed in and can see the protected app surface below the auth panel.
  const [session, setSession] = useState(null)

  // Local form state for the email/password auth panel. `authMode` controls
  // whether the form submits to Supabase sign-in or sign-up.
  const [authMode, setAuthMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // UI status flags are kept separate so loading the auth session, submitting
  // auth requests, and loading the map can be represented independently.
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // `storeMap` is the render-ready structure produced by StoreMapService. It
  // contains the store dimensions, raw sections, and a 2D cell grid.
  const [storeMap, setStoreMap] = useState(null)
  const [isMapLoading, setIsMapLoading] = useState(false)
  const [mapError, setMapError] = useState('')

  // Temporary product search state for testing ProductService previews before
  // the dedicated Search screen exists.
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [productPreviews, setProductPreviews] = useState([])
  const [productSearchError, setProductSearchError] = useState('')
  const [isProductSearchLoading, setIsProductSearchLoading] = useState(false)

  useEffect(() => {
    let authSubscription

    async function loadSession() {
      // On initial page load, ask Supabase whether a session already exists.
      // This supports returning users without forcing them to sign in again.
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        setStatus(error.message)
      }

      setSession(session)
      setIsLoading(false)
    }

    loadSession()

    // Supabase emits auth events for sign-in, sign-out, token refresh, and
    // account confirmation. Listening here keeps React state aligned with the
    // browser's persisted Supabase auth state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    authSubscription = subscription

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // The store map is only useful after authentication. Clearing it here
    // prevents a signed-out user from seeing stale map data from a prior session.
    if (!session) {
      setStoreMap(null)
      return
    }

    // React effects can complete after a component unmounts or after auth state
    // changes. `isCurrent` prevents stale async work from updating state.
    let isCurrent = true

    async function loadStoreMap() {
      setIsMapLoading(true)
      setMapError('')

      try {
        // StoreMapService handles Supabase reads, Dexie caching, and conversion of
        // store/section rows into the 2D structure the map component renders.
        const map = await StoreMapService.getStoreMap()
        if (isCurrent) {
          setStoreMap(map)
        }
      } catch (error) {
        if (isCurrent) {
          setMapError(error.message)
        }
      } finally {
        if (isCurrent) {
          setIsMapLoading(false)
        }
      }
    }

    loadStoreMap()

    return () => {
      isCurrent = false
    }
  }, [session])

  async function handleAuth(event) {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    const credentials = {
      email,
      password,
    }

    const { error } =
      // The same form is reused for sign-in and account creation. Supabase
      // expects the same credential shape for both flows.
      authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)

    if (error) {
      setStatus(error.message)
    } else if (authMode === 'sign-up') {
      setStatus('Check your email to confirm your account.')
    }

    setIsSubmitting(false)
  }

  async function handleSignOut() {
    // Supabase signOut clears the persisted session and triggers the auth state
    // listener above, which then removes protected UI from the screen.
    setStatus('')
    setIsSubmitting(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setStatus(error.message)
    }

    setIsSubmitting(false)
  }

  async function handleProductSearch(event) {
    event.preventDefault()
    setProductPreviews([])
    setProductSearchError('')

    const trimmedSearchTerm = productSearchTerm.trim()

    if (!trimmedSearchTerm) {
      setProductSearchError('Enter a product name.')
      return
    }

    setIsProductSearchLoading(true)

    try {
      const previews = await ProductService.getProductPreviewsForSearch(trimmedSearchTerm)
      setProductPreviews(previews)
    } catch (error) {
      setProductSearchError(error.message)
    } finally {
      setIsProductSearchLoading(false)
    }
  }

  const userEmail = session?.user?.email

  return (
    <main className="app-shell">
      {/* The top section is both the public sign-in UI and the signed-in account summary. */}
      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow">Grocery Navigator</p>
          <h1>Plan smarter shopping trips.</h1>
          <p className="intro">
            Sign in to save lists, organize stores, and keep your grocery planning synced.
          </p>
        </div>

        <div className="auth-panel" aria-busy={isLoading}>
          {isLoading ? (
            <p className="muted">Loading session...</p>
          ) : session ? (
            <div className="account-view">
              <p className="panel-kicker">Signed in</p>
              <h2>{userEmail}</h2>
              <p className="muted">Your Supabase session is active on this device.</p>
              <button type="button" onClick={handleSignOut} disabled={isSubmitting}>
                {isSubmitting ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : (
            <>
              <div className="mode-toggle" aria-label="Authentication mode">
                <button
                  type="button"
                  className={authMode === 'sign-in' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('sign-in')
                    setStatus('')
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={authMode === 'sign-up' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('sign-up')
                    setStatus('')
                  }}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleAuth}>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    // Browser autocomplete values are mode-aware so sign-up
                    // can suggest a new password while sign-in can reuse one.
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                  />
                </label>

                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? authMode === 'sign-in'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : authMode === 'sign-in'
                      ? 'Sign in'
                      : 'Create account'}
                </button>
              </form>
            </>
          )}

          {status ? <p className="status">{status}</p> : null}
        </div>
      </section>

      {session ? (
        // The map is intentionally below auth so it can be treated as the first
        // protected app screen while the project is still early in development.
        <section className="map-section">
          <div className="section-heading">
            <p className="eyebrow">Store map</p>
            <h2>Sections</h2>
          </div>

          {isMapLoading ? <p className="muted">Loading store map...</p> : null}
          {mapError ? <p className="status">Could not load store map: {mapError}</p> : null}

          {storeMap ? (
            <div
              className="store-map"
              // The column count comes from Supabase store dimensions. Rows are
              // produced by StoreMapService in `storeMap.cells`, so CSS only needs
              // to know how many columns to lay out.
              style={{ gridTemplateColumns: `repeat(${storeMap.width}, minmax(24px, 1fr))` }}
              aria-label="Store section map"
            >
              {storeMap.cells.map((row) =>
                row.map((cell) => (
                  <div
                    className={[
                      'map-cell',
                      cell.section ? 'has-section' : 'walkspace',
                      cell.section?.hasProducts ? 'product-section' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={`${cell.x}-${cell.y}`}
                    title={cell.section?.name ?? 'Walkspace'}
                  >
                    {/* Empty cells are walkspace. Section cells show the service-selected emoji and label. */}
                    {cell.section ? (
                      <>
                        <span className="section-emoji" aria-hidden="true">
                          {cell.section.emoji}
                        </span>
                        <span className="section-name">{cell.section.name}</span>
                      </>
                    ) : null}
                  </div>
                )),
              )}
            </div>
          ) : null}

          <section className="product-lookup" aria-label="Product lookup">
            <div className="section-heading">
              <p className="eyebrow">Product search</p>
              <h2>Find products</h2>
            </div>

            <form className="product-lookup-form" onSubmit={handleProductSearch}>
              <label>
                Product name
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(event) => setProductSearchTerm(event.target.value)}
                  placeholder="Search by name"
                />
              </label>

              <button type="submit" disabled={isProductSearchLoading}>
                {isProductSearchLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {productSearchError ? <p className="status">Could not search products: {productSearchError}</p> : null}

            {productPreviews.length > 0 ? (
              <div className="product-results">
                {productPreviews.map((product) => (
                  <article className="product-result" key={product.id}>
                    {product.thumbnail ? (
                      <img className="product-thumbnail" src={product.thumbnail} alt="" />
                    ) : (
                      <div className="product-thumbnail product-thumbnail-placeholder" aria-hidden="true">
                        🛒
                      </div>
                    )}

                    <div>
                      <p className="panel-kicker">Product</p>
                      <h2>{product.name || 'Unnamed product'}</h2>

                      <dl className="product-details">
                        <div>
                          <dt>ID</dt>
                          <dd>{product.id}</dd>
                        </div>
                        <div>
                          <dt>Price</dt>
                          <dd>{product.price === null ? 'Unknown' : product.price}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>
      ) : null}
    </main>
  )
}

export default App
