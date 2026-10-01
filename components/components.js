/**
 * EDMITH Centralized Component Loader — components/components.js
 * 
 * Provides centralized loading, rendering, active navigation, theme handling,
 * mobile drawer management, and authentication hooks for Header and Footer.
 * 
 * Works seamlessly across all folder depths, supports both HTTP/HTTPS and local file:// protocols,
 * and maintains SEO friendly structure.
 */

(function () {
    'use strict';

    // Default fallback templates (ensures instant render and offline / file:// protocol compatibility)
    const DEFAULT_HEADER_HTML = `
<nav class="navbar" aria-label="Main navigation">
    <a href="{{ROOT}}index.html" class="logo">EDMITH</a>

    <!-- Desktop Navigation Links (Clean text, no icons, no wrapping) -->
    <ul class="nav-links desktop-nav-links" id="desktopNavLinks">
        <li><a href="{{ROOT}}index.html#home" data-nav="home">Home</a></li>
        <li><a href="{{ROOT}}course.html" data-nav="courses">Browse All Courses</a></li>
        <li><a href="{{ROOT}}tests/index.html" data-nav="tests">Tests</a></li>
        <li><a href="{{ROOT}}leaderboard/index.html" data-nav="leaderboard">Leaderboard</a></li>
    </ul>

    <div class="header-actions">
        <button id="themeToggle" class="theme-btn" title="Toggle Dark Mode" aria-label="Toggle Dark Mode">
            <i class="fas fa-moon"></i>
        </button>
        <button class="mobile-menu-btn" title="Toggle Navigation Menu" aria-label="Toggle Navigation Menu" aria-expanded="false">
            <i class="fas fa-bars"></i>
        </button>
    </div>
</nav>

<!-- Mobile Navigation Backdrop & Bottom Drawer (Independent of header containing block) -->
<div class="mobile-nav-backdrop" id="mobileNavBackdrop"></div>
<aside class="mobile-nav-drawer" id="mobileNavDrawer" aria-label="Mobile navigation menu">
    <div class="mobile-drawer-header">
        <div class="mobile-drawer-handle" aria-hidden="true"></div>
        <div class="mobile-drawer-topbar">
            <span class="mobile-drawer-title"><i class="fas fa-compass" aria-hidden="true"></i> Explore EDMITH</span>
            <button type="button" class="mobile-drawer-close" id="mobileDrawerCloseBtn" aria-label="Close navigation menu">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
    </div>

    <ul class="mobile-nav-links" id="mobileNavLinks">
        <li style="--item-index: 1;">
            <a href="{{ROOT}}index.html#home" data-nav="home">
                <span class="mobile-nav-icon" aria-hidden="true"><i class="fas fa-house"></i></span>
                <span>Home</span>
            </a>
        </li>
        <li style="--item-index: 2;">
            <a href="{{ROOT}}course.html" data-nav="courses">
                <span class="mobile-nav-icon" aria-hidden="true"><i class="fas fa-graduation-cap"></i></span>
                <span>Browse All Courses</span>
            </a>
        </li>
        <li style="--item-index: 3;">
            <a href="{{ROOT}}tests/index.html" data-nav="tests">
                <span class="mobile-nav-icon" aria-hidden="true"><i class="fas fa-file-alt"></i></span>
                <span>Tests & Assessments</span>
            </a>
        </li>
        <li style="--item-index: 4;">
            <a href="{{ROOT}}leaderboard/index.html" data-nav="leaderboard">
                <span class="mobile-nav-icon" aria-hidden="true"><i class="fas fa-trophy"></i></span>
                <span>Leaderboard</span>
            </a>
        </li>
    </ul>

    <div class="mobile-drawer-auth" id="mobileNavAuth">
        <!-- Dynamically rendered: Create Free Account & Log In OR Profile -->
    </div>
</aside>
`.trim();

    const DEFAULT_FOOTER_HTML = `
<div class="footer-container">
    <div class="footer-brand">
        <div class="brand-title">EDMITH</div>
        <p>Empowering the next generation of software engineers through practical, hands-on learning.</p>
    </div>
    <div class="footer-links">
        <h3>Quick Links</h3>
        <ul>
            <li><a href="{{ROOT}}index.html#home">Home</a></li>
            <li><a href="{{ROOT}}course.html">All Courses</a></li>
            <li><a href="{{ROOT}}tests/index.html">Tests & Assessments</a></li>
            <li><a href="{{ROOT}}fundamentals/index.html">Programming Fundamentals</a></li>
            <li><a href="{{ROOT}}sql/index.html">SQL Mastery</a></li>
            <li><a href="{{ROOT}}etl/index.html">ETL Testing</a></li>
            <li><a href="{{ROOT}}c/index.html">C Programming</a></li>
            <li><a href="{{ROOT}}python/index.html">Python Programming</a></li>
        </ul>

    </div>
    <div class="footer-links">
        <h3>Community &amp; Stats</h3>
        <ul>
            <li><a href="{{ROOT}}leaderboard/index.html"><i class="fas fa-trophy"></i> Rankings</a></li>
            <li><a href="{{ROOT}}users/profile.html"><i class="fas fa-id-badge"></i> User Profile</a></li>
        </ul>
    </div>
    <div class="footer-links">
        <h3>Editors</h3>
        <ul>
            <li><a href="{{ROOT}}editors/editor.html"><i class="fas fa-terminal"></i> SQL Editor</a></li>
            <li><a href="{{ROOT}}editors/c-editor.html"><i class="fas fa-code"></i> C Editor</a></li>
        </ul>
    </div>
    <div class="footer-links">
        <h3>Support</h3>
        <ul>
            <li><a href="{{ROOT}}index.html#contact">Help Center</a></li>
            <li><a href="{{ROOT}}index.html#contact">Contact Us</a></li>
            <li><a href="{{ROOT}}report-bug.html" class="report-bug-link">Report a Bug</a></li>
        </ul>
    </div>
</div>
<div class="footer-bottom">
    <p>&copy; <span class="current-year">2026</span> EDMITH. All rights reserved.</p>
</div>
`.trim();

    /**
     * Compute relative path prefix to site root based on script src or location pathname.
     * @returns {string} e.g. "", "../", "../../"
     */
    function getSitePrefix() {
        // 1. Inspect script tag that loaded components.js
        const scriptTags = document.querySelectorAll('script[src*="components.js"]');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].getAttribute('src') || '';
            const match = src.match(/^((\.\.\/)+)/);
            if (match) return match[1];
            if (src.startsWith('../')) return '../';
            if (src.indexOf('components/components.js') === 0 || src === 'components.js') return '';
        }

        // 2. Fallback based on pathname
        const rawPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        if (rawPath.includes('/sql/tests/')) return '../../';
        if (rawPath.includes('/tests/') || rawPath.includes('/sql/') || rawPath.includes('/editors/') || rawPath.includes('/editor/') || rawPath.includes('/users/') || rawPath.includes('/etl/') || rawPath.includes('/c/') || rawPath.includes('/python/') || rawPath.includes('/fundamentals/') || rawPath.includes('/leaderboard/')) return '../';
        return '';
    }

    const prefix = getSitePrefix();

    /**
     * Replace {{ROOT}} token and resolve relative URLs in component HTML.
     */
    function resolveComponentPaths(html, rootPrefix) {
        if (!html) return '';
        return html.replace(/\{\{ROOT\}\}/g, rootPrefix);
    }

    /**
     * Fetch component template with fallback to embedded defaults.
     */
    async function loadTemplate(name, defaultHtml) {
        // On file:// protocol, fetch() is blocked by browser CORS policy
        if (window.location.protocol === 'file:') {
            return defaultHtml;
        }

        try {
            const response = await fetch(prefix + 'components/' + name, { cache: 'no-cache' });
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    return text.trim();
                }
            }
        } catch (e) {
            console.warn('[EDMITH Components] Failed to fetch ' + name + ', using fallback template.');
        }

        return defaultHtml;
    }

    /**
     * Highlight the active link in the navigation menu according to the current page URL.
     */
    function updateActiveNavigation(navContainer) {
        const currentPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        const allNavLinks = document.querySelectorAll('.desktop-nav-links a, .mobile-nav-links a');

        // Reset any existing active classes
        allNavLinks.forEach(a => a.classList.remove('active'));

        // Route categories (evaluated strictly and in priority order)
        const isTests = currentPath.includes('/tests/') ||
                        currentPath.includes('/sql/tests/') ||
                        currentPath.endsWith('/tests') ||
                        currentPath.endsWith('/tests/');

        const isLeaderboard = currentPath.includes('leaderboard');

        const isProfile = currentPath.includes('/users/profile.html');

        const isCourses = !isTests && (
            currentPath.includes('/course.html') ||
            currentPath.includes('/courses.html') ||
            currentPath.includes('/sql/') ||
            currentPath.includes('/etl/') ||
            currentPath.includes('/c/') ||
            currentPath.includes('/python/') ||
            currentPath.includes('/fundamentals/')
        );

        const isAuth = currentPath.includes('/users/') || currentPath.includes('login') || currentPath.includes('signup');

        if (isLeaderboard) {
            document.querySelectorAll('a[data-nav="leaderboard"]').forEach(a => a.classList.add('active'));
        } else if (isTests) {
            document.querySelectorAll('a[data-nav="tests"]').forEach(a => a.classList.add('active'));
        } else if (isCourses) {
            document.querySelectorAll('a[data-nav="courses"]').forEach(a => a.classList.add('active'));
        } else if (isProfile) {
            const p = document.querySelectorAll('.header-profile-btn, .mobile-profile-btn, .header-user-btn');
            p.forEach(el => el.classList.add('active'));
        } else if (!isAuth) {
            // Default to Home on root, index.html, or landing surfaces
            document.querySelectorAll('a[data-nav="home"]').forEach(a => a.classList.add('active'));
        }
    }

    /**
     * Update dynamic year in footer.
     */
    function updateCurrentYear(container) {
        if (!container) return;
        const year = new Date().getFullYear();
        container.querySelectorAll('.current-year').forEach(el => {
            el.textContent = year;
        });
    }

    /**
     * Synchronize theme icon with current theme state.
     */
    function syncThemeIcon() {
        const themeBtn = document.getElementById('themeToggle');
        if (!themeBtn) return;
        const isDark = document.body.classList.contains('dark-mode') ||
            document.documentElement.classList.contains('dark-mode') ||
            localStorage.getItem('edmith-theme') === 'dark';
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Render the Header component into the page placeholder.
     */
    async function renderHeader() {
        const headerPlaceholder = document.getElementById('site-header') ||
            document.querySelector('[data-component="header"]') ||
            document.querySelector('header.header');

        if (!headerPlaceholder) return;

        const rawHtml = await loadTemplate('header.html', DEFAULT_HEADER_HTML);
        const resolvedHtml = resolveComponentPaths(rawHtml, prefix);

        // Ensure semantic element
        if (headerPlaceholder.tagName === 'HEADER') {
            headerPlaceholder.className = 'header' + (headerPlaceholder.className ? ' ' + headerPlaceholder.className.replace(/\bheader\b/g, '').trim() : '');
            headerPlaceholder.id = 'site-header';
            headerPlaceholder.innerHTML = resolvedHtml;
        } else {
            const header = document.createElement('header');
            header.className = 'header';
            header.id = 'site-header';
            header.innerHTML = resolvedHtml;
            headerPlaceholder.parentNode.replaceChild(header, headerPlaceholder);
        }

        // Ensure mobile backdrop and drawer are attached directly to document.body
        // to completely bypass any parent stacking / backdrop-filter / overflow containment traps!
        const backdrop = document.getElementById('mobileNavBackdrop');
        const drawer = document.getElementById('mobileNavDrawer');
        if (backdrop && backdrop.parentElement !== document.body) {
            document.body.appendChild(backdrop);
        }
        if (drawer && drawer.parentElement !== document.body) {
            document.body.appendChild(drawer);
        }

        const activeHeader = document.getElementById('site-header');
        updateActiveNavigation(activeHeader);
        syncThemeIcon();

        // Notify global auth / navigation handlers in script.js
        if (typeof window.initEdmithAuthAndNavigation === 'function') {
            try {
                window.initEdmithAuthAndNavigation();
            } catch (err) {
                console.warn('[EDMITH Components] initEdmithAuthAndNavigation error:', err);
            }
        }

        window.dispatchEvent(new CustomEvent('edmith:header-loaded', { detail: { prefix } }));
    }

    /**
     * Render the Footer component into the page placeholder.
     */
    async function renderFooter() {
        const footerPlaceholder = document.getElementById('site-footer') ||
            document.querySelector('[data-component="footer"]') ||
            document.querySelector('footer.footer');

        if (!footerPlaceholder) return;

        const rawHtml = await loadTemplate('footer.html', DEFAULT_FOOTER_HTML);
        const resolvedHtml = resolveComponentPaths(rawHtml, prefix);

        let targetFooter;
        if (footerPlaceholder.tagName === 'FOOTER') {
            footerPlaceholder.className = 'footer';
            footerPlaceholder.id = 'site-footer';
            footerPlaceholder.innerHTML = '<span id="contact" style="position:absolute;visibility:hidden;" aria-hidden="true"></span>' + resolvedHtml;
            targetFooter = footerPlaceholder;
        } else {
            const footer = document.createElement('footer');
            footer.className = 'footer';
            footer.id = 'site-footer';
            footer.innerHTML = '<span id="contact" style="position:absolute;visibility:hidden;" aria-hidden="true"></span>' + resolvedHtml;
            footerPlaceholder.parentNode.replaceChild(footer, footerPlaceholder);
            targetFooter = footer;
        }

        updateCurrentYear(targetFooter);
        window.dispatchEvent(new CustomEvent('edmith:footer-loaded', { detail: { prefix } }));
    }

    /**
     * Mobile Navigation Drawer Controllers
     */
    function openMobileMenu() {
        const drawer = document.getElementById('mobileNavDrawer');
        const backdrop = document.getElementById('mobileNavBackdrop');
        const menuBtn = document.querySelector('.mobile-menu-btn');

        if (drawer) drawer.classList.add('nav-active');
        if (backdrop) backdrop.classList.add('active');
        if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', 'true');
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            }
        }
        document.body.classList.add('nav-drawer-open');
    }

    function closeMobileMenu() {
        const drawer = document.getElementById('mobileNavDrawer');
        const backdrop = document.getElementById('mobileNavBackdrop');
        const menuBtn = document.querySelector('.mobile-menu-btn');

        if (drawer) drawer.classList.remove('nav-active');
        if (backdrop) backdrop.classList.remove('active');
        if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', 'false');
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
        document.body.classList.remove('nav-drawer-open');
    }

    function toggleMobileMenu() {
        const drawer = document.getElementById('mobileNavDrawer');
        if (drawer && drawer.classList.contains('nav-active')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    /**
     * Delegated Global Event Listeners for Header Controls:
     * - Mobile Navigation drawer toggle, backdrop click, close button, and auto-close
     * - Theme Toggle button
     */
    function attachGlobalListeners() {
        // Delegated Click Handlers
        document.addEventListener('click', function (e) {
            // Theme Toggle Delegated Handler
            const toggleBtn = e.target.closest('#themeToggle');
            if (toggleBtn) {
                const isCurrentlyDark = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
                const newTheme = isCurrentlyDark ? 'light' : 'dark';
                localStorage.setItem('edmith-theme', newTheme);
                document.body.classList.toggle('dark-mode', newTheme === 'dark');
                document.documentElement.classList.toggle('dark-mode', newTheme === 'dark');
                syncThemeIcon();
                return;
            }

            // Mobile Menu Toggle Button
            const mobileBtn = e.target.closest('.mobile-menu-btn');
            if (mobileBtn) {
                e.stopPropagation();
                toggleMobileMenu();
                return;
            }

            // Mobile Drawer Close Button (X in top right of bottom sheet)
            const closeBtn = e.target.closest('#mobileDrawerCloseBtn');
            if (closeBtn) {
                e.stopPropagation();
                closeMobileMenu();
                return;
            }

            // Backdrop Click
            const backdrop = e.target.closest('#mobileNavBackdrop');
            if (backdrop) {
                closeMobileMenu();
                return;
            }

            // Close mobile menu when clicking any mobile nav link
            const mobileNavLink = e.target.closest('.mobile-nav-links a');
            if (mobileNavLink) {
                closeMobileMenu();
                return;
            }

            // Close mobile menu on outside click if clicked outside drawer and menu button
            const drawer = document.getElementById('mobileNavDrawer');
            const menuBtn = document.querySelector('.mobile-menu-btn');
            if (drawer && drawer.classList.contains('nav-active')) {
                if (!drawer.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
                    closeMobileMenu();
                }
            }
        });

        // Close mobile menu on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const drawer = document.getElementById('mobileNavDrawer');
                if (drawer && drawer.classList.contains('nav-active')) {
                    closeMobileMenu();
                }
            }
        });
    }

    /**
     * Master Loader Execution
     */
    async function initComponents() {
        attachGlobalListeners();
        await Promise.all([renderHeader(), renderFooter()]);
        window.dispatchEvent(new CustomEvent('edmith:components-loaded', { detail: { prefix } }));
    }

    // Public API
    window.EdmithComponents = {
        getPrefix: () => prefix,
        load: initComponents,
        renderHeader: renderHeader,
        renderFooter: renderFooter,
        updateActiveNavigation: () => updateActiveNavigation(document.getElementById('site-header')),
        syncThemeIcon: syncThemeIcon,
        openMobileMenu: openMobileMenu,
        closeMobileMenu: closeMobileMenu,
        toggleMobileMenu: toggleMobileMenu
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }
})();
