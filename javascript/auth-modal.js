// EDMITH Reusable Global Auth Modal — javascript/auth-modal.js
// Makes the authentic EDITH Login Popup available on EVERY page.
// Integrates seamlessly with Supabase Auth and maintains state across the application.

(function () {
    'use strict';

    const SUPABASE_CONFIG = {
        url: 'https://jnoigbvvxwpvxefunvfc.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub2lnYnZ2eHdwdnhlZnVudmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDkzMjEsImV4cCI6MjEwNTMyNTMyMX0.kg07-fyqAPdnSqs4RxNvzvbD5VhNR8vtFkg-RS5pMnA'
    };

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
        const path = window.location.pathname.replace(/\\/g, '/');
        if (path.includes('/sql/tests/')) return '../../';
        if (path.includes('/sql/') || path.includes('/editors/') || path.includes('/users/')) return '../';
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
                <form id="modalLoginForm" class="auth-form" novalidate autocomplete="on" style="padding: 1.5rem 1.75rem 2rem;">
                    <div class="auth-toggle-group" role="tablist" aria-label="Login method" style="margin-bottom: 1.25rem;">
                        <button type="button" class="auth-toggle-tab active" id="modalTabUsername" role="tab" aria-selected="true">
                            <i class="fas fa-at" aria-hidden="true"></i>
                            <span>Username</span>
                        </button>
                        <button type="button" class="auth-toggle-tab" id="modalTabEmail" role="tab" aria-selected="false">
                            <i class="fas fa-envelope" aria-hidden="true"></i>
                            <span>Email</span>
                        </button>
                    </div>

                    <div class="auth-form-section">
                        <div class="auth-field-group">
                            <label class="auth-label" for="modalIdentifier" id="modalIdentifierLabel">
                                <span id="modalIdentifierLabelText">Username</span> <span class="auth-required" title="Required">*</span>
                            </label>
                            <div class="auth-input-wrap">
                                <i class="fas fa-at auth-input-icon" id="modalIdentifierIcon" aria-hidden="true"></i>
                                <input type="text" id="modalIdentifier" class="auth-input" placeholder="Enter your username" maxlength="100" autocomplete="username" required>
                            </div>
                            <span class="auth-field-error" id="modalIdentifierError" aria-live="polite"></span>
                        </div>

                        <div class="auth-field-group" style="margin-bottom: 0.25rem;">
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

                        <div class="auth-forgot-row">
                            <a href="${prefix}users/forgot-password.html" class="auth-forgot-link" id="modalForgotPasswordLink">Forgot Password?</a>
                        </div>
                    </div>

                    <div class="auth-form-error" id="modalFormError" style="display: none; margin-top: 1rem;" role="alert">
                        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                        <span id="modalFormErrorText"></span>
                    </div>

                    <div class="auth-submit-section" style="margin-top: 1.25rem;">
                        <button type="submit" id="modalSubmitBtn" class="auth-submit-btn">
                            <i class="fas fa-right-to-bracket" aria-hidden="true"></i>
                            <span>Log In</span>
                        </button>

                        ${showGuest ? `
                        <button type="button" id="modalGuestBtn" class="auth-guest-btn">
                            <i class="fas fa-user-clock" aria-hidden="true"></i>
                            <span>Continue as Guest</span>
                        </button>` : ''}

                        <p class="auth-switch-link" style="margin-top: 1.15rem; font-size: 0.9rem;">
                            Don't have an account?
                            <a href="${prefix}users/signup.html" id="modalSignupLink" class="auth-link">Sign up</a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
        `;
    }

    function initModalElements() {
        let overlay = document.getElementById('edmithLoginModalOverlay');
        if (!overlay) {
            const prefix = getPathPrefix();
            const placeholder = document.createElement('div');
            placeholder.innerHTML = buildModalHtml(prefix, 'Welcome Back', 'Log in to continue your learning journey.', true);
            overlay = placeholder.firstElementChild;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function showLoginModal(options = {}) {
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

        if (overlay) overlay.remove(); // Rebuild to reflect specific title/force options
        const temp = document.createElement('div');
        temp.innerHTML = buildModalHtml(prefix, title, subtitle, showGuest);
        overlay = temp.firstElementChild;
        document.body.appendChild(overlay);

        const cardTitle = overlay.querySelector('#modalCardTitle');
        const cardSubtitle = overlay.querySelector('#modalCardSubtitle');
        const formError = overlay.querySelector('#modalFormError');
        const formErrorText = overlay.querySelector('#modalFormErrorText');
        const idInput = overlay.querySelector('#modalIdentifier');
        const pwdInput = overlay.querySelector('#modalPassword');
        const idLabelText = overlay.querySelector('#modalIdentifierLabelText');
        const idIcon = overlay.querySelector('#modalIdentifierIcon');
        const idError = overlay.querySelector('#modalIdentifierError');
        const pwdError = overlay.querySelector('#modalPasswordError');
        const tabUsername = overlay.querySelector('#modalTabUsername');
        const tabEmail = overlay.querySelector('#modalTabEmail');
        const togglePwd = overlay.querySelector('#modalTogglePassword');
        const submitBtn = overlay.querySelector('#modalSubmitBtn');
        const guestBtn = overlay.querySelector('#modalGuestBtn');
        const closeBtn = overlay.querySelector('#modalCloseBtn');
        const form = overlay.querySelector('#modalLoginForm');
        const forgotLink = overlay.querySelector('#modalForgotPasswordLink');
        const signupLink = overlay.querySelector('#modalSignupLink');

        if (forgotLink) forgotLink.href = `${prefix}users/forgot-password.html?returnTo=${encodeURIComponent(returnTo)}`;
        if (signupLink) signupLink.href = `${prefix}users/signup.html?returnTo=${encodeURIComponent(returnTo)}`;

        let mode = 'username';

        function setMode(newMode) {
            mode = newMode;
            formError.style.display = 'none';
            idError.textContent = '';
            pwdError.textContent = '';
            idInput.classList.remove('input-error', 'input-success');
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
                idInput.placeholder = 'e.g. learner@example.com';
                idInput.autocomplete = 'email';
            }
            idInput.focus();
        }

        tabUsername.addEventListener('click', () => setMode('username'));
        tabEmail.addEventListener('click', () => setMode('email'));

        togglePwd.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            togglePwd.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });

        function hideModal() {
            overlay.classList.remove('modal-visible');
            setTimeout(() => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 250);
            document.removeEventListener('keydown', onEsc);
        }

        function onEsc(e) {
            if (e.key === 'Escape') {
                if (force) {
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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            formError.style.display = 'none';

            const rawId = idInput.value.trim();
            const password = pwdInput.value;
            let valid = true;

            if (!rawId) {
                idError.textContent = mode === 'username' ? 'Username is required.' : 'Email is required.';
                idInput.classList.add('input-error');
                valid = false;
            } else if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId)) {
                idError.textContent = 'Please enter a valid email address.';
                idInput.classList.add('input-error');
                valid = false;
            } else {
                idError.textContent = '';
                idInput.classList.remove('input-error');
            }

            if (!password) {
                pwdError.textContent = 'Password is required.';
                pwdInput.classList.add('input-error');
                valid = false;
            } else {
                pwdError.textContent = '';
                pwdInput.classList.remove('input-error');
            }

            if (!valid) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Logging In...</span>';

            try {
                const client = await getSupabaseClient();
                if (!client) throw new Error('Database connection failed. Please check network.');

                let targetEmail = '';
                if (mode === 'username') {
                    const normalized = rawId.toLowerCase();
                    const { data: userRow, error: uErr } = await client
                        .from('users')
                        .select('email')
                        .ilike('username', normalized)
                        .maybeSingle();

                    if (uErr || !userRow || !userRow.email) {
                        throw new Error('Invalid username or password.');
                    }
                    targetEmail = userRow.email;
                } else {
                    targetEmail = rawId.toLowerCase();
                }

                const { data, error } = await client.auth.signInWithPassword({
                    email: targetEmail,
                    password
                });

                if (error) throw error;
                if (!data || !data.user) {
                    throw new Error('Invalid credentials.');
                }

                sessionStorage.removeItem('edmith_guest');

                submitBtn.style.background = '#10b981';
                submitBtn.innerHTML = '<i class="fas fa-circle-check"></i> <span>Welcome back!</span>';

                setTimeout(() => {
                    hideModal();
                    if (typeof onLoginSuccess === 'function') {
                        onLoginSuccess(data.user);
                    } else {
                        // Refresh to apply session
                        window.location.reload();
                    }
                }, 600);

            } catch (err) {
                console.warn('[EDMITH AuthModal] Sign-in error:', err);
                formErrorText.textContent = err.message || 'Invalid login credentials.';
                formError.style.display = 'flex';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> <span>Log In</span>';
            }
        });

        // Trigger animation
        requestAnimationFrame(() => {
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
