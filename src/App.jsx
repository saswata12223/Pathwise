import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, Brain, BriefcaseBusiness,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  Bot, ChartNoAxesColumn, Clock3, Cloud, Code2, Flame, Focus, GraduationCap, Headphones, LayoutDashboard, Menu,
  MessageSquareText, MoreHorizontal, Play, Plus, Search, Settings2, Sparkles,
  Server, ShieldCheck, Target, Upload, X,
} from 'lucide-react'

const initialLessons = [
  { title: 'Understand async JavaScript', course: 'Frontend development', duration: '25 min', color: 'violet', icon: 'code' },
  { title: 'Practice array methods', course: 'JavaScript fundamentals', duration: '30 min', color: 'blue', icon: 'brackets' },
  { title: 'Review your flashcards', course: 'Daily review', duration: '10 min', color: 'mint', icon: 'cards' },
]

const careerOptions = [
  { name: 'Product designer', description: 'Craft thoughtful digital experiences', icon: Sparkles },
  { name: 'Frontend developer', description: 'Build the web, one component at a time', icon: Code2 },
  { name: 'Data analyst', description: 'Turn data into useful decisions', icon: ChartNoAxesColumn },
  { name: 'UX researcher', description: 'Understand people and their needs', icon: Brain },
  { name: 'Cybersecurity analyst', description: 'Protect systems, networks, and data', icon: ShieldCheck },
  { name: 'AI developer', description: 'Build useful products with AI', icon: Bot },
  { name: 'Cloud engineer', description: 'Design and manage cloud infrastructure', icon: Cloud },
  { name: 'Backend developer', description: 'Build APIs and reliable services', icon: Server },
]
const interviewQuestions = [
  { category: 'Behavioral', question: 'Tell me about a time you had to learn something quickly. How did you approach it?' },
  { category: 'Problem solving', question: 'How do you break a complex problem into smaller, manageable steps?' },
  { category: 'Career story', question: 'What kind of problems are you most excited to solve in your next role?' },
]

const navItems = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'My roadmap', icon: BookOpen },
  { name: 'Career paths', icon: BriefcaseBusiness },
  { name: 'Interview prep', icon: MessageSquareText },
  { name: 'Focus planner', icon: Focus },
]

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
let csrfTokenCache = ''

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function getCsrfToken() {
  const response = await fetch(apiUrl('/api/auth/csrf/'), {
    credentials: API_BASE_URL ? 'include' : 'same-origin',
  })
  if (!response.ok) throw new Error('Could not initialize a secure session. Please try again.')
  const data = await response.json()
  csrfTokenCache = data.csrfToken
  return csrfTokenCache
}

async function apiFetch(url, options = {}) {
  const method = options.method || 'GET'
  const headers = new Headers(options.headers || {})
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const cookieToken = document.cookie.split('; ').find((cookie) => cookie.startsWith('csrftoken='))?.split('=').slice(1).join('=')
    const csrfToken = csrfTokenCache || (cookieToken && decodeURIComponent(cookieToken)) || await getCsrfToken()
    headers.set('X-CSRFToken', csrfToken)
  }
  return fetch(apiUrl(url), {
    ...options,
    method,
    headers,
    credentials: API_BASE_URL ? 'include' : 'same-origin',
  })
}

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedCareer, setSelectedCareer] = useState('Product designer')
  const [customCareers, setCustomCareers] = useState([])
  const [careerPlan, setCareerPlan] = useState(null)
  const [fileName, setFileName] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [completedTasks, setCompletedTasks] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [toast, setToast] = useState('')
  const [user, setUser] = useState(null)
  const [accountDialog, setAccountDialog] = useState(null)
  const [accountError, setAccountError] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInput = useRef(null)
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true
    getCsrfToken()
      .then(() => apiFetch('/api/auth/me/'))
      .then((response) => response.json())
      .then((data) => { if (active) setUser(data.user) })
      .catch(() => { if (active) setToast('Could not connect to your account service. Start Django to use login and profile features.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!timerRunning) return undefined
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          setTimerRunning(false)
          setToast('Focus session complete. Nice work!')
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [timerRunning])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setAccountDialog(null)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  const openAccountDialog = (dialog) => {
    setAccountError('')
    setAccountDialog(dialog)
  }

  const submitAccount = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(formData.entries())
    setAccountError('')
    setAccountBusy(true)
    try {
      const endpoint = accountDialog === 'profile'
        ? '/api/profile/'
        : `/api/auth/${accountDialog}/`
      const payload = accountDialog === 'register'
        ? { name: values.name, email: values.email, password: values.password }
        : accountDialog === 'profile'
          ? { name: values.name, email: values.email }
          : { email: values.email, password: values.password }
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save your account details.')
      setUser(data.user)
      setAccountDialog(null)
      setToast(accountDialog === 'profile' ? 'Your profile has been updated.' : `Welcome${data.user.name ? `, ${data.user.name.split(' ')[0]}` : ''}!`)
    } catch (error) {
      setAccountError(error.message === 'Failed to fetch'
        ? 'Could not reach the Django server. Check that it is running and try again.'
        : error.message)
    } finally {
      setAccountBusy(false)
    }
  }

  const signOut = async () => {
    setAccountError('')
    setAccountBusy(true)
    try {
      const response = await apiFetch('/api/auth/logout/', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to log out.')
      setUser(data.user)
      setAccountDialog(null)
      setToast('You’ve been logged out.')
    } catch (error) {
      setAccountError(error.message === 'Failed to fetch' ? 'Could not reach the Django server.' : error.message)
    } finally {
      setAccountBusy(false)
    }
  }

  const scanFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setScanError('')
    setScanResult(null)
    setIsScanning(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await apiFetch('/api/scan-syllabus/', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to scan this file.')
      setScanResult(data)
      setActivePage('My roadmap')
    } catch (error) {
      setScanError(error.message === 'Failed to fetch'
        ? 'Could not reach the learning API. Start the Django server and try again.'
        : error.message)
    } finally {
      setIsScanning(false)
    }
  }

  const generateCareerPlan = async () => {
    setIsGenerating(true)
    try {
      const response = await apiFetch('/api/career-roadmap/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ career: selectedCareer }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to generate your roadmap.')
      setCareerPlan(data)
    } catch (error) {
      setToast(error.message === 'Failed to fetch' ? 'Start the Django API to generate a career plan.' : error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const navigate = (page) => {
    setActivePage(page)
    setMobileNavOpen(false)
  }

  const toggleTask = (title) => {
    setCompletedTasks((current) => current.includes(title)
      ? current.filter((task) => task !== title)
      : [...current, title])
  }

  const addCareer = (name) => {
    const career = name.trim().replace(/\s+/g, ' ')
    if (!career) return
    const existing = [...careerOptions, ...customCareers].find(
      (option) => option.name.toLowerCase() === career.toLowerCase(),
    )
    if (existing) {
      setSelectedCareer(existing.name)
      setCareerPlan(null)
      setToast(`${existing.name} is already in your career paths.`)
      return
    }
    setCustomCareers((current) => [...current, {
      name: career,
      description: 'Your custom career path',
      icon: BriefcaseBusiness,
    }])
    setSelectedCareer(career)
    setCareerPlan(null)
    setToast(`${career} added to your career paths.`)
  }

  const formatTime = (time) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('Overview') }}>
          <span className="brand-mark"><Sparkles size={18} strokeWidth={2.2} /></span>
          <span>pathwise<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${activePage === name ? 'nav-active' : ''}`} onClick={() => navigate(name)}>
              <Icon size={18} strokeWidth={1.8} /><span>{name}</span>
              {name === 'My roadmap' && scanResult && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card">
            <div className="streak-top"><span className="streak-icon"><Flame size={17} fill="currentColor" /></span><span className="streak-count">7 day streak</span><MoreHorizontal size={17} className="muted-icon" /></div>
            <p>You’re building a great habit. Keep the momentum going!</p>
            <div className="week-dots" aria-label="7-day streak">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span className={index < 5 ? 'day-done' : ''} key={`${day}-${index}`}>{index < 5 ? <Check size={11} /> : day}</span>)}
            </div>
          </div>
          <button className="profile-button" onClick={() => openAccountDialog(user ? 'profile' : 'login')}>
            <span className="avatar">{user ? user.name.slice(0, 1).toUpperCase() : 'A'}</span><span className="profile-copy"><strong>{user?.name || 'Your profile'}</strong><small>{user ? user.email : 'Log in or create account'}</small></span><ChevronDown size={16} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up!')}><Bell size={18} /><i /></button>
            <span className="topbar-divider" />
            <button className="help-button" onClick={() => setToast('Your learning journey is looking good!')}><CircleHelp size={17} /><span>Help center</span></button>
            {!user && <button className="topbar-login" onClick={() => openAccountDialog('login')}>Log in</button>}
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Overview' && <Overview
            lessons={initialLessons}
            userName={user?.name}
            completedTasks={completedTasks}
            onToggleTask={toggleTask}
            onNavigate={navigate}
            onUpload={() => fileInput.current?.click()}
            onStartTimer={() => { setActivePage('Focus planner'); setTimerRunning(true) }}
            scanResult={scanResult}
          />}
          {activePage === 'My roadmap' && <RoadmapPage scanResult={scanResult} fileName={fileName} isScanning={isScanning} error={scanError} onUpload={() => fileInput.current?.click()} />}
          {activePage === 'Career paths' && <CareerPage selectedCareer={selectedCareer} setSelectedCareer={(career) => { setSelectedCareer(career); setCareerPlan(null) }} extraCareers={customCareers} onAddCareer={addCareer} plan={careerPlan} isGenerating={isGenerating} onGenerate={generateCareerPlan} />}
          {activePage === 'Interview prep' && <InterviewPage questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} />}
          {activePage === 'Focus planner' && <FocusPage
            secondsLeft={secondsLeft}
            formatTime={formatTime}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
            setSecondsLeft={setSecondsLeft}
            completedTasks={completedTasks}
            onToggleTask={toggleTask}
            onAddTask={() => setToast('Custom priorities are coming soon.')}
          />}
        </div>
      </main>
      <input ref={fileInput} className="visually-hidden" type="file" accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { scanFile(event.target.files?.[0]); event.target.value = '' }} />
      {searchOpen && <SearchDialog
        query={searchQuery}
        setQuery={setSearchQuery}
        inputRef={searchInput}
        scanResult={scanResult}
        extraCareers={customCareers}
        onClose={() => { setSearchOpen(false); setSearchQuery('') }}
        onNavigate={(page) => { navigate(page); setSearchOpen(false); setSearchQuery('') }}
      />}
      {accountDialog && <AccountDialog
        mode={accountDialog}
        user={user}
        error={accountError}
        busy={accountBusy}
        onSubmit={submitAccount}
        onClose={() => setAccountDialog(null)}
        onModeChange={openAccountDialog}
        onLogout={signOut}
      />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  )
}

function SearchDialog({ query, setQuery, inputRef, scanResult, extraCareers, onClose, onNavigate }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const items = [
    ...navItems.map(({ name }) => ({ title: name, detail: `Go to ${name.toLowerCase()}`, page: name, group: 'Pages' })),
    ...initialLessons.map((lesson) => ({ title: lesson.title, detail: lesson.course, page: 'My roadmap', group: 'Lessons' })),
    ...[...careerOptions, ...extraCareers].map((career) => ({ title: career.name, detail: career.description, page: 'Career paths', group: 'Career paths' })),
    ...interviewQuestions.map((question) => ({ title: question.question, detail: `${question.category} interview practice`, page: 'Interview prep', group: 'Interview prep' })),
    ...(scanResult?.modules || []).map((module) => ({ title: module.title, detail: `${scanResult.course} · Module ${module.week}`, page: 'My roadmap', group: 'Your syllabus' })),
  ]
  const normalizedQuery = query.trim().toLowerCase()
  const results = items.filter((item) => !normalizedQuery
    || `${item.title} ${item.detail} ${item.group}`.toLowerCase().includes(normalizedQuery)).slice(0, 8)
  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault()
      onNavigate(results[selectedIndex].page)
    }
  }

  return (
    <div className="dialog-backdrop search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search Pathwise">
        <div className="search-dialog-input"><Search size={18} /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0) }} onKeyDown={handleSearchKeyDown} placeholder="Search lessons, roadmaps, and more…" /><kbd>ESC</kbd><button aria-label="Close search" onClick={onClose}><X size={17} /></button></div>
        <div className="search-results">
          <div className="search-results-label">{normalizedQuery ? 'SEARCH RESULTS' : 'QUICK ACCESS'}</div>
          {results.length ? results.map((item, index) => <button className={`search-result ${selectedIndex === index ? 'search-result-active' : ''}`} key={`${item.group}-${item.title}-${index}`} onMouseEnter={() => setSelectedIndex(index)} onClick={() => onNavigate(item.page)}><span className="search-result-icon">{item.group === 'Lessons' || item.group === 'Your syllabus' ? <BookOpen size={16} /> : item.group === 'Career paths' ? <BriefcaseBusiness size={16} /> : item.group === 'Interview prep' ? <MessageSquareText size={16} /> : <ArrowRight size={16} />}</span><span><b>{item.title}</b><small>{item.detail}</small></span><span className="search-result-group">{item.group}</span><ArrowUpRight size={15} className="search-result-arrow" /></button>) : <div className="search-empty"><Search size={20} /><span>No results for “{query}”</span><small>Try a different search term.</small></div>}
        </div>
        <div className="search-dialog-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to browse</span><span><kbd>↵</kbd> to open</span><span className="search-footer-brand"><Sparkles size={12} /> pathwise</span></div>
      </section>
    </div>
  )
}

function AccountDialog({ mode, user, error, busy, onSubmit, onClose, onModeChange, onLogout }) {
  const isProfile = mode === 'profile'
  const isRegister = mode === 'register'
  const title = isProfile ? 'Your profile' : isRegister ? 'Create your account' : 'Welcome back'
  const description = isProfile
    ? 'Keep your account details up to date.'
    : isRegister
      ? 'Save your learning journey and pick up anytime.'
      : 'Log in to continue your learning journey.'
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <button className="dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <span className="dialog-brand-mark"><Sparkles size={19} /></span>
        <h2 id="account-dialog-title">{title}</h2>
        <p className="dialog-description">{description}</p>
        <form className="account-form" onSubmit={onSubmit}>
          {(isRegister || isProfile) && <label>Full name<input name="name" type="text" autoComplete="name" defaultValue={isProfile ? user?.name : ''} placeholder="Your name" maxLength={150} required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" defaultValue={isProfile ? user?.email : ''} placeholder="you@example.com" required /></label>
          {!isProfile && <label>Password<input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} minLength={isRegister ? 8 : undefined} required /></label>}
          {error && <div className="account-error" role="alert">{error}</div>}
          <button className="button button-primary account-submit" type="submit" disabled={busy}>{busy ? <span className="loading-spinner small-spinner" /> : null}{busy ? 'Please wait…' : isProfile ? 'Save changes' : isRegister ? 'Create account' : 'Log in'}{!busy && <ArrowRight size={15} />}</button>
        </form>
        {isProfile
          ? <button className="logout-button" onClick={onLogout} disabled={busy}>Log out of your account</button>
          : <div className="account-switch">{isRegister ? 'Already have an account?' : 'New to Pathwise?'} <button onClick={() => onModeChange(isRegister ? 'login' : 'register')}>{isRegister ? 'Log in' : 'Create an account'}</button></div>}
        <div className="account-privacy">Your account is stored securely on this app.</div>
      </section>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Overview({ lessons, userName, completedTasks, onToggleTask, onNavigate, onUpload, onStartTimer, scanResult }) {
  const studyTasks = ['Read chapter 4 notes', 'Finish async JS lesson', 'Review 12 flashcards']
  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today).toUpperCase()
  return (
    <>
      <PageHeading eyebrow={formattedDate} title={<>{greeting}, {userName?.split(' ')[0] || 'there'} <span className="wave">✳</span></>} description="A little progress each day adds up to big results." action={<button className="button button-outline" onClick={() => onNavigate('Focus planner')}><CalendarDays size={16} /> View my plan</button>} />
      <div className="overview-grid">
        <section className="welcome-card">
          <div className="welcome-content"><span className="welcome-pill"><Sparkles size={13} /> YOUR WEEKLY FOCUS</span><h2>You’re finding<br />your <span>flow.</span></h2><p>You’ve completed 8 of 12 study hours this week. Keep it up — you’re almost there.</p><button className="button button-light" onClick={onStartTimer}><Play size={14} fill="currentColor" /> Start a focus session <ArrowRight size={15} /></button></div>
          <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun"><Sparkles size={32} /></div><div className="art-dot dot-one" /><div className="art-dot dot-two" /><div className="art-dot dot-three" /></div>
          <div className="welcome-note"><span className="note-icon"><Target size={16} /></span><span><b>4 hours left</b><small>to hit your weekly goal</small></span></div>
        </section>
        <section className="stats-card">
          <div className="section-head"><div><h3>Your progress</h3><span className="section-subtitle">A snapshot of your learning</span></div><button className="icon-button more-button" aria-label="More progress options"><MoreHorizontal size={19} /></button></div>
          <div className="stat-list">
            <div className="stat-row"><div className="stat-icon stat-violet"><BookOpen size={17} /></div><div className="stat-info"><span>Learning streak</span><strong>7 days <small>+2 this week</small></strong></div><div className="stat-trend"><Flame size={15} fill="currentColor" /></div></div>
            <div className="stat-row"><div className="stat-icon stat-blue"><Clock3 size={17} /></div><div className="stat-info"><span>Focus time</span><strong>2h 25m <small>this week</small></strong></div><div className="stat-trend trend-up"><ArrowUpRight size={15} /> 18%</div></div>
            <div className="stat-row"><div className="stat-icon stat-mint"><CheckCircle2 size={17} /></div><div className="stat-info"><span>Lessons completed</span><strong>12 <small>of 18 total</small></strong></div><div className="stat-trend trend-up"><ArrowUpRight size={15} /> 4</div></div>
          </div>
          <button className="text-link" onClick={() => onNavigate('My roadmap')}>View detailed progress <ArrowRight size={14} /></button>
        </section>
      </div>

      <div className="content-grid">
        <section className="panel lessons-panel">
          <div className="section-head"><div><h3>Pick up where you left off</h3><span className="section-subtitle">Your next steps, thoughtfully lined up</span></div><button className="text-link desktop-link" onClick={() => onNavigate('My roadmap')}>See roadmap <ArrowRight size={14} /></button></div>
          {scanResult && <div className="imported-banner"><Sparkles size={15} /><span><b>{scanResult.course}</b> roadmap ready · {scanResult.module_count} modules</span><button onClick={() => onNavigate('My roadmap')}>Open <ArrowRight size={13} /></button></div>}
          <div className="lesson-list">{lessons.map((lesson, index) => <LessonRow key={lesson.title} lesson={lesson} index={index} />)}</div>
          <button className="add-roadmap" onClick={onUpload}><span><Plus size={16} /></span><b>Build a roadmap from your syllabus</b><span className="add-hint">Upload a PDF or Word doc</span><ChevronRight size={17} /></button>
        </section>
        <section className="panel tasks-panel">
          <div className="section-head"><div><h3>Today’s plan</h3><span className="section-subtitle">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(today)}</span></div><button className="icon-button more-button" aria-label="More plan options"><MoreHorizontal size={19} /></button></div>
          <div className="daily-progress"><div className="progress-copy"><span>Daily progress</span><b>{completedTasks.length} / 3</b></div><div className="progress-track"><span style={{ width: `${completedTasks.length / 3 * 100}%` }} /></div></div>
          <div className="task-list">{studyTasks.map((task, index) => { const done = completedTasks.includes(task); return <button className={`task-row ${done ? 'task-done' : ''}`} key={task} onClick={() => onToggleTask(task)}><span className={`task-check ${done ? 'checked' : ''}`}>{done && <Check size={12} />}</span><span className="task-copy"><b>{task}</b><small>{index === 0 ? 'Reading · 20 min' : index === 1 ? 'Lesson · 25 min' : 'Review · 10 min'}</small></span><span className={`task-time task-color-${index}`}>{index === 0 ? '9:30' : index === 1 ? '11:00' : '2:00'}</span></button> })}</div>
          <button className="text-link plan-link" onClick={() => onNavigate('Focus planner')}>Open focus planner <ArrowRight size={14} /></button>
        </section>
      </div>

      <section className="bottom-strip">
        <div className="quote-icon"><Sparkles size={16} /></div><p><b>A gentle reminder</b><span>Rest is part of the process. Take a short break between study sessions.</span></p><button onClick={() => onNavigate('Focus planner')}>Plan a break <ArrowRight size={14} /></button>
      </section>
    </>
  )
}

function LessonRow({ lesson, index }) {
  return <button className="lesson-row">
    <span className={`lesson-thumb thumb-${lesson.color}`}>{lesson.icon === 'code' ? <span className="code-symbol">{'{ }'}</span> : lesson.icon === 'brackets' ? <span className="bracket-symbol">[ ]</span> : <BookOpen size={18} />}</span>
    <span className="lesson-copy"><span className="lesson-course">{lesson.course}</span><b>{lesson.title}</b><span className="lesson-meta"><Clock3 size={12} /> {lesson.duration}<i /> {index === 0 ? 'Continue learning' : 'Ready when you are'}</span></span>
    <span className={`lesson-progress progress-${index}`}><span /></span><span className="lesson-arrow"><ArrowUpRight size={16} /></span>
  </button>
}

function RoadmapPage({ scanResult, fileName, isScanning, error, onUpload }) {
  return (
    <>
      <PageHeading eyebrow="YOUR LEARNING JOURNEY" title="My roadmap" description="A clear path from where you are to where you want to be." action={<button className="button button-primary" onClick={onUpload}><Plus size={16} /> Import syllabus</button>} />
      {error && <div className="error-banner" role="alert">{error}</div>}
      {isScanning && <div className="loading-card"><span className="loading-spinner" /><span><b>Building your roadmap…</b><small>Reading {fileName}</small></span></div>}
      {!scanResult && !isScanning && <div className="empty-roadmap panel"><div className="empty-illustration"><BookOpen size={29} /></div><h2>Your next chapter starts here.</h2><p>Upload a course syllabus and we’ll turn it into a week-by-week learning roadmap.</p><button className="button button-primary" onClick={onUpload}><Upload size={16} /> Upload a syllabus</button><span className="supported-files">PDF or Word document · up to 10 MB</span></div>}
      {scanResult && <><div className="roadmap-summary panel"><div className="course-cover"><GraduationCap size={26} /></div><div className="course-details"><span className="eyebrow">IMPORTED SYLLABUS</span><h2>{scanResult.course}</h2><p>{scanResult.filename} <span>·</span> {scanResult.module_count} modules mapped</p></div><span className="course-status"><CheckCircle2 size={15} /> Ready to learn</span></div><div className="roadmap-layout"><section className="panel module-panel"><div className="section-head"><div><h3>Your modules</h3><span className="section-subtitle">A little at a time goes a long way</span></div><span className="module-count">{scanResult.module_count} MODULES</span></div><div className="module-list">{scanResult.modules.map((module, index) => <article className={`module-item ${index === 0 ? 'module-current' : ''}`} key={`${module.title}-${index}`}><div className="module-timeline"><span>{index === 0 ? <Play size={11} fill="currentColor" /> : <span>{String(index + 1).padStart(2, '0')}</span>}</span>{index !== scanResult.modules.length - 1 && <i />}</div><div className="module-body"><div className="module-meta"><span>{module.week ? `WEEK ${module.week}` : `MODULE ${String(index + 1).padStart(2, '0')}`}</span><span><Clock3 size={12} /> {module.duration}</span></div><h4>{module.title}</h4><div className="topic-list">{module.topics.map((topic) => <span key={topic}>{topic}</span>)}</div></div><button className="icon-button module-more" aria-label={`Options for ${module.title}`}><MoreHorizontal size={17} /></button></article>)}</div></section><aside className="panel roadmap-side"><span className="side-icon"><Target size={18} /></span><h3>Small steps, real progress.</h3><p>Your syllabus is now a roadmap. Make a little time for it each day and you’ll be surprised how far you get.</p><div className="side-stat"><span>Estimated commitment</span><b>2.5 hours <small>/ module</small></b></div><div className="side-stat"><span>Your next milestone</span><b>{scanResult.modules[0]?.title || 'Get started'}</b></div></aside></div></>}
    </>
  )
}

function CareerPage({ selectedCareer, setSelectedCareer, extraCareers, onAddCareer, plan, isGenerating, onGenerate }) {
  const [newCareer, setNewCareer] = useState('')
  const options = [...careerOptions, ...extraCareers]
  const submitCareer = (event) => {
    event.preventDefault()
    onAddCareer(newCareer)
    setNewCareer('')
  }
  return (
    <>
      <PageHeading eyebrow="GROW WITH INTENTION" title="Career paths" description="Build the skills for a career that feels like you." />
      <section className="career-hero"><div className="career-orb"><BriefcaseBusiness size={26} /></div><div><span className="welcome-pill"><Sparkles size={13} /> YOUR NEXT CHAPTER</span><h2>Big goals, meet<br /><span>small steps.</span></h2><p>Choose a role you’re curious about. We’ll map the skills, milestones, and projects to help you get there.</p></div><div className="career-decoration">↗</div></section>
      <div className="career-layout"><section className="panel career-selector"><div className="section-head"><div><h3>What are you working towards?</h3><span className="section-subtitle">Pick a path to see your personalized roadmap</span></div></div><div className="career-options">{options.map(({ name, description, icon: Icon }) => <button key={name} className={`career-option ${selectedCareer === name ? 'career-selected' : ''}`} onClick={() => setSelectedCareer(name)}><span className="career-option-icon"><Icon size={17} /></span><span><b>{name}</b><small>{description}</small></span><span className={`radio-dot ${selectedCareer === name ? 'radio-on' : ''}`} /></button>)}</div><form className="add-career-form" onSubmit={submitCareer}><label htmlFor="custom-career">Looking for a different path?</label><div className="add-career-controls"><input id="custom-career" value={newCareer} onChange={(event) => setNewCareer(event.target.value)} placeholder="e.g. Game developer" maxLength={60} /><button className="button button-outline" type="submit" disabled={!newCareer.trim()}><Plus size={14} /> Add path</button></div></form><button className="button button-primary generate-button" onClick={onGenerate} disabled={isGenerating}>{isGenerating ? <span className="loading-spinner small-spinner" /> : <Sparkles size={16} />}{isGenerating ? 'Building your roadmap…' : 'Build my career roadmap'}<ArrowRight size={15} /></button></section>
        <section className="panel career-plan"><div className="section-head"><div><h3>Your roadmap</h3><span className="section-subtitle">{plan ? `${plan.duration} · ${plan.career}` : 'Your next steps, all in one place'}</span></div><span className="plan-sparkle"><Sparkles size={17} /></span></div>{plan ? <div className="career-stages">{plan.stages.map((stage, index) => <div className="career-stage" key={stage.title}><span className={`stage-number ${index === 0 ? 'stage-first' : ''}`}>{index === 0 ? <Play size={10} fill="currentColor" /> : String(index + 1).padStart(2, '0')}</span><span className="stage-text"><b>{stage.title}</b><small>{stage.week}</small></span><ChevronRight size={15} /></div>)}</div> : <div className="career-empty"><div className="career-empty-icon"><Target size={24} /></div><b>Your plan will take shape here</b><span>Pick a career path to get a personalized, step-by-step guide.</span></div>}<div className="career-footnote"><span><Clock3 size={14} /></span><span>Designed to fit around your life, not the other way around.</span></div></section></div>
    </>
  )
}

function InterviewPage({ questionIndex, setQuestionIndex }) {
  const question = interviewQuestions[questionIndex]
  return (
    <>
      <PageHeading eyebrow="SHOW UP AS YOURSELF" title="Interview prep" description="Build confidence one thoughtful answer at a time." />
      <div className="interview-layout"><section className="interview-feature"><div className="interview-top"><span><Sparkles size={14} /> A QUESTION FOR YOU</span><span>{String(questionIndex + 1).padStart(2, '0')} / {String(interviewQuestions.length).padStart(2, '0')}</span></div><div className="question-category">{question.category}</div><h2>{question.question}</h2><p>Take a breath, think of a real example, and answer in your own words. There’s no perfect answer.</p><div className="answer-box"><textarea aria-label="Your interview answer" placeholder="Jot down a few thoughts to get started…" /><div className="answer-tools"><span><Headphones size={14} /> Practice out loud</span><button onClick={() => setQuestionIndex((questionIndex + 1) % interviewQuestions.length)}>Next question <ArrowRight size={14} /></button></div></div></section><aside className="panel interview-tips"><span className="side-icon"><Brain size={18} /></span><h3>A gentle framework</h3><p>For experience-based questions, try the STAR approach to keep your story clear and memorable.</p><div className="star-list">{[['S', 'Situation', 'Set the scene'], ['T', 'Task', 'What needed to happen?'], ['A', 'Action', 'What did you do?'], ['R', 'Result', 'What changed?']].map(([letter, title, detail]) => <div className="star-row" key={letter}><span>{letter}</span><b>{title}<small>{detail}</small></b></div>)}</div><div className="tip-note"><Sparkles size={14} /> Your perspective is your superpower.</div></aside></div>
      <div className="practice-progress"><span className="practice-icon"><CheckCircle2 size={17} /></span><div><b>Practice makes progress</b><small>Every answer is a step towards feeling more confident.</small></div><span className="practice-count">{questionIndex + 1} of {interviewQuestions.length} questions</span></div>
    </>
  )
}

function FocusPage({ secondsLeft, formatTime, timerRunning, setTimerRunning, setSecondsLeft, completedTasks, onToggleTask, onAddTask }) {
  const tasks = ['Read chapter 4 notes', 'Finish async JS lesson', 'Review 12 flashcards']
  const progress = (25 * 60 - secondsLeft) / (25 * 60)
  return (
    <>
      <PageHeading eyebrow="MAKE SPACE TO FOCUS" title="Focus planner" description="One thing at a time. You’re exactly where you need to be." action={<button className="button button-outline" onClick={() => { setSecondsLeft(25 * 60); setTimerRunning(false) }}><Settings2 size={16} /> Reset timer</button>} />
      <div className="focus-layout"><section className="panel timer-panel"><span className="welcome-pill"><Focus size={13} /> POMODORO SESSION</span><div className="timer-ring" style={{ '--progress': `${progress * 100}%` }}><div className="timer-inner"><span>{formatTime(secondsLeft)}</span><small>{timerRunning ? 'YOU’RE IN THE ZONE' : 'READY WHEN YOU ARE'}</small></div></div><h2>{timerRunning ? 'Stay in your flow.' : 'Make room for focus.'}</h2><p>A little uninterrupted time can make a big difference.</p><button className="button button-primary timer-button" onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? 'Pause session' : secondsLeft === 0 ? 'Session complete' : 'Start focus session'}<span className="timer-button-icon">{timerRunning ? 'Ⅱ' : <Play size={14} fill="currentColor" />}</span></button><span className="timer-session-note">25 min focus <i /> 5 min break</span></section><section className="panel focus-tasks"><div className="section-head"><div><h3>Today’s priorities</h3><span className="section-subtitle">Keep it light, keep it doable.</span></div><span className="module-count">{completedTasks.length} / 3 DONE</span></div><div className="focus-task-list">{tasks.map((task, index) => { const done = completedTasks.includes(task); return <button className={`task-row ${done ? 'task-done' : ''}`} key={task} onClick={() => onToggleTask(task)}><span className={`task-check ${done ? 'checked' : ''}`}>{done && <Check size={12} />}</span><span className="task-copy"><b>{task}</b><small>{index === 0 ? 'Reading · 20 min' : index === 1 ? 'Lesson · 25 min' : 'Review · 10 min'}</small></span><span className="priority-label">{index === 0 ? 'UP NEXT' : index === 1 ? 'LATER' : 'LATER'}</span></button> })}</div><button className="add-priority" onClick={onAddTask}><Plus size={15} /> Add a priority</button><div className="focus-encouragement"><span>✦</span><p><b>You don’t have to do it all today.</b><small>Choose one small thing and give it your attention.</small></p></div></section></div>
    </>
  )
}

export default App
