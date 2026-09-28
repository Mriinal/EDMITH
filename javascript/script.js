// =========================================================
// AUTH & HEADER ACTIONS — Injected into header-actions on every page
// Authenticated user → Profile button
// Guest / Unauthenticated → Log In + Sign Up buttons
//   - On index.html: Sign Up navigates directly to users/signup.html
//   - On all other pages: Sign Up opens promotion modal
// =========================================================

function hasSupabaseSession() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && (parsed.access_token || parsed.currentSession || parsed.refresh_token || parsed.user)) {
                        return true;
                    }
                }
            }
        }
    } catch (e) {}
    return false;
}

(function initGlobalAuthAndNavigation() {
    // ── Determine page depth and relative prefix ──
    const rawPath = window.location.pathname.replace(/\\/g, '/');
    let prefix = '';
    if (rawPath.includes('/sql/tests/')) {
        prefix = '../../';
    } else if (rawPath.includes('/sql/') || rawPath.includes('/editors/') || rawPath.includes('/users/') || rawPath.includes('/etl/')) {
        prefix = '../';
    }

    // ── Ensure auth-modal.js is loaded on every page ──
    if (!window.EdmithAuthModal && !document.querySelector('script[src*="auth-modal.js"]')) {
        const authScript = document.createElement('script');
        authScript.src = prefix + 'javascript/auth-modal.js';
        document.head.appendChild(authScript);
    }

    // ── Ensure components.js is loaded on every page with site-header or site-footer ──
    if (!window.EdmithComponents && !document.querySelector('script[src*="components.js"]') && (document.getElementById('site-header') || document.getElementById('site-footer'))) {
        const compScript = document.createElement('script');
        compScript.src = prefix + 'components/components.js';
        document.head.appendChild(compScript);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function extractUserFirstName(user) {
        if (!user) return 'Learner';
        const meta = user.user_metadata || {};
        if (meta.first_name && typeof meta.first_name === 'string' && meta.first_name.trim()) {
            return meta.first_name.trim();
        }
        if (meta.full_name && typeof meta.full_name === 'string' && meta.full_name.trim()) {
            const first = meta.full_name.trim().split(/\s+/)[0];
            if (first) return first;
        }
        if (meta.username_display && typeof meta.username_display === 'string' && meta.username_display.trim()) {
            return meta.username_display.trim();
        }
        if (meta.username && typeof meta.username === 'string' && meta.username.trim()) {
            return meta.username.trim();
        }
        if (user.email && typeof user.email === 'string') {
            const part = user.email.split('@')[0];
            if (part) return part;
        }
        return 'Learner';
    }

    async function resolveUserFirstName(user) {
        if (!user) return 'Learner';
        const cached = extractUserFirstName(user);
        if (cached && cached !== 'Learner') return cached;

        try {
            if (typeof getEdmithSupabaseClient === 'function') {
                const client = await getEdmithSupabaseClient();
                if (client && user.id) {
                    const { data, error } = await client
                        .from('users')
                        .select('first_name')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();
                    if (!error && data && data.first_name && data.first_name.trim()) {
                        return data.first_name.trim();
                    }
                }
            }
        } catch (e) {}

        return cached || 'Learner';
    }

    async function handleLogout(isRootIndex) {
        try {
            sessionStorage.clear();
            if (window.EdmithProgress?.purgeLegacyUnscopedStorage) {
                window.EdmithProgress.purgeLegacyUnscopedStorage();
            }
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                    localStorage.removeItem(k);
                }
            }
            if (typeof getEdmithSupabaseClient === 'function') {
                const client = await getEdmithSupabaseClient();
                if (client) {
                    await client.auth.signOut();
                }
            }
        } catch (err) {
            console.warn('[EDMITH Logout] Warning during signOut:', err);
        }

        // Close mobile drawer if open
        if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
            window.EdmithComponents.closeMobileMenu();
        }

        // If on user profile pages, redirect to home
        const path = window.location.pathname.replace(/\\/g, '/');
        if (path.includes('/users/profile.html') || path.includes('/users/edit-profile.html')) {
            window.location.href = prefix + 'index.html';
            return;
        }

        // Instantly re-render header & mobile drawer in-place without page reload
        const headerActions = document.querySelector('.header-actions');
        renderHeaderAuth(false, headerActions, isRootIndex, null);
        window.dispatchEvent(new CustomEvent('edmith:auth-changed', { detail: { authenticated: false } }));
    }

    function renderHeaderAuth(isAuthenticated, headerActions, isRootIndex, userObj) {
        if (!userObj && isAuthenticated) {
            userObj = typeof getActiveAuthUserSync === 'function' ? getActiveAuthUserSync() : null;
        }
        const firstName = extractUserFirstName(userObj);

        // --- 1. Desktop Header Bar Auth Controls ---
        if (headerActions) {
            if (isAuthenticated) {
                // Remove unauthenticated buttons if present
                const oldLogin = headerActions.querySelector('.header-login-btn');
                const oldSignup = headerActions.querySelector('.header-signup-btn');
                const oldProfile = headerActions.querySelector('.header-profile-btn');
                if (oldLogin) oldLogin.remove();
                if (oldSignup) oldSignup.remove();
                if (oldProfile) oldProfile.remove();

                let userMenu = headerActions.querySelector('.header-user-menu');
                if (!userMenu) {
                    userMenu = document.createElement('div');
                    userMenu.className = 'header-user-menu';
                    userMenu.id = 'headerUserMenu';
                    userMenu.innerHTML = `
                        <button type="button" class="header-user-btn" id="headerUserBtn" aria-haspopup="true" aria-expanded="false" aria-label="User Account Menu">
                            <i class="fas fa-user-circle"></i>
                            <span class="header-user-name">${escapeHtml(firstName)}</span>
                            <i class="fas fa-chevron-down header-user-chevron"></i>
                        </button>
                        <div class="header-user-dropdown" id="headerUserDropdown" role="menu">
                            <div class="header-dropdown-greeting">
                                <span class="dropdown-greeting-label">Signed in as</span>
                                <span class="dropdown-greeting-name">${escapeHtml(firstName)}</span>
                            </div>
                            <div class="header-dropdown-divider"></div>
                            <a href="${prefix}users/profile.html" class="header-dropdown-item" role="menuitem">
                                <i class="fas fa-id-badge"></i>
                                <span>My Profile</span>
                            </a>
                            <a href="${prefix}users/edit-profile.html" class="header-dropdown-item" role="menuitem">
                                <i class="fas fa-user-gear"></i>
                                <span>Edit Profile</span>
                            </a>
                            <div class="header-dropdown-divider"></div>
                            <button type="button" class="header-dropdown-item header-logout-btn" id="headerLogoutBtn" role="menuitem">
                                <i class="fas fa-right-from-bracket"></i>
                                <span>Log Out</span>
                            </button>
                        </div>
                    `;
                    headerActions.insertBefore(userMenu, headerActions.firstChild);

                    const userBtn = userMenu.querySelector('#headerUserBtn');
                    const dropdown = userMenu.querySelector('#headerUserDropdown');
                    const logoutBtn = userMenu.querySelector('#headerLogoutBtn');

                    userBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isOpen = dropdown.classList.toggle('dropdown-open');
                        userBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                    });

                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dropdown.classList.remove('dropdown-open');
                        userBtn.setAttribute('aria-expanded', 'false');
                        handleLogout(isRootIndex);
                    });

                    // Close on click outside
                    document.addEventListener('click', (e) => {
                        if (!userMenu.contains(e.target)) {
                            dropdown.classList.remove('dropdown-open');
                            userBtn.setAttribute('aria-expanded', 'false');
                        }
                    });

                    // Close on Escape
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && dropdown.classList.contains('dropdown-open')) {
                            dropdown.classList.remove('dropdown-open');
                            userBtn.setAttribute('aria-expanded', 'false');
                            userBtn.focus();
                        }
                    });
                } else {
                    const nameEl = userMenu.querySelector('.header-user-name');
                    const greetEl = userMenu.querySelector('.dropdown-greeting-name');
                    if (nameEl) nameEl.textContent = firstName;
                    if (greetEl) greetEl.textContent = firstName;
                }
            } else {
                // Remove User Menu if present
                const oldUserMenu = headerActions.querySelector('.header-user-menu');
                const oldProfile = headerActions.querySelector('.header-profile-btn');
                if (oldUserMenu) oldUserMenu.remove();
                if (oldProfile) oldProfile.remove();

                // Insert Sign Up and Log In buttons if not present and not on standalone login/signup page
                const isAuthPage = rawPath.endsWith('/login.html') || rawPath.endsWith('/signup.html');
                if (!headerActions.querySelector('.header-login-btn') && !isAuthPage) {
                    const signupBtn = document.createElement('a');
                    signupBtn.className = 'header-signup-btn';
                    signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';

                    if (isRootIndex) {
                        signupBtn.href = prefix + 'users/signup.html';
                    } else {
                        signupBtn.href = '#';
                        signupBtn.setAttribute('role', 'button');
                        signupBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            showSignupModal(prefix);
                        });
                    }

                    const loginBtn = document.createElement('a');
                    loginBtn.className = 'header-login-btn';
                    loginBtn.href = '#';
                    loginBtn.setAttribute('role', 'button');
                    loginBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Log In';
                    loginBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (window.EdmithAuthModal && typeof window.EdmithAuthModal.show === 'function') {
                            window.EdmithAuthModal.show({ returnTo: window.location.href });
                        } else {
                            window.location.href = prefix + 'users/login.html?returnTo=' + encodeURIComponent(window.location.href);
                        }
                    });

                    headerActions.insertBefore(signupBtn, headerActions.firstChild);
                    headerActions.insertBefore(loginBtn, signupBtn);
                }
            }
        }

        // --- 2. Mobile Floating Drawer Auth Controls (#mobileNavAuth) ---
        const mobileNavAuth = document.getElementById('mobileNavAuth');
        if (mobileNavAuth) {
            mobileNavAuth.innerHTML = '';
            if (isAuthenticated) {
                const userCard = document.createElement('div');
                userCard.className = 'mobile-user-card';
                userCard.innerHTML = `
                    <div class="mobile-user-info">
                        <div class="mobile-user-avatar">
                            <i class="fas fa-user-astronaut"></i>
                        </div>
                        <div class="mobile-user-details">
                            <span class="mobile-user-label">Signed in as</span>
                            <span class="mobile-user-name">${escapeHtml(firstName)}</span>
                        </div>
                    </div>
                    <div class="mobile-user-actions">
                        <a href="${prefix}users/profile.html" class="mobile-auth-btn mobile-profile-btn" id="mobileProfileLink">
                            <i class="fas fa-id-badge"></i>
                            <span>My Profile</span>
                            <i class="fas fa-chevron-right mobile-auth-chevron"></i>
                        </a>
                        <button type="button" class="mobile-auth-btn mobile-logout-btn" id="mobileLogoutBtn">
                            <i class="fas fa-right-from-bracket"></i>
                            <span>Log Out</span>
                        </button>
                    </div>
                `;

                const profileLink = userCard.querySelector('#mobileProfileLink');
                const logoutBtn = userCard.querySelector('#mobileLogoutBtn');

                if (profileLink) {
                    profileLink.addEventListener('click', () => {
                        if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
                            window.EdmithComponents.closeMobileMenu();
                        }
                    });
                }

                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        handleLogout(isRootIndex);
                    });
                }

                mobileNavAuth.appendChild(userCard);
            } else {
                const signupBtn = document.createElement('a');
                signupBtn.className = 'mobile-auth-btn mobile-signup-btn';
                signupBtn.href = '#';
                signupBtn.setAttribute('role', 'button');
                signupBtn.innerHTML = '<i class="fas fa-rocket"></i> <span>Create Free Account</span>';
                if (isRootIndex) {
                    signupBtn.href = prefix + 'users/signup.html';
                    signupBtn.addEventListener('click', () => {
                        if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
                            window.EdmithComponents.closeMobileMenu();
                        }
                    });
                } else {
                    signupBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
                            window.EdmithComponents.closeMobileMenu();
                        }
                        showSignupModal(prefix);
                    });
                }

                const loginBtn = document.createElement('a');
                loginBtn.className = 'mobile-auth-btn mobile-login-btn';
                loginBtn.href = '#';
                loginBtn.setAttribute('role', 'button');
                loginBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> <span>Log In</span>';
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
                        window.EdmithComponents.closeMobileMenu();
                    }
                    if (window.EdmithAuthModal && typeof window.EdmithAuthModal.show === 'function') {
                        window.EdmithAuthModal.show({ returnTo: window.location.href });
                    } else {
                        window.location.href = prefix + 'users/login.html?returnTo=' + encodeURIComponent(window.location.href);
                    }
                });

                mobileNavAuth.appendChild(signupBtn);
                mobileNavAuth.appendChild(loginBtn);
            }
        }

        // Asynchronously enhance name from DB if only fallback was initially available
        if (isAuthenticated && userObj && firstName === 'Learner') {
            resolveUserFirstName(userObj).then(resolved => {
                if (resolved && resolved !== 'Learner') {
                    const nameEl = document.querySelector('.header-user-name');
                    const greetEl = document.querySelector('.dropdown-greeting-name');
                    const mobileNameEl = document.querySelector('.mobile-user-name');
                    if (nameEl) nameEl.textContent = resolved;
                    if (greetEl) greetEl.textContent = resolved;
                    if (mobileNameEl) mobileNameEl.textContent = resolved;
                }
            });
        }
    }

    function inject() {
        // 1. Remove Contact Us, Live Previews, and legacy items from Header Navigation
        document.querySelectorAll('.desktop-nav-links, .mobile-nav-links, .nav-links').forEach(nav => {
            nav.querySelectorAll('a[href*="#contact"], a[href$="contact"], a[href*="#preview"], a[href$="preview"]').forEach(a => {
                const li = a.closest('li');
                if (li) li.remove();
                else a.remove();
            });
        });

        // 2. Ensure Leaderboard link in Header Navigation
        const desktopNav = document.querySelector('.desktop-nav-links') || document.querySelector('.nav-links');
        if (desktopNav && !desktopNav.querySelector('a[href*="Leaderboard.html"]')) {
            const lbItem = document.createElement('li');
            const isLbActive = rawPath.endsWith('/Leaderboard.html');
            lbItem.innerHTML = `<a href="${prefix}Leaderboard.html"${isLbActive ? ' class="active"' : ''} data-nav="leaderboard">Leaderboard</a>`;
            desktopNav.appendChild(lbItem);
        }

        // 3. Header Actions Auth Buttons
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const isRootIndex = (
                rawPath.endsWith('/index.html') ||
                rawPath.endsWith('/EDMITH/') ||
                rawPath.endsWith('/EDMITH') ||
                rawPath === '/' ||
                rawPath.endsWith('/')
            ) && !rawPath.includes('/sql/') && !rawPath.includes('/editors/') && !rawPath.includes('/users/') && !rawPath.includes('/etl/');

            // Fast synchronous render based on cached session state to prevent UI flicker
            const initialAuth = hasSupabaseSession();
            const cachedUser = typeof getActiveAuthUserSync === 'function' ? getActiveAuthUserSync() : null;
            renderHeaderAuth(initialAuth, headerActions, isRootIndex, cachedUser);

            // Asynchronous verification via Supabase SDK singleton
            if (typeof getEdmithSupabaseClient === 'function') {
                getEdmithSupabaseClient().then(client => {
                    if (!client) return;

                    // Verify active session with Supabase
                    client.auth.getSession().then(({ data: { session } }) => {
                        const isAuthed = !!(session && session.user);
                        renderHeaderAuth(isAuthed, headerActions, isRootIndex, session ? session.user : null);
                    }).catch(e => {
                        console.warn('[EDMITH Header] Session retrieval warning:', e);
                    });

                    // Listen to auth state transitions
                    client.auth.onAuthStateChange((event, session) => {
                        const isAuthed = !!(session && session.user);
                        renderHeaderAuth(isAuthed, headerActions, isRootIndex, session ? session.user : null);
                    });
                }).catch(e => {
                    console.warn('[EDMITH Header] Supabase client init warning:', e);
                });
            }
        }
        window.initEdmithAuthAndNavigation = inject;
        window.addEventListener('edmith:header-loaded', inject);
        window.addEventListener('edmith:components-loaded', inject);
    }

    window.initEdmithAuthAndNavigation = inject;
    window.addEventListener('edmith:header-loaded', inject);
    window.addEventListener('edmith:components-loaded', inject);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();


// =========================================================
// SIGNUP MODAL — Shown on inner/sub-pages
// =========================================================

function showSignupModal(pathPrefix) {
    const prefix = pathPrefix || '';

    // Prevent duplicate
    if (document.getElementById('edmithSignupModal')) {
        document.getElementById('edmithSignupModal').classList.add('modal-visible');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'signup-modal-overlay';
    overlay.id = 'edmithSignupModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Create an EDMITH account');

    const currentUrlParam = encodeURIComponent(window.location.href);

    overlay.innerHTML = `
        <div class="signup-modal">
            <button class="signup-modal-close" id="closeSignupModalBtn" aria-label="Close signup prompt">
                <i class="fas fa-times"></i>
            </button>
            <div class="signup-modal-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="signup-modal-logo">EDMITH</div>
            <h2>Start Your Learning Journey</h2>
            <p>Create a free account and unlock access to SQL, Python, C &amp; Web Development courses — with progress tracking and an interactive SQL Editor.</p>
            <div class="signup-modal-features">
                <div class="signup-modal-feature"><i class="fas fa-check-circle"></i> Free forever — no credit card</div>
                <div class="signup-modal-feature"><i class="fas fa-check-circle"></i> Interactive SQL Workbench</div>
                <div class="signup-modal-feature"><i class="fas fa-check-circle"></i> Track your lesson progress</div>
                <div class="signup-modal-feature"><i class="fas fa-check-circle"></i> Structured course curriculum</div>
            </div>
            <a href="${prefix}users/signup.html?returnTo=${currentUrlParam}" class="btn-modal-signup">
                <i class="fas fa-rocket"></i> Create Free Account
            </a>
            <p class="signup-modal-login-link">
                Already have an account? <a href="${prefix}users/login.html?returnTo=${currentUrlParam}">Log In</a>
            </p>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('modal-visible'));
    });

    // Close on X button
    overlay.querySelector('#closeSignupModalBtn').addEventListener('click', closeSignupModal);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSignupModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', handleSignupModalEsc);
}

function closeSignupModal() {
    const overlay = document.getElementById('edmithSignupModal');
    if (!overlay) return;
    overlay.classList.remove('modal-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    document.removeEventListener('keydown', handleSignupModalEsc);
}

function handleSignupModalEsc(e) {
    if (e.key === 'Escape') closeSignupModal();
}



// =========================================================
// GLOBAL LOGIC (Runs on all pages)
// =========================================================

// --- 0. Standard Footer Injection & Guarantee ---
(function ensureStandardFooter() {
    function injectFooter() {
        const rawPath = window.location.pathname.replace(/\\/g, '/');

        // Strictly remove footer from login and signup auth pages
        if (rawPath.includes('/login.html') || document.getElementById('loginForm') || rawPath.includes('/signup.html')) {
            const existing = document.querySelector('footer.footer, footer#contact, footer#site-footer, footer');
            if (existing) existing.remove();
            return;
        }

        if (document.querySelector('footer.footer') || document.getElementById('site-footer')) return;

        if (window.EdmithComponents && typeof window.EdmithComponents.renderFooter === 'function') {
            window.EdmithComponents.renderFooter();
            return;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFooter);
    } else {
        injectFooter();
    }
})();

// --- 1. Dynamic Footer Copyright Year ---
function initDynamicYear() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = currentYear;
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicYear);
} else {
    initDynamicYear();
}

// --- 2. Persistent Dark Mode Toggle ---
const themeToggleBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (document.body) {
        document.body.classList.toggle('dark-mode', isDark);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body) document.body.classList.toggle('dark-mode', isDark);
        });
    }
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
}

// Initialize theme on page load
const savedTheme = localStorage.getItem('edmith-theme');
const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
applyTheme(initialTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
        const isCurrentlyDark = document.body.classList.contains('dark-mode');
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        localStorage.setItem('edmith-theme', newTheme);
        applyTheme(newTheme);
    });
}

// Listen for system theme changes if user hasn't set an explicit preference
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('edmith-theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// --- 3. Mobile Navigation Drawer Toggle ---
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('nav-active');
        const icon = this.querySelector('i');
        if (icon) {
            if (isOpen) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Close mobile menu when clicking any nav link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('nav-active');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        }
    });
}

// --- 4. Smooth Scrolling (For anchor links) ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || this.classList.contains('logo')) return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            window.scrollTo({
                top: targetElement.offsetTop - 70, 
                behavior: 'smooth'
            });
        }
    });
});

// --- 5. Code Block Copy Buttons & Lightweight Syntax Highlighting ---
function initCodeCopyButtons() {
    // A. Lightweight Client-side SQL Syntax Highlighting for plain-text code blocks
    const sqlKeywords = new Set([
        'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE',
        'CREATE', 'TABLE', 'VIEW', 'DROP', 'ALTER', 'MERGE', 'USING', 'WHEN',
        'MATCHED', 'THEN', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS',
        'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'AND', 'OR', 'NOT',
        'IN', 'IS', 'NULL', 'AS', 'CASE', 'ELSE', 'END', 'UNION', 'ALL',
        'EXISTS', 'LIKE', 'DISTINCT', 'COPY', 'PRIMARY', 'KEY', 'FOREIGN',
        'REFERENCES', 'INTEGER', 'VARCHAR', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL',
        'DEFAULT', 'CASCADE', 'TRUNCATE', 'EXCEPT', 'MINUS', 'INTERSECT',
        'WITH', 'OVER', 'PARTITION', 'WINDOW', 'VALUES', 'PURGE'
    ]);

    const sqlFunctions = new Set([
        'SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CONCAT', 'CONCAT_WS',
        'SUBSTRING', 'SUBSTR', 'ROUND', 'TRIM', 'UPPER', 'LOWER', 'NOW', 'CAST',
        'CONVERT', 'ABS', 'LENGTH', 'NEXTVAL', 'RANK', 'DENSE_RANK', 'ROW_NUMBER',
        'LEAD', 'LAG', 'IFNULL', 'NVL', 'NVL2', 'NULLIF'
    ]);

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function tokenizeAndHighlightSql(codeEl) {
        if (!codeEl || codeEl.children.length > 0) return; // Skip if already structured with child elements
        const raw = codeEl.textContent;
        if (!raw || raw.trim().length === 0) return;

        // Check if content looks like SQL query
        const upper = raw.toUpperCase();
        const hasSqlKeywords = ['SELECT', 'FROM', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'CREATE', 'ALTER', 'COPY', 'CASE'].some(k => upper.includes(k));
        if (!hasSqlKeywords) return;

        // Tokenize pattern: Comments, Strings, Numbers, Words, Operators
        const tokenRegex = /(--[^\r\n]*)|(\/\*[\s\S]*?\*\/)|('(?:''|[^'])*')|("(?:""|[^"])*")|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|([^\s\w]+)/g;
        let lastIndex = 0;
        let result = '';
        let match;

        while ((match = tokenRegex.exec(raw)) !== null) {
            // Append non-matching whitespace or text between tokens
            if (match.index > lastIndex) {
                result += escapeHtml(raw.slice(lastIndex, match.index));
            }
            lastIndex = tokenRegex.lastIndex;

            const [token, c1, c2, s1, s2, num, word, sym] = match;
            if (c1 || c2) {
                result += `<span class="code-comment">${escapeHtml(c1 || c2)}</span>`;
            } else if (s1 || s2) {
                result += `<span class="code-string">${escapeHtml(s1 || s2)}</span>`;
            } else if (num) {
                result += `<span class="code-num">${num}</span>`;
            } else if (word) {
                const upperWord = word.toUpperCase();
                if (sqlKeywords.has(upperWord)) {
                    result += `<span class="code-keyword">${escapeHtml(word)}</span>`;
                } else if (sqlFunctions.has(upperWord)) {
                    result += `<span class="code-func">${escapeHtml(word)}</span>`;
                } else {
                    result += escapeHtml(word);
                }
            } else if (sym) {
                result += escapeHtml(sym);
            }
        }

        if (lastIndex < raw.length) {
            result += escapeHtml(raw.slice(lastIndex));
        }

        codeEl.innerHTML = result;
    }

    // Apply auto-highlighting to unhighlighted pre code blocks
    document.querySelectorAll('pre code').forEach(codeEl => {
        tokenizeAndHighlightSql(codeEl);
    });

    // B. Header-based Copy Buttons (Terminals, Mac Headers, Carousels)
    document.querySelectorAll('.carousel-content, .code-terminal, .code-window').forEach(container => {
        const macHeader = container.querySelector('.mac-header, .terminal-header');
        const preCode = container.querySelector('pre code') || container.querySelector('pre');
        if (!preCode || !macHeader) return;

        // Skip if a copy button already exists in this header
        if (!macHeader.querySelector('.code-copy-btn, .editor-copy-btn, .copy-btn, .copy-code-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.title = 'Copy Code';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
            macHeader.appendChild(copyBtn);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const codeText = preCode.innerText || preCode.textContent;
                navigator.clipboard.writeText(codeText.trim()).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
        }
    });

    // C. Universal Delegated Click Handler for all terminal copy buttons
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-code-btn, .copy-btn, .code-copy-btn');
        if (!copyBtn) return;

        // Find associated code element
        const terminal = copyBtn.closest('.code-terminal, .code-window, .diagram-terminal, .flow-card, .code-preview');
        let codeEl = terminal ? (terminal.querySelector('code') || terminal.querySelector('pre')) : null;
        if (!codeEl) {
            const parent = copyBtn.parentElement;
            codeEl = parent ? (parent.querySelector('code') || parent.querySelector('pre')) : null;
        }

        if (codeEl) {
            const codeText = (codeEl.innerText || codeEl.textContent).trim();
            const originalHTML = copyBtn.innerHTML;

            function onCopySuccess() {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeText).then(onCopySuccess).catch(() => {
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = codeText;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                        onCopySuccess();
                    } catch (err) {}
                });
            } else {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = codeText;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                    onCopySuccess();
                } catch (err) {}
            }
        }
    });

    // D. Pre-rendered editor-copy-btn buttons (e.g. homepage carousel, scenario blocks)
    document.querySelectorAll('.editor-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.carousel-content') || btn.closest('.scenario-block');
            const preCode = container ? container.querySelector('pre') : null;
            if (!preCode) return;

            const codeText = preCode.innerText || preCode.textContent;
            navigator.clipboard.writeText(codeText.trim()).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            });
        });
    });

    // E. Interactive Run Code simulation buttons on homepage carousel
    document.querySelectorAll('.editor-run-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.carousel-content');
            const tray = container ? container.querySelector('.terminal-tray-output') : null;
            const originalHTML = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Running...</span>';
            btn.classList.add('running');

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Executed</span>';
                btn.classList.remove('running');
                btn.classList.add('success');

                if (tray) {
                    const now = new Date();
                    const timeStr = now.toTimeString().split(' ')[0];
                    const highlight = tray.querySelector('.term-highlight');
                    if (highlight) {
                        highlight.textContent = `Executed at ${timeStr} • OK (0.6ms)`;
                    }
                    tray.style.transition = 'opacity 0.2s ease';
                    tray.style.opacity = '0.3';
                    setTimeout(() => { tray.style.opacity = '1'; }, 100);
                }

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('success');
                }, 1800);
            }, 350);
        });
    });
}
document.addEventListener('DOMContentLoaded', initCodeCopyButtons);


// =========================================================
// HOMEPAGE SPECIFIC LOGIC (index.html)
// =========================================================

const carouselItems = document.querySelectorAll('.carousel-item');
if (carouselItems.length > 0) {
    
    // --- CAROUSEL LOGIC ---
    let currentSlide = 0;
    let slideInterval;
    const carouselContainer = document.querySelector('.carousel-container');
    const carouselDots = document.querySelectorAll('.carousel-dot');
    const prevArrow = document.querySelector('.carousel-arrow.prev-arrow');
    const nextArrow = document.querySelector('.carousel-arrow.next-arrow');

    function updateCarousel() {
        carouselItems.forEach((item, index) => {
            item.className = 'carousel-item'; // reset
            
            if (index === currentSlide) {
                item.classList.add('active'); 
            } else if (index === (currentSlide + 1) % carouselItems.length) {
                item.classList.add('next');   
            } else if (index === (currentSlide - 1 + carouselItems.length) % carouselItems.length) {
                item.classList.add('prev');   
            } else {
                item.classList.add('hidden'); 
            }
        });

        // Synchronize dots
        if (carouselDots.length > 0) {
            carouselDots.forEach((dot, idx) => {
                if (idx === currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % carouselItems.length;
        updateCarousel();
    }

    function prevSlideAction() {
        currentSlide = (currentSlide - 1 + carouselItems.length) % carouselItems.length;
        updateCarousel();
    }

    function startAutoSlide() {
        if (!slideInterval) {
            slideInterval = setInterval(nextSlide, 4500);
        }
    }

    function stopAutoSlide() {
        clearInterval(slideInterval);
        slideInterval = null;
    }

    startAutoSlide();

    // Pause auto-rotation when hovering carousel
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // Slide card clicks
    carouselItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (index !== currentSlide) {
                currentSlide = index;
                updateCarousel();
                stopAutoSlide();
                startAutoSlide();
            }
        });
    });

    // Dot indicators clicks
    carouselDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            currentSlide = idx;
            updateCarousel();
            stopAutoSlide();
            startAutoSlide();
        });
    });

    // Arrow navigation buttons
    if (prevArrow) {
        prevArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            prevSlideAction();
            stopAutoSlide();
            startAutoSlide();
        });
    }

    if (nextArrow) {
        nextArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            nextSlide();
            stopAutoSlide();
            startAutoSlide();
        });
    }

    // Touch Swipe Gestures for Mobile
    let touchStartX = 0;
    let touchEndX = 0;
    if (carouselContainer) {
        carouselContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 45) {
                // Swiped Left -> Next
                nextSlide();
                stopAutoSlide();
                startAutoSlide();
            } else if (touchEndX - touchStartX > 45) {
                // Swiped Right -> Prev
                prevSlideAction();
                stopAutoSlide();
                startAutoSlide();
            }
        }, { passive: true });
    }

    updateCarousel();

    // --- SEARCH BUTTON LOGIC (index.html) ---
    const searchInput = document.getElementById('courseSearch');
    const searchBtn = document.getElementById('searchBtn');
    const courseCards = document.querySelectorAll('.plain-card');
    const noResultsText = document.getElementById('noResults');
    const previewSection = document.getElementById('preview');

    function handleSearch(isButtonClick = false) {
        const query = searchInput.value.toLowerCase().trim();

        if (query === "") {
            if (isButtonClick) {
                searchInput.placeholder = "Please enter a course name...";
                searchInput.focus();
            } else {
                searchInput.placeholder = "Search for SQL, HTML, Python...";
            }
            
            if (previewSection) previewSection.style.display = 'block'; 
            courseCards.forEach(card => card.style.display = 'flex');
            if (noResultsText) noResultsText.style.display = 'none';
            return;
        }

        if (previewSection) previewSection.style.display = 'none'; 
        searchInput.placeholder = "Search for SQL, HTML, Python..."; 

        let visibleCount = 0;
        courseCards.forEach(card => {
            const title = card.getAttribute('data-title') || '';
            if (title.includes(query)) {
                card.style.display = card.classList.contains('view-all-card') ? 'flex' : 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResultsText) {
            noResultsText.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // When user explicitly clicks search, smooth scroll to courses section
        if (isButtonClick) {
            const coursesSection = document.getElementById('courses');
            if (coursesSection) {
                window.scrollTo({
                    top: coursesSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(true);
            } else {
                handleSearch(false);
            }
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', () => handleSearch(true));
    }
}


// =========================================================
// ALL COURSES CATALOG PAGE LOGIC (course.html)
// =========================================================

const smartHeader = document.getElementById('smartHeader') || document.getElementById('catalogHero') || (document.getElementById('site-header') && window.location.pathname.includes('course.html'));
if (smartHeader) {
    const catalogCards = document.querySelectorAll('.catalog-card');
    const catalogHero = document.getElementById('catalogHero');
    const stickySearchBar = document.getElementById('stickySearchBar');
    
    // Main search controls
    const categoryFilter = document.getElementById('categoryFilter');
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const catalogSearchBtn = document.getElementById('catalogSearchBtn');
    const catalogNoResults = document.getElementById('catalogNoResults');
    
    // Sticky search controls
    const stickyCategoryFilter = document.getElementById('stickyCategoryFilter');
    const stickySearchInput = document.getElementById('stickySearchInput');
    const stickySearchBtn = document.getElementById('stickySearchBtn');

    // --- 1. STICKY HEADER SEARCH TRANSITION LOGIC ---
    if (catalogHero && stickySearchBar) {
        window.addEventListener('scroll', () => {
            const heroBottom = catalogHero.offsetTop + catalogHero.offsetHeight;
            let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            if (currentScroll > heroBottom - 50) {
                stickySearchBar.classList.add('visible');
            } else {
                stickySearchBar.classList.remove('visible');
            }
        });
    }

    // --- 2. UNIFIED FILTER & SEARCH LOGIC ---
    function executeCatalogSearch(queryVal, categoryVal, isButtonClick = false) {
        let query = (queryVal || '').toLowerCase().trim();
        let category = categoryVal || 'all';

        if (query === "") {
            if (isButtonClick && catalogSearchInput) {
                catalogSearchInput.placeholder = "Please enter a course name...";
                if (stickySearchInput) stickySearchInput.placeholder = "Please enter a course name...";
                catalogSearchInput.focus();
            } else {
                if (catalogSearchInput) catalogSearchInput.placeholder = "Search a course...";
                if (stickySearchInput) stickySearchInput.placeholder = "Search a course...";
            }
        }

        let visibleCount = 0;
        catalogCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category') || '';
            const cardTitle = card.getAttribute('data-title') || '';
            
            const matchesCategory = (category === 'all' || cardCategory.includes(category));
            const matchesText = cardTitle.includes(query);

            if (matchesCategory && matchesText) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (catalogNoResults) {
            catalogNoResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // Update URL query params without reloading
        const url = new URL(window.location);
        if (query) {
            url.searchParams.set('search', query);
        } else {
            url.searchParams.delete('search');
        }
        if (category && category !== 'all') {
            url.searchParams.set('category', category);
        } else {
            url.searchParams.delete('category');
        }
        window.history.replaceState({}, '', url);
    }

    // --- 3. URL PARAMETERS INIT ON PAGE LOAD ---
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search') || urlParams.get('q') || '';
    const categoryParam = urlParams.get('category') || 'all';

    if (catalogSearchInput) catalogSearchInput.value = searchParam;
    if (stickySearchInput) stickySearchInput.value = searchParam;
    if (categoryFilter) categoryFilter.value = categoryParam;
    if (stickyCategoryFilter) stickyCategoryFilter.value = categoryParam;

    if (searchParam || categoryParam !== 'all') {
        executeCatalogSearch(searchParam, categoryParam, false);
    }

    // Sync Main Bar -> Sticky Bar & Execute
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            if (stickyCategoryFilter) stickyCategoryFilter.value = categoryFilter.value;
            executeCatalogSearch(catalogSearchInput ? catalogSearchInput.value : '', categoryFilter.value, false);
        });
    }
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('keyup', (e) => {
            if (stickySearchInput) stickySearchInput.value = catalogSearchInput.value;
            executeCatalogSearch(catalogSearchInput.value, categoryFilter ? categoryFilter.value : 'all', e.key === 'Enter');
        });
    }
    if (catalogSearchBtn) {
        catalogSearchBtn.addEventListener('click', () => {
            if (stickySearchInput && catalogSearchInput) stickySearchInput.value = catalogSearchInput.value;
            executeCatalogSearch(catalogSearchInput ? catalogSearchInput.value : '', categoryFilter ? categoryFilter.value : 'all', true);
        });
    }

    // Sync Sticky Bar -> Main Bar & Execute
    if (stickyCategoryFilter) {
        stickyCategoryFilter.addEventListener('change', () => {
            if (categoryFilter) categoryFilter.value = stickyCategoryFilter.value;
            executeCatalogSearch(stickySearchInput ? stickySearchInput.value : '', stickyCategoryFilter.value, false);
        });
    }
    if (stickySearchInput) {
        stickySearchInput.addEventListener('keyup', (e) => {
            if (catalogSearchInput) catalogSearchInput.value = stickySearchInput.value;
            executeCatalogSearch(stickySearchInput.value, stickyCategoryFilter ? stickyCategoryFilter.value : 'all', e.key === 'Enter');
        });
    }
    if (stickySearchBtn) {
        stickySearchBtn.addEventListener('click', () => {
            if (catalogSearchInput && stickySearchInput) catalogSearchInput.value = stickySearchInput.value;
            executeCatalogSearch(stickySearchInput ? stickySearchInput.value : '', stickyCategoryFilter ? stickyCategoryFilter.value : 'all', true);
        });
    }
}


// =========================================================
// COURSE DETAIL PAGE LOGIC (sql/index.html)
// =========================================================

const detailAccordions = document.querySelectorAll('.detail-main .accordion-header');
if (detailAccordions.length > 0) {
    detailAccordions.forEach(header => {
        header.addEventListener('click', function() {
            const item = this.parentElement;
            const body = item.querySelector('.accordion-body');
            
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                body.style.maxHeight = null;
                body.style.padding = "0 1.5rem";
            } else {
                item.classList.add('active');
                body.style.maxHeight = (body.scrollHeight + 50) + "px";
                body.style.padding = "1.5rem";
            }
        });
    });
}


// =========================================================
// LESSON / READING INTERFACE & TABLE OF CONTENTS
// =========================================================

/**
 * Canonical chapter page detection across EDMITH courses (SQL, ETL, C).
 * Returns chapter context { courseId, lesson, cleanLessonId, dbLessonId, file, title }
 * or null if the current page is any non-chapter page (e.g. course index, module overview,
 * test, quiz, coding round, editor, leaderboard, profile, support, etc.).
 */
function getChapterContext() {
    // 1. Mandatory DOM markers: Must have a Mark Complete button inside a chapter layout
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    if (!markCompleteBtn) return null;

    const hasChapterLayout = !!document.querySelector('.learning-layout .lesson-container, .learning-layout main, .course-layout .lesson-container');
    if (!hasChapterLayout) return null;

    // 2. Strict exclusion: Non-chapter pages must never be treated as chapters
    const rawPath = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    const isExcluded = 
        rawPath.includes('/tests/') ||
        rawPath.includes('/test/') ||
        rawPath.includes('/editors/') ||
        rawPath.includes('/editor/') ||
        rawPath.includes('leaderboard') ||
        rawPath.includes('report-bug') ||
        rawPath.includes('/users/') ||
        rawPath.includes('quiz') ||
        rawPath.includes('coding-round') ||
        rawPath.endsWith('/index.html') ||
        rawPath.endsWith('/') ||
        rawPath === '' ||
        rawPath.endsWith('course.html');

    if (isExcluded) return null;

    // 3. Extract page identifier
    const fileName = rawPath.split('/').pop().toLowerCase();
    const attrId = (markCompleteBtn.getAttribute('data-lesson-id') || '').trim();

    // 4. Validate against EDMITH_COURSES curriculum registry if defined
    const courseRegistry = (typeof window !== 'undefined' && window.EDMITH_COURSES) ? window.EDMITH_COURSES : null;
    if (courseRegistry) {
        for (const [cId, courseDef] of Object.entries(courseRegistry)) {
            if (!courseDef || !Array.isArray(courseDef.lessons)) continue;

            const matchedLesson = courseDef.lessons.find(lesson => {
                if (lesson.file && lesson.file.toLowerCase() === fileName) return true;
                if (attrId && (lesson.id === attrId || lesson.id.replace(/^(sql_|etl_|c_)/, '') === attrId.replace(/^(sql_|etl_|c_)/, ''))) return true;
                return false;
            });

            if (matchedLesson) {
                const prefix = cId === 'etl_testing' ? 'etl_' : (cId === 'c_programming' ? 'c_' : 'sql_');
                const cleanId = matchedLesson.id.replace(/^(sql_|etl_|c_)/, '').replace(/[-_]/g, '_');
                return {
                    isChapter: true,
                    courseId: cId,
                    lesson: matchedLesson,
                    cleanLessonId: cleanId,
                    dbLessonId: matchedLesson.id.startsWith(prefix) ? matchedLesson.id : (prefix + cleanId),
                    file: matchedLesson.file,
                    title: matchedLesson.title
                };
            }
        }
    }

    // 5. Inferred fallback if inside authentic chapter container with valid data-lesson-id
    if (attrId) {
        let courseId = 'sql_mastery';
        let prefix = 'sql_';
        if (attrId.startsWith('etl_') || rawPath.includes('/etl/')) {
            courseId = 'etl_testing';
            prefix = 'etl_';
        } else if (attrId.startsWith('c_') || rawPath.includes('/c/')) {
            courseId = 'c_programming';
            prefix = 'c_';
        }

        const cleanId = attrId.replace(/^(sql_|etl_|c_)/, '').replace(/[-_]/g, '_');
        return {
            isChapter: true,
            courseId: courseId,
            lesson: { id: attrId, file: fileName },
            cleanLessonId: cleanId,
            dbLessonId: attrId.startsWith(prefix) ? attrId : (prefix + cleanId),
            file: fileName,
            title: (document.title || '').split('—')[0].split('-')[0].trim()
        };
    }

    return null;
}

/**
 * Checks whether the current page is an authentic chapter page.
 */
function isChapterPage() {
    return !!getChapterContext();
}

/**
 * Validates if current page is an authentic course learning/lesson chapter page.
 * Strictly returns false for all non-chapter pages (Course Index, Tests, Editors,
 * Quizzes, Leaderboards, Modules, Profiles, Bug Reports, etc.)
 */
function isCourseLearningPage() {
    return isChapterPage();
}

// 1. Reading Progress Bar & Auto-Completion on progress >= 80% or reaching Summary/Footer
(function setupReadingProgressBar() {
    const isLearning = isCourseLearningPage();

    // If on a non-learning page, remove any stray reading progress containers
    if (!isLearning) {
        document.querySelectorAll('.reading-progress-container').forEach(el => el.remove());
        return;
    }

    const progressBar = document.querySelector('.reading-progress-container #progressBar') ||
                        document.querySelector('.reading-progress-container #readingProgressBar') ||
                        document.querySelector('.reading-progress-bar') ||
                        document.getElementById('progressBar') ||
                        document.getElementById('readingProgressBar');

    let autoCompletedThisSession = false;

    function triggerAutoComplete(progressVal) {
        if (autoCompletedThisSession) return;
        autoCompletedThisSession = true;
        if (progressBar) progressBar.style.width = '100%';
        if (typeof window.__edmith_auto_complete_lesson === 'function') {
            window.__edmith_auto_complete_lesson(progressVal || 100);
        } else {
            // If DOMContentLoaded hasn't finished yet, dispatch once ready
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof window.__edmith_auto_complete_lesson === 'function') {
                    window.__edmith_auto_complete_lesson(progressVal || 100);
                }
            }, { once: true });
        }
    }

    if (progressBar) {
        window.addEventListener('scroll', () => {
            const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const currentScroll = window.scrollY;
            if (totalHeight > 0) {
                const progress = (currentScroll / totalHeight) * 100;
                progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';

                // Check lesson content height directly
                const lessonMain = document.querySelector('.lesson-container, main.lesson-container, .lesson-content');
                let contentProgress = 0;
                if (lessonMain) {
                    const rect = lessonMain.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    const scrolledThrough = (windowHeight - rect.top);
                    contentProgress = (scrolledThrough / rect.height) * 100;
                }

                // Auto-completion requirement: >90% content read or >=80% window scroll
                if ((contentProgress >= 90 || progress >= 80) && !autoCompletedThisSession) {
                    triggerAutoComplete(Math.max(contentProgress, progress));
                }
            }
        }, { passive: true });
    }

    // High-precision IntersectionObserver: Triggers auto-completion when reader scrolls to Summary section or Lesson Footer
    function setupIntersectionTrigger() {
        const completionTarget = document.querySelector('#lesson-summary, .summary-card, .summary-box, .lesson-footer, #markCompleteBtn');
        if (completionTarget && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !autoCompletedThisSession) {
                        triggerAutoComplete(100);
                    }
                });
            }, { threshold: 0.15 });
            observer.observe(completionTarget);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupIntersectionTrigger);
    } else {
        setupIntersectionTrigger();
    }
})();

// 2. World-Class Interactive Table of Contents Suite (Desktop Right Rail + Floating Smart Pill + Dual-Tab Navigation Drawer)
(function setupWorldClassTocSuite() {
    if (!isCourseLearningPage()) return;

    const lessonContainer = document.querySelector('.learning-layout .lesson-container');
    const lessonContent = lessonContainer ? lessonContainer.querySelector('.lesson-content') : null;
    const courseSidebarNav = document.querySelector('.course-sidebar-nav');
    const learningLayout = document.querySelector('.learning-layout');

    if (!lessonContainer || !lessonContent) return;

    // 1. Discover all section headings (<h2>) and assign robust unique IDs
    const headings = Array.from(lessonContent.querySelectorAll('h2'));
    headings.forEach((h2, idx) => {
        if (!h2.id) {
            const rawSlug = h2.textContent
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
            h2.id = rawSlug ? `sec-${rawSlug}` : `section-${idx + 1}`;
        }
    });

    const lessonTitleEl = lessonContainer.querySelector('.lesson-header h1');
    const lessonTitle = lessonTitleEl ? lessonTitleEl.textContent.trim() : document.title.split('-')[0].trim();

    // Helper: Flash subtle EDMITH purple pulse on section arrival
    function highlightTargetSection(targetEl) {
        if (!targetEl) return;
        targetEl.classList.remove('toc-highlight-target');
        void targetEl.offsetWidth; // Trigger reflow for re-animation
        targetEl.classList.add('toc-highlight-target');
        setTimeout(() => {
            targetEl.classList.remove('toc-highlight-target');
        }, 1800);
    }

    // 2. Build Desktop Sticky Right Rail "On This Page" TOC
    let otpNav = document.querySelector('.on-this-page-nav');
    if (learningLayout && !otpNav && headings.length > 0) {
        otpNav = document.createElement('nav');
        otpNav.className = 'on-this-page-nav';
        otpNav.setAttribute('aria-label', 'On this page table of contents');

        let listItemsHtml = '';
        headings.forEach((h2, idx) => {
            const numStr = (idx + 1 < 10 ? '0' : '') + (idx + 1);
            const cleanText = h2.textContent.replace(/^\d+[\.\)]\s*/, '').trim();
            listItemsHtml += `
                <li class="otp-list-item" data-target="${h2.id}">
                    <a href="#${h2.id}">
                        <span class="otp-item-num">${numStr}</span>
                        <span class="otp-item-text">${cleanText}</span>
                    </a>
                </li>
            `;
        });

        otpNav.innerHTML = `
            <div class="otp-card">
                <div class="otp-header-top">
                    <span class="otp-badge"><i class="fas fa-stream"></i> On This Page</span>
                    <span class="otp-reading-pct" id="otpReadingPct">0%</span>
                </div>
                <div class="otp-progress-bar-wrap">
                    <div class="otp-progress-bar-fill" id="otpProgressBarFill"></div>
                </div>
            </div>
            <div class="otp-title-label"><i class="fas fa-list-ul"></i> Jump to Section</div>
            <ul class="otp-list">
                ${listItemsHtml}
            </ul>
            <div class="otp-actions">
                <button type="button" class="otp-action-btn" id="otpBackToTopBtn" title="Scroll to top of chapter">
                    <i class="fas fa-arrow-up"></i> Top of Chapter
                </button>
                <button type="button" class="otp-action-btn" id="otpOpenSyllabusBtn" title="Open complete course syllabus">
                    <i class="fas fa-book-open"></i> Full Syllabus
                </button>
            </div>
        `;
        learningLayout.appendChild(otpNav);

        otpNav.querySelector('#otpBackToTopBtn')?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        otpNav.querySelector('#otpOpenSyllabusBtn')?.addEventListener('click', () => {
            openSmartTocModal('syllabus');
        });

        otpNav.querySelectorAll('.otp-list-item a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = a.getAttribute('href').slice(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                    highlightTargetSection(targetEl);
                    try { history.replaceState(null, '', '#' + targetId); } catch (e) {}
                }
            });
        });
    }

    // 3. Build Floating Smart TOC Pill (Scroll Reveal at >180px)
    let floatingPill = document.querySelector('.floating-toc-pill');
    if (!floatingPill) {
        floatingPill = document.createElement('button');
        floatingPill.type = 'button';
        floatingPill.className = 'floating-toc-pill';
        floatingPill.setAttribute('aria-label', 'Open Table of Contents');
        floatingPill.setAttribute('title', 'Table of Contents (Hotkey: T)');
        floatingPill.innerHTML = `
            <div class="floating-toc-ring-wrap">
                <svg class="floating-toc-ring-svg" viewBox="0 0 28 28">
                    <circle class="floating-toc-ring-bg" cx="14" cy="14" r="12"></circle>
                    <circle class="floating-toc-ring-fill" id="floatingRingFill" cx="14" cy="14" r="12"></circle>
                </svg>
                <i class="fas fa-list-ul floating-toc-ring-icon"></i>
            </div>
            <div class="floating-toc-content">
                <span class="floating-toc-kicker">Contents</span>
                <span class="floating-toc-heading" id="floatingActiveSecTitle">${headings.length ? headings[0].textContent.replace(/^\d+[\.\)]\s*/, '') : 'Overview'}</span>
            </div>
            <span class="floating-toc-pct-badge" id="floatingPctBadge">0%</span>
        `;
        document.body.appendChild(floatingPill);

        floatingPill.addEventListener('click', (e) => {
            e.stopPropagation();
            openSmartTocModal('chapter');
        });
    }

    // 4. Build Smart TOC Modal / Drawer (Dual Tabs: In This Chapter + Course Syllabus)
    let modalBackdrop = document.getElementById('smartTocModal');
    if (!modalBackdrop) {
        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'smartTocModal';
        modalBackdrop.className = 'smart-toc-backdrop';
        modalBackdrop.setAttribute('aria-hidden', 'true');

        let chapterSectionsHtml = '';
        if (headings.length > 0) {
            headings.forEach((h2, idx) => {
                const numStr = (idx + 1 < 10 ? '0' : '') + (idx + 1);
                const cleanText = h2.textContent.replace(/^\d+[\.\)]\s*/, '').trim();
                chapterSectionsHtml += `
                    <a href="#${h2.id}" class="st-section-card" data-target="${h2.id}">
                        <span class="st-sec-num">${numStr}</span>
                        <span class="st-sec-title">${cleanText}</span>
                        <span class="st-sec-badge" style="display: none;"><i class="fas fa-eye"></i> Viewing</span>
                    </a>
                `;
            });
        } else {
            chapterSectionsHtml = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">This lesson contains a single reading section.</p>`;
        }

        modalBackdrop.innerHTML = `
            <div class="smart-toc-dialog" role="dialog" aria-modal="true" aria-labelledby="stModalTitle">
                <div class="st-dialog-header">
                    <div class="st-header-title-wrap">
                        <span class="st-header-badge"><i class="fas fa-layer-group"></i> Course &amp; Chapter Hub</span>
                        <h3 class="st-header-title" id="stModalTitle">Table of Contents</h3>
                    </div>
                    <button type="button" class="st-close-btn" id="stCloseModalBtn" aria-label="Close Table of Contents">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="st-tabs">
                    <button type="button" class="st-tab-btn active" data-tab="chapter">
                        <i class="fas fa-list-ul"></i>
                        <span>In This Chapter</span>
                        <span class="st-tab-count">${headings.length}</span>
                    </button>
                    <button type="button" class="st-tab-btn" data-tab="syllabus">
                        <i class="fas fa-book-open"></i>
                        <span>Course Syllabus</span>
                        <span class="st-tab-count" id="stSyllabusCount">Modules</span>
                    </button>
                </div>
                <div class="st-dialog-body">
                    <div class="st-tab-panel" id="stTabPanelChapter">
                        <div class="st-chapter-summary-card">
                            <div class="st-chapter-summary-info">
                                <span class="st-chapter-name"><i class="fas fa-bookmark" style="color: var(--accent); margin-right: 6px;"></i> ${lessonTitle}</span>
                                <span id="stModalReadingPct">0% Read</span>
                            </div>
                            <div class="otp-progress-bar-wrap">
                                <div class="otp-progress-bar-fill" id="stModalProgressFill" style="width: 0%;"></div>
                            </div>
                        </div>
                        <div class="st-chapter-sections-list">
                            ${chapterSectionsHtml}
                        </div>
                    </div>
                    <div class="st-tab-panel" id="stTabPanelSyllabus" style="display: none;">
                        <div class="st-syllabus-search-wrap">
                            <i class="fas fa-search st-syllabus-search-icon"></i>
                            <input type="text" class="st-syllabus-search-input" id="stSyllabusSearchInput" placeholder="Filter course lessons...">
                        </div>
                        <div class="st-syllabus-clone-container" id="stSyllabusCloneWrap"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalBackdrop);

        // Populate syllabus clone from sidebar
        const syllabusWrap = modalBackdrop.querySelector('#stSyllabusCloneWrap');
        if (syllabusWrap && courseSidebarNav) {
            const moduleGroups = courseSidebarNav.querySelectorAll('.sidebar-module-group');
            moduleGroups.forEach(grp => {
                const clone = grp.cloneNode(true);
                clone.classList.remove('collapsed'); // open by default in modal for easy scanning
                const hdr = clone.querySelector('.sidebar-module-header');
                if (hdr) {
                    hdr.setAttribute('aria-expanded', 'true');
                    hdr.addEventListener('click', (e) => {
                        e.preventDefault();
                        clone.classList.toggle('collapsed');
                    });
                }
                syllabusWrap.appendChild(clone);
            });

            // Count total lessons for tab badge
            const totalLessonLinks = syllabusWrap.querySelectorAll('li a').length;
            const countBadge = modalBackdrop.querySelector('#stSyllabusCount');
            if (countBadge && totalLessonLinks > 0) {
                countBadge.textContent = `${totalLessonLinks}`;
            }

            // Real-time syllabus search filter
            const searchInput = modalBackdrop.querySelector('#stSyllabusSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const q = (e.target.value || '').toLowerCase().trim();
                    syllabusWrap.querySelectorAll('.sidebar-module-group').forEach(grp => {
                        let hasVisibleMatch = false;
                        grp.querySelectorAll('li').forEach(li => {
                            const match = !q || li.textContent.toLowerCase().includes(q);
                            li.style.display = match ? '' : 'none';
                            if (match) hasVisibleMatch = true;
                        });
                        grp.style.display = hasVisibleMatch ? '' : 'none';
                        if (q && hasVisibleMatch) {
                            grp.classList.remove('collapsed');
                        }
                    });
                });
            }
        }

        // Section card click: smooth scroll & pulse
        modalBackdrop.querySelectorAll('.st-section-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = card.getAttribute('href').slice(1);
                const targetEl = document.getElementById(targetId);
                closeSmartTocModal();
                if (targetEl) {
                    setTimeout(() => {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                        highlightTargetSection(targetEl);
                        try { history.replaceState(null, '', '#' + targetId); } catch (e) {}
                    }, 120);
                }
            });
        });

        // Tab switching
        const tabBtns = modalBackdrop.querySelectorAll('.st-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchSmartTocTab(tab);
            });
        });

        modalBackdrop.querySelector('#stCloseModalBtn')?.addEventListener('click', closeSmartTocModal);
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeSmartTocModal();
        });
    }

    function switchSmartTocTab(tabName) {
        if (!modalBackdrop) return;
        const tabBtns = modalBackdrop.querySelectorAll('.st-tab-btn');
        const chapterPanel = modalBackdrop.querySelector('#stTabPanelChapter');
        const syllabusPanel = modalBackdrop.querySelector('#stTabPanelSyllabus');

        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        if (tabName === 'syllabus') {
            if (chapterPanel) chapterPanel.style.display = 'none';
            if (syllabusPanel) {
                syllabusPanel.style.display = 'block';
                modalBackdrop.querySelector('#stSyllabusSearchInput')?.focus();
            }
        } else {
            if (chapterPanel) chapterPanel.style.display = 'block';
            if (syllabusPanel) syllabusPanel.style.display = 'none';
        }
    }

    function openSmartTocModal(tabName = 'chapter') {
        if (!modalBackdrop) return;
        switchSmartTocTab(tabName);
        modalBackdrop.classList.add('active');
        document.body.classList.add('toc-modal-open');
    }

    function closeSmartTocModal() {
        if (!modalBackdrop) return;
        modalBackdrop.classList.remove('active');
        document.body.classList.remove('toc-modal-open');
    }

    // 5. Wire existing in-page Mobile TOC Toggle Button
    const mobileTocBtn = document.getElementById('mobileTocBtn');
    if (mobileTocBtn) {
        mobileTocBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSmartTocModal('chapter');
        });
    }

    // 6. Keyboard Hotkeys: "T" opens TOC, "Escape" closes
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('active')) {
            closeSmartTocModal();
            return;
        }

        const tag = (e.target.tagName || '').toLowerCase();
        const isEditable = e.target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
        if (!isEditable && (e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (modalBackdrop && modalBackdrop.classList.contains('active')) {
                closeSmartTocModal();
            } else {
                openSmartTocModal('chapter');
            }
        }
    });

    // 7. Scrollspy & Reading Progress Tracker
    let scrollRafId = null;
    function handleScrollTracking() {
        const docEl = document.documentElement;
        const totalHeight = docEl.scrollHeight - window.innerHeight;
        const currentScroll = window.scrollY || docEl.scrollTop;
        const progressPct = totalHeight > 0 ? Math.min(100, Math.max(0, Math.round((currentScroll / totalHeight) * 100))) : 0;

        // Toggle floating pill on scroll (>180px threshold)
        if (floatingPill) {
            if (currentScroll > 180) {
                floatingPill.classList.add('visible');
            } else {
                floatingPill.classList.remove('visible');
            }

            // Update SVG Progress Ring
            const ringFill = floatingPill.querySelector('#floatingRingFill');
            if (ringFill) {
                const circumference = 75.39; // 2 * PI * 12
                const offset = circumference - (progressPct / 100) * circumference;
                ringFill.style.strokeDashoffset = offset;
            }
            const pctBadge = floatingPill.querySelector('#floatingPctBadge');
            if (pctBadge) pctBadge.textContent = `${progressPct}%`;
        }

        // Update Desktop Right Rail Progress
        const otpPct = document.getElementById('otpReadingPct');
        const otpFill = document.getElementById('otpProgressBarFill');
        if (otpPct) otpPct.textContent = `${progressPct}%`;
        if (otpFill) otpFill.style.width = `${progressPct}%`;

        // Update Modal Progress
        const stPct = document.getElementById('stModalReadingPct');
        const stFill = document.getElementById('stModalProgressFill');
        if (stPct) stPct.textContent = `${progressPct}% Read`;
        if (stFill) stFill.style.width = `${progressPct}%`;

        // Active Section Scrollspy Detection
        if (headings.length > 0) {
            let activeIdx = 0;
            const scrollMarker = 120; // 120px below top of viewport
            for (let i = 0; i < headings.length; i++) {
                const rect = headings[i].getBoundingClientRect();
                if (rect.top <= scrollMarker) {
                    activeIdx = i;
                } else {
                    break;
                }
            }

            const activeH2 = headings[activeIdx];
            const activeId = activeH2 ? activeH2.id : '';
            const activeCleanText = activeH2 ? activeH2.textContent.replace(/^\d+[\.\)]\s*/, '').trim() : '';

            // Update Floating Pill label
            const activeLabelEl = document.getElementById('floatingActiveSecTitle');
            if (activeLabelEl && activeCleanText) {
                activeLabelEl.textContent = activeCleanText;
            }

            // Update Right Rail active item
            if (otpNav) {
                otpNav.querySelectorAll('.otp-list-item').forEach(item => {
                    item.classList.toggle('active', item.getAttribute('data-target') === activeId);
                });
            }

            // Update Modal section active badge
            if (modalBackdrop) {
                modalBackdrop.querySelectorAll('.st-section-card').forEach(card => {
                    const isCardActive = card.getAttribute('data-target') === activeId;
                    card.classList.toggle('active', isCardActive);
                    const badge = card.querySelector('.st-sec-badge');
                    if (badge) badge.style.display = isCardActive ? 'inline-flex' : 'none';
                });
            }
        }
    }

    window.addEventListener('scroll', () => {
        if (!scrollRafId) {
            scrollRafId = requestAnimationFrame(() => {
                handleScrollTracking();
                scrollRafId = null;
            });
        }
    }, { passive: true });

    // Initial run
    handleScrollTracking();

    // Hook into mobile header drawer if on lesson page
    const hookMobileNavSyllabus = () => {
        const mobileNavLinks = document.getElementById('mobileNavLinks');
        if (mobileNavLinks && !document.getElementById('mobileOpenSyllabusLink')) {
            const li = document.createElement('li');
            li.style.setProperty('--item-index', '6');
            li.innerHTML = `
                <a href="#" id="mobileOpenSyllabusLink" style="color: var(--accent); font-weight: 700;">
                    <span class="mobile-nav-icon" aria-hidden="true"><i class="fas fa-list-ol"></i></span>
                    <span>Course Chapters &amp; Syllabus</span>
                </a>
            `;
            mobileNavLinks.appendChild(li);
            li.querySelector('#mobileOpenSyllabusLink').addEventListener('click', (e) => {
                e.preventDefault();
                if (window.EdmithComponents && typeof window.EdmithComponents.closeMobileMenu === 'function') {
                    window.EdmithComponents.closeMobileMenu();
                }
                setTimeout(() => openSmartTocModal('syllabus'), 200);
            });
        }
    };
    hookMobileNavSyllabus();
    window.addEventListener('edmith:header-loaded', hookMobileNavSyllabus);

    // Auto-expand module containing active lesson in sidebar
    if (courseSidebarNav) {
        const activeItem = courseSidebarNav.querySelector('li.active');
        if (activeItem) {
            const parentModule = activeItem.closest('.sidebar-module-group');
            if (parentModule) {
                parentModule.classList.remove('collapsed');
                const header = parentModule.querySelector('.sidebar-module-header');
                if (header) header.setAttribute('aria-expanded', 'true');
            }
        }
    }
})();

// =========================================================
// 3. EDMITH USER-ISOLATED COURSE & LESSON PROGRESS SYSTEM
// =========================================================

const SUPABASE_PROGRESS_CONFIG = {
    url: 'https://jnoigbvvxwpvxefunvfc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub2lnYnZ2eHdwdnhlZnVudmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDkzMjEsImV4cCI6MjEwNTMyNTMyMX0.kg07-fyqAPdnSqs4RxNvzvbD5VhNR8vtFkg-RS5pMnA'
};

const EDMITH_COURSES = {
    sql_mastery: {
        id: 'sql_mastery',
        title: 'SQL & Databases Mastery',
        module: 'Module 1: SQL and Basics',
        icon: 'fas fa-database',
        url: 'sql/index.html',
        firstLessonUrl: 'sql/intro.html',
        totalLessons: 50,
        lessons: [
            { id: 'sql_intro', title: 'SQL Introduction', file: 'intro.html' },
            { id: 'sql_languages', title: 'The 5 SQL Languages', file: 'languages.html' },
            { id: 'sql_priority_rule', title: 'The Priority Rule', file: 'priority-rule.html' },
            { id: 'sql_syntax', title: 'SQL Syntax & Statement Grammar', file: 'syntax.html' },
            { id: 'sql_select', title: 'The SELECT Statement', file: 'select.html' },
            { id: 'sql_aliases', title: 'SQL Aliases (The AS Keyword)', file: 'aliases.html' },
            { id: 'sql_select_distinct', title: 'SELECT DISTINCT (Deduplication)', file: 'select-distinct.html' },
            { id: 'sql_where', title: 'The WHERE Clause', file: 'where.html' },
            { id: 'sql_and', title: 'The AND Operator', file: 'and.html' },
            { id: 'sql_or', title: 'The OR Operator', file: 'or.html' },
            { id: 'sql_not', title: 'The NOT Operator', file: 'not.html' },
            { id: 'sql_between', title: 'The BETWEEN Operator', file: 'between.html' },
            { id: 'sql_in', title: 'The IN Operator', file: 'in.html' },
            { id: 'sql_like', title: 'The LIKE Operator', file: 'like.html' },
            { id: 'sql_wildcards', title: 'Wildcards', file: 'wildcards.html' },
            { id: 'sql_null_values', title: 'NULL Values & Logic', file: 'null-values.html' },
            { id: 'sql_order_by', title: 'The ORDER BY Clause', file: 'order-by.html' },
            { id: 'sql_select_top', title: 'SELECT TOP, LIMIT & Pagination', file: 'select-top.html' },
            { id: 'sql_aggregate_functions', title: 'Aggregate Functions Overview', file: 'aggregate-functions.html' },
            { id: 'sql_count', title: 'The COUNT() Function', file: 'count.html' },
            { id: 'sql_sum', title: 'The SUM() Function', file: 'sum.html' },
            { id: 'sql_avg', title: 'The AVG() Function', file: 'avg.html' },
            { id: 'sql_min', title: 'The MIN() Function', file: 'min.html' },
            { id: 'sql_max', title: 'The MAX() Function', file: 'max.html' },
            { id: 'sql_group_by', title: 'The GROUP BY Statement', file: 'group-by.html' },
            { id: 'sql_having', title: 'The HAVING Clause', file: 'having.html' },
            { id: 'sql_joins', title: 'SQL Joins Overview', file: 'joins.html' },
            { id: 'sql_inner_join', title: 'INNER JOIN', file: 'inner-join.html' },
            { id: 'sql_left_join', title: 'LEFT JOIN', file: 'left-join.html' },
            { id: 'sql_right_join', title: 'RIGHT JOIN', file: 'right-join.html' },
            { id: 'sql_full_join', title: 'FULL OUTER JOIN', file: 'full-join.html' },
            { id: 'sql_self_join', title: 'SELF JOIN', file: 'self-join.html' },
            { id: 'sql_union', title: 'The UNION Operator', file: 'union.html' },
            { id: 'sql_union_all', title: 'The UNION ALL Operator', file: 'union-all.html' },
            { id: 'sql_case', title: 'The CASE Expression', file: 'case.html' },
            { id: 'sql_null_functions', title: 'SQL NULL Functions (COALESCE & IFNULL)', file: 'null-functions.html' },
            { id: 'sql_exists', title: 'The EXISTS Operator', file: 'exists.html' },
            { id: 'sql_any', title: 'The ANY Operator', file: 'any.html' },
            { id: 'sql_all', title: 'The ALL Operator', file: 'all.html' },
            { id: 'sql_insert_into', title: 'The INSERT INTO Statement', file: 'insert-into.html' },
            { id: 'sql_update', title: 'The UPDATE Statement', file: 'update.html' },
            { id: 'sql_delete', title: 'The DELETE Statement', file: 'delete.html' },
            { id: 'sql_select_into', title: 'The SELECT INTO Statement', file: 'select-into.html' },
            { id: 'sql_insert_into_select', title: 'The INSERT INTO SELECT Statement', file: 'insert-into-select.html' },
            { id: 'sql_comments', title: 'SQL Comments', file: 'comments.html' },
            { id: 'sql_acid_properties', title: 'ACID Properties', file: 'acid-properties.html' },
            { id: 'sql_stored_procedures', title: 'Stored Procedures', file: 'stored-procedures.html' },
            { id: 'sql_operators', title: 'SQL Operators Reference', file: 'operators.html' },
            { id: 'sql_functions', title: 'SQL Functions Guide', file: 'functions.html' },
            { id: 'sql_keywords', title: 'SQL Keywords Dictionary', file: 'keywords.html' }
        ]
    },
    etl_testing: {
        id: 'etl_testing',
        title: 'ETL Testing & Data Warehouse',
        module: 'Modules 1–32: End-to-End Enterprise ETL, Warehousing, Migration & Quality Engineering',
        icon: 'fas fa-diagram-project',
        url: 'etl/index.html',
        firstLessonUrl: 'etl/what-is-data.html',
        totalLessons: 592,
        lessons: [
            // Module 1: Computer & Data Fundamentals
            { id: 'etl_what_is_data', title: "What is Data?", file: 'what-is-data.html' },
            { id: 'etl_types_of_data', title: "Types of Data", file: 'types-of-data.html' },
            { id: 'etl_structured_data', title: "Structured Data", file: 'structured-data.html' },
            { id: 'etl_semi_structured_data', title: "Semi-Structured Data", file: 'semi-structured-data.html' },
            { id: 'etl_unstructured_data', title: "Unstructured Data", file: 'unstructured-data.html' },
            { id: 'etl_data_formats', title: "Data Formats", file: 'data-formats.html' },
            { id: 'etl_csv', title: "CSV Files (Comma-Separated Values)", file: 'csv.html' },
            { id: 'etl_excel', title: "Excel Files (.xlsx, .xls)", file: 'excel.html' },
            { id: 'etl_json', title: "JSON Data (JavaScript Object Notation)", file: 'json.html' },
            { id: 'etl_xml', title: "XML Data (Extensible Markup Language)", file: 'xml.html' },
            { id: 'etl_parquet', title: "Apache Parquet", file: 'parquet.html' },
            { id: 'etl_avro', title: "Apache Avro", file: 'avro.html' },
            { id: 'etl_orc', title: "Apache ORC (Optimized Row Columnar)", file: 'orc.html' },
            { id: 'etl_txt', title: "TXT Files (Delimited & Fixed-Width)", file: 'txt.html' },
            { id: 'etl_files_vs_databases', title: "Files vs Databases", file: 'files-vs-databases.html' },
            { id: 'etl_tables_rows_columns', title: "Tables, Rows & Columns", file: 'tables-rows-columns.html' },
            { id: 'etl_records', title: "Records", file: 'records.html' },
            { id: 'etl_fields', title: "Fields", file: 'fields.html' },
            { id: 'etl_primary_identifiers', title: "Primary Identifiers", file: 'primary-identifiers.html' },
            { id: 'etl_data_types', title: "Data Types", file: 'data-types.html' },
            { id: 'etl_null_values', title: "NULL Values", file: 'null-values.html' },
            { id: 'etl_duplicate_data', title: "Duplicate Data", file: 'duplicate-data.html' },
            { id: 'etl_missing_data', title: "Missing Data", file: 'missing-data.html' },
            { id: 'etl_invalid_data', title: "Invalid Data", file: 'invalid-data.html' },
            { id: 'etl_data_quality', title: "Data Quality Dimensions", file: 'data-quality.html' },
            { id: 'etl_data_lifecycle', title: "Data Lifecycle", file: 'data-lifecycle.html' },
            { id: 'etl_crud_operations', title: "CRUD Operations", file: 'crud-operations.html' },
            { id: 'etl_oltp_vs_olap', title: "OLTP vs OLAP", file: 'oltp-vs-olap.html' },
            { id: 'etl_what_is_data_pipeline', title: "What is a Data Pipeline?", file: 'what-is-data-pipeline.html' },
            { id: 'etl_what_is_data_movement', title: "What is Data Movement?", file: 'what-is-data-movement.html' },
            { id: 'etl_what_is_data_processing', title: "What is Data Processing?", file: 'what-is-data-processing.html' },
            // Module 2: ETL Fundamentals
            { id: 'etl_what_is_etl', title: "What is ETL?", file: 'what-is-etl.html' },
            { id: 'etl_why_etl_is_required', title: "Why ETL is Required", file: 'why-etl-is-required.html' },
            { id: 'etl_architecture', title: "ETL Architecture", file: 'etl-architecture.html' },
            { id: 'etl_extract', title: "Extract", file: 'extract.html' },
            { id: 'etl_transform', title: "Transform", file: 'transform.html' },
            { id: 'etl_load', title: "Load", file: 'load.html' },
            { id: 'etl_source', title: "Source", file: 'source.html' },
            { id: 'etl_staging', title: "Staging", file: 'staging.html' },
            { id: 'etl_transformation_layer', title: "Transformation Layer", file: 'transformation-layer.html' },
            { id: 'etl_target', title: "Target", file: 'target.html' },
            { id: 'etl_pipeline', title: "ETL Pipeline", file: 'etl-pipeline.html' },
            { id: 'etl_workflow', title: "ETL Workflow", file: 'etl-workflow.html' },
            { id: 'etl_job', title: "ETL Job", file: 'etl-job.html' },
            { id: 'etl_batch', title: "ETL Batch", file: 'etl-batch.html' },
            { id: 'etl_schedule', title: "ETL Schedule", file: 'etl-schedule.html' },
            { id: 'etl_dependencies', title: "ETL Dependencies", file: 'etl-dependencies.html' },
            { id: 'etl_full_extraction', title: "Full Extraction", file: 'full-extraction.html' },
            { id: 'etl_incremental_extraction', title: "Incremental Extraction", file: 'incremental-extraction.html' },
            { id: 'etl_initial_extraction', title: "Initial Load", file: 'initial-extraction.html' },
            { id: 'etl_delta_extraction', title: "Delta Load", file: 'delta-extraction.html' },
            { id: 'etl_cdc', title: "Change Data Capture", file: 'cdc.html' },
            { id: 'etl_timestamp_based_extraction', title: "Timestamp-Based Extraction", file: 'timestamp-based-extraction.html' },
            { id: 'etl_flag_based_extraction', title: "Flag-Based Extraction", file: 'flag-based-extraction.html' },
            { id: 'etl_log_based_extraction', title: "Log-Based Extraction", file: 'log-based-extraction.html' },
            { id: 'etl_query_based_extraction', title: "Query-Based Extraction", file: 'query-based-extraction.html' },
            { id: 'etl_source_extraction_filters', title: "Source Extraction Filters", file: 'source-extraction-filters.html' },
            { id: 'etl_data_cleansing', title: "Data Cleansing", file: 'data-cleansing.html' },
            { id: 'etl_data_validation', title: "Data Validation", file: 'data-validation.html' },
            { id: 'etl_data_standardization', title: "Data Standardization", file: 'data-standardization.html' },
            { id: 'etl_data_conversion', title: "Data Conversion", file: 'data-conversion.html' },
            { id: 'etl_data_mapping', title: "Data Mapping", file: 'data-mapping.html' },
            { id: 'etl_data_filtering', title: "Data Filtering", file: 'data-filtering.html' },
            { id: 'etl_data_splitting', title: "Data Splitting", file: 'data-splitting.html' },
            { id: 'etl_data_merging', title: "Data Merging", file: 'data-merging.html' },
            { id: 'etl_data_aggregation', title: "Data Aggregation", file: 'data-aggregation.html' },
            { id: 'etl_sorting', title: "Sorting", file: 'sorting.html' },
            { id: 'etl_deduplication', title: "Deduplication", file: 'deduplication.html' },
            { id: 'etl_lookup', title: "Lookup", file: 'lookup.html' },
            { id: 'etl_join', title: "Join", file: 'join.html' },
            { id: 'etl_derived_columns', title: "Derived Columns", file: 'derived-columns.html' },
            { id: 'etl_conditional_transformations', title: "Conditional Transformations", file: 'conditional-transformations.html' },
            { id: 'etl_data_enrichment', title: "Data Enrichment", file: 'data-enrichment.html' },
            { id: 'etl_data_masking', title: "Data Masking", file: 'data-masking.html' },
            { id: 'etl_data_validation_rules', title: "Data Validation Rules", file: 'data-validation-rules.html' },
            { id: 'etl_full_load', title: "Full Load", file: 'full-load.html' },
            { id: 'etl_incremental_load', title: "Incremental Load", file: 'incremental-load.html' },
            { id: 'etl_initial_load', title: "Initial Load", file: 'initial-load.html' },
            { id: 'etl_delta_load', title: "Delta Load", file: 'delta-load.html' },
            { id: 'etl_append', title: "Append", file: 'append.html' },
            { id: 'etl_update', title: "Update", file: 'update.html' },
            { id: 'etl_insert', title: "Insert", file: 'insert.html' },
            { id: 'etl_upsert', title: "Upsert", file: 'upsert.html' },
            { id: 'etl_merge', title: "Merge", file: 'merge.html' },
            { id: 'etl_scd_loading', title: "Slowly Changing Dimension Loading", file: 'scd-loading.html' },
            { id: 'etl_batch_loading', title: "Batch Loading", file: 'batch-loading.html' },
            { id: 'etl_bulk_loading', title: "Bulk Loading", file: 'bulk-loading.html' },
            // Module 3: Data Warehousing Fundamentals
            { id: 'etl_er_diagrams', title: "ER Diagrams", file: 'er-diagrams.html' },
            { id: 'etl_relationships', title: "Relationships", file: 'relationships.html' },
            { id: 'etl_normalization', title: "Normalization", file: 'normalization.html' },
            { id: 'etl_1nf', title: "1NF", file: '1nf.html' },
            { id: 'etl_2nf', title: "2NF", file: '2nf.html' },
            { id: 'etl_3nf', title: "3NF", file: '3nf.html' },
            { id: 'etl_denormalization', title: "Denormalization", file: 'denormalization.html' },
            { id: 'etl_referential_integrity', title: "Referential Integrity", file: 'referential-integrity.html' },
            { id: 'etl_what_is_a_data_warehouse', title: "What is a Data Warehouse?", file: 'what-is-a-data-warehouse.html' },
            { id: 'etl_why_data_warehouses_are_required', title: "Why Data Warehouses are Required", file: 'why-data-warehouses-are-required.html' },
            { id: 'etl_database_vs_data_warehouse', title: "Database vs Data Warehouse", file: 'database-vs-data-warehouse.html' },
            { id: 'etl_oltp', title: "OLTP", file: 'oltp.html' },
            { id: 'etl_olap', title: "OLAP", file: 'olap.html' },
            { id: 'etl_oltp_vs_olap_comparison', title: "OLTP vs OLAP", file: 'oltp-vs-olap-comparison.html' },
            { id: 'etl_data_warehouse_architecture', title: "Data Warehouse Architecture", file: 'data-warehouse-architecture.html' },
            { id: 'etl_enterprise_data_warehouse', title: "Enterprise Data Warehouse", file: 'enterprise-data-warehouse.html' },
            { id: 'etl_data_mart', title: "Data Mart", file: 'data-mart.html' },
            { id: 'etl_operational_data_store', title: "Operational Data Store", file: 'operational-data-store.html' },
            { id: 'etl_data_lake', title: "Data Lake", file: 'data-lake.html' },
            { id: 'etl_data_lakehouse', title: "Data Lakehouse", file: 'data-lakehouse.html' },
            { id: 'etl_staging_area', title: "Staging Area", file: 'staging-area.html' },
            { id: 'etl_source_system', title: "Source System", file: 'source-system.html' },
            { id: 'etl_target_system', title: "Target System", file: 'target-system.html' },
            { id: 'etl_data_warehouse_layers', title: "Data Warehouse Layers", file: 'data-warehouse-layers.html' },
            { id: 'etl_presentation_layer', title: "Presentation Layer", file: 'presentation-layer.html' },
            { id: 'etl_semantic_layer', title: "Semantic Layer", file: 'semantic-layer.html' },
            { id: 'etl_reporting_layer', title: "Reporting Layer", file: 'reporting-layer.html' },
            { id: 'etl_star_schema', title: "Star Schema", file: 'star-schema.html' },
            { id: 'etl_snowflake_schema', title: "Snowflake Schema", file: 'snowflake-schema.html' },
            { id: 'etl_galaxy_schema', title: "Galaxy Schema / Fact Constellation", file: 'galaxy-schema.html' },
            { id: 'etl_star_vs_snowflake_schema', title: "Star vs Snowflake Schema", file: 'star-vs-snowflake-schema.html' },
            { id: 'etl_what_is_a_fact_table', title: "What is a Fact Table?", file: 'what-is-a-fact-table.html' },
            { id: 'etl_types_of_facts', title: "Types of Facts", file: 'types-of-facts.html' },
            { id: 'etl_additive_facts', title: "Additive Facts", file: 'additive-facts.html' },
            { id: 'etl_semi_additive_facts', title: "Semi-Additive Facts", file: 'semi-additive-facts.html' },
            { id: 'etl_non_additive_facts', title: "Non-Additive Facts", file: 'non-additive-facts.html' },
            { id: 'etl_fact_table_grain', title: "Fact Table Grain", file: 'fact-table-grain.html' },
            { id: 'etl_transaction_fact', title: "Transaction Fact", file: 'transaction-fact.html' },
            { id: 'etl_periodic_snapshot_fact', title: "Periodic Snapshot Fact", file: 'periodic-snapshot-fact.html' },
            { id: 'etl_accumulating_snapshot_fact', title: "Accumulating Snapshot Fact", file: 'accumulating-snapshot-fact.html' },
            { id: 'etl_what_is_a_dimension', title: "What is a Dimension?", file: 'what-is-a-dimension.html' },
            { id: 'etl_dimension_attributes', title: "Dimension Attributes", file: 'dimension-attributes.html' },
            { id: 'etl_dimension_keys', title: "Dimension Keys", file: 'dimension-keys.html' },
            { id: 'etl_dimension_hierarchy', title: "Dimension Hierarchy", file: 'dimension-hierarchy.html' },
            { id: 'etl_dimension_types', title: "Dimension Types", file: 'dimension-types.html' },
            { id: 'etl_conformed_dimensions', title: "Conformed Dimensions", file: 'conformed-dimensions.html' },
            { id: 'etl_role_playing_dimensions', title: "Role-Playing Dimensions", file: 'role-playing-dimensions.html' },
            { id: 'etl_degenerate_dimensions', title: "Degenerate Dimensions", file: 'degenerate-dimensions.html' },
            { id: 'etl_junk_dimensions', title: "Junk Dimensions", file: 'junk-dimensions.html' },
            { id: 'etl_mini_dimensions', title: "Mini Dimensions", file: 'mini-dimensions.html' },
            { id: 'etl_slowly_changing_dimensions', title: "Slowly Changing Dimensions", file: 'slowly-changing-dimensions.html' },
            { id: 'etl_scd_type_0', title: "SCD Type 0", file: 'scd-type-0.html' },
            { id: 'etl_scd_type_1', title: "SCD Type 1", file: 'scd-type-1.html' },
            { id: 'etl_scd_type_2', title: "SCD Type 2", file: 'scd-type-2.html' },
            { id: 'etl_scd_type_3', title: "SCD Type 3", file: 'scd-type-3.html' },
            { id: 'etl_scd_type_4', title: "SCD Type 4", file: 'scd-type-4.html' },
            { id: 'etl_scd_type_6', title: "SCD Type 6", file: 'scd-type-6.html' },
            { id: 'etl_effective_date', title: "Effective Date", file: 'effective-date.html' },
            { id: 'etl_expiry_date', title: "Expiry Date", file: 'expiry-date.html' },
            { id: 'etl_current_flag', title: "Current Flag", file: 'current-flag.html' },
            { id: 'etl_version_number', title: "Version Number", file: 'version-number.html' },
            { id: 'etl_historical_records', title: "Historical Records", file: 'historical-records.html' },
            // Module 4: ETL vs ELT Architecture
            { id: 'etl_architecture', title: "ETL Architecture", file: 'etl-architecture.html' },
            { id: 'etl_elt_architecture', title: "ELT Architecture", file: 'elt-architecture.html' },
            { id: 'etl_vs_elt', title: "ETL vs ELT", file: 'etl-vs-elt.html' },
            { id: 'etl_when_etl_is_used', title: "When ETL is Used", file: 'when-etl-is-used.html' },
            { id: 'etl_when_elt_is_used', title: "When ELT is Used", file: 'when-elt-is-used.html' },
            { id: 'etl_advantages_of_etl', title: "Advantages of ETL", file: 'advantages-of-etl.html' },
            { id: 'etl_limitations_of_etl', title: "Limitations of ETL", file: 'limitations-of-etl.html' },
            { id: 'etl_advantages_of_elt', title: "Advantages of ELT", file: 'advantages-of-elt.html' },
            { id: 'etl_limitations_of_elt', title: "Limitations of ELT", file: 'limitations-of-elt.html' },
            { id: 'etl_modern_cloud_data_pipelines', title: "Modern Cloud Data Pipelines", file: 'modern-cloud-data-pipelines.html' },
            { id: 'etl_cloud_native_etl_elt', title: "Cloud-Native ETL/ELT", file: 'cloud-native-etl-elt.html' },
            // Module 5: Data Integration Fundamentals
            { id: 'etl_what_is_data_integration', title: "What is Data Integration?", file: 'what-is-data-integration.html' },
            { id: 'etl_why_data_integration_is_required', title: "Why Data Integration is Required", file: 'why-data-integration-is-required.html' },
            { id: 'etl_source_to_target_integration', title: "Source-to-Target Integration", file: 'source-to-target-integration.html' },
            { id: 'etl_batch_integration', title: "Batch Integration", file: 'batch-integration.html' },
            { id: 'etl_real_time_integration', title: "Real-Time Integration", file: 'real-time-integration.html' },
            { id: 'etl_near_real_time_integration', title: "Near-Real-Time Integration", file: 'near-real-time-integration.html' },
            { id: 'etl_api_based_integration', title: "API-Based Integration", file: 'api-based-integration.html' },
            { id: 'etl_file_based_integration', title: "File-Based Integration", file: 'file-based-integration.html' },
            { id: 'etl_database_to_database_integration', title: "Database-to-Database Integration", file: 'database-to-database-integration.html' },
            { id: 'etl_application_to_database_integration', title: "Application-to-Database Integration", file: 'application-to-database-integration.html' },
            { id: 'etl_event_driven_integration', title: "Event-Driven Integration", file: 'event-driven-integration.html' },
            { id: 'etl_streaming_data_integration', title: "Streaming Data Integration", file: 'streaming-data-integration.html' },
            { id: 'etl_data_synchronization', title: "Data Synchronization", file: 'data-synchronization.html' },
            { id: 'etl_data_replication', title: "Data Replication", file: 'data-replication.html' },
            { id: 'etl_data_federation', title: "Data Federation", file: 'data-federation.html' },
            // Module 6: ETL Mapping Concepts
            { id: 'etl_source_to_target_mapping', title: "Source-to-Target Mapping", file: 'source-to-target-mapping.html' },
            { id: 'etl_source_columns', title: "Source Columns", file: 'source-columns.html' },
            { id: 'etl_target_columns', title: "Target Columns", file: 'target-columns.html' },
            { id: 'etl_transformation_rules', title: "Transformation Rules", file: 'transformation-rules.html' },
            { id: 'etl_business_rules', title: "Business Rules", file: 'business-rules.html' },
            { id: 'etl_data_type_mapping', title: "Data Type Mapping", file: 'data-type-mapping.html' },
            { id: 'etl_default_values', title: "Default Values", file: 'default-values.html' },
            { id: 'etl_null_handling', title: "Null Handling", file: 'null-handling.html' },
            { id: 'etl_derived_fields', title: "Derived Fields", file: 'derived-fields.html' },
            { id: 'etl_lookup_rules', title: "Lookup Rules", file: 'lookup-rules.html' },
            { id: 'etl_filter_conditions', title: "Filter Conditions", file: 'filter-conditions.html' },
            { id: 'etl_join_conditions', title: "Join Conditions", file: 'join-conditions.html' },
            { id: 'etl_aggregation_rules', title: "Aggregation Rules", file: 'aggregation-rules.html' },
            { id: 'etl_data_conversion_rules', title: "Data Conversion Rules", file: 'data-conversion-rules.html' },
            { id: 'etl_reject_rules', title: "Reject Rules", file: 'reject-rules.html' },
            { id: 'etl_error_handling_rules', title: "Error Handling Rules", file: 'error-handling-rules.html' },
            { id: 'etl_mapping_documents', title: "Mapping Documents", file: 'mapping-documents.html' },
            { id: 'etl_source_to_target_mapping_documents', title: "Source-to-Target Mapping Documents", file: 'source-to-target-mapping-documents.html' },
            // Module 7: ETL Testing Fundamentals
            { id: 'etl_what_is_etl_testing', title: "What is ETL Testing?", file: 'what-is-etl-testing.html' },
            { id: 'etl_why_etl_testing_is_required', title: "Why ETL Testing is Required", file: 'why-etl-testing-is-required.html' },
            { id: 'etl_role_of_an_etl_tester', title: "Role of an ETL Tester", file: 'role-of-an-etl-tester.html' },
            { id: 'etl_tester_vs_manual_tester', title: "ETL Tester vs Manual Tester", file: 'etl-tester-vs-manual-tester.html' },
            { id: 'etl_tester_vs_data_engineer', title: "ETL Tester vs Data Engineer", file: 'etl-tester-vs-data-engineer.html' },
            { id: 'etl_testing_lifecycle', title: "ETL Testing Lifecycle", file: 'etl-testing-lifecycle.html' },
            { id: 'etl_testing_process', title: "ETL Testing Process", file: 'etl-testing-process.html' },
            { id: 'etl_testing_strategy', title: "ETL Testing Strategy", file: 'etl-testing-strategy.html' },
            { id: 'etl_test_plan', title: "ETL Test Plan", file: 'etl-test-plan.html' },
            { id: 'etl_test_scenarios', title: "ETL Test Scenarios", file: 'etl-test-scenarios.html' },
            { id: 'etl_test_cases', title: "ETL Test Cases", file: 'etl-test-cases.html' },
            { id: 'etl_test_data', title: "Test Data", file: 'test-data.html' },
            { id: 'etl_expected_results', title: "Expected Results", file: 'expected-results.html' },
            { id: 'etl_actual_results', title: "Actual Results", file: 'actual-results.html' },
            { id: 'etl_test_evidence', title: "Test Evidence", file: 'test-evidence.html' },
            { id: 'etl_defect_reporting', title: "Defect Reporting", file: 'defect-reporting.html' },
            // Module 8: Types of ETL Testing
            { id: 'etl_source_to_target_testing', title: "Source-to-Target Testing", file: 'source-to-target-testing.html' },
            { id: 'etl_data_validation_testing', title: "Data Validation Testing", file: 'data-validation-testing.html' },
            { id: 'etl_data_completeness_testing', title: "Data Completeness Testing", file: 'data-completeness-testing.html' },
            { id: 'etl_data_accuracy_testing', title: "Data Accuracy Testing", file: 'data-accuracy-testing.html' },
            { id: 'etl_data_consistency_testing', title: "Data Consistency Testing", file: 'data-consistency-testing.html' },
            { id: 'etl_data_integrity_testing', title: "Data Integrity Testing", file: 'data-integrity-testing.html' },
            { id: 'etl_data_transformation_testing', title: "Data Transformation Testing", file: 'data-transformation-testing.html' },
            { id: 'etl_data_mapping_testing', title: "Data Mapping Testing", file: 'data-mapping-testing.html' },
            { id: 'etl_data_type_testing', title: "Data Type Testing", file: 'data-type-testing.html' },
            { id: 'etl_null_validation', title: "Null Validation", file: 'null-validation.html' },
            { id: 'etl_duplicate_validation', title: "Duplicate Validation", file: 'duplicate-validation.html' },
            { id: 'etl_referential_integrity_testing', title: "Referential Integrity Testing", file: 'referential-integrity-testing.html' },
            { id: 'etl_constraint_testing', title: "Constraint Testing", file: 'constraint-testing.html' },
            { id: 'etl_lookup_testing', title: "Lookup Testing", file: 'lookup-testing.html' },
            { id: 'etl_join_testing', title: "Join Testing", file: 'join-testing.html' },
            { id: 'etl_aggregation_testing', title: "Aggregation Testing", file: 'aggregation-testing.html' },
            { id: 'etl_filter_testing', title: "Filter Testing", file: 'filter-testing.html' },
            { id: 'etl_business_rule_validation', title: "Business-Rule Validation", file: 'business-rule-validation.html' },
            { id: 'etl_default_value_validation', title: "Default-Value Validation", file: 'default-value-validation.html' },
            { id: 'etl_boundary_value_testing', title: "Boundary-Value Testing", file: 'boundary-value-testing.html' },
            { id: 'etl_negative_testing', title: "Negative Testing", file: 'negative-testing.html' },
            { id: 'etl_regression_testing', title: "Regression Testing", file: 'regression-testing.html' },
            { id: 'etl_smoke_testing', title: "Smoke Testing", file: 'smoke-testing.html' },
            { id: 'etl_sanity_testing', title: "Sanity Testing", file: 'sanity-testing.html' },
            { id: 'etl_functional_testing', title: "Functional Testing", file: 'functional-testing.html' },
            { id: 'etl_integration_testing', title: "Integration Testing", file: 'integration-testing.html' },
            { id: 'etl_system_testing', title: "System Testing", file: 'system-testing.html' },
            { id: 'etl_end_to_end_testing', title: "End-to-End Testing", file: 'end-to-end-testing.html' },
            { id: 'etl_performance_testing', title: "Performance Testing", file: 'performance-testing.html' },
            { id: 'etl_security_testing', title: "Security Testing", file: 'security-testing.html' },
            { id: 'etl_recovery_testing', title: "Recovery Testing", file: 'recovery-testing.html' },
            { id: 'etl_restartability_testing', title: "Restartability Testing", file: 'restartability-testing.html' },
            { id: 'etl_failure_handling_testing', title: "Failure Handling Testing", file: 'failure-handling-testing.html' },
            // Module 9: Source-to-Target Validation
            { id: 'etl_source_to_target_validation', title: "Source-to-Target Validation", file: 'source-to-target-validation.html' },
            { id: 'etl_column_mapping', title: "Column Mapping", file: 'column-mapping.html' },
            { id: 'etl_row_mapping', title: "Row Mapping", file: 'row-mapping.html' },
            { id: 'etl_record_count_comparison', title: "Record Count Comparison", file: 'record-count-comparison.html' },
            { id: 'etl_column_count_comparison', title: "Column Count Comparison", file: 'column-count-comparison.html' },
            { id: 'etl_data_type_comparison', title: "Data Type Comparison", file: 'data-type-comparison.html' },
            { id: 'etl_length_comparison', title: "Length Comparison", file: 'length-comparison.html' },
            { id: 'etl_precision_comparison', title: "Precision Comparison", file: 'precision-comparison.html' },
            { id: 'etl_scale_comparison', title: "Scale Comparison", file: 'scale-comparison.html' },
            { id: 'etl_value_comparison', title: "Value Comparison", file: 'value-comparison.html' },
            { id: 'etl_transformation_comparison', title: "Transformation Comparison", file: 'transformation-comparison.html' },
            { id: 'etl_null_comparison', title: "Null Comparison", file: 'null-comparison.html' },
            { id: 'etl_duplicate_comparison', title: "Duplicate Comparison", file: 'duplicate-comparison.html' },
            { id: 'etl_aggregation_comparison', title: "Aggregation Comparison", file: 'aggregation-comparison.html' },
            { id: 'etl_filter_comparison', title: "Filter Comparison", file: 'filter-comparison.html' },
            { id: 'etl_business_rule_comparison', title: "Business-Rule Comparison", file: 'business-rule-comparison.html' },
            // Module 10: Data Completeness Testing
            { id: 'etl_source_record_count', title: "Source Record Count", file: 'source-record-count.html' },
            { id: 'etl_target_record_count', title: "Target Record Count", file: 'target-record-count.html' },
            { id: 'etl_count_reconciliation', title: "Count Reconciliation", file: 'count-reconciliation.html' },
            { id: 'etl_missing_records', title: "Missing Records", file: 'missing-records.html' },
            { id: 'etl_extra_records', title: "Extra Records", file: 'extra-records.html' },
            { id: 'etl_missing_columns', title: "Missing Columns", file: 'missing-columns.html' },
            { id: 'etl_missing_values', title: "Missing Values", file: 'missing-values.html' },
            { id: 'etl_partial_loads', title: "Partial Loads", file: 'partial-loads.html' },
            { id: 'etl_rejected_records', title: "Rejected Records", file: 'rejected-records.html' },
            { id: 'etl_duplicate_records', title: "Duplicate Records", file: 'duplicate-records.html' },
            { id: 'etl_source_vs_staging_count', title: "Source vs Staging Count", file: 'source-vs-staging-count.html' },
            { id: 'etl_staging_vs_target_count', title: "Staging vs Target Count", file: 'staging-vs-target-count.html' },
            { id: 'etl_end_to_end_record_count', title: "End-to-End Record Count", file: 'end-to-end-record-count.html' },
            // Module 11: Data Accuracy Testing
            { id: 'etl_exact_value_comparison', title: "Exact Value Comparison", file: 'exact-value-comparison.html' },
            { id: 'etl_transformed_value_validation', title: "Transformed Value Validation", file: 'transformed-value-validation.html' },
            { id: 'etl_calculated_field_validation', title: "Calculated Field Validation", file: 'calculated-field-validation.html' },
            { id: 'etl_derived_field_validation', title: "Derived Field Validation", file: 'derived-field-validation.html' },
            { id: 'etl_business_rule_accuracy_validation', title: "Business Rule Validation", file: 'business-rule-accuracy-validation.html' },
            { id: 'etl_currency_conversion_validation', title: "Currency Conversion Validation", file: 'currency-conversion-validation.html' },
            { id: 'etl_date_conversion_validation', title: "Date Conversion Validation", file: 'date-conversion-validation.html' },
            { id: 'etl_numeric_conversion_validation', title: "Numeric Conversion Validation", file: 'numeric-conversion-validation.html' },
            { id: 'etl_aggregated_value_validation', title: "Aggregated Value Validation", file: 'aggregated-value-validation.html' },
            { id: 'etl_lookup_result_validation', title: "Lookup Result Validation", file: 'lookup-result-validation.html' },
            // Module 12: Data Quality Testing
            { id: 'etl_data_quality_accuracy', title: "Accuracy", file: 'data-quality-accuracy.html' },
            { id: 'etl_data_quality_completeness', title: "Completeness", file: 'data-quality-completeness.html' },
            { id: 'etl_data_quality_consistency', title: "Consistency", file: 'data-quality-consistency.html' },
            { id: 'etl_data_quality_validity', title: "Validity", file: 'data-quality-validity.html' },
            { id: 'etl_data_quality_uniqueness', title: "Uniqueness", file: 'data-quality-uniqueness.html' },
            { id: 'etl_data_quality_timeliness', title: "Timeliness", file: 'data-quality-timeliness.html' },
            { id: 'etl_data_quality_integrity', title: "Integrity", file: 'data-quality-integrity.html' },
            { id: 'etl_null_values_testing', title: "Null Values", file: 'null-values-testing.html' },
            { id: 'etl_blank_values', title: "Blank Values", file: 'blank-values.html' },
            { id: 'etl_duplicate_values', title: "Duplicate Values", file: 'duplicate-values.html' },
            { id: 'etl_invalid_values', title: "Invalid Values", file: 'invalid-values.html' },
            { id: 'etl_out_of_range_values', title: "Out-of-Range Values", file: 'out-of-range-values.html' },
            { id: 'etl_incorrect_formats', title: "Incorrect Formats", file: 'incorrect-formats.html' },
            { id: 'etl_invalid_dates', title: "Invalid Dates", file: 'invalid-dates.html' },
            { id: 'etl_invalid_codes', title: "Invalid Codes", file: 'invalid-codes.html' },
            { id: 'etl_invalid_relationships', title: "Invalid Relationships", file: 'invalid-relationships.html' },
            { id: 'etl_orphan_records', title: "Orphan Records", file: 'orphan-records.html' },
            { id: 'etl_unexpected_characters', title: "Unexpected Characters", file: 'unexpected-characters.html' },
            { id: 'etl_truncated_data', title: "Truncated Data", file: 'truncated-data.html' },
            // Module 13: Data Transformation Testing
            { id: 'etl_string_transformations', title: "String Transformations", file: 'string-transformations.html' },
            { id: 'etl_numeric_transformations', title: "Numeric Transformations", file: 'numeric-transformations.html' },
            { id: 'etl_date_transformations', title: "Date Transformations", file: 'date-transformations.html' },
            { id: 'etl_conditional_transformation_testing', title: "Conditional Transformations", file: 'conditional-transformation-testing.html' },
            { id: 'etl_lookup_transformations', title: "Lookup Transformations", file: 'lookup-transformations.html' },
            { id: 'etl_join_transformations', title: "Join Transformations", file: 'join-transformations.html' },
            { id: 'etl_aggregations_testing', title: "Aggregations", file: 'aggregations-testing.html' },
            { id: 'etl_calculations_testing', title: "Calculations", file: 'calculations-testing.html' },
            { id: 'etl_concatenation', title: "Concatenation", file: 'concatenation.html' },
            { id: 'etl_splitting', title: "Splitting", file: 'splitting.html' },
            { id: 'etl_formatting', title: "Formatting", file: 'formatting.html' },
            { id: 'etl_rounding', title: "Rounding", file: 'rounding.html' },
            { id: 'etl_currency_conversion', title: "Currency Conversion", file: 'currency-conversion.html' },
            { id: 'etl_unit_conversion', title: "Unit Conversion", file: 'unit-conversion.html' },
            { id: 'etl_null_handling_transformation', title: "Null Handling", file: 'null-handling-transformation.html' },
            { id: 'etl_default_values_transformation', title: "Default Values", file: 'default-values-transformation.html' },
            { id: 'etl_data_cleansing_testing', title: "Data Cleansing", file: 'data-cleansing-testing.html' },
            { id: 'etl_deduplication_testing', title: "Deduplication", file: 'deduplication-testing.html' },
            { id: 'etl_filtering_transformation', title: "Filtering", file: 'filtering-transformation.html' },
            // Module 14: Incremental Load Testing
            { id: 'etl_full_load_vs_incremental_load', title: "Full Load vs Incremental Load", file: 'full-load-vs-incremental-load.html' },
            { id: 'etl_delta_identification', title: "Delta Identification", file: 'delta-identification.html' },
            { id: 'etl_new_records', title: "New Records", file: 'new-records.html' },
            { id: 'etl_updated_records', title: "Updated Records", file: 'updated-records.html' },
            { id: 'etl_deleted_records', title: "Deleted Records", file: 'deleted-records.html' },
            { id: 'etl_unchanged_records', title: "Unchanged Records", file: 'unchanged-records.html' },
            { id: 'etl_timestamp_based_incremental_load', title: "Timestamp-Based Incremental Load", file: 'timestamp-based-incremental-load.html' },
            { id: 'etl_cdc_based_incremental_load', title: "CDC-Based Incremental Load", file: 'cdc-based-incremental-load.html' },
            { id: 'etl_watermark', title: "Watermark", file: 'watermark.html' },
            { id: 'etl_last_run_timestamp', title: "Last-Run Timestamp", file: 'last-run-timestamp.html' },
            { id: 'etl_duplicate_prevention', title: "Duplicate Prevention", file: 'duplicate-prevention.html' },
            { id: 'etl_incremental_reconciliation', title: "Incremental Reconciliation", file: 'incremental-reconciliation.html' },
            { id: 'etl_multiple_incremental_runs', title: "Multiple Incremental Runs", file: 'multiple-incremental-runs.html' },
            { id: 'etl_late_arriving_data', title: "Late-Arriving Data", file: 'late-arriving-data.html' },
            { id: 'etl_out_of_order_data', title: "Out-of-Order Data", file: 'out-of-order-data.html' },
            // Module 15: Slowly Changing Dimensions (SCD) Testing
            { id: 'etl_scd_type_0_testing', title: "SCD Type 0 Testing", file: 'scd-type-0-testing.html' },
            { id: 'etl_scd_type_1_testing', title: "SCD Type 1 Testing", file: 'scd-type-1-testing.html' },
            { id: 'etl_scd_type_2_testing', title: "SCD Type 2 Testing", file: 'scd-type-2-testing.html' },
            { id: 'etl_scd_type_3_testing', title: "SCD Type 3 Testing", file: 'scd-type-3-testing.html' },
            { id: 'etl_historical_record_validation', title: "Historical Record Validation", file: 'historical-record-validation.html' },
            { id: 'etl_new_record_validation', title: "New Record Validation", file: 'new-record-validation.html' },
            { id: 'etl_updated_record_validation', title: "Updated Record Validation", file: 'updated-record-validation.html' },
            { id: 'etl_effective_date_validation', title: "Effective Date Validation", file: 'effective-date-validation.html' },
            { id: 'etl_expiry_date_validation', title: "Expiry Date Validation", file: 'expiry-date-validation.html' },
            { id: 'etl_current_flag_validation', title: "Current Flag Validation", file: 'current-flag-validation.html' },
            { id: 'etl_version_validation', title: "Version Validation", file: 'version-validation.html' },
            { id: 'etl_duplicate_history_validation', title: "Duplicate History Validation", file: 'duplicate-history-validation.html' },
            { id: 'etl_overlapping_date_validation', title: "Overlapping Date Validation", file: 'overlapping-date-validation.html' },
            { id: 'etl_missing_history_validation', title: "Missing History Validation", file: 'missing-history-validation.html' },
            // Module 16: Data Reconciliation
            { id: 'etl_what_is_reconciliation', title: "What is Reconciliation?", file: 'what-is-reconciliation.html' },
            { id: 'etl_source_vs_target_reconciliation', title: "Source vs Target Reconciliation", file: 'source-vs-target-reconciliation.html' },
            { id: 'etl_count_reconciliation_testing', title: "Count Reconciliation", file: 'count-reconciliation-testing.html' },
            { id: 'etl_sum_reconciliation', title: "Sum Reconciliation", file: 'sum-reconciliation.html' },
            { id: 'etl_hash_reconciliation', title: "Hash Reconciliation", file: 'hash-reconciliation.html' },
            { id: 'etl_column_level_reconciliation', title: "Column-Level Reconciliation", file: 'column-level-reconciliation.html' },
            { id: 'etl_record_level_reconciliation', title: "Record-Level Reconciliation", file: 'record-level-reconciliation.html' },
            { id: 'etl_aggregate_reconciliation', title: "Aggregate Reconciliation", file: 'aggregate-reconciliation.html' },
            { id: 'etl_financial_reconciliation', title: "Financial Reconciliation", file: 'financial-reconciliation.html' },
            { id: 'etl_reconciliation_reports', title: "Reconciliation Reports", file: 'reconciliation-reports.html' },
            { id: 'etl_difference_identification', title: "Difference Identification", file: 'difference-identification.html' },
            { id: 'etl_difference_investigation', title: "Difference Investigation", file: 'difference-investigation.html' },
            { id: 'etl_reconciliation_sql_queries', title: "Reconciliation SQL Queries", file: 'reconciliation-sql-queries.html' },
            // Module 17: ETL Error & Exception Testing
            { id: 'etl_reject_records_testing', title: "Reject Records", file: 'reject-records-testing.html' },
            { id: 'etl_error_records', title: "Error Records", file: 'error-records.html' },
            { id: 'etl_error_tables', title: "Error Tables", file: 'error-tables.html' },
            { id: 'etl_error_logs', title: "Error Logs", file: 'error-logs.html' },
            { id: 'etl_error_messages', title: "Error Messages", file: 'error-messages.html' },
            { id: 'etl_invalid_source_data', title: "Invalid Source Data", file: 'invalid-source-data.html' },
            { id: 'etl_transformation_failures', title: "Transformation Failures", file: 'transformation-failures.html' },
            { id: 'etl_target_failures', title: "Target Failures", file: 'target-failures.html' },
            { id: 'etl_database_failures', title: "Database Failures", file: 'database-failures.html' },
            { id: 'etl_connection_failures', title: "Connection Failures", file: 'connection-failures.html' },
            { id: 'etl_timeout_failures', title: "Timeout Failures", file: 'timeout-failures.html' },
            { id: 'etl_duplicate_failures', title: "Duplicate Failures", file: 'duplicate-failures.html' },
            { id: 'etl_constraint_failures', title: "Constraint Failures", file: 'constraint-failures.html' },
            { id: 'etl_data_type_failures', title: "Data Type Failures", file: 'data-type-failures.html' },
            { id: 'etl_restart_after_failure', title: "Restart After Failure", file: 'restart-after-failure.html' },
            { id: 'etl_recovery_testing_methods', title: "Recovery Testing", file: 'recovery-testing-methods.html' },
            { id: 'etl_partial_load_testing', title: "Partial-Load Testing", file: 'partial-load-testing.html' },
            // Module 18: File-Based ETL Testing
            { id: 'etl_csv_testing', title: "CSV Testing", file: 'csv-testing.html' },
            { id: 'etl_excel_testing', title: "Excel Testing", file: 'excel-testing.html' },
            { id: 'etl_txt_testing', title: "TXT Testing", file: 'txt-testing.html' },
            { id: 'etl_json_testing', title: "JSON Testing", file: 'json-testing.html' },
            { id: 'etl_xml_testing', title: "XML Testing", file: 'xml-testing.html' },
            { id: 'etl_fixed_width_files_testing', title: "Fixed-Width Files", file: 'fixed-width-files-testing.html' },
            { id: 'etl_delimited_files_testing', title: "Delimited Files", file: 'delimited-files-testing.html' },
            { id: 'etl_header_validation', title: "Header Validation", file: 'header-validation.html' },
            { id: 'etl_footer_validation', title: "Footer Validation", file: 'footer-validation.html' },
            { id: 'etl_column_validation', title: "Column Validation", file: 'column-validation.html' },
            { id: 'etl_file_record_count_validation', title: "Record Count", file: 'file-record-count-validation.html' },
            { id: 'etl_file_size_validation', title: "File Size", file: 'file-size-validation.html' },
            { id: 'etl_file_naming_conventions', title: "File Naming Conventions", file: 'file-naming-conventions.html' },
            { id: 'etl_file_format_validation', title: "File Format", file: 'file-format-validation.html' },
            { id: 'etl_file_encoding_validation', title: "Encoding", file: 'file-encoding-validation.html' },
            { id: 'etl_file_special_characters_validation', title: "Special Characters", file: 'file-special-characters-validation.html' },
            { id: 'etl_file_quotes_validation', title: "Quotes", file: 'file-quotes-validation.html' },
            { id: 'etl_file_delimiters_validation', title: "Delimiters", file: 'file-delimiters-validation.html' },
            { id: 'etl_file_line_breaks_validation', title: "Line Breaks", file: 'file-line-breaks-validation.html' },
            { id: 'etl_missing_files_testing', title: "Missing Files", file: 'missing-files-testing.html' },
            { id: 'etl_empty_files_testing', title: "Empty Files", file: 'empty-files-testing.html' },
            { id: 'etl_duplicate_files_testing', title: "Duplicate Files", file: 'duplicate-files-testing.html' },
            { id: 'etl_corrupted_files_testing', title: "Corrupted Files", file: 'corrupted-files-testing.html' },
            { id: 'etl_late_files_testing', title: "Late Files", file: 'late-files-testing.html' },
            { id: 'etl_partial_files_testing', title: "Partial Files", file: 'partial-files-testing.html' },
            // Module 19: Data Warehouse Testing
            { id: 'etl_dimension_testing', title: "Dimension Testing", file: 'dimension-testing.html' },
            { id: 'etl_fact_testing', title: "Fact Testing", file: 'fact-testing.html' },
            { id: 'etl_fact_dimension_relationships_testing', title: "Fact-Dimension Relationships", file: 'fact-dimension-relationships-testing.html' },
            { id: 'etl_grain_validation', title: "Grain Validation", file: 'grain-validation.html' },
            { id: 'etl_surrogate_key_validation', title: "Surrogate Key Validation", file: 'surrogate-key-validation.html' },
            { id: 'etl_foreign_key_validation', title: "Foreign Key Validation", file: 'foreign-key-validation.html' },
            { id: 'etl_referential_integrity_validation', title: "Referential Integrity", file: 'referential-integrity-validation.html' },
            { id: 'etl_hierarchy_validation', title: "Hierarchy Validation", file: 'hierarchy-validation.html' },
            { id: 'etl_aggregation_validation', title: "Aggregation Validation", file: 'aggregation-validation.html' },
            { id: 'etl_snapshot_validation', title: "Snapshot Validation", file: 'snapshot-validation.html' },
            { id: 'etl_historical_data_validation', title: "Historical Data Validation", file: 'historical-data-validation.html' },
            { id: 'etl_scd_testing_overview', title: "SCD Testing", file: 'scd-testing-overview.html' },
            { id: 'etl_data_mart_testing', title: "Data Mart Testing", file: 'data-mart-testing.html' },
            { id: 'etl_reporting_layer_testing', title: "Reporting Layer Testing", file: 'reporting-layer-testing.html' },
            // Module 20: Database Testing
            { id: 'etl_database_functional_testing', title: "Database Functional Testing", file: 'database-functional-testing.html' },
            { id: 'etl_database_schema_testing', title: "Schema Testing", file: 'database-schema-testing.html' },
            { id: 'etl_database_table_testing', title: "Table Testing", file: 'database-table-testing.html' },
            { id: 'etl_database_column_testing', title: "Column Testing", file: 'database-column-testing.html' },
            { id: 'etl_database_data_type_testing', title: "Data Type Testing", file: 'database-data-type-testing.html' },
            { id: 'etl_database_constraint_testing', title: "Constraint Testing", file: 'database-constraint-testing.html' },
            { id: 'etl_primary_key_testing', title: "Primary Key Testing", file: 'primary-key-testing.html' },
            { id: 'etl_foreign_key_testing', title: "Foreign Key Testing", file: 'foreign-key-testing.html' },
            { id: 'etl_index_testing', title: "Index Testing", file: 'index-testing.html' },
            { id: 'etl_view_testing', title: "View Testing", file: 'view-testing.html' },
            { id: 'etl_stored_procedure_testing', title: "Stored Procedure Testing", file: 'stored-procedure-testing.html' },
            { id: 'etl_function_testing', title: "Function Testing", file: 'function-testing.html' },
            { id: 'etl_trigger_testing', title: "Trigger Testing", file: 'trigger-testing.html' },
            { id: 'etl_database_data_integrity_testing', title: "Data Integrity", file: 'database-data-integrity-testing.html' },
            { id: 'etl_database_referential_integrity_testing', title: "Referential Integrity", file: 'database-referential-integrity-testing.html' },
            { id: 'etl_database_performance_basics', title: "Database Performance Basics", file: 'database-performance-basics.html' },
            // Module 21: Data Lineage
            { id: 'etl_what_is_data_lineage', title: "What is Data Lineage?", file: 'what-is-data-lineage.html' },
            { id: 'etl_source_to_target_lineage', title: "Source-to-Target Lineage", file: 'source-to-target-lineage.html' },
            { id: 'etl_column_level_lineage', title: "Column-Level Lineage", file: 'column-level-lineage.html' },
            { id: 'etl_table_level_lineage', title: "Table-Level Lineage", file: 'table-level-lineage.html' },
            { id: 'etl_transformation_lineage', title: "Transformation Lineage", file: 'transformation-lineage.html' },
            { id: 'etl_business_lineage', title: "Business Lineage", file: 'business-lineage.html' },
            { id: 'etl_technical_lineage', title: "Technical Lineage", file: 'technical-lineage.html' },
            { id: 'etl_upstream_dependencies', title: "Upstream Dependencies", file: 'upstream-dependencies.html' },
            { id: 'etl_downstream_dependencies', title: "Downstream Dependencies", file: 'downstream-dependencies.html' },
            { id: 'etl_impact_analysis', title: "Impact Analysis", file: 'impact-analysis.html' },
            { id: 'etl_lineage_validation', title: "Lineage Validation", file: 'lineage-validation.html' },
            // Module 22: Metadata Testing
            { id: 'etl_what_is_metadata', title: "What is Metadata?", file: 'what-is-metadata.html' },
            { id: 'etl_technical_metadata_testing', title: "Technical Metadata", file: 'technical-metadata-testing.html' },
            { id: 'etl_business_metadata_testing', title: "Business Metadata", file: 'business-metadata-testing.html' },
            { id: 'etl_operational_metadata_testing', title: "Operational Metadata", file: 'operational-metadata-testing.html' },
            { id: 'etl_schema_metadata_testing', title: "Schema Metadata", file: 'schema-metadata-testing.html' },
            { id: 'etl_column_metadata_testing', title: "Column Metadata", file: 'column-metadata-testing.html' },
            { id: 'etl_data_type_metadata_testing', title: "Data Type Metadata", file: 'data-type-metadata-testing.html' },
            { id: 'etl_data_lineage_metadata_testing', title: "Data Lineage Metadata", file: 'data-lineage-metadata-testing.html' },
            { id: 'etl_metadata_validation', title: "Metadata Validation", file: 'metadata-validation.html' },
            { id: 'etl_schema_changes_testing', title: "Schema Changes", file: 'schema-changes-testing.html' },
            { id: 'etl_schema_evolution_testing', title: "Schema Evolution", file: 'schema-evolution-testing.html' },
            // Module 23: Schema Testing
            { id: 'etl_schema_comparison', title: "Schema Comparison", file: 'schema-comparison.html' },
            { id: 'etl_schema_column_comparison', title: "Column Comparison", file: 'schema-column-comparison.html' },
            { id: 'etl_schema_data_type_comparison', title: "Data Type Comparison", file: 'schema-data-type-comparison.html' },
            { id: 'etl_schema_length_comparison', title: "Length Comparison", file: 'schema-length-comparison.html' },
            { id: 'etl_schema_precision_testing', title: "Precision", file: 'schema-precision-testing.html' },
            { id: 'etl_schema_scale_testing', title: "Scale", file: 'schema-scale-testing.html' },
            { id: 'etl_schema_nullable_property_testing', title: "Nullable Property", file: 'schema-nullable-property-testing.html' },
            { id: 'etl_schema_primary_keys_testing', title: "Primary Keys", file: 'schema-primary-keys-testing.html' },
            { id: 'etl_schema_foreign_keys_testing', title: "Foreign Keys", file: 'schema-foreign-keys-testing.html' },
            { id: 'etl_schema_new_columns_testing', title: "New Columns", file: 'schema-new-columns-testing.html' },
            { id: 'etl_schema_removed_columns_testing', title: "Removed Columns", file: 'schema-removed-columns-testing.html' },
            { id: 'etl_schema_renamed_columns_testing', title: "Renamed Columns", file: 'schema-renamed-columns-testing.html' },
            { id: 'etl_schema_evolution_architecture', title: "Schema Evolution", file: 'schema-evolution-architecture.html' },
            { id: 'etl_schema_backward_compatibility', title: "Backward Compatibility", file: 'schema-backward-compatibility.html' },
            // Module 24: Regression Testing
            { id: 'etl_what_is_regression_testing', title: "What is Regression Testing?", file: 'what-is-regression-testing.html' },
            { id: 'etl_regression_testing', title: "ETL Regression Testing", file: 'etl-regression-testing.html' },
            { id: 'etl_data_regression_testing', title: "Data Regression Testing", file: 'data-regression-testing.html' },
            { id: 'etl_pipeline_regression_testing', title: "Pipeline Regression", file: 'pipeline-regression-testing.html' },
            { id: 'etl_schema_regression_testing', title: "Schema Regression", file: 'schema-regression-testing.html' },
            { id: 'etl_business_rule_regression_testing', title: "Business-Rule Regression", file: 'business-rule-regression-testing.html' },
            { id: 'etl_incremental_regression_testing', title: "Incremental Regression", file: 'incremental-regression-testing.html' },
            { id: 'etl_historical_data_regression_testing', title: "Historical Data Regression", file: 'historical-data-regression-testing.html' },
            { id: 'etl_automated_regression_testing', title: "Automated Regression", file: 'automated-regression-testing.html' },
            { id: 'etl_regression_test_suite', title: "Regression Test Suite", file: 'regression-test-suite.html' },
            // Module 25: Test Data Management
            { id: 'etl_test_data_creation', title: "Test Data Creation", file: 'test-data-creation.html' },
            { id: 'etl_test_data_preparation', title: "Test Data Preparation", file: 'test-data-preparation.html' },
            { id: 'etl_test_data_selection', title: "Test Data Selection", file: 'test-data-selection.html' },
            { id: 'etl_positive_test_data', title: "Positive Test Data", file: 'positive-test-data.html' },
            { id: 'etl_negative_test_data', title: "Negative Test Data", file: 'negative-test-data.html' },
            { id: 'etl_boundary_test_data', title: "Boundary Test Data", file: 'boundary-test-data.html' },
            { id: 'etl_large_volume_test_data', title: "Large-Volume Data", file: 'large-volume-test-data.html' },
            { id: 'etl_duplicate_test_data', title: "Duplicate Data", file: 'duplicate-test-data.html' },
            { id: 'etl_null_test_data', title: "Null Data", file: 'null-test-data.html' },
            { id: 'etl_invalid_test_data', title: "Invalid Data", file: 'invalid-test-data.html' },
            { id: 'etl_historical_test_data', title: "Historical Data", file: 'historical-test-data.html' },
            { id: 'etl_incremental_test_data', title: "Incremental Data", file: 'incremental-test-data.html' },
            { id: 'etl_synthetic_test_data', title: "Synthetic Data", file: 'synthetic-test-data.html' },
            { id: 'etl_masked_production_data', title: "Masked Production Data", file: 'masked-production-data.html' },
            { id: 'etl_data_refresh_management', title: "Data Refresh", file: 'data-refresh-management.html' },
            { id: 'etl_test_environment_data', title: "Test Environment Data", file: 'test-environment-data.html' },
            // Module 26: ETL Test Cases
            { id: 'etl_source_validation_test_cases', title: "Source Validation", file: 'source-validation-test-cases.html' },
            { id: 'etl_target_validation_test_cases', title: "Target Validation", file: 'target-validation-test-cases.html' },
            { id: 'etl_count_validation_test_cases', title: "Count Validation", file: 'count-validation-test-cases.html' },
            { id: 'etl_transformation_validation_test_cases', title: "Transformation Validation", file: 'transformation-validation-test-cases.html' },
            { id: 'etl_null_validation_test_cases', title: "Null Validation", file: 'null-validation-test-cases.html' },
            { id: 'etl_duplicate_validation_test_cases', title: "Duplicate Validation", file: 'duplicate-validation-test-cases.html' },
            { id: 'etl_data_type_validation_test_cases', title: "Data Type Validation", file: 'data-type-validation-test-cases.html' },
            { id: 'etl_business_rule_validation_test_cases', title: "Business Rule Validation", file: 'business-rule-validation-test-cases.html' },
            { id: 'etl_lookup_validation_test_cases', title: "Lookup Validation", file: 'lookup-validation-test-cases.html' },
            { id: 'etl_join_validation_test_cases', title: "Join Validation", file: 'join-validation-test-cases.html' },
            { id: 'etl_aggregation_validation_test_cases', title: "Aggregation Validation", file: 'aggregation-validation-test-cases.html' },
            { id: 'etl_incremental_load_test_cases', title: "Incremental Load", file: 'incremental-load-test-cases.html' },
            { id: 'etl_full_load_test_cases', title: "Full Load", file: 'full-load-test-cases.html' },
            { id: 'etl_scd_test_cases', title: "SCD", file: 'scd-test-cases.html' },
            { id: 'etl_error_handling_test_cases', title: "Error Handling", file: 'error-handling-test-cases.html' },
            { id: 'etl_reject_records_test_cases', title: "Reject Records", file: 'reject-records-test-cases.html' },
            { id: 'etl_job_execution_test_cases', title: "Job Execution", file: 'job-execution-test-cases.html' },
            { id: 'etl_scheduling_test_cases', title: "Scheduling", file: 'scheduling-test-cases.html' },
            { id: 'etl_performance_test_cases', title: "Performance", file: 'performance-test-cases.html' },
            { id: 'etl_recovery_test_cases', title: "Recovery", file: 'recovery-test-cases.html' },
            { id: 'etl_restartability_test_cases', title: "Restartability", file: 'restartability-test-cases.html' },
            // Module 27: Defect Management
            { id: 'etl_what_is_a_defect', title: "What is a Defect?", file: 'what-is-a-defect.html' },
            { id: 'etl_defect_management_lifecycle', title: "Defect Lifecycle", file: 'defect-management-lifecycle.html' },
            { id: 'etl_defect_severity', title: "Severity", file: 'defect-severity.html' },
            { id: 'etl_defect_priority', title: "Priority", file: 'defect-priority.html' },
            { id: 'etl_defect_title_writing', title: "Defect Title", file: 'defect-title-writing.html' },
            { id: 'etl_defect_description_writing', title: "Description", file: 'defect-description-writing.html' },
            { id: 'etl_defect_steps_to_reproduce', title: "Steps to Reproduce", file: 'defect-steps-to-reproduce.html' },
            { id: 'etl_defect_expected_result', title: "Expected Result", file: 'defect-expected-result.html' },
            { id: 'etl_defect_actual_result', title: "Actual Result", file: 'defect-actual-result.html' },
            { id: 'etl_defect_evidence_gathering', title: "Evidence", file: 'defect-evidence-gathering.html' },
            { id: 'etl_defect_sql_evidence', title: "SQL Evidence", file: 'defect-sql-evidence.html' },
            { id: 'etl_defect_logs_evidence', title: "Logs", file: 'defect-logs-evidence.html' },
            { id: 'etl_defect_screenshots_evidence', title: "Screenshots", file: 'defect-screenshots-evidence.html' },
            { id: 'etl_defect_root_cause_analysis', title: "Root Cause", file: 'defect-root-cause-analysis.html' },
            { id: 'etl_defect_retesting', title: "Retesting", file: 'defect-retesting.html' },
            { id: 'etl_defect_regression_testing', title: "Regression", file: 'defect-regression-testing.html' },
            { id: 'etl_defect_closure', title: "Defect Closure", file: 'defect-closure.html' },
            { id: 'etl_duplicate_defect_handling', title: "Duplicate Defect", file: 'duplicate-defect-handling.html' },
            { id: 'etl_reopened_defect_handling', title: "Reopened Defect", file: 'reopened-defect-handling.html' },
            // Module 28: Data Migration Testing
            { id: 'etl_what_is_data_migration', title: "What is Data Migration?", file: 'what-is-data-migration.html' },
            { id: 'etl_migration_strategy', title: "Migration Strategy", file: 'migration-strategy.html' },
            { id: 'etl_migration_source_system', title: "Source System", file: 'migration-source-system.html' },
            { id: 'etl_migration_legacy_system', title: "Legacy System", file: 'migration-legacy-system.html' },
            { id: 'etl_migration_target_system', title: "Target System", file: 'migration-target-system.html' },
            { id: 'etl_migration_mapping', title: "Mapping", file: 'migration-mapping.html' },
            { id: 'etl_migration_transformation', title: "Transformation", file: 'migration-transformation.html' },
            { id: 'etl_migration_validation', title: "Migration Validation", file: 'migration-validation.html' },
            { id: 'etl_migration_record_count', title: "Record Count", file: 'migration-record-count.html' },
            { id: 'etl_migration_data_comparison', title: "Data Comparison", file: 'migration-data-comparison.html' },
            { id: 'etl_migration_data_integrity', title: "Data Integrity", file: 'migration-data-integrity.html' },
            { id: 'etl_migration_historical_data', title: "Historical Data", file: 'migration-historical-data.html' },
            { id: 'etl_migration_referential_integrity', title: "Referential Integrity", file: 'migration-referential-integrity.html' },
            { id: 'etl_migration_duplicate_validation', title: "Duplicate Validation", file: 'migration-duplicate-validation.html' },
            { id: 'etl_migration_reconciliation', title: "Reconciliation", file: 'migration-reconciliation.html' },
            { id: 'etl_migration_performance', title: "Migration Performance", file: 'migration-performance.html' },
            { id: 'etl_migration_rollback', title: "Migration Rollback", file: 'migration-rollback.html' },
            { id: 'etl_migration_cutover', title: "Cutover", file: 'migration-cutover.html' },
            { id: 'etl_post_migration_validation', title: "Post-Migration Validation", file: 'post-migration-validation.html' },
            // Module 29: Agile & Software Testing Fundamentals
            { id: 'etl_sdlc_fundamentals', title: "SDLC", file: 'sdlc-fundamentals.html' },
            { id: 'etl_stlc_fundamentals', title: "STLC", file: 'stlc-fundamentals.html' },
            { id: 'etl_agile_methodology', title: "Agile", file: 'agile-methodology.html' },
            { id: 'etl_scrum_framework', title: "Scrum", file: 'scrum-framework.html' },
            { id: 'etl_sprint_cycle', title: "Sprint", file: 'sprint-cycle.html' },
            { id: 'etl_product_backlog', title: "Product Backlog", file: 'product-backlog.html' },
            { id: 'etl_user_story_structure', title: "User Story", file: 'user-story-structure.html' },
            { id: 'etl_acceptance_criteria', title: "Acceptance Criteria", file: 'acceptance-criteria.html' },
            { id: 'etl_epic_management', title: "Epic", file: 'epic-management.html' },
            { id: 'etl_task_tracking', title: "Task", file: 'task-tracking.html' },
            { id: 'etl_bug_fundamentals', title: "Bug", file: 'bug-fundamentals.html' },
            { id: 'etl_daily_standup_meeting', title: "Daily Stand-up", file: 'daily-standup-meeting.html' },
            { id: 'etl_sprint_planning_meeting', title: "Sprint Planning", file: 'sprint-planning-meeting.html' },
            { id: 'etl_sprint_review_meeting', title: "Sprint Review", file: 'sprint-review-meeting.html' },
            { id: 'etl_retrospective_meeting', title: "Retrospective", file: 'retrospective-meeting.html' },
            { id: 'etl_quality_assurance_qa', title: "QA", file: 'quality-assurance-qa.html' },
            { id: 'etl_quality_control_qc', title: "QC", file: 'quality-control-qc.html' },
            { id: 'etl_verification_process', title: "Verification", file: 'verification-process.html' },
            { id: 'etl_validation_process', title: "Validation", file: 'validation-process.html' },
            { id: 'etl_test_scenario_fundamentals', title: "Test Scenario", file: 'test-scenario-fundamentals.html' },
            { id: 'etl_test_case_fundamentals', title: "Test Case", file: 'test-case-fundamentals.html' },
            { id: 'etl_test_execution_fundamentals', title: "Test Execution", file: 'test-execution-fundamentals.html' },
            { id: 'etl_agile_defect_lifecycle', title: "Defect Lifecycle", file: 'agile-defect-lifecycle.html' },
            // Module 30: ETL Testing Documentation
            { id: 'etl_requirement_document', title: "Requirement Document", file: 'requirement-document.html' },
            { id: 'etl_source_to_target_mapping_doc', title: "Source-to-Target Mapping Document", file: 'source-to-target-mapping-doc.html' },
            { id: 'etl_data_mapping_document', title: "Data Mapping Document", file: 'data-mapping-document.html' },
            { id: 'etl_test_strategy_document', title: "Test Strategy", file: 'test-strategy-document.html' },
            { id: 'etl_test_plan_document', title: "Test Plan", file: 'test-plan-document.html' },
            { id: 'etl_test_scenarios_document', title: "Test Scenarios", file: 'test-scenarios-document.html' },
            { id: 'etl_test_cases_document', title: "Test Cases", file: 'test-cases-document.html' },
            { id: 'etl_test_data_document', title: "Test Data", file: 'test-data-document.html' },
            { id: 'etl_traceability_matrix', title: "Traceability Matrix", file: 'traceability-matrix.html' },
            { id: 'etl_defect_report_document', title: "Defect Report", file: 'defect-report-document.html' },
            { id: 'etl_test_execution_report_document', title: "Test Execution Report", file: 'test-execution-report-document.html' },
            { id: 'etl_test_summary_report_document', title: "Test Summary Report", file: 'test-summary-report-document.html' },
            { id: 'etl_reconciliation_report_document', title: "Reconciliation Report", file: 'reconciliation-report-document.html' },
            { id: 'etl_data_quality_report_document', title: "Data-Quality Report", file: 'data-quality-report-document.html' },
            { id: 'etl_production_validation_report', title: "Production Validation Report", file: 'production-validation-report.html' },
            // Module 31: Enterprise Architecture References & Dictionaries
            { id: 'etl_structured_vs_semi_structured_vs_unstructured_data', title: "Structured vs Semi-Structured vs Unstructured Data Reference", file: 'structured-vs-semi-structured-vs-unstructured-data.html' },
            // Module 32: Quality Assessments & Certification
            { id: 'etl_sql_sql_basics', title: "SQL Basics QA Certification Test (15 Questions \u00b7 Timed)", file: '../sql/tests/sql_basics.html' },
            { id: 'etl_sql_coding_test', title: "Data Validation Coding Test (Query Evaluation)", file: '../sql/tests/coding_test.html' },
            { id: 'etl_sql_index', title: "All Assessment Tracks &amp; Testing Rules", file: '../sql/tests/index.html' },
            { id: 'etl_Leaderboard', title: "Official EDMITH Leaderboard &amp; Rankings", file: '../Leaderboard.html' },
        ]
    },
    c_programming: {
        id: 'c_programming',
        title: 'C Programming',
        module: 'Modules 1–15: Complete Beginner-to-Advanced C Programming Mastery',
        icon: 'fas fa-c',
        url: 'c/index.html',
        firstLessonUrl: 'c/what-is-programming.html',
        totalLessons: 290,
        lessons: [
            // Module 1: Programming Fundamentals
            { id: 'c_what_is_programming', title: "What is Programming?", file: 'what-is-programming.html' },
            { id: 'c_what_is_a_programming_language', title: "What is a Programming Language?", file: 'what-is-a-programming-language.html' },
            { id: 'c_compiler_vs_interpreter', title: "Compiler vs Interpreter", file: 'compiler-vs-interpreter.html' },
            { id: 'c_source_object_executable_code', title: "Source Code, Object Code, Executable Code", file: 'source-object-executable-code.html' },
            { id: 'c_how_a_c_program_works', title: "How a C Program Works", file: 'how-a-c-program-works.html' },
            { id: 'c_c_compilation_process', title: "C Compilation Process", file: 'c-compilation-process.html' },
            { id: 'c_c_program_execution_flow', title: "C Program Execution Flow", file: 'c-program-execution-flow.html' },
            { id: 'c_basic_problem_solving_approach', title: "Basic Problem-Solving Approach", file: 'basic-problem-solving-approach.html' },
            { id: 'c_algorithms', title: "Algorithms", file: 'algorithms.html' },
            { id: 'c_flowcharts', title: "Flowcharts", file: 'flowcharts.html' },
            { id: 'c_pseudocode', title: "Pseudocode", file: 'pseudocode.html' },
            { id: 'c_variables_and_data', title: "Variables and Data", file: 'variables-and-data.html' },
            { id: 'c_input_processing_output', title: "Input → Processing → Output", file: 'input-processing-output.html' },
            { id: 'c_debugging_fundamentals', title: "Debugging Fundamentals", file: 'debugging-fundamentals.html' },
            { id: 'c_syntax_errors', title: "Syntax Errors", file: 'syntax-errors.html' },
            { id: 'c_runtime_errors', title: "Runtime Errors", file: 'runtime-errors.html' },
            { id: 'c_logical_errors', title: "Logical Errors", file: 'logical-errors.html' },
            // Module 2: Introduction to C
            { id: 'c_history_of_c', title: "History of C", file: 'history-of-c.html' },
            { id: 'c_features_of_c', title: "Features of C", file: 'features-of-c.html' },
            { id: 'c_applications_of_c', title: "Applications of C", file: 'applications-of-c.html' },
            { id: 'c_c_standards', title: "C Standards", file: 'c-standards.html' },
            { id: 'c_c89_c90_standard', title: "C89/C90 Standard", file: 'c89-c90-standard.html' },
            { id: 'c_c99_standard', title: "C99 Standard", file: 'c99-standard.html' },
            { id: 'c_c11_standard', title: "C11 Standard", file: 'c11-standard.html' },
            { id: 'c_c17_standard', title: "C17 Standard", file: 'c17-standard.html' },
            { id: 'c_c23_standard', title: "C23 Standard", file: 'c23-standard.html' },
            { id: 'c_structure_of_a_c_program', title: "Structure of a C Program", file: 'structure-of-a-c-program.html' },
            { id: 'c_main_function', title: "main() Function", file: 'main-function.html' },
            { id: 'c_header_files', title: "Header Files", file: 'header-files.html' },
            { id: 'c_preprocessor_directives', title: "Preprocessor Directives", file: 'preprocessor-directives.html' },
            { id: 'c_comments', title: "Comments", file: 'comments.html' },
            { id: 'c_statements', title: "Statements", file: 'statements.html' },
            { id: 'c_blocks', title: "Blocks", file: 'blocks.html' },
            { id: 'c_identifiers', title: "Identifiers", file: 'identifiers.html' },
            { id: 'c_keywords', title: "Keywords", file: 'keywords.html' },
            { id: 'c_naming_conventions', title: "Naming Conventions", file: 'naming-conventions.html' },
            { id: 'c_case_sensitivity', title: "Case Sensitivity", file: 'case-sensitivity.html' },
            // Module 3: Setting Up C
            { id: 'c_installing_a_c_compiler', title: "Installing a C Compiler", file: 'installing-a-c-compiler.html' },
            { id: 'c_gcc_compiler', title: "GCC Compiler", file: 'gcc-compiler.html' },
            { id: 'c_clang_compiler', title: "Clang Compiler", file: 'clang-compiler.html' },
            { id: 'c_msvc_compiler', title: "MSVC Compiler", file: 'msvc-compiler.html' },
            { id: 'c_ides_and_editors', title: "IDEs and Editors", file: 'ides-and-editors.html' },
            { id: 'c_compiling_from_command_line', title: "Compiling from Command Line", file: 'compiling-from-command-line.html' },
            { id: 'c_running_c_programs', title: "Running C Programs", file: 'running-c-programs.html' },
            { id: 'c_compile_link_runtime', title: "Compile-Time vs Link-Time vs Runtime", file: 'compile-link-runtime.html' },
            { id: 'c_compiler_warnings', title: "Compiler Warnings", file: 'compiler-warnings.html' },
            { id: 'c_strict_compilation_flags', title: "Strict Compilation Flags", file: 'strict-compilation-flags.html' },
            { id: 'c_debug_vs_release_builds', title: "Debug Builds vs Release Builds", file: 'debug-vs-release-builds.html' },
            // Module 4: Basic Syntax
            { id: 'c_include_directive', title: "#include Directive", file: 'include-directive.html' },
            { id: 'c_define_directive', title: "#define Directive", file: 'define-directive.html' },
            { id: 'c_main_syntax', title: "main() Syntax", file: 'main-syntax.html' },
            { id: 'c_braces', title: "Braces { }", file: 'braces.html' },
            { id: 'c_semicolon', title: "Semicolon ;", file: 'semicolon.html' },
            { id: 'c_comma_syntax', title: "Comma ,", file: 'comma-syntax.html' },
            { id: 'c_parentheses', title: "Parentheses ( )", file: 'parentheses.html' },
            { id: 'c_square_brackets', title: "Square Brackets [ ]", file: 'square-brackets.html' },
            { id: 'c_syntax_comments', title: "Comments in C", file: 'syntax-comments.html' },
            { id: 'c_escape_sequences', title: "Escape Sequences", file: 'escape-sequences.html' },
            { id: 'c_whitespace', title: "Whitespace", file: 'whitespace.html' },
            { id: 'c_statements_and_expressions', title: "Statements and Expressions", file: 'statements-and-expressions.html' },
            // Module 5: Variables and Constants
            { id: 'c_variable_declaration', title: "Variable Declaration", file: 'variable-declaration.html' },
            { id: 'c_variable_initialization', title: "Variable Initialization", file: 'variable-initialization.html' },
            { id: 'c_variable_assignment', title: "Variable Assignment", file: 'variable-assignment.html' },
            { id: 'c_multiple_variable_declarations', title: "Multiple Variable Declarations", file: 'multiple-variable-declarations.html' },
            { id: 'c_constants', title: "Constants", file: 'constants.html' },
            { id: 'c_literal_values', title: "Literal Values", file: 'literal-values.html' },
            { id: 'c_integer_constants', title: "Integer Constants", file: 'integer-constants.html' },
            { id: 'c_floating_point_constants', title: "Floating-Point Constants", file: 'floating-point-constants.html' },
            { id: 'c_character_constants', title: "Character Constants", file: 'character-constants.html' },
            { id: 'c_string_literals_constant', title: "String Literals", file: 'string-literals-constant.html' },
            { id: 'c_const_qualifier', title: "const Qualifier", file: 'const-qualifier.html' },
            { id: 'c_define_constants', title: "#define Constants", file: 'define-constants.html' },
            { id: 'c_scope_of_variables', title: "Scope of Variables", file: 'scope-of-variables.html' },
            { id: 'c_lifetime_of_variables', title: "Lifetime of Variables", file: 'lifetime-of-variables.html' },
            // Module 6: C Data Types
            { id: 'c_fundamental_data_types', title: "Fundamental Data Types", file: 'fundamental-data-types.html' },
            { id: 'c_char_data_type', title: "char Data Type", file: 'char-data-type.html' },
            { id: 'c_signed_char', title: "signed char", file: 'signed-char.html' },
            { id: 'c_unsigned_char', title: "unsigned char", file: 'unsigned-char.html' },
            { id: 'c_short_data_type', title: "short Data Type", file: 'short-data-type.html' },
            { id: 'c_unsigned_short', title: "unsigned short", file: 'unsigned-short.html' },
            { id: 'c_int_data_type', title: "int Data Type", file: 'int-data-type.html' },
            { id: 'c_unsigned_int', title: "unsigned int", file: 'unsigned-int.html' },
            { id: 'c_long_data_type', title: "long Data Type", file: 'long-data-type.html' },
            { id: 'c_unsigned_long', title: "unsigned long", file: 'unsigned-long.html' },
            { id: 'c_long_long_data_type', title: "long long Data Type", file: 'long-long-data-type.html' },
            { id: 'c_unsigned_long_long', title: "unsigned long long", file: 'unsigned-long-long.html' },
            { id: 'c_float_data_type', title: "float Data Type", file: 'float-data-type.html' },
            { id: 'c_double_data_type', title: "double Data Type", file: 'double-data-type.html' },
            { id: 'c_long_double_data_type', title: "long double", file: 'long-double-data-type.html' },
            { id: 'c_bool_data_type', title: "_Bool Data Type", file: 'bool-data-type.html' },
            { id: 'c_void_data_type', title: "void Data Type", file: 'void-data-type.html' },
            { id: 'c_integer_types', title: "Integer Types", file: 'integer-types.html' },
            { id: 'c_floating_point_types', title: "Floating-Point Types", file: 'floating-point-types.html' },
            { id: 'c_signed_vs_unsigned', title: "Signed vs Unsigned", file: 'signed-vs-unsigned.html' },
            { id: 'c_type_ranges', title: "Type Ranges", file: 'type-ranges.html' },
            { id: 'c_sizeof_operator_type', title: "sizeof Operator", file: 'sizeof-operator-type.html' },
            { id: 'c_implementation_defined_sizes', title: "Implementation-Defined Sizes", file: 'implementation-defined-sizes.html' },
            { id: 'c_fixed_width_integer_types', title: "Fixed-Width Integer Types", file: 'fixed-width-integer-types.html' },
            { id: 'c_int8_t', title: "int8_t", file: 'int8-t.html' },
            { id: 'c_int16_t', title: "int16_t", file: 'int16-t.html' },
            { id: 'c_int32_t', title: "int32_t", file: 'int32-t.html' },
            { id: 'c_int64_t', title: "int64_t", file: 'int64-t.html' },
            { id: 'c_uint8_t', title: "uint8_t", file: 'uint8-t.html' },
            { id: 'c_uint16_t', title: "uint16_t", file: 'uint16-t.html' },
            { id: 'c_uint32_t', title: "uint32_t", file: 'uint32-t.html' },
            { id: 'c_uint64_t', title: "uint64_t", file: 'uint64-t.html' },
            // Module 7: Input and Output
            { id: 'c_printf_function', title: "printf() Function", file: 'printf-function.html' },
            { id: 'c_scanf_function', title: "scanf() Function", file: 'scanf-function.html' },
            { id: 'c_getchar_function', title: "getchar() Function", file: 'getchar-function.html' },
            { id: 'c_putchar_function', title: "putchar() Function", file: 'putchar-function.html' },
            { id: 'c_fgets_function', title: "fgets() Function", file: 'fgets-function.html' },
            { id: 'c_puts_function', title: "puts() Function", file: 'puts-function.html' },
            { id: 'c_format_specifiers', title: "Format Specifiers", file: 'format-specifiers.html' },
            { id: 'c_specifier_d', title: "%d Format Specifier", file: 'specifier-d.html' },
            { id: 'c_specifier_i', title: "%i Format Specifier", file: 'specifier-i.html' },
            { id: 'c_specifier_u', title: "%u Format Specifier", file: 'specifier-u.html' },
            { id: 'c_specifier_f', title: "%f Format Specifier", file: 'specifier-f.html' },
            { id: 'c_specifier_lf', title: "%lf Format Specifier", file: 'specifier-lf.html' },
            { id: 'c_specifier_c', title: "%c Format Specifier", file: 'specifier-c.html' },
            { id: 'c_specifier_s', title: "%s Format Specifier", file: 'specifier-s.html' },
            { id: 'c_specifier_x', title: "%x Format Specifier", file: 'specifier-x.html' },
            { id: 'c_specifier_uppercase_x', title: "%X Format Specifier", file: 'specifier-uppercase-x.html' },
            { id: 'c_specifier_o', title: "%o Format Specifier", file: 'specifier-o.html' },
            { id: 'c_specifier_p', title: "%p Format Specifier", file: 'specifier-p.html' },
            { id: 'c_specifier_lld', title: "%lld Format Specifier", file: 'specifier-lld.html' },
            { id: 'c_specifier_zu', title: "%zu Format Specifier", file: 'specifier-zu.html' },
            { id: 'c_width_and_precision', title: "Width and Precision", file: 'width-and-precision.html' },
            { id: 'c_io_escape_sequences', title: "Escape Sequences in I/O", file: 'io-escape-sequences.html' },
            { id: 'c_formatted_output', title: "Formatted Output", file: 'formatted-output.html' },
            { id: 'c_formatted_input', title: "Formatted Input", file: 'formatted-input.html' },
            { id: 'c_input_buffering', title: "Input Buffering", file: 'input-buffering.html' },
            { id: 'c_common_scanf_problems', title: "Common scanf() Problems", file: 'common-scanf-problems.html' },
            // Module 8: Operators
            { id: 'c_arithmetic_operators', title: "Arithmetic Operators", file: 'arithmetic-operators.html' },
            { id: 'c_operator_addition', title: "Addition Operator +", file: 'operator-addition.html' },
            { id: 'c_operator_subtraction', title: "Subtraction Operator -", file: 'operator-subtraction.html' },
            { id: 'c_operator_multiplication', title: "Multiplication Operator *", file: 'operator-multiplication.html' },
            { id: 'c_operator_division', title: "Division Operator /", file: 'operator-division.html' },
            { id: 'c_operator_modulo', title: "Modulo Operator %", file: 'operator-modulo.html' },
            { id: 'c_relational_operators', title: "Relational Operators", file: 'relational-operators.html' },
            { id: 'c_operators_less_greater', title: "Less Than < and Greater Than >", file: 'operators-less-greater.html' },
            { id: 'c_operators_less_greater_equal', title: "Less Than or Equal <= and Greater Than or Equal >=", file: 'operators-less-greater-equal.html' },
            { id: 'c_operator_equality', title: "Equality Operator ==", file: 'operator-equality.html' },
            { id: 'c_operator_inequality', title: "Inequality Operator !=", file: 'operator-inequality.html' },
            { id: 'c_logical_operators', title: "Logical Operators", file: 'logical-operators.html' },
            { id: 'c_operator_logical_and', title: "Logical AND &&", file: 'operator-logical-and.html' },
            { id: 'c_operator_logical_or', title: "Logical OR ||", file: 'operator-logical-or.html' },
            { id: 'c_operator_logical_not', title: "Logical NOT !", file: 'operator-logical-not.html' },
            { id: 'c_assignment_operators', title: "Assignment Operators", file: 'assignment-operators.html' },
            { id: 'c_compound_assignment_operators', title: "Compound Assignment Operators", file: 'compound-assignment-operators.html' },
            { id: 'c_bitwise_operators', title: "Bitwise Operators", file: 'bitwise-operators.html' },
            { id: 'c_operator_bitwise_and', title: "Bitwise AND &", file: 'operator-bitwise-and.html' },
            { id: 'c_operator_bitwise_or', title: "Bitwise OR |", file: 'operator-bitwise-or.html' },
            { id: 'c_operator_bitwise_xor', title: "Bitwise XOR ^", file: 'operator-bitwise-xor.html' },
            { id: 'c_operator_bitwise_not', title: "Bitwise NOT ~", file: 'operator-bitwise-not.html' },
            { id: 'c_operator_bitwise_shifts', title: "Bitwise Shift Operators << >>", file: 'operator-bitwise-shifts.html' },
            { id: 'c_increment_operator', title: "Increment Operator ++", file: 'increment-operator.html' },
            { id: 'c_decrement_operator', title: "Decrement Operator --", file: 'decrement-operator.html' },
            { id: 'c_conditional_ternary_operator', title: "Conditional/Ternary Operator ?:", file: 'conditional-ternary-operator.html' },
            { id: 'c_comma_operator', title: "Comma Operator", file: 'comma-operator.html' },
            { id: 'c_operator_precedence_associativity', title: "Operator Precedence and Associativity", file: 'operator-precedence-associativity.html' },
            { id: 'c_expressions', title: "Expressions", file: 'expressions.html' },
            // Module 9: Type Conversion
            { id: 'c_implicit_conversion', title: "Implicit Conversion", file: 'implicit-conversion.html' },
            { id: 'c_explicit_conversion', title: "Explicit Conversion", file: 'explicit-conversion.html' },
            { id: 'c_type_casting', title: "Type Casting", file: 'type-casting.html' },
            { id: 'c_integer_promotion', title: "Integer Promotion", file: 'integer-promotion.html' },
            { id: 'c_usual_arithmetic_conversions', title: "Usual Arithmetic Conversions", file: 'usual-arithmetic-conversions.html' },
            { id: 'c_signed_unsigned_conversion', title: "Signed/Unsigned Conversion", file: 'signed-unsigned-conversion.html' },
            { id: 'c_integer_overflow', title: "Integer Overflow", file: 'integer-overflow.html' },
            { id: 'c_floating_point_conversion', title: "Floating-Point Conversion", file: 'floating-point-conversion.html' },
            { id: 'c_narrowing_conversions', title: "Narrowing Conversions", file: 'narrowing-conversions.html' },
            { id: 'c_conversion_pitfalls', title: "Conversion Pitfalls", file: 'conversion-pitfalls.html' },
            { id: 'c_undefined_behavior_conversions', title: "Undefined Behavior Related to Conversions", file: 'undefined-behavior-conversions.html' },
            // Module 10: Decision Making
            { id: 'c_if_statement', title: "if Statement", file: 'if-statement.html' },
            { id: 'c_if_else_statement', title: "if-else Statement", file: 'if-else-statement.html' },
            { id: 'c_nested_if', title: "Nested if", file: 'nested-if.html' },
            { id: 'c_else_if_ladder', title: "else-if Ladder", file: 'else-if-ladder.html' },
            { id: 'c_switch_statement', title: "switch Statement", file: 'switch-statement.html' },
            { id: 'c_case_default_labels', title: "case and default Labels", file: 'case-default-labels.html' },
            { id: 'c_break_in_switch', title: "break Statement in switch", file: 'break-in-switch.html' },
            { id: 'c_nested_switch', title: "Nested switch", file: 'nested-switch.html' },
            { id: 'c_conditional_operator_decisions', title: "Conditional Operator in Decision Making", file: 'conditional-operator-decisions.html' },
            { id: 'c_multiple_conditions', title: "Multiple Conditions", file: 'multiple-conditions.html' },
            { id: 'c_truth_values_in_c', title: "Truth Values in C", file: 'truth-values-in-c.html' },
            { id: 'c_bool_decisions', title: "_Bool and Boolean Logic", file: 'bool-decisions.html' },
            { id: 'c_decision_making_pitfalls', title: "Common Decision-Making Pitfalls", file: 'decision-making-pitfalls.html' },
            // Module 11: Loops
            { id: 'c_for_loop', title: "for Loop", file: 'for-loop.html' },
            { id: 'c_while_loop', title: "while Loop", file: 'while-loop.html' },
            { id: 'c_do_while_loop', title: "do-while Loop", file: 'do-while-loop.html' },
            { id: 'c_nested_loops', title: "Nested Loops", file: 'nested-loops.html' },
            { id: 'c_infinite_loops', title: "Infinite Loops", file: 'infinite-loops.html' },
            { id: 'c_break_in_loops', title: "break in Loops", file: 'break-in-loops.html' },
            { id: 'c_continue_statement', title: "continue Statement", file: 'continue-statement.html' },
            { id: 'c_loop_control', title: "Loop Control", file: 'loop-control.html' },
            { id: 'c_counter_controlled_loops', title: "Counter-Controlled Loops", file: 'counter-controlled-loops.html' },
            { id: 'c_sentinel_controlled_loops', title: "Sentinel-Controlled Loops", file: 'sentinel-controlled-loops.html' },
            { id: 'c_loop_nesting_patterns', title: "Loop Nesting Patterns", file: 'loop-nesting-patterns.html' },
            { id: 'c_common_loop_mistakes', title: "Common Loop Mistakes", file: 'common-loop-mistakes.html' },
            // Module 12: Functions
            { id: 'c_function_declaration', title: "Function Declaration", file: 'function-declaration.html' },
            { id: 'c_function_definition', title: "Function Definition", file: 'function-definition.html' },
            { id: 'c_function_call', title: "Function Call", file: 'function-call.html' },
            { id: 'c_function_prototypes', title: "Function Prototypes", file: 'function-prototypes.html' },
            { id: 'c_parameters_and_arguments', title: "Parameters and Arguments", file: 'parameters-and-arguments.html' },
            { id: 'c_return_values', title: "Return Values", file: 'return-values.html' },
            { id: 'c_void_functions', title: "void Functions", file: 'void-functions.html' },
            { id: 'c_functions_with_parameters', title: "Functions with Parameters", file: 'functions-with-parameters.html' },
            { id: 'c_functions_without_parameters', title: "Functions without Parameters", file: 'functions-without-parameters.html' },
            { id: 'c_functions_returning_values', title: "Functions Returning Values", file: 'functions-returning-values.html' },
            { id: 'c_pass_by_value', title: "Pass-by-Value", file: 'pass-by-value.html' },
            { id: 'c_scope_in_functions', title: "Scope in Functions", file: 'scope-in-functions.html' },
            { id: 'c_local_variables', title: "Local Variables", file: 'local-variables.html' },
            { id: 'c_global_variables', title: "Global Variables", file: 'global-variables.html' },
            { id: 'c_static_local_variables', title: "Static Local Variables", file: 'static-local-variables.html' },
            { id: 'c_function_recursion', title: "Function Recursion", file: 'function-recursion.html' },
            { id: 'c_recursive_functions', title: "Recursive Functions in Practice", file: 'recursive-functions.html' },
            { id: 'c_recursion_vs_iteration', title: "Recursion vs Iteration", file: 'recursion-vs-iteration.html' },
            { id: 'c_function_pointers', title: "Function Pointers", file: 'function-pointers.html' },
            { id: 'c_callback_functions', title: "Callback Functions", file: 'callback-functions.html' },
            // Module 13: Arrays
            { id: 'c_one_dimensional_arrays', title: "One-Dimensional Arrays", file: 'one-dimensional-arrays.html' },
            { id: 'c_array_declaration', title: "Array Declaration", file: 'array-declaration.html' },
            { id: 'c_array_initialization', title: "Array Initialization", file: 'array-initialization.html' },
            { id: 'c_array_indexing', title: "Array Indexing", file: 'array-indexing.html' },
            { id: 'c_traversing_arrays', title: "Traversing Arrays", file: 'traversing-arrays.html' },
            { id: 'c_updating_array_elements', title: "Updating Array Elements", file: 'updating-array-elements.html' },
            { id: 'c_multidimensional_arrays', title: "Multidimensional Arrays", file: 'multidimensional-arrays.html' },
            { id: 'c_two_dimensional_arrays', title: "Two-Dimensional Arrays", file: 'two-dimensional-arrays.html' },
            { id: 'c_three_dimensional_arrays', title: "Three-Dimensional Arrays", file: 'three-dimensional-arrays.html' },
            { id: 'c_arrays_of_different_data_types', title: "Arrays of Different Data Types", file: 'arrays-of-different-data-types.html' },
            { id: 'c_passing_arrays_to_functions', title: "Passing Arrays to Functions", file: 'passing-arrays-to-functions.html' },
            { id: 'c_array_size_calculation', title: "Array Size Calculation", file: 'array-size-calculation.html' },
            { id: 'c_variable_length_arrays', title: "Variable-Length Arrays", file: 'variable-length-arrays.html' },
            { id: 'c_array_bounds', title: "Array Bounds", file: 'array-bounds.html' },
            { id: 'c_out_of_bounds_access', title: "Out-of-Bounds Access", file: 'out-of-bounds-access.html' },
            { id: 'c_arrays_and_pointers_relationship', title: "Relationship Between Arrays and Pointers", file: 'arrays-and-pointers-relationship.html' },
            // Module 14: Strings
            { id: 'c_character_arrays', title: "Character Arrays", file: 'character-arrays.html' },
            { id: 'c_string_literals', title: "String Literals", file: 'string-literals.html' },
            { id: 'c_null_terminator', title: "Null Terminator '\0'", file: 'null-terminator.html' },
            { id: 'c_string_initialization', title: "String Initialization", file: 'string-initialization.html' },
            { id: 'c_reading_strings', title: "Reading Strings", file: 'reading-strings.html' },
            { id: 'c_printing_strings', title: "Printing Strings", file: 'printing-strings.html' },
            { id: 'c_string_traversal', title: "String Traversal", file: 'string-traversal.html' },
            { id: 'c_string_length', title: "String Length", file: 'string-length.html' },
            { id: 'c_string_comparison', title: "String Comparison", file: 'string-comparison.html' },
            { id: 'c_string_copying', title: "String Copying", file: 'string-copying.html' },
            { id: 'c_string_concatenation', title: "String Concatenation", file: 'string-concatenation.html' },
            { id: 'c_searching_strings', title: "Searching Strings", file: 'searching-strings.html' },
            { id: 'c_string_h_header', title: "<string.h> Header", file: 'string-h-header.html' },
            { id: 'c_strlen_function', title: "strlen() Function", file: 'strlen-function.html' },
            { id: 'c_strcpy_function', title: "strcpy() Function", file: 'strcpy-function.html' },
            { id: 'c_strncpy_function', title: "strncpy() Function", file: 'strncpy-function.html' },
            { id: 'c_strcat_function', title: "strcat() Function", file: 'strcat-function.html' },
            { id: 'c_strncat_function', title: "strncat() Function", file: 'strncat-function.html' },
            { id: 'c_strcmp_function', title: "strcmp() Function", file: 'strcmp-function.html' },
            { id: 'c_strncmp_function', title: "strncmp() Function", file: 'strncmp-function.html' },
            { id: 'c_strchr_strrchr', title: "strchr() and strrchr()", file: 'strchr-strrchr.html' },
            { id: 'c_strstr_function', title: "strstr() Function", file: 'strstr-function.html' },
            { id: 'c_strtok_function', title: "strtok() Function", file: 'strtok-function.html' },
            { id: 'c_string_safety_buffer_overflow', title: "String Safety and Buffer Overflow", file: 'string-safety-buffer-overflow.html' },
            // Module 15: Pointers — Core Topic
            { id: 'c_what_is_a_pointer', title: "What is a Pointer?", file: 'what-is-a-pointer.html' },
            { id: 'c_memory_addresses', title: "Memory Addresses", file: 'memory-addresses.html' },
            { id: 'c_address_of_operator', title: "Address-of Operator &", file: 'address-of-operator.html' },
            { id: 'c_dereference_operator', title: "Dereference Operator *", file: 'dereference-operator.html' },
            { id: 'c_pointer_declaration', title: "Pointer Declaration", file: 'pointer-declaration.html' },
            { id: 'c_pointer_initialization', title: "Pointer Initialization", file: 'pointer-initialization.html' },
            { id: 'c_pointer_types', title: "Pointer Types", file: 'pointer-types.html' },
            { id: 'c_null_pointers', title: "Null Pointers and NULL", file: 'null-pointers.html' },
            { id: 'c_pointer_arithmetic', title: "Pointer Arithmetic", file: 'pointer-arithmetic.html' },
            { id: 'c_incrementing_pointers', title: "Incrementing Pointers", file: 'incrementing-pointers.html' },
            { id: 'c_decrementing_pointers', title: "Decrementing Pointers", file: 'decrementing-pointers.html' },
            { id: 'c_pointer_comparison', title: "Pointer Comparison", file: 'pointer-comparison.html' },
            { id: 'c_pointers_and_arrays', title: "Pointers and Arrays", file: 'pointers-and-arrays.html' },
            { id: 'c_pointers_and_strings', title: "Pointers and Strings", file: 'pointers-and-strings.html' },
            { id: 'c_pointers_as_function_arguments', title: "Pointers as Function Arguments", file: 'pointers-as-function-arguments.html' },
            { id: 'c_modifying_variables_through_pointers', title: "Modifying Variables Through Pointers", file: 'modifying-variables-through-pointers.html' },
            { id: 'c_pointer_to_pointer', title: "Pointer to Pointer", file: 'pointer-to-pointer.html' },
            { id: 'c_multiple_levels_of_pointers', title: "Multiple Levels of Pointers", file: 'multiple-levels-of-pointers.html' },
            { id: 'c_void_generic_pointers', title: "void * Generic Pointers", file: 'void-generic-pointers.html' },
            { id: 'c_const_with_pointers', title: "const with Pointers", file: 'const-with-pointers.html' },
            { id: 'c_pointer_to_const', title: "Pointer to const", file: 'pointer-to-const.html' },
            { id: 'c_const_pointer', title: "const Pointer", file: 'const-pointer.html' },
            { id: 'c_const_pointer_to_const', title: "const Pointer to const", file: 'const-pointer-to-const.html' },
            { id: 'c_function_pointers_in_depth', title: "Function Pointers in Depth", file: 'function-pointers-in-depth.html' },
            { id: 'c_pointer_arrays', title: "Pointer Arrays", file: 'pointer-arrays.html' },
            { id: 'c_array_of_pointers', title: "Array of Pointers", file: 'array-of-pointers.html' },
            { id: 'c_pointer_to_array', title: "Pointer to Array", file: 'pointer-to-array.html' },
            { id: 'c_dangling_pointers', title: "Dangling Pointers", file: 'dangling-pointers.html' },
            { id: 'c_wild_pointers', title: "Wild Pointers", file: 'wild-pointers.html' },
            { id: 'c_null_pointer_dereference', title: "Null Pointer Dereference", file: 'null-pointer-dereference.html' },
            { id: 'c_invalid_pointers', title: "Invalid Pointers", file: 'invalid-pointers.html' },
            { id: 'c_pointer_lifetime', title: "Pointer Lifetime", file: 'pointer-lifetime.html' },
            { id: 'c_pointer_ownership_concepts', title: "Pointer Ownership Concepts", file: 'pointer-ownership-concepts.html' },
        ]
    }
};
if (typeof window !== 'undefined') {
    window.EDMITH_COURSES = EDMITH_COURSES;
}

/**
 * Loads Supabase SDK dynamically if needed and returns singleton client
 */
function getEdmithSupabaseClient() {
    if (window.__edmith_supabase_client) return Promise.resolve(window.__edmith_supabase_client);
    return new Promise((resolve) => {
        function instantiate() {
            try {
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    window.__edmith_supabase_client = window.supabase.createClient(
                        SUPABASE_PROGRESS_CONFIG.url,
                        SUPABASE_PROGRESS_CONFIG.anonKey
                    );
                    resolve(window.__edmith_supabase_client);
                    return;
                }
            } catch (e) {
                console.warn('[EDMITH] Supabase instantiation warning:', e);
            }
            resolve(null);
        }

        if (window.supabase) {
            instantiate();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = instantiate;
            script.onerror = () => {
                console.warn('[EDMITH] Supabase CDN script load failed.');
                resolve(null);
            };
            document.head.appendChild(script);
        }
    });
}

/**
 * Validates authenticated user against Supabase Auth server
 */
async function getAuthenticatedUser() {
    const client = await getEdmithSupabaseClient();
    if (!client) return null;
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) return null;
        return user;
    } catch (e) {
        return null;
    }
}

/**
 * Synchronously checks for cached authenticated user UUID in localStorage
 */
function getActiveAuthUserSync() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const user = parsed.user || (parsed.currentSession && parsed.currentSession.user);
                    if (user && user.id) return user;
                }
            }
        }
    } catch (e) {}
    return null;
}

const ETL_LEGACY_KEY_ALIASES = {
    "acceptance_criteria": "agile_acceptance_criteria",
    "aggregation_validation_test_cases": "tc_aggregation",
    "bug_fundamentals": "agile_bug",
    "business_rule_validation_test_cases": "tc_business_rule",
    "count_validation_test_cases": "tc_count",
    "daily_standup_meeting": "agile_standup",
    "data_mapping_document": "doc_data_mapping",
    "data_quality_report_document": "doc_dq_report",
    "data_type_validation_test_cases": "tc_data_type",
    "defect_actual_result": "def_actual",
    "defect_closure": "def_closure",
    "defect_description_writing": "def_description",
    "defect_evidence_gathering": "def_evidence",
    "defect_expected_result": "def_expected",
    "defect_logs_evidence": "def_logs_evidence",
    "defect_management_lifecycle": "def_lifecycle",
    "defect_priority": "def_priority",
    "defect_regression_testing": "def_regression",
    "defect_report_document": "doc_defect_report",
    "defect_retesting": "def_retesting",
    "defect_root_cause_analysis": "def_rca",
    "defect_screenshots_evidence": "def_screenshots",
    "defect_severity": "def_severity",
    "defect_sql_evidence": "def_sql_evidence",
    "defect_steps_to_reproduce": "def_steps",
    "defect_title_writing": "def_title",
    "duplicate_defect_handling": "def_duplicate",
    "duplicate_validation_test_cases": "tc_duplicate",
    "epic_management": "agile_epic",
    "error_handling_test_cases": "tc_error_handling",
    "full_load_test_cases": "tc_full_load",
    "incremental_load_test_cases": "tc_incremental",
    "job_execution_test_cases": "tc_job_execution",
    "join_validation_test_cases": "tc_join",
    "lookup_validation_test_cases": "tc_lookup",
    "migration_cutover": "mig_cutover",
    "migration_data_comparison": "mig_comparison",
    "migration_data_integrity": "mig_integrity",
    "migration_duplicate_validation": "mig_reconciliation",
    "migration_historical_data": "mig_ref_integrity",
    "migration_legacy_system": "mig_legacy",
    "migration_mapping": "mig_mapping",
    "migration_performance": "mig_rollback",
    "migration_reconciliation": "mig_performance",
    "migration_record_count": "mig_count",
    "migration_referential_integrity": "mig_dup_validation",
    "migration_rollback": "mig_cutover",
    "migration_source_system": "mig_source",
    "migration_strategy": "mig_strategy",
    "migration_target_system": "mig_target",
    "migration_transformation": "mig_transform",
    "migration_validation": "mig_validation",
    "null_validation_test_cases": "tc_null",
    "performance_test_cases": "tc_performance",
    "post_migration_validation": "mig_post_validation",
    "product_backlog": "agile_backlog",
    "production_validation_report": "doc_prod_validation",
    "quality_assurance_qa": "agile_qa",
    "quality_control_qc": "agile_qc",
    "reconciliation_report_document": "doc_recon_report",
    "recovery_test_cases": "tc_recovery",
    "reject_records_test_cases": "tc_reject_records",
    "reopened_defect_handling": "def_reopened",
    "requirement_document": "doc_brd",
    "restartability_test_cases": "tc_restartability",
    "retrospective_meeting": "agile_retrospective",
    "scd_test_cases": "tc_scd",
    "scheduling_test_cases": "tc_scheduling",
    "scrum_framework": "agile_scrum",
    "sdlc_fundamentals": "agile_sdlc",
    "source_to_target_mapping_doc": "doc_sttm",
    "source_validation_test_cases": "tc_source",
    "sprint_cycle": "agile_sprint",
    "sprint_planning_meeting": "agile_planning",
    "sprint_review_meeting": "agile_review",
    "stlc_fundamentals": "agile_stlc",
    "target_validation_test_cases": "tc_target",
    "task_tracking": "agile_task",
    "test_case_fundamentals": "agile_test_case",
    "test_cases_document": "doc_test_cases",
    "test_data_document": "doc_test_data",
    "test_execution_fundamentals": "agile_execution",
    "test_execution_report_document": "doc_execution_report",
    "test_plan_document": "doc_test_plan",
    "test_scenario_fundamentals": "agile_scenario",
    "test_scenarios_document": "doc_test_scenarios",
    "test_strategy_document": "doc_test_strategy",
    "test_summary_report_document": "doc_summary_report",
    "traceability_matrix": "doc_rtm",
    "transformation_validation_test_cases": "tc_transform",
    "user_story_structure": "agile_user_story",
    "validation_process": "agile_validation",
    "verification_process": "agile_verification",
    "what_is_a_defect": "def_what_is",
    "what_is_data_migration": "mig_what_is"
};

/**
 * Generates user- and course-isolated keys to guarantee zero cross-course or cross-user pollution
 */
function getScopedLessonKey(userId, lessonId, courseId) {
    const safeUser = userId || 'guest';
    let clean = (lessonId || '').trim();

    // Determine course prefix: 'sql', 'etl', or 'c'
    let cPrefix = 'sql';
    const isEtl = courseId === 'etl_testing' ||
                  clean.startsWith('etl_') ||
                  (typeof window !== 'undefined' && window.location.pathname.replace(/\\/g, '/').toLowerCase().includes('/etl/'));

    const isC = courseId === 'c_programming' ||
                clean.startsWith('c_') ||
                (typeof window !== 'undefined' && window.location.pathname.replace(/\\/g, '/').toLowerCase().includes('/c/'));

    if (isEtl) {
        cPrefix = 'etl';
    } else if (isC) {
        cPrefix = 'c';
    }

    clean = clean.replace(/^(sql_|etl_|c_)/, '').replace(/[-_]/g, '_');
    const scopedKey = `edmith_lesson_done_${safeUser}_${cPrefix}_${clean}`;

    // Backward-compatibility and cross-alias migration
    if (typeof localStorage !== 'undefined' && localStorage.getItem(scopedKey) !== 'true') {
        if (cPrefix === 'sql') {
            const legacyKey = `edmith_lesson_done_${safeUser}_${clean}`;
            if (localStorage.getItem(legacyKey) === 'true') {
                localStorage.setItem(scopedKey, 'true');
            }
        } else if (cPrefix === 'etl') {
            const alias = ETL_LEGACY_KEY_ALIASES[clean];
            if (alias) {
                const legacyKey = `edmith_lesson_done_${safeUser}_etl_${alias.replace(/[-_]/g, '_')}`;
                if (localStorage.getItem(legacyKey) === 'true') {
                    localStorage.setItem(scopedKey, 'true');
                }
            }
            const unscopedKey = `edmith_lesson_done_${safeUser}_${clean}`;
            if (localStorage.getItem(unscopedKey) === 'true') {
                localStorage.setItem(scopedKey, 'true');
            }
        }
    }

    return scopedKey;
}


function getScopedCourseStartKey(userId, courseId) {
    const safeUser = userId || 'guest';
    const cId = courseId || 'sql_mastery';
    return `edmith_course_started_${safeUser}_${cId}`;
}

/**
 * Clears legacy un-scoped storage keys that previously leaked between users
 */
function purgeLegacyUnscopedStorage() {
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (
                k.startsWith('edmith_lesson_completed_sql_') ||
                k.startsWith('edmith_lesson_completed_') ||
                k === 'edmith_course_started_sql_mastery' ||
                k === 'edmith_sql_intro_completed'
            ) {
                localStorage.removeItem(k);
            }
        }
    } catch (e) {}
}

/**
 * Calculates course progress strictly for a specific course ID and user ID
 */
function calculateCourseProgress(courseId, userId) {
    const cId = courseId || 'sql_mastery';
    const course = EDMITH_COURSES[cId];
    if (!course) return null;

    const safeUserId = userId || 'guest';
    let completedCount = 0;
    let nextLesson = null;

    course.lessons.forEach(lesson => {
        const key = getScopedLessonKey(safeUserId, lesson.id, cId);
        const isDone = localStorage.getItem(key) === 'true';
        if (isDone) {
            completedCount++;
        } else if (!nextLesson) {
            nextLesson = lesson;
        }
    });

    if (!nextLesson) {
        nextLesson = course.lessons[0];
    }

    const percentage = completedCount > 0 ? Math.max(1, Math.round((completedCount / course.totalLessons) * 100)) : 0;
    const startKey = getScopedCourseStartKey(safeUserId, cId);
    const isStarted = localStorage.getItem(startKey) === 'true' || completedCount > 0;

    return {
        course_id: cId,
        user_id: safeUserId,
        title: course.title,
        module: course.module,
        icon: course.icon,
        total_lessons: course.totalLessons,
        completed_count: completedCount,
        progress_percentage: percentage,
        next_lesson_id: nextLesson ? nextLesson.id : null,
        next_lesson_file: nextLesson ? nextLesson.file : null,
        next_lesson_title: nextLesson ? nextLesson.title : null,
        is_started: isStarted,
        last_accessed_at: new Date().toISOString()
    };
}

/**
 * Fetches user progress directly from Supabase tables
 */
async function fetchUserProgressFromSupabase(userId) {
    if (!userId || userId === 'guest') return null;
    const client = await getEdmithSupabaseClient();
    if (!client) return null;

    try {
        console.log('[EDMITH Progress] Querying Supabase progress tables for user:', userId);
        const { data: courseRows, error: cErr } = await client
            .from('course_progress')
            .select('*')
            .eq('user_id', userId);

        if (cErr) {
            console.error('[EDMITH Progress] Supabase course_progress SELECT error:', cErr);
        }

        const { data: lessonRows, error: lErr } = await client
            .from('lesson_progress')
            .select('*')
            .eq('user_id', userId);

        if (lErr) {
            console.error('[EDMITH Progress] Supabase lesson_progress SELECT error:', lErr);
        }

        // Cache completed lessons into user- and course-isolated storage
        if (Array.isArray(lessonRows)) {
            lessonRows.forEach(lp => {
                if (lp.completed && lp.lesson_id) {
                    const cId = lp.course_id || (lp.lesson_id.startsWith('etl_') ? 'etl_testing' : (lp.lesson_id.startsWith('c_') ? 'c_programming' : 'sql_mastery'));
                    const cleanLesson = lp.lesson_id.replace(/^(sql_|etl_|c_)/, '');
                    localStorage.setItem(getScopedLessonKey(userId, cleanLesson, cId), 'true');
                }
            });
        }

        return {
            courses: courseRows || [],
            lessons: lessonRows || []
        };
    } catch (e) {
        console.error('[EDMITH Progress] Supabase progress query exception:', e);
        return null;
    }
}

// Expose globally for profile.html and lesson controllers
window.EdmithProgress = {
    EDMITH_COURSES,
    getEdmithSupabaseClient,
    getAuthenticatedUser,
    getActiveAuthUserSync,
    calculateCourseProgress,
    fetchUserProgressFromSupabase,
    getScopedLessonKey,
    getScopedCourseStartKey,
    purgeLegacyUnscopedStorage,
    checkTestEligibility: async function(courseId = 'sql_mastery') {
        const user = await getAuthenticatedUser();
        if (!user) {
            return { eligible: false, reason: 'unauthenticated', percentage: 0, completedCount: 0, user: null };
        }
        await fetchUserProgressFromSupabase(user.id);
        const progress = calculateCourseProgress(courseId, user.id);
        const percentage = progress ? (progress.progress_percentage || 0) : 0;
        const completedCount = progress ? (progress.completed_count || 0) : 0;
        const nextLessonFile = progress && progress.next_lesson_file ? progress.next_lesson_file : 'intro.html';
        return {
            eligible: percentage >= 15,
            reason: percentage >= 15 ? 'ok' : 'course_incomplete',
            percentage,
            completedCount,
            totalLessons: progress ? progress.total_lessons : (EDMITH_COURSES[courseId]?.totalLessons || 50),
            nextLessonFile,
            user
        };
    },
    startCourse: function(courseId, userId) {
        const safeUserId = userId || (getActiveAuthUserSync() ? getActiveAuthUserSync().id : 'guest');
        localStorage.setItem(getScopedCourseStartKey(safeUserId, courseId), 'true');
        return calculateCourseProgress(courseId, safeUserId);
    }
};

async function initLessonCompletion() {
    // 1. Strictly enforce chapter page: Mark Complete ONLY runs on authentic chapter pages
    const chapter = getChapterContext();
    if (!chapter) {
        // Not a chapter page — do not run Mark Complete, do not start course, do not attach listeners
        return;
    }

    const currentCourseId = chapter.courseId;
    const cleanId = chapter.cleanLessonId;
    const dbLessonId = chapter.dbLessonId;
    const chapterFile = chapter.file;

    // Purge any contaminated legacy shared keys
    purgeLegacyUnscopedStorage();

    // Retrieve active user
    let activeUser = getActiveAuthUserSync();
    let userId = activeUser ? activeUser.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : 'guest');

    // Asynchronously verify against Supabase auth
    getAuthenticatedUser().then(user => {
        if (user) {
            userId = user.id;
            // Sync user's completed lessons from Supabase if online
            fetchUserProgressFromSupabase(userId).then(() => {
                updateSidebarCheckmarks(userId);
                updateCurrentButtonState(userId);
            });
        }
    });

    // Mark current course started for the current user strictly when on an authentic chapter page
    localStorage.setItem(getScopedCourseStartKey(userId, currentCourseId), 'true');

    // Register course start on enrollment/start buttons
    document.querySelectorAll(`a[href*="what-is-data.html"], a[href*="what-is-data-integration.html"], a[href*="${currentCourseId === 'etl_testing' ? 'etl' : 'sql'}/intro.html"], a[href*="intro.html"]`).forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem(getScopedCourseStartKey(userId, currentCourseId), 'true');
        });
    });

    const markCompleteBtn = document.getElementById('markCompleteBtn');
    if (!markCompleteBtn) return;
    
    // Helper to show floating toast
    function showToast(message, iconClass = 'fa-circle-check') {
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function ensureTocHeader(sidebarEl) {
        if (!sidebarEl || sidebarEl.querySelector('.course-toc-header')) return;
        const courseDef = EDMITH_COURSES[currentCourseId] || EDMITH_COURSES.sql_mastery;
        const headerEl = document.createElement('div');
        headerEl.className = 'course-toc-header';
        headerEl.innerHTML = `
            <div class="toc-header-top">
                <div class="toc-badge-wrap">
                    <span class="toc-course-badge"><i class="${courseDef.icon}"></i> ${courseDef.title}</span>
                </div>
                <button type="button" class="toc-close-btn" id="courseTocCloseBtn" aria-label="Close table of contents" title="Close table of contents">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toc-progress-card">
                <div class="toc-progress-info">
                    <span class="toc-progress-label">Course Progress</span>
                    <span class="toc-progress-percent" id="tocProgressPercent">0%</span>
                </div>
                <div class="toc-progress-track">
                    <div class="toc-progress-fill" id="tocProgressFill" style="width: 0%;"></div>
                </div>
                <div class="toc-lessons-count">
                    <i class="fas fa-circle-check"></i> <span id="tocCompletedCount">0</span> of ${courseDef.totalLessons} completed
                </div>
            </div>
        `;
        sidebarEl.prepend(headerEl);

        const closeBtn = headerEl.querySelector('#courseTocCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebarEl.classList.remove('mobile-open');
                const backdrop = document.querySelector('.course-toc-backdrop');
                if (backdrop) backdrop.classList.remove('active');
                document.body.classList.remove('toc-drawer-open');
                const mobileTocBtn = document.getElementById('mobileTocBtn');
                if (mobileTocBtn) {
                    const icon = mobileTocBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-xmark');
                        icon.classList.add('fa-list');
                    }
                }
            });
        }
    }

    // Update sidebar checklist icons strictly for this course and user
    function updateSidebarCheckmarks(targetUserId) {
        const uId = targetUserId || userId;
        const sidebarNav = document.querySelector('.course-sidebar-nav');
        if (sidebarNav) ensureTocHeader(sidebarNav);

        let totalCompleted = 0;
        document.querySelectorAll('.course-sidebar-nav li a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            const pageName = href.split('/').pop().replace('.html', '').replace(/[-_]/g, '_');
            const key = getScopedLessonKey(uId, pageName, currentCourseId);
            const isDone = localStorage.getItem(key) === 'true';
            const li = link.closest('li');

            if (isDone) {
                totalCompleted++;
                if (li) li.classList.add('lesson-completed');
            } else {
                if (li) li.classList.remove('lesson-completed');
            }

            let badge = link.querySelector('.lesson-done-icon');
            if (isDone) {
                if (!badge) {
                    badge = document.createElement('i');
                    badge.className = 'fas fa-check-circle lesson-done-icon';
                    badge.setAttribute('aria-label', 'Completed');
                    link.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        });

        // Update progress card live for current course only
        const progress = calculateCourseProgress(currentCourseId, uId);
        const pct = progress ? Math.round(progress.progress_percentage) : 0;
        const pctEl = document.getElementById('tocProgressPercent');
        const fillEl = document.getElementById('tocProgressFill');
        const countEl = document.getElementById('tocCompletedCount');
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (fillEl) fillEl.style.width = `${pct}%`;
        if (countEl) countEl.textContent = progress ? progress.completed_count : totalCompleted;
    }

    // Update current button state matching canonical SQL styling
    function updateCurrentButtonState(targetUserId) {
        if (!markCompleteBtn) return;
        const uId = targetUserId || userId;
        const lessonKey = getScopedLessonKey(uId, cleanId, currentCourseId);
        const fileKey = getScopedLessonKey(uId, chapterFile.replace('.html', '').replace(/[-_]/g, '_'), currentCourseId);

        const isDone = localStorage.getItem(lessonKey) === 'true' || localStorage.getItem(fileKey) === 'true';
        if (isDone) {
            markCompleteBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Completed!</span>';
            markCompleteBtn.classList.add('completed-btn');
            markCompleteBtn.title = 'Click to unmark or reset';
        } else {
            markCompleteBtn.innerHTML = '<i class="fas fa-check"></i> <span>Mark Complete</span>';
            markCompleteBtn.classList.remove('completed-btn');
            markCompleteBtn.title = 'Mark this lesson as completed';
        }
    }

    updateSidebarCheckmarks(userId);
    updateCurrentButtonState(userId);

    async function setLessonCompletionStatus(newStatus, isAuto = false) {
        // Immediate synchronous resolution of current user id for instant UI responsiveness
        const activeAuth = getActiveAuthUserSync();
        const currentUserId = activeAuth ? activeAuth.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : 'guest');
        const pageFileId = chapterFile.replace('.html', '').replace(/[-_]/g, '_');
        const lessonStorageKey = getScopedLessonKey(currentUserId, cleanId, currentCourseId);
        const fileStorageKey = getScopedLessonKey(currentUserId, pageFileId, currentCourseId);

        const currentlyCompleted = localStorage.getItem(lessonStorageKey) === 'true' || localStorage.getItem(fileStorageKey) === 'true';
        if (newStatus === currentlyCompleted) {
            return; // Avoid redundant updates
        }

        if (newStatus) {
            localStorage.setItem(lessonStorageKey, 'true');
            localStorage.setItem(fileStorageKey, 'true');
            if (isAuto) {
                showToast('Study progress exceeded 90%! Lesson automatically completed.', 'fa-circle-check');
            } else {
                showToast('Lesson marked as complete! Great job.', 'fa-circle-check');
            }
        } else {
            localStorage.removeItem(lessonStorageKey);
            localStorage.removeItem(fileStorageKey);
            showToast('Lesson marked as incomplete.', 'fa-arrow-rotate-left');
        }

        // Mark current course started for this user
        localStorage.setItem(getScopedCourseStartKey(currentUserId, currentCourseId), 'true');

        // Update button and sidebar immediately in the UI (0ms latency)
        updateCurrentButtonState(currentUserId);
        updateSidebarCheckmarks(currentUserId);

        // Calculate progress for current user and current course
        const progress = calculateCourseProgress(currentCourseId, currentUserId);

        // If user is authenticated, sync asynchronously to Supabase tables
        getAuthenticatedUser().then(async (authUser) => {
            if (authUser && authUser.id) {
                const client = await getEdmithSupabaseClient();
                if (client) {
                    try {
                        await client
                            .from('lesson_progress')
                            .upsert({
                                user_id: authUser.id,
                                course_id: currentCourseId,
                                lesson_id: dbLessonId,
                                completed: newStatus,
                                started_at: new Date().toISOString(),
                                completed_at: newStatus ? new Date().toISOString() : null
                            }, { onConflict: 'user_id,course_id,lesson_id' });

                        const isCourseCompleted = progress && progress.progress_percentage > 90;
                        await client
                            .from('course_progress')
                            .upsert({
                                user_id: authUser.id,
                                course_id: currentCourseId,
                                progress_percentage: progress ? progress.progress_percentage : 0,
                                last_accessed_at: new Date().toISOString(),
                                completed_at: isCourseCompleted ? new Date().toISOString() : null
                            }, { onConflict: 'user_id,course_id' });
                    } catch (err) {
                        console.warn('[EDMITH Progress] Database sync warning:', err);
                    }
                }
            }
        }).catch(() => {});
    }

    // Expose auto-complete callback for progress bar and IntersectionObserver strictly for this chapter
    window.__edmith_auto_complete_lesson = function(progressVal) {
        if (progressVal >= 80 || progressVal === true || progressVal === 100) {
            setLessonCompletionStatus(true, true);
        }
    };

    markCompleteBtn.addEventListener('click', async () => {
        const activeAuth = getActiveAuthUserSync();
        const currentUserId = activeAuth ? activeAuth.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : 'guest');
        const lessonStorageKey = getScopedLessonKey(currentUserId, cleanId, currentCourseId);
        const currentlyCompleted = localStorage.getItem(lessonStorageKey) === 'true';
        await setLessonCompletionStatus(!currentlyCompleted, false);
    });
}

// 3.1 Dynamic "Continue Learning" section on root homepage
async function initContinueLearningSection() {
    const container = document.getElementById('continueLearningContainer');
    if (!container) return;

    let activeUser = getActiveAuthUserSync();
    let userId = activeUser ? activeUser.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : null);
    if (!userId) {
        const authUser = await getAuthenticatedUser();
        if (authUser) userId = authUser.id;
    }

    if (!userId) {
        container.style.display = 'none';
        return;
    }

    // Sync progress from cloud if user is online
    await fetchUserProgressFromSupabase(userId);

    const courses = EDMITH_COURSES;
    let activeCards = [];

    Object.keys(courses).forEach(cId => {
        const progress = calculateCourseProgress(cId, userId);
        if (progress && (progress.is_started || progress.completed_count > 0)) {
            activeCards.push(progress);
        }
    });

    if (activeCards.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <div class="continue-learning-banner" style="background: var(--card-bg); border: 1.5px solid var(--accent); border-radius: var(--radius-lg); padding: 1.5rem; margin: 2rem auto; max-width: 1200px; box-shadow: var(--shadow-md);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 1.25rem;">
                <span class="badge-pulse-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
                <h3 style="margin:0; font-size: 1.15rem; color:var(--text-primary); font-weight:700;">Continue Where You Left Off</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                ${activeCards.map(p => {
                    const courseFolder = p.course_id === 'etl_testing' ? 'etl/' : (p.course_id === 'c_programming' ? 'c/' : 'sql/');
                    const fallbackFile = p.course_id === 'c_programming' ? 'what-is-programming.html' : (p.course_id === 'etl_testing' ? 'what-is-data.html' : 'intro.html');
                    const targetFile = p.next_lesson_file || fallbackFile;
                    const continueUrl = `${courseFolder}${targetFile}`;
                    return `
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display:flex; flex-direction:column; gap:0.75rem;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:36px; height:36px; border-radius:8px; background:rgba(99,102,241,0.12); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:1rem;">
                                    <i class="${p.icon}"></i>
                                </div>
                                <div>
                                    <h4 style="margin:0; font-size:0.98rem; color:var(--text-primary); font-weight:600;">${p.title}</h4>
                                    <span style="font-size:0.78rem; color:var(--text-secondary);">${p.module}</span>
                                </div>
                            </div>
                            <span style="font-weight:700; color:var(--accent); font-size:0.95rem;">${p.progress_percentage}%</span>
                        </div>
                        <div class="progress-bar-wrap" style="height:6px; background:rgba(0,0,0,0.06); border-radius:3px; overflow:hidden;">
                            <div class="progress-bar-fill" style="width: ${p.progress_percentage}%; height:100%; background:var(--accent); transition:width 0.3s ease;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:0.5rem; border-top:1px solid var(--border-color);">
                            <span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fas fa-check-circle" style="color:#10b981;"></i> ${p.completed_count} of ${p.total_lessons} completed</span>
                            <a href="${continueUrl}" class="btn-enroll" style="padding:6px 14px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <span>Continue</span> <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                `;}).join('')}
            </div>
        </div>
    `;
}

// 4. Collapsible Sidebar Modules (Accordion with Hamburger & Chevron)
function initCollapsibleModules() {
    const moduleHeaders = document.querySelectorAll('.sidebar-module-header');
    if (!moduleHeaders.length) return;

    moduleHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            const group = this.closest('.sidebar-module-group');
            if (!group) return;

            const isCollapsed = group.classList.toggle('collapsed');
            this.setAttribute('aria-expanded', !isCollapsed);
        });
    });

    // Automatically expand the module containing the active lesson
    const activeItem = document.querySelector('.course-sidebar-nav li.active');
    if (activeItem) {
        const activeGroup = activeItem.closest('.sidebar-module-group');
        if (activeGroup) {
            activeGroup.classList.remove('collapsed');
            const header = activeGroup.querySelector('.sidebar-module-header');
            if (header) header.setAttribute('aria-expanded', 'true');
            // Scroll active item smoothly into the vertical middle of the sidebar nav
            setTimeout(() => {
                const sidebarNav = document.querySelector('.course-sidebar-nav');
                if (sidebarNav) {
                    const sidebarRect = sidebarNav.getBoundingClientRect();
                    const activeRect = activeItem.getBoundingClientRect();
                    // Calculate target scrollTop so activeItem is centered vertically in sidebarNav
                    const currentScroll = sidebarNav.scrollTop;
                    const relativeActiveTop = activeRect.top - sidebarRect.top + currentScroll;
                    const targetScroll = relativeActiveTop - (sidebarRect.height / 2) + (activeRect.height / 2);

                    sidebarNav.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                } else {
                    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 180);
        }
    } else {
        // Default to opening Module 1
        const firstGroup = document.querySelector('.sidebar-module-group[data-module="module-1"]');
        if (firstGroup) {
            firstGroup.classList.remove('collapsed');
            const header = firstGroup.querySelector('.sidebar-module-header');
            if (header) header.setAttribute('aria-expanded', 'true');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLessonCompletion();
        initCollapsibleModules();
        initContinueLearningSection();
    });
} else {
    initLessonCompletion();
    initCollapsibleModules();
    initContinueLearningSection();
}

/**
 * Global helper to open or update the EDMITH SQL Editor with specified code.
 * Works whether called with a code string or a button element (using `this`).
 */
window.openEdmithEditor = function(target) {
    let sql = '';
    if (typeof target === 'string') {
        sql = target.trim();
    } else if (target && target.closest) {
        const terminal = target.closest('.code-terminal') || target.closest('.carousel-content') || target.closest('.scenario-block') || target.closest('.code-snippet-box') || target.closest('pre');
        const codeEl = terminal ? (terminal.querySelector('code') || terminal.querySelector('pre')) : null;
        sql = codeEl ? (codeEl.innerText || codeEl.textContent || '').trim() : '';
    }

    if (!sql) return;

    // 1. Save to localStorage for instant cross-tab catch
    try {
        localStorage.setItem('edmith_sql_editor_incoming', JSON.stringify({
            query: sql,
            ts: Date.now()
        }));
    } catch (e) {}

    // 2. Broadcast to any already-open editor tabs
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('edmith_sql_channel');
            bc.postMessage({ action: 'load_query', query: sql });
            bc.close();
        }
    } catch (e) {}

    // 3. Resolve target URL based on current page location (targeting canonical editors/editor.html)
    let editorPath = 'editors/editor.html';
    if (window.location.pathname.includes('/sql/') || window.location.href.includes('/sql/')) {
        editorPath = '../editors/editor.html';
    } else if (window.location.pathname.includes('/editors/') || window.location.href.includes('/editors/')) {
        editorPath = 'editor.html';
    }
    const targetUrl = editorPath + '?query=' + encodeURIComponent(sql);

    // 4. Open or focus the named editor window
    const editorWin = window.open(targetUrl, 'edmith_sql_editor');
    if (editorWin) {
        try {
            editorWin.focus();
            editorWin.postMessage({ action: 'load_query', query: sql }, '*');
        } catch (e) {}
    }
};

/**
 * Global helper to open or update the EDMITH C Editor with specified code.
 * Works whether called with a code string or a button element (using `this`).
 */
window.openEdmithCEditor = function(target) {
    let cCode = '';
    if (typeof target === 'string') {
        cCode = target.trim();
    } else if (target && target.closest) {
        const terminal = target.closest('.code-terminal') || target.closest('pre') || target.closest('.carousel-content');
        const codeEl = terminal ? (terminal.querySelector('code') || terminal.querySelector('pre')) : null;
        cCode = codeEl ? (codeEl.innerText || codeEl.textContent || '').trim() : '';
    }

    if (!cCode) return;

    // 1. Save to localStorage for instant cross-tab catch
    try {
        localStorage.setItem('edmith_c_editor_incoming', JSON.stringify({
            code: cCode,
            ts: Date.now()
        }));
    } catch (e) {}

    // 2. Broadcast to any already-open C editor tabs
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('edmith_c_channel');
            bc.postMessage({ action: 'load_code', code: cCode });
            bc.close();
        }
    } catch (e) {}

    // 3. Resolve target URL based on current page location (targeting editors/c-editor.html)
    let editorPath = 'editors/c-editor.html';
    if (window.location.pathname.includes('/c/') || window.location.href.includes('/c/')) {
        editorPath = '../editors/c-editor.html';
    } else if (window.location.pathname.includes('/editors/') || window.location.href.includes('/editors/')) {
        editorPath = 'c-editor.html';
    }
    const targetUrl = editorPath + '?code=' + encodeURIComponent(cCode);

    // 4. Open or focus the named C editor window
    const editorWin = window.open(targetUrl, 'edmith_c_editor');
    if (editorWin) {
        try {
            editorWin.focus();
            editorWin.postMessage({ action: 'load_code', code: cCode }, '*');
        } catch (e) {}
    }
};