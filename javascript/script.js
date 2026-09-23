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
    } else if (rawPath.includes('/sql/') || rawPath.includes('/editors/') || rawPath.includes('/users/')) {
        prefix = '../';
    }

    // ── Ensure auth-modal.js is loaded on every page ──
    if (!window.EdmithAuthModal && !document.querySelector('script[src*="auth-modal.js"]')) {
        const authScript = document.createElement('script');
        authScript.src = prefix + 'javascript/auth-modal.js';
        document.head.appendChild(authScript);
    }

    function renderHeaderAuth(isAuthenticated, headerActions, isRootIndex) {
        if (!headerActions) return;

        if (isAuthenticated) {
            // Remove unauthenticated buttons if present
            const oldLogin = headerActions.querySelector('.header-login-btn');
            const oldSignup = headerActions.querySelector('.header-signup-btn');
            if (oldLogin) oldLogin.remove();
            if (oldSignup) oldSignup.remove();

            // Insert Profile button if not present
            if (!headerActions.querySelector('.header-profile-btn')) {
                const profileBtn = document.createElement('a');
                profileBtn.className = 'header-profile-btn';
                profileBtn.href = prefix + 'users/profile.html';
                profileBtn.innerHTML = '<i class="fas fa-user-circle"></i> Profile';
                headerActions.insertBefore(profileBtn, headerActions.firstChild);
            }
        } else {
            // Remove Profile button if present
            const oldProfile = headerActions.querySelector('.header-profile-btn');
            if (oldProfile) oldProfile.remove();

            // Insert Sign Up and Log In buttons if not present
            if (!headerActions.querySelector('.header-login-btn')) {
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

    function inject() {
        // 1. Remove Contact Us and Live Previews from Header Navigation
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.querySelectorAll('a[href*="#contact"], a[href$="contact"], a[href*="#preview"], a[href$="preview"]').forEach(a => {
                const li = a.closest('li');
                if (li) li.remove();
                else a.remove();
            });
        }

        // 2. Ensure Leaderboard link in Header Navigation
        if (navLinks && !navLinks.querySelector('a[href*="Leaderboard.html"]')) {
            const lbItem = document.createElement('li');
            const isLbActive = rawPath.endsWith('/Leaderboard.html');
            lbItem.innerHTML = `<a href="${prefix}Leaderboard.html"${isLbActive ? ' class="active"' : ''}>Leaderboard</a>`;
            navLinks.appendChild(lbItem);
        }

        // 3. Header Actions Auth Buttons
        const headerActions = document.querySelector('.header-actions');
        const isUsers = rawPath.includes('/users/');
        if (headerActions && !isUsers) {
            const isRootIndex = (
                rawPath.endsWith('/index.html') ||
                rawPath.endsWith('/EDMITH/') ||
                rawPath.endsWith('/EDMITH') ||
                rawPath === '/' ||
                rawPath.endsWith('/')
            ) && !rawPath.includes('/sql/') && !rawPath.includes('/editors/') && !rawPath.includes('/users/');

            // Fast synchronous render based on cached session state to prevent UI flicker
            const initialAuth = hasSupabaseSession();
            renderHeaderAuth(initialAuth, headerActions, isRootIndex);

            // Asynchronous verification via Supabase SDK singleton
            if (typeof getEdmithSupabaseClient === 'function') {
                getEdmithSupabaseClient().then(client => {
                    if (!client) return;

                    // Verify active session with Supabase
                    client.auth.getSession().then(({ data: { session } }) => {
                        const isAuthed = !!(session && session.user);
                        renderHeaderAuth(isAuthed, headerActions, isRootIndex);
                    }).catch(e => {
                        console.warn('[EDMITH Header] Session retrieval warning:', e);
                    });

                    // Listen to auth state transitions
                    client.auth.onAuthStateChange((event, session) => {
                        const isAuthed = !!(session && session.user);
                        renderHeaderAuth(isAuthed, headerActions, isRootIndex);
                    });
                }).catch(e => {
                    console.warn('[EDMITH Header] Supabase client init warning:', e);
                });
            }
        }

        // 4. Ensure Leaderboard link in Quick Links Footer
        const footerLinks = document.querySelectorAll('.footer-links ul');
        if (footerLinks.length > 0) {
            const quickLinksUl = footerLinks[0];
            if (quickLinksUl && !quickLinksUl.querySelector('a[href*="Leaderboard.html"]')) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${prefix}Leaderboard.html">Leaderboard</a>`;
                quickLinksUl.appendChild(li);
            }
        }
    }

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

        // Strictly remove footer from login page
        if (rawPath.includes('/login.html') || document.getElementById('loginForm')) {
            const existing = document.querySelector('footer.footer, footer#contact, footer');
            if (existing) existing.remove();
            return;
        }

        if (document.querySelector('footer.footer')) return;
        let prefix = '';
        if (rawPath.includes('/sql/tests/')) prefix = '../../';
        else if (rawPath.includes('/sql/') || rawPath.includes('/editors/') || rawPath.includes('/users/')) prefix = '../';

        const footer = document.createElement('footer');
        footer.id = 'contact';
        footer.className = 'footer';
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-brand">
                    <div class="brand-title">EDMITH</div>
                    <p>Empowering the next generation of software engineers through practical, hands-on learning.</p>
                </div>
                <div class="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="${prefix}index.html#home">Home</a></li>
                        <li><a href="${prefix}course.html">All Courses</a></li>
                        <li><a href="${prefix}sql/index.html">SQL Mastery</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h3>Leaderboard</h3>
                    <ul>
                        <li><a href="${prefix}Leaderboard.html">Rankings</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h3>Editors</h3>
                    <ul>
                        <li><a href="${prefix}editors/editor.html"><i class="fas fa-terminal"></i> SQL Editor</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h3>Support</h3>
                    <ul>
                        <li><a href="${prefix}index.html#contact">Help Center</a></li>
                        <li><a href="${prefix}index.html#contact">Contact Us</a></li>
                        <li><a href="${prefix}report-bug.html" class="report-bug-link">Report a Bug</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; <span class="current-year">2026</span> EDMITH. All rights reserved.</p>
            </div>
        `;
        document.body.appendChild(footer);
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

// --- 5. Code Block Copy Buttons ---
function initCodeCopyButtons() {
    // 1. Standalone tutorial blocks and carousel copy buttons
    document.querySelectorAll('.carousel-content, .lesson-content pre, .code-wrapper').forEach(container => {
        const macHeader = container.querySelector('.mac-header');
        const preCode = container.tagName === 'PRE' ? container : container.querySelector('pre');
        if (!preCode) return;

        // Skip if a copy button already exists in this header
        if (macHeader && !macHeader.querySelector('.code-copy-btn, .editor-copy-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.title = 'Copy Code';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
            macHeader.appendChild(copyBtn);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const codeText = preCode.innerText || preCode.textContent;
                navigator.clipboard.writeText(codeText).then(() => {
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

    // 2. Pre-rendered editor-copy-btn buttons (e.g. homepage carousel)
    document.querySelectorAll('.editor-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.carousel-content');
            const preCode = container ? container.querySelector('pre') : null;
            if (!preCode) return;

            const codeText = preCode.innerText || preCode.textContent;
            navigator.clipboard.writeText(codeText).then(() => {
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

    // 3. Interactive Run Code simulation buttons on homepage carousel
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

const smartHeader = document.getElementById('smartHeader');
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
// LESSON / READING INTERFACE (sql/intro.html)
// =========================================================

// 1. Reading Progress Bar & Auto-Completion on progress > 90%
const progressBar = document.getElementById('progressBar');
if (progressBar) {
    let autoCompletedThisSession = false;

    window.addEventListener('scroll', () => {
        const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const currentScroll = window.scrollY;
        if (totalHeight > 0) {
            const progress = (currentScroll / totalHeight) * 100;
            progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';

            // Auto-completion requirement: progress > 90 strictly
            if (progress > 90 && !autoCompletedThisSession) {
                if (typeof window.__edmith_auto_complete_lesson === 'function') {
                    autoCompletedThisSession = true;
                    window.__edmith_auto_complete_lesson(progress);
                }
            }
        }
    }, { passive: true });
}

// 2. Mobile Table of Contents Drawer Toggle
const mobileTocBtn = document.getElementById('mobileTocBtn');
const courseSidebarNav = document.querySelector('.course-sidebar-nav');

if (mobileTocBtn && courseSidebarNav) {
    mobileTocBtn.addEventListener('click', () => {
        courseSidebarNav.classList.toggle('mobile-open');
        const icon = mobileTocBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-list');
            icon.classList.toggle('fa-xmark');
        }
    });

    // Close sidebar on link click
    courseSidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            courseSidebarNav.classList.remove('mobile-open');
            const icon = mobileTocBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-list');
            }
        });
    });
}

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
        totalLessons: 47,
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
            { id: 'sql_stored_procedures', title: 'Stored Procedures', file: 'stored-procedures.html' }
        ]
    }
};

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

/**
 * Generates user-isolated keys to guarantee zero cross-user pollution
 */
function getScopedLessonKey(userId, lessonId) {
    const safeUser = userId || 'guest';
    const cleanLesson = (lessonId || '').replace(/^sql_/, '').replace(/[-_]/g, '_');
    return `edmith_lesson_done_${safeUser}_${cleanLesson}`;
}

function getScopedCourseStartKey(userId, courseId) {
    const safeUser = userId || 'guest';
    return `edmith_course_started_${safeUser}_${courseId}`;
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
 * Calculates course progress strictly for a specific user ID
 */
function calculateCourseProgress(courseId, userId) {
    const course = EDMITH_COURSES[courseId];
    if (!course) return null;

    const safeUserId = userId || 'guest';
    let completedCount = 0;
    let nextLesson = null;

    course.lessons.forEach(lesson => {
        const key = getScopedLessonKey(safeUserId, lesson.id);
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

    const percentage = Math.round((completedCount / course.totalLessons) * 100);
    const startKey = getScopedCourseStartKey(safeUserId, courseId);
    const isStarted = localStorage.getItem(startKey) === 'true' || completedCount > 0;

    return {
        course_id: courseId,
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

        // Cache completed lessons into user-isolated storage
        if (Array.isArray(lessonRows)) {
            lessonRows.forEach(lp => {
                if (lp.completed && lp.lesson_id) {
                    const cleanLesson = lp.lesson_id.replace(/^sql_/, '');
                    localStorage.setItem(getScopedLessonKey(userId, cleanLesson), 'true');
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
            totalLessons: progress ? progress.total_lessons : 47,
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
    // Purge any contaminated legacy shared keys
    purgeLegacyUnscopedStorage();

    const rawPath = window.location.pathname.replace(/\\/g, '/');
    const isSqlSection = rawPath.includes('/sql/');
    const isSqlLesson = isSqlSection && !rawPath.endsWith('/sql/index.html') && !rawPath.endsWith('/report-bug.html');

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

    // Mark course started for the current user when on a lesson page
    if (isSqlLesson) {
        localStorage.setItem(getScopedCourseStartKey(userId, 'sql_mastery'), 'true');
    }

    // Register course start on enrollment/start buttons
    document.querySelectorAll('a[href*="sql/intro.html"], a[href*="intro.html"]').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem(getScopedCourseStartKey(userId, 'sql_mastery'), 'true');
        });
    });

    const markCompleteBtn = document.getElementById('markCompleteBtn');
    
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

    // Update sidebar checklist icons strictly for this user
    function updateSidebarCheckmarks(targetUserId) {
        const uId = targetUserId || userId;
        document.querySelectorAll('.course-sidebar-nav li a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            const pageName = href.split('/').pop().replace('.html', '').replace(/[-_]/g, '_');
            const key = getScopedLessonKey(uId, pageName);
            const isDone = localStorage.getItem(key) === 'true';
            
            let badge = link.querySelector('.lesson-done-icon');
            if (isDone) {
                if (!badge) {
                    badge = document.createElement('i');
                    badge.className = 'fas fa-check-circle lesson-done-icon';
                    badge.style.marginLeft = 'auto';
                    badge.style.color = '#10b981';
                    badge.style.fontSize = '0.85rem';
                    link.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        });
    }

    function updateCurrentButtonState(targetUserId) {
        if (!markCompleteBtn) return;
        const uId = targetUserId || userId;
        const attrId = markCompleteBtn.getAttribute('data-lesson-id');
        const fileId = window.location.pathname.split('/').pop().replace('.html', '');
        const cleanId = (attrId ? attrId.replace('sql_', '') : fileId).replace(/[-_]/g, '_');
        const lessonKey = getScopedLessonKey(uId, cleanId);

        const isDone = localStorage.getItem(lessonKey) === 'true';
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

    const attrId = markCompleteBtn ? markCompleteBtn.getAttribute('data-lesson-id') : null;
    const fileId = window.location.pathname.split('/').pop().replace('.html', '');
    const cleanId = (attrId ? attrId.replace('sql_', '') : fileId).replace(/[-_]/g, '_');

    async function setLessonCompletionStatus(newStatus, isAuto = false) {
        // Re-check current authenticated user at the exact moment
        const authUser = await getAuthenticatedUser();
        const currentUserId = authUser ? authUser.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : 'guest');
        const lessonStorageKey = getScopedLessonKey(currentUserId, cleanId);

        const currentlyCompleted = localStorage.getItem(lessonStorageKey) === 'true';
        if (newStatus === currentlyCompleted) {
            return; // Avoid redundant updates
        }

        if (newStatus) {
            localStorage.setItem(lessonStorageKey, 'true');
            if (isAuto) {
                showToast('Study progress exceeded 90%! Lesson automatically completed.', 'fa-circle-check');
            } else {
                showToast('Lesson marked as complete! Great job.', 'fa-circle-check');
            }
        } else {
            localStorage.removeItem(lessonStorageKey);
            showToast('Lesson marked as incomplete.', 'fa-arrow-rotate-left');
        }

        // Mark course started for this user
        localStorage.setItem(getScopedCourseStartKey(currentUserId, 'sql_mastery'), 'true');

        // Update button and sidebar immediately in the UI
        updateCurrentButtonState(currentUserId);
        updateSidebarCheckmarks(currentUserId);

        // Calculate progress for current user
        const progress = calculateCourseProgress('sql_mastery', currentUserId);

        // If user is authenticated, sync to Supabase tables
        if (authUser && authUser.id) {
            const client = await getEdmithSupabaseClient();
            if (client) {
                try {
                    await client
                        .from('lesson_progress')
                        .upsert({
                            user_id: authUser.id,
                            course_id: 'sql_mastery',
                            lesson_id: 'sql_' + cleanId,
                            completed: newStatus,
                            started_at: new Date().toISOString(),
                            completed_at: newStatus ? new Date().toISOString() : null
                        }, { onConflict: 'user_id,course_id,lesson_id' });

                    const isCourseCompleted = progress && progress.progress_percentage > 90;
                    await client
                        .from('course_progress')
                        .upsert({
                            user_id: authUser.id,
                            course_id: 'sql_mastery',
                            progress_percentage: progress ? progress.progress_percentage : 0,
                            last_accessed_at: new Date().toISOString(),
                            completed_at: isCourseCompleted ? new Date().toISOString() : null
                        }, { onConflict: 'user_id,course_id' });
                } catch (err) {
                    console.warn('[EDMITH Progress] Database sync warning:', err);
                }
            }
        }
    }

    // Expose auto-complete callback for progress bar
    window.__edmith_auto_complete_lesson = function(progressVal) {
        if (progressVal > 90) {
            setLessonCompletionStatus(true, true);
        }
    };

    if (markCompleteBtn) {
        markCompleteBtn.addEventListener('click', async () => {
            const authUser = await getAuthenticatedUser();
            const currentUserId = authUser ? authUser.id : (sessionStorage.getItem('edmith_guest') === 'true' ? 'guest' : 'guest');
            const lessonStorageKey = getScopedLessonKey(currentUserId, cleanId);
            const currentlyCompleted = localStorage.getItem(lessonStorageKey) === 'true';
            setLessonCompletionStatus(!currentlyCompleted, false);
        });
    }
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
    });
} else {
    initLessonCompletion();
    initCollapsibleModules();
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
        const terminal = target.closest('.code-terminal');
        const codeEl = terminal ? terminal.querySelector('code') : null;
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