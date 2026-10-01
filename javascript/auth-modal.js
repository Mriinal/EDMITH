// EDMITH Reusable Global Auth Modal — javascript/auth-modal.js
// Makes the authentic EDMIT Login Popup available on EVERY page.
// Integrates seamlessly with Supabase Auth and maintains state across the application.

(function () {
    'use strict';

    const SUPABASE_CONFIG = {
        url: 'https://jnoigbvvxwpvxefunvfc.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub2lnYnZ2eHdwdnhlZnVudmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDkzMjEsImV4cCI6MjEwNTMyNTMyMX0.kg07-fyqAPdnSqs4RxNvzvbD5VhNR8vtFkg-RS5pMnA'
    };

    // ── PRE-WARM: fire a silent HEAD to wake Supabase from hibernation ──
    // Free-tier projects hibernate after ~5 min and take 10-15s to wake.
    // This tiny request ensures the connection is hot before the user submits.
    (function warmConn() {
        try {
            fetch(SUPABASE_CONFIG.url + '/rest/v1/users?select=count&limit=0', {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
                    'Prefer': 'count=none'
                }
            }).catch(() => {});
        } catch (_) {}
    })();

    let supabaseClient = null;

    function getSupabaseClient() {
        if (supabaseClient) return Promise.resolve(supabaseClient);
        if (window.__edmith_supabase_client) {
            supabaseClient = window.__edmith_supabase_client;
            return Promise.resolve(supabaseClient);
        }
        return new Promise((resolve) => {
            function instantiate() {
                try {
                    if (window.supabase && typeof window.supabase.createClient === 'function') {
                        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                        window.__edmith_supabase_client = supabaseClient;
                        resolve(supabaseClient);
                        return;
                    }
                } catch (e) {
                    console.warn('[EDMITH AuthModal] Supabase creation error:', e);
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
                    console.warn('[EDMITH AuthModal] Failed to load Supabase CDN.');
                    resolve(null);
                };
                document.head.appendChild(script);
            }
        });
    }

    function getPathPrefix() {
        if (window.EdmithComponents && typeof window.EdmithComponents.getPrefix === 'function') {
            const p = window.EdmithComponents.getPrefix();
            if (p !== undefined && p !== null) return p;
        }
        const scriptTags = document.querySelectorAll('script[src*="auth-modal.js"], script[src*="components.js"]');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].getAttribute('src') || '';
            const match = src.match(/^((\.\.\/)+)/);
            if (match) return match[1];
            if (src.startsWith('../')) return '../';
        }
        const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
        if (path.includes('/sql/tests/')) return '../../';
        if (
            path.includes('/tests/') ||
            path.includes('/sql/') ||
            path.includes('/editors/') ||
            path.includes('/editor/') ||
            path.includes('/users/') ||
            path.includes('/etl/') ||
            path.includes('/c/') ||
            path.includes('/python/') ||
            path.includes('/fundamentals/')
        ) {
            return '../';
        }
        return '';
    }

    function hasValidSession() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && (parsed.access_token || parsed.currentSession)) {
                            const expiresAt = parsed.expires_at || (parsed.currentSession && parsed.currentSession.expires_at);
                            if (!expiresAt || expiresAt * 1000 > Date.now()) {
                                return true;
                            }
                        }
                    }
                }
            }
        } catch (e) {}
        return false;
    }

    function ensureStyles() {
        try {
            const prefix = getPathPrefix();
            if (!document.querySelector('link[href*="modal.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = prefix + 'css/modal.css';
                document.head.appendChild(link);
            }
            if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="all.min.css"]')) {
                const fa = document.createElement('link');
                fa.rel = 'stylesheet';
                fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
                document.head.appendChild(fa);
            }
        } catch (e) {
            console.warn('[EDMITH AuthModal] Stylesheet auto-load warning:', e);
        }
    }

    // Preload modal styles immediately
    ensureStyles();

    let activeModalState = null;

    function buildModalHtml(prefix, title, subtitle, showGuest) {
        return `
        <div class="login-modal-overlay" id="edmithLoginModalOverlay" role="dialog" aria-modal="true" aria-labelledby="modalCardTitle">
            <div class="login-modal-card auth-card">
                <button type="button" class="login-modal-close" id="modalCloseBtn" aria-label="Close login dialog">
                    <i class="fas fa-times"></i>
                </button>
                <div class="auth-card-header">
                    <a href="${prefix}index.html" class="auth-card-logo">EDMITH</a>
                    <h2 class="auth-card-title" id="modalCardTitle">${title || 'Welcome Back'}</h2>
                    <p class="auth-card-subtitle" id="modalCardSubtitle">${subtitle || 'Log in to continue your learning journey and access tests.'}</p>
                </div>

                <!-- STEP 1 — Identifier (Username / Email) -->
                <div id="modalStepIdentifier" class="login-step">
                    <!-- Login Method Toggle Tabs -->
                    <div class="auth-toggle-group" role="tablist" aria-label="Login method">
                        <button type="button" class="auth-toggle-tab active" id="modalTabUsername" role="tab" aria-selected="true">
                            <i class="fas fa-at" aria-hidden="true"></i>
                            <span>Username</span>
                        </button>
                        <button type="button" class="auth-toggle-tab" id="modalTabEmail" role="tab" aria-selected="false">
                            <i class="fas fa-envelope" aria-hidden="true"></i>
                            <span>Email</span>
                        </button>
                    </div>

                    <form id="modalIdentifierForm" class="auth-form" novalidate autocomplete="on">
                        <div class="auth-field-group">
                            <label class="auth-label" for="modalIdentifier" id="modalIdentifierLabel">
                                <span id="modalIdentifierLabelText">Username</span> <span class="auth-required" title="Required">*</span>
                            </label>
                            <div class="auth-input-wrap">
                                <i class="fas fa-at auth-input-icon" id="modalIdentifierIcon" aria-hidden="true"></i>
                                <input type="text" id="modalIdentifier" class="auth-input" placeholder="Enter your username" maxlength="100" autocomplete="username" required>
                                <span class="auth-input-spinner" id="modalIdentifierSpinner" aria-hidden="true" style="display:none;">
                                    <i class="fas fa-circle-notch fa-spin"></i>
                                </span>
                            </div>
                            <span class="auth-field-error" id="modalIdentifierError" aria-live="polite"></span>
                        </div>

                        <!-- Form-level Error Message for Step 1 -->
                        <div class="auth-form-error" id="modalIdentifierFormError" style="display: none;" role="alert">
                            <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                            <span id="modalIdentifierFormErrorText"></span>
                        </div>

                        <!-- Submit & Action Buttons -->
                        <div class="auth-submit-section">
                            <button type="submit" id="modalContinueBtn" class="auth-submit-btn">
                                <i class="fas fa-arrow-right" aria-hidden="true"></i>
                                <span>Continue</span>
                            </button>

                            ${showGuest ? `
                            <button type="button" id="modalGuestBtn" class="auth-guest-btn">
                                <i class="fas fa-user-clock" aria-hidden="true"></i>
                                <span>Continue as Guest</span>
                            </button>` : ''}

                            <p class="auth-switch-link">
                                Don't have an account?
                                <a href="${prefix}users/signup.html" id="modalSignupLink" class="auth-link">Sign up</a>
                            </p>
                        </div>
                    </form>
                </div>

                <!-- STEP 2 — Password (shown after account is verified) -->
                <div id="modalStepPassword" class="login-step" style="display: none;">
                    <!-- User found pill -->
                    <div class="auth-found-pill" id="modalFoundPill">
                        <div class="found-pill-avatar" id="modalFoundAvatar">?</div>
                        <div class="found-pill-info">
                            <span class="found-pill-name" id="modalFoundName">Learner</span>
                            <span class="found-pill-sub" id="modalFoundSub">Account verified</span>
                        </div>
                        <button type="button" class="found-pill-change" id="modalChangeAccountBtn" title="Use a different account" aria-label="Use a different account">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <form id="modalPasswordForm" class="auth-form" novalidate autocomplete="on">
                        <div class="auth-field-group" style="margin-bottom: 0.35rem;">
                            <label class="auth-label" for="modalPassword">
                                Password <span class="auth-required" title="Required">*</span>
                            </label>
                            <div class="auth-input-wrap">
                                <i class="fas fa-key auth-input-icon" aria-hidden="true"></i>
                                <input type="password" id="modalPassword" class="auth-input" placeholder="Enter your password" maxlength="128" autocomplete="current-password" required>
                                <button type="button" class="auth-toggle-pwd" id="modalTogglePassword" title="Show / hide password" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="auth-field-error" id="modalPasswordError" aria-live="polite"></span>
                        </div>

                        <!-- Forgot Password Link -->
                        <div class="auth-forgot-row">
                            <a href="${prefix}users/forgot-password.html" class="auth-forgot-link" id="modalForgotPasswordLink">Forgot Password?</a>
                        </div>

                        <!-- Form-level Error Message for Step 2 -->
                        <div class="auth-form-error" id="modalPasswordFormError" style="display: none;" role="alert">
                            <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                            <span id="modalPasswordFormErrorText"></span>
                        </div>

                        <!-- Submit Button -->
                        <div class="auth-submit-section" style="margin-top: 1rem;">
                            <button type="submit" id="modalSubmitBtn" class="auth-submit-btn">
                                <i class="fas fa-right-to-bracket" aria-hidden="true"></i>
                                <span>Log In</span>
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
        `;
    }

    function initModalElements() {
        let overlay = document.getElementById('edmithLoginModalOverlay');
        if (!overlay) {
            ensureStyles();
            const prefix = getPathPrefix();
            const placeholder = document.createElement('div');
            placeholder.innerHTML = buildModalHtml(prefix, 'Welcome Back', 'Log in to continue your learning journey.', true);
            overlay = placeholder.firstElementChild;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function showLoginModal(options = {}) {
        ensureStyles();
        const {
            returnTo = window.location.href,
            title = 'Sign In to EDMITH',
            subtitle = 'Authentication is required to proceed.',
            force = false,
            showGuest = !force,
            onLoginSuccess = null,
            onCancel = null
        } = options;

        activeModalState = { returnTo, force, onLoginSuccess, onCancel };

        let overlay = document.getElementById('edmithLoginModalOverlay');
        const prefix = getPathPrefix();

        if (overlay) overlay.remove(); // Rebuild with current options
        const temp = document.createElement('div');
        temp.innerHTML = buildModalHtml(prefix, title, subtitle, showGuest);
        overlay = temp.firstElementChild;
        document.body.appendChild(overlay);

        let mode = 'username'; // 'username' | 'email'
        let resolvedEmail = '';

        const cardTitle = overlay.querySelector('#modalCardTitle');
        const cardSubtitle = overlay.querySelector('#modalCardSubtitle');

        // Step 1 Elements
        const step1 = overlay.querySelector('#modalStepIdentifier');
        const idForm = overlay.querySelector('#modalIdentifierForm');
        const tabUsername = overlay.querySelector('#modalTabUsername');
        const tabEmail = overlay.querySelector('#modalTabEmail');
        const idInput = overlay.querySelector('#modalIdentifier');
        const idLabelText = overlay.querySelector('#modalIdentifierLabelText');
        const idIcon = overlay.querySelector('#modalIdentifierIcon');
        const idSpinner = overlay.querySelector('#modalIdentifierSpinner');
        const idError = overlay.querySelector('#modalIdentifierError');
        const idFormError = overlay.querySelector('#modalIdentifierFormError');
        const idFormErrorText = overlay.querySelector('#modalIdentifierFormErrorText');
        const continueBtn = overlay.querySelector('#modalContinueBtn');
        const guestBtn = overlay.querySelector('#modalGuestBtn');
        const signupLink = overlay.querySelector('#modalSignupLink');

        // Step 2 Elements
        const step2 = overlay.querySelector('#modalStepPassword');
        const pwdForm = overlay.querySelector('#modalPasswordForm');
        const foundAvatar = overlay.querySelector('#modalFoundAvatar');
        const foundName = overlay.querySelector('#modalFoundName');
        const foundSub = overlay.querySelector('#modalFoundSub');
        const changeAccountBtn = overlay.querySelector('#modalChangeAccountBtn');
        const pwdInput = overlay.querySelector('#modalPassword');
        const togglePwd = overlay.querySelector('#modalTogglePassword');
        const pwdError = overlay.querySelector('#modalPasswordError');
        const pwdFormError = overlay.querySelector('#modalPasswordFormError');
        const pwdFormErrorText = overlay.querySelector('#modalPasswordFormErrorText');
        const forgotLink = overlay.querySelector('#modalForgotPasswordLink');
        const submitBtn = overlay.querySelector('#modalSubmitBtn');

        const closeBtn = overlay.querySelector('#modalCloseBtn');

        if (forgotLink) forgotLink.href = `${prefix}users/forgot-password.html?returnTo=${encodeURIComponent(returnTo)}`;
        if (signupLink) signupLink.href = `${prefix}users/signup.html?returnTo=${encodeURIComponent(returnTo)}`;

        function showStep1() {
            step1.style.display = 'flex';
            step2.style.display = 'none';
            cardTitle.textContent = title || 'Welcome Back';
            cardSubtitle.textContent = subtitle || 'Log in to continue your learning journey and access tests.';
            idFormError.style.display = 'none';
            idError.textContent = '';
            idInput.classList.remove('input-error');
            idInput.focus();
        }

        function showStep2(displayName, identifierDisplay) {
            step1.style.display = 'none';
            step2.style.display = 'flex';
            cardTitle.textContent = `Hi, ${displayName}! 👋`;
            cardSubtitle.textContent = 'Enter your password to continue.';
            foundAvatar.textContent = displayName.charAt(0).toUpperCase();
            foundName.textContent = displayName;
            foundSub.textContent = identifierDisplay;
            pwdFormError.style.display = 'none';
            pwdError.textContent = '';
            pwdInput.value = '';
            pwdInput.classList.remove('input-error');
            pwdInput.focus();
        }

        function setMode(newMode) {
            mode = newMode;
            idFormError.style.display = 'none';
            idError.textContent = '';
            idInput.classList.remove('input-error');
            idInput.value = '';

            if (mode === 'username') {
                tabUsername.classList.add('active');
                tabUsername.setAttribute('aria-selected', 'true');
                tabEmail.classList.remove('active');
                tabEmail.setAttribute('aria-selected', 'false');
                idLabelText.textContent = 'Username';
                idIcon.className = 'fas fa-at auth-input-icon';
                idInput.type = 'text';
                idInput.placeholder = 'Enter your username';
                idInput.autocomplete = 'username';
            } else {
                tabEmail.classList.add('active');
                tabEmail.setAttribute('aria-selected', 'true');
                tabUsername.classList.remove('active');
                tabUsername.setAttribute('aria-selected', 'false');
                idLabelText.textContent = 'Email Address';
                idIcon.className = 'fas fa-envelope auth-input-icon';
                idInput.type = 'email';
                idInput.placeholder = 'e.g. yourname@example.com';
                idInput.autocomplete = 'email';
            }
            idInput.focus();
        }

        if (tabUsername) tabUsername.addEventListener('click', () => setMode('username'));
        if (tabEmail) tabEmail.addEventListener('click', () => setMode('email'));

        if (changeAccountBtn) {
            changeAccountBtn.addEventListener('click', () => {
                resolvedEmail = '';
                showStep1();
            });
        }

        idInput.addEventListener('input', () => {
            idError.textContent = '';
            idInput.classList.remove('input-error');
            idFormError.style.display = 'none';
        });

        pwdInput.addEventListener('input', () => {
            pwdError.textContent = '';
            pwdInput.classList.remove('input-error');
            pwdFormError.style.display = 'none';
        });

        togglePwd.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            togglePwd.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });

        function hideModal() {
            document.body.classList.remove('login-modal-open');
            overlay.classList.remove('modal-visible');
            setTimeout(() => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 250);
            document.removeEventListener('keydown', onEsc);
        }

        function onEsc(e) {
            if (e.key === 'Escape') {
                if (force) {
                    document.body.classList.remove('login-modal-open');
                    if (onCancel) onCancel();
                    else window.location.href = `${prefix}sql/index.html`;
                } else {
                    hideModal();
                }
            }
        }
        document.addEventListener('keydown', onEsc);

        closeBtn.addEventListener('click', () => {
            if (force) {
                document.body.classList.remove('login-modal-open');
                if (onCancel) onCancel();
                else window.location.href = `${prefix}sql/index.html`;
            } else {
                hideModal();
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (force) {
                    if (onCancel) onCancel();
                    else window.location.href = `${prefix}sql/index.html`;
                } else {
                    hideModal();
                }
            }
        });

        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                sessionStorage.setItem('edmith_guest', 'true');
                hideModal();
                if (onLoginSuccess) onLoginSuccess({ guest: true });
            });
        }

        // STEP 1 SUBMIT — Identifier Verification
        idForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            idFormError.style.display = 'none';
            idError.textContent = '';

            const rawId = idInput.value.trim();

            if (!rawId) {
                idError.textContent = mode === 'username' ? 'Username is required.' : 'Email is required.';
                idInput.classList.add('input-error');
                idInput.focus();
                return;
            }

            if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId)) {
                idError.textContent = 'Please enter a valid email address.';
                idInput.classList.add('input-error');
                idInput.focus();
                return;
            }

            continueBtn.disabled = true;
            continueBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Checking…</span>';
            if (idSpinner) idSpinner.style.display = 'inline-flex';

            try {
                const client = await getSupabaseClient();
                if (!client) throw new Error('Database connection failed. Please check network.');

                const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId);
                let userRow = null;

                if (isEmailFormat) {
                    const { data, error } = await client
                        .from('users')
                        .select('email, username, first_name')
                        .eq('email', rawId.toLowerCase())
                        .maybeSingle();

                    if (!error && data) userRow = data;
                } else {
                    const cleanUser = rawId.replace(/^@+/, '').toLowerCase();
                    const { data, error } = await client
                        .from('users')
                        .select('email, username, first_name')
                        .eq('username', cleanUser)
                        .maybeSingle();

                    if (!error && data) userRow = data;
                }

                if (!userRow || !userRow.email) {
                    const label = mode === 'username' ? 'username' : 'email address';
                    idError.textContent = `No account found with this ${label}.`;
                    idInput.classList.add('input-error');
                    idInput.focus();
                    return;
                }

                resolvedEmail = userRow.email;
                const displayName = userRow.first_name || userRow.username || 'Learner';
                const identifierDisplay = isEmailFormat ? userRow.email : `@${userRow.username}`;
                showStep2(displayName, identifierDisplay);

            } catch (err) {
                console.warn('[EDMITH AuthModal] Identifier lookup error:', err);
                idFormErrorText.textContent = err.message || 'Unable to verify your account. Please try again.';
                idFormError.style.display = 'flex';
            } finally {
                continueBtn.disabled = false;
                continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> <span>Continue</span>';
                if (idSpinner) idSpinner.style.display = 'none';
            }
        });

        // STEP 2 SUBMIT — Sign In with Resolved Email & Password
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            pwdFormError.style.display = 'none';
            pwdError.textContent = '';

            const password = pwdInput.value;
            if (!password) {
                pwdError.textContent = 'Password is required.';
                pwdInput.classList.add('input-error');
                pwdInput.focus();
                return;
            }

            if (!resolvedEmail) {
                pwdFormErrorText.textContent = 'Session expired. Please start again.';
                pwdFormError.style.display = 'flex';
                setTimeout(showStep1, 1200);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Logging In...</span>';

            try {
                const client = await getSupabaseClient();
                if (!client) throw new Error('Database connection failed. Please check network.');

                const { data, error } = await client.auth.signInWithPassword({
                    email: resolvedEmail,
                    password
                });

                if (error) {
                    const errStr = (error.message || '').toLowerCase();
                    if (errStr.includes('invalid') || errStr.includes('credentials')) {
                        throw new Error('Incorrect password. Please try again.');
                    }
                    throw error;
                }

                if (!data || !data.user) {
                    throw new Error('Invalid username or password.');
                }

                sessionStorage.removeItem('edmith_guest');

                submitBtn.style.background = '#10b981';
                submitBtn.innerHTML = '<i class="fas fa-circle-check"></i> <span>Welcome back!</span>';

                setTimeout(() => {
                    hideModal();
                    if (typeof onLoginSuccess === 'function') {
                        onLoginSuccess(data.user);
                    } else {
                        window.location.reload();
                    }
                }, 600);

            } catch (err) {
                console.warn('[EDMITH AuthModal] Sign-in error:', err);
                pwdFormErrorText.textContent = err.message || 'Incorrect password. Please try again.';
                pwdFormError.style.display = 'flex';
                pwdInput.classList.add('input-error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> <span>Log In</span>';
            }
        });

        // Trigger animation
        requestAnimationFrame(() => {
            document.body.classList.add('login-modal-open');
            overlay.classList.add('modal-visible');
            idInput.focus();
        });
    }

    async function requireAuth(options = {}) {
        const hasSession = hasValidSession();
        if (hasSession) return true;

        return new Promise((resolve) => {
            showLoginModal({
                ...options,
                force: true,
                showGuest: false,
                title: options.title || 'Sign In Required',
                subtitle: options.subtitle || 'You must be signed in to take educational assessments.',
                onLoginSuccess: (user) => resolve(user),
                onCancel: () => {
                    const prefix = getPathPrefix();
                    window.location.href = `${prefix}sql/index.html`;
                }
            });
        });
    }

    // Expose API globally
    window.EdmithAuthModal = {
        show: showLoginModal,
        requireAuth,
        hasSession: hasValidSession,
        getPathPrefix
    };

    // Auto-bind to any element with data-auth-trigger="login"
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-auth-trigger="login"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginModal();
            });
        });
    });

})();
