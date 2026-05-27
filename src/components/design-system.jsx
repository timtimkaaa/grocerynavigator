function getInitial(email) {
  return email?.trim()?.charAt(0)?.toUpperCase() ?? 'G'
}

export function AppFrame({ children }) {
  return <main className="app-shell">{children}</main>
}

export function Screen({ children, label }) {
  return (
    <section className="app-screen" aria-label={label}>
      {children}
    </section>
  )
}

export function TopBar({ actions, title, userEmail }) {
  return (
    <header className="top-bar">
      <button className="menu-button" type="button" aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
      <div>
        <p>Grocery Navigator</p>
        <h1>{title}</h1>
      </div>
      {actions ?? (
        <button className="profile-button" type="button" aria-label="Account">
          {getInitial(userEmail)}
        </button>
      )}
    </header>
  )
}

export function TopBarActions({ children }) {
  return <div className="top-bar-actions">{children}</div>
}

export function IconButton({ children, className = '', label, onClick }) {
  return (
    <button className={`icon-control ${className}`.trim()} type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

export function PlusIcon() {
  return <span className="plus-icon" aria-hidden="true" />
}

export function SearchIcon() {
  return <span className="search-icon" aria-hidden="true" />
}

function HomeNavIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.75 10.75 12 4l8.25 6.75" />
      <path d="M5.75 9.75V20h4.5v-5.25h3.5V20h4.5V9.75" />
    </svg>
  )
}

function ListsNavIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.75h11" />
      <path d="M8 12h11" />
      <path d="M8 17.25h11" />
      <path d="M4.5 6.75h.01" />
      <path d="M4.5 12h.01" />
      <path d="M4.5 17.25h.01" />
    </svg>
  )
}

function PromotionsNavIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 12.6V6.25h6.35l8.15 8.15a2.12 2.12 0 0 1 0 3l-1.85 1.85a2.12 2.12 0 0 1-3 0L4.75 12.6Z" />
      <path d="M8.75 9.25h.01" />
    </svg>
  )
}

export function Content({ children }) {
  return <div className="content">{children}</div>
}

export function SearchBox({ placeholder = 'Search products, aisles, lists' }) {
  return (
    <label className="search-box" aria-label="Search">
      <SearchIcon />
      <input type="search" readOnly placeholder={placeholder} aria-label="Search" />
    </label>
  )
}

export function SectionHeading({ actionLabel, eyebrow, onAction, title, titleId }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={titleId}>{title}</h2>
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function InlineState({ children }) {
  return (
    <div className="inline-state">
      <p>{children}</p>
    </div>
  )
}

export function ListIcon({ variant = 'default' }) {
  return (
    <div className={`list-icon ${variant === 'muted' ? 'muted-list-icon' : ''}`.trim()} aria-hidden="true">
      <span />
    </div>
  )
}

export function MoreButton({ label = 'More options', onClick }) {
  return (
    <button className="more-button" type="button" aria-label={label} onClick={onClick}>
      <span />
      <span />
      <span />
    </button>
  )
}

export function BottomNav({ activeView, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button
        className={`nav-item ${activeView === 'home' ? 'active' : ''}`.trim()}
        type="button"
        onClick={() => onNavigate('home')}
      >
        <HomeNavIcon />
        Home
      </button>
      <button
        className={`nav-item ${activeView === 'lists' ? 'active' : ''}`.trim()}
        type="button"
        onClick={() => onNavigate('lists')}
      >
        <ListsNavIcon />
        Lists
      </button>
      <button className="nav-item" type="button" onClick={() => onNavigate('promotions')}>
        <PromotionsNavIcon />
        Promotions
      </button>
    </nav>
  )
}
