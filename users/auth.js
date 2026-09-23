// EDMITH Auth Controller — users/auth.js
// Handles signup and login form validation, guest access, and Supabase integration.

// ============================================================
// SUPABASE CONFIGURATION
// URL  : Supabase project URL (from Project Settings → API)
// KEY  : anon / publishable key — safe to use in frontend code
//        (Supabase Project Settings → API → "anon public" key)
// ============================================================
const SUPABASE_URL = 'https://jnoigbvvxwpvxefunvfc.supabase.co';
// const SUPABASE_ANON_KEY = 'sb_publishable_MP8oTZ_Ni9RuGqIVoA6jOA_Ort2l2qo';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub2lnYnZ2eHdwdnhlZnVudmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDkzMjEsImV4cCI6MjEwNTMyNTMyMX0.kg07-fyqAPdnSqs4RxNvzvbD5VhNR8vtFkg-RS5pMnA';

// ============================================================
// Initialise Supabase client using the CDN window.supabase object
// (equivalent to: import { createClient } from '@supabase/supabase-js'
//  in a Vite/npm project — static-site equivalent)
// ============================================================
let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('[EDMITH Auth] Supabase init failed. Did you add the CDN script?', e);
}

// ============================================================
// SHARED UTILITIES & HELPERS
// ============================================================

/**
 * Validates and extracts a safe return destination.
 * Prevents open redirects, protocol-relative destinations (//), and javascript: schemes.
 * Only allows destinations within the same origin.
 */
function getSafeReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (!returnTo) return null;

    try {
        if (/^(\/\/|javascript:|data:)/i.test(returnTo)) return null;

        const url = new URL(returnTo, window.location.origin);
        if (url.origin === window.location.origin) {
            // Avoid loops back to login or signup
            if (url.pathname.includes('/users/login.html') || url.pathname.includes('/users/signup.html')) {
                return null;
            }
            return url.pathname + url.search + url.hash;
        }
    } catch (e) {
        // If not a full URL, check if it's a relative path on same site
        if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
            return returnTo;
        }
    }
    return null;
}

function setFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

function clearError(errorId) {
    const el = document.getElementById(errorId);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

/**
 * @param {HTMLElement} input
 * @param {'idle'|'success'|'error'} state
 */
function setFieldState(input, state) {
    if (!input) return;
    input.classList.remove('input-success', 'input-error');
    if (state === 'success') input.classList.add('input-success');
    if (state === 'error') input.classList.add('input-error');
}

function showFormError(message) {
    const formErrorTextEl = document.getElementById('formErrorText');
    const formErrorEl = document.getElementById('formError');
    if (formErrorTextEl) formErrorTextEl.textContent = message;
    if (formErrorEl) { formErrorEl.style.display = 'flex'; }
    formErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideFormError() {
    const formErrorEl = document.getElementById('formError');
    if (formErrorEl) formErrorEl.style.display = 'none';
}

function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
    });
}

function addLiveClearListener(el, errorId, extraCheck) {
    if (!el) return;
    const eventName = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(eventName, () => {
        if (!el.classList.contains('input-error')) return;
        const val = (el.tagName === 'SELECT') ? el.value : el.value.trim();
        const passes = extraCheck ? extraCheck(val) : val.length > 0;
        if (passes) {
            clearError(errorId);
            setFieldState(el, 'idle');
        }
    });
}

/**
 * Maps Supabase / generic error messages to user-friendly strings.
 */
function friendlyError(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('user already registered') || m.includes('email already'))
        return 'An account with this email already exists. Try logging in instead.';
    if (m.includes('password') && m.includes('weak'))
        return 'Your password is too weak. Please use a stronger password.';
    if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
        return 'We couldn\'t connect to the authentication service. Please check your internet connection and try again.';
    if (m.includes('supabase_url') || m.includes('your_project_ref'))
        return 'The app is not connected to the database yet. Please add your Supabase credentials in users/auth.js.';
    if (m.includes('rate limit') || m.includes('email_send_rate') || m.includes('over_email_send_rate'))
        return 'We could not process your request right now due to high demand. Please wait a few minutes and try again.';
    if (m.includes('signup') && m.includes('disabled'))
        return 'New account registrations are temporarily paused. Please try again later.';
    return msg || 'Something went wrong. Please try again.';
}

/**
 * Specific user-friendly error messages for login.
 * Supports Username (default) and Email login modes.
 */
function friendlyLoginError(msg, mode = 'username') {
    const m = (msg || '').toLowerCase();
    if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('user not found') || m.includes('invalid password') || m.includes('invalid user')) {
        return mode === 'username'
            ? 'Invalid username or password.'
            : 'Invalid email or password.';
    }
    if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
        return 'We couldn\'t connect to the authentication service. Please check your internet connection and try again.';
    }
    if (m.includes('email not confirmed')) {
        // In the current implementation, email verification is out of scope.
        return mode === 'username'
            ? 'Invalid username or password.'
            : 'Invalid email or password.';
    }
    return friendlyError(msg);
}


// ============================================================
// SIGNUP PAGE CONTROLLER
// Only initializes if signupForm exists in the DOM.
// ============================================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const usernameEl = document.getElementById('username');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const confirmPasswordEl = document.getElementById('confirmPassword');
    const countryEl = document.getElementById('country');
    const learningGoalEl = document.getElementById('learningGoal');
    const referralSourceEl = document.getElementById('referralSource');
    const referralOtherGroupEl = document.getElementById('referralOtherGroup');
    const referralOtherEl = document.getElementById('referralOther');
    const agreedTermsEl = document.getElementById('agreedTerms');
    const agreedPrivacyEl = document.getElementById('agreedPrivacy');
    const submitBtn = document.getElementById('submitBtn');
    const successOverlay = document.getElementById('successOverlay');
    const verifiedEmailEl = document.getElementById('verifiedEmail');

    // Password strength & requirements
    const strengthFill = document.getElementById('strengthFill');
    const strengthLabel = document.getElementById('strengthLabel');

    // Preserve returnTo parameter on the "Log in to EDMITH" link if present
    const safeReturn = getSafeReturnUrl();
    if (safeReturn) {
        const loginLink = document.querySelector('.auth-switch-link a');
        if (loginLink) {
            loginLink.href = `login.html?returnTo=${encodeURIComponent(safeReturn)}`;
        }
    }

    // --- Username Debounce Availability Check ---
    let usernameDebounceTimer = null;
    if (usernameEl) {
        usernameEl.addEventListener('input', () => {
            clearTimeout(usernameDebounceTimer);
            const val = usernameEl.value.trim();
            const statusEl = document.getElementById('usernameStatus');

            setFieldState(usernameEl, 'idle');
            if (statusEl) statusEl.textContent = '';

            if (val.length < 3) return;

            const formatOk = /^[a-zA-Z0-9._-]{3,30}$/.test(val);
            if (!formatOk) {
                setFieldError('usernameError', 'Invalid characters. Use only letters, numbers, dots, hyphens, or underscores.');
                setFieldState(usernameEl, 'error');
                return;
            }

            clearError('usernameError');
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color: var(--text-secondary);"></i>';

            usernameDebounceTimer = setTimeout(async () => {
                const available = await checkUsernameAvailability(val);
                if (available === true) {
                    if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-check" style="color: #10b981;"></i>';
                    setFieldState(usernameEl, 'success');
                } else if (available === false) {
                    if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-xmark" style="color: #ef4444;"></i>';
                    setFieldError('usernameError', 'This username is already taken. Try another.');
                    setFieldState(usernameEl, 'error');
                } else {
                    if (statusEl) statusEl.textContent = '';
                }
            }, 600);
        });
    }

    // --- Password Live Requirements ---
    if (passwordEl) {
        passwordEl.addEventListener('input', () => {
            updatePasswordRequirements(passwordEl.value);
            clearError('passwordError');
            if (passwordEl.classList.contains('input-error')) {
                setFieldState(passwordEl, 'idle');
            }
            if (confirmPasswordEl && confirmPasswordEl.value) {
                validateConfirmPassword();
            }
        });
    }

    function updatePasswordRequirements(pwd) {
        const checks = {
            'req-length': pwd.length >= 8,
            'req-upper': /[A-Z]/.test(pwd),
            'req-lower': /[a-z]/.test(pwd),
            'req-number': /[0-9]/.test(pwd),
            'req-special': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        };

        let passedCount = 0;
        for (const [id, passed] of Object.entries(checks)) {
            const el = document.getElementById(id);
            if (!el) continue;
            const icon = el.querySelector('.req-icon');
            if (passed) {
                el.classList.add('req-pass');
                el.classList.remove('req-fail');
                if (icon) { icon.className = 'fas fa-circle-check req-icon'; }
                passedCount++;
            } else {
                el.classList.remove('req-pass');
                if (pwd.length > 0) {
                    el.classList.add('req-fail');
                    if (icon) { icon.className = 'fas fa-circle-xmark req-icon'; }
                } else {
                    el.classList.remove('req-fail');
                    if (icon) { icon.className = 'fas fa-circle-xmark req-icon'; }
                }
            }
        }

        updateStrengthBar(passedCount, pwd.length);
    }

    function updateStrengthBar(passedCount, pwdLen) {
        if (!strengthFill || !strengthLabel) return;
        if (pwdLen === 0) {
            strengthFill.style.width = '0%';
            strengthFill.className = 'auth-strength-fill';
            strengthLabel.textContent = '';
            return;
        }

        const pct = (passedCount / 5) * 100;
        let cls = '';
        let label = '';

        if (passedCount <= 1) { cls = 'strength-weak'; label = 'Weak'; }
        else if (passedCount === 2) { cls = 'strength-fair'; label = 'Fair'; }
        else if (passedCount === 3) { cls = 'strength-good'; label = 'Good'; }
        else if (passedCount === 4) { cls = 'strength-strong'; label = 'Strong'; }
        else { cls = 'strength-very-strong'; label = 'Very Strong'; }

        strengthFill.style.width = pct + '%';
        strengthFill.className = 'auth-strength-fill ' + cls;
        strengthLabel.textContent = label;
        strengthLabel.className = 'auth-strength-label ' + cls;
    }

    // --- Confirm Password Match ---
    if (confirmPasswordEl) {
        confirmPasswordEl.addEventListener('input', validateConfirmPassword);
    }

    function validateConfirmPassword() {
        if (!confirmPasswordEl || !passwordEl) return;
        const statusEl = document.getElementById('confirmStatus');
        const pwd = passwordEl.value;
        const cpwd = confirmPasswordEl.value;

        if (!cpwd) {
            setFieldState(confirmPasswordEl, 'idle');
            if (statusEl) statusEl.textContent = '';
            clearError('confirmPasswordError');
            return;
        }

        if (pwd === cpwd) {
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-check" style="color: #10b981;"></i>';
            setFieldState(confirmPasswordEl, 'success');
            clearError('confirmPasswordError');
        } else {
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-xmark" style="color: #ef4444;"></i>';
            setFieldState(confirmPasswordEl, 'error');
            setFieldError('confirmPasswordError', 'Passwords do not match.');
        }
    }

    // --- Referral Other Toggle ---
    if (referralSourceEl && referralOtherGroupEl && referralOtherEl) {
        referralSourceEl.addEventListener('change', () => {
            if (referralSourceEl.value === 'Other') {
                referralOtherGroupEl.style.display = 'block';
                referralOtherEl.focus();
            } else {
                referralOtherGroupEl.style.display = 'none';
                referralOtherEl.value = '';
            }
        });
    }

    // --- Live Clear Listeners ---
    addLiveClearListener(firstNameEl, 'firstNameError');
    addLiveClearListener(emailEl, 'emailError', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    addLiveClearListener(countryEl, 'countryError', (v) => v !== '');

    [agreedTermsEl, agreedPrivacyEl].forEach((chk) => {
        if (!chk) return;
        chk.addEventListener('change', () => {
            if (chk.checked) {
                const errId = chk.id === 'agreedTerms' ? 'termsError' : 'privacyError';
                clearError(errId);
            }
        });
    });

    // Password visibility toggles
    setupPasswordToggle('togglePassword', 'password');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    // --- Form Submission ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormError();

        if (!validateAllFields()) return;

        setSubmitLoading(true);

        try {
            await handleSignup();
        } catch (err) {
            console.error('[EDMITH Auth] Signup error:', err);
            showFormError(friendlyError(err.message || String(err)));
            setSubmitLoading(false);
        }
    });

    function validateAllFields() {
        let valid = true;

        const firstName = firstNameEl ? firstNameEl.value.trim() : '';
        if (!firstName) {
            setFieldError('firstNameError', 'First name is required.');
            if (firstNameEl) setFieldState(firstNameEl, 'error');
            valid = false;
        } else {
            clearError('firstNameError');
            if (firstNameEl) setFieldState(firstNameEl, 'success');
        }

        const username = usernameEl ? usernameEl.value.trim() : '';
        const usernameRegex = /^[a-zA-Z0-9._-]{3,30}$/;
        if (!username) {
            setFieldError('usernameError', 'Username is required.');
            if (usernameEl) setFieldState(usernameEl, 'error');
            valid = false;
        } else if (!usernameRegex.test(username)) {
            setFieldError('usernameError', 'Username may only contain letters, numbers, dots, hyphens, or underscores (3–30 chars, no spaces).');
            if (usernameEl) setFieldState(usernameEl, 'error');
            valid = false;
        } else if (username.includes(' ')) {
            setFieldError('usernameError', 'Username cannot contain spaces.');
            if (usernameEl) setFieldState(usernameEl, 'error');
            valid = false;
        }

        const email = emailEl ? emailEl.value.trim() : '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setFieldError('emailError', 'Email address is required.');
            if (emailEl) setFieldState(emailEl, 'error');
            valid = false;
        } else if (!emailRegex.test(email)) {
            setFieldError('emailError', 'Please enter a valid email address (e.g. mrinal@example.com).');
            if (emailEl) setFieldState(emailEl, 'error');
            valid = false;
        } else {
            clearError('emailError');
            if (emailEl) setFieldState(emailEl, 'success');
        }

        const password = passwordEl ? passwordEl.value : '';
        const pwdOk =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        if (!password) {
            setFieldError('passwordError', 'Password is required.');
            if (passwordEl) setFieldState(passwordEl, 'error');
            valid = false;
        } else if (!pwdOk) {
            setFieldError('passwordError', 'Password does not meet all requirements above.');
            if (passwordEl) setFieldState(passwordEl, 'error');
            valid = false;
        } else {
            clearError('passwordError');
            if (passwordEl) setFieldState(passwordEl, 'success');
        }

        const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value : '';
        if (!confirmPassword) {
            setFieldError('confirmPasswordError', 'Please re-enter your password.');
            if (confirmPasswordEl) setFieldState(confirmPasswordEl, 'error');
            valid = false;
        } else if (password !== confirmPassword) {
            setFieldError('confirmPasswordError', 'Passwords do not match.');
            if (confirmPasswordEl) setFieldState(confirmPasswordEl, 'error');
            valid = false;
        } else {
            clearError('confirmPasswordError');
            if (confirmPasswordEl) setFieldState(confirmPasswordEl, 'success');
        }

        const country = countryEl ? countryEl.value : '';
        if (!country) {
            setFieldError('countryError', 'Please select your country.');
            if (countryEl) setFieldState(countryEl, 'error');
            valid = false;
        } else {
            clearError('countryError');
            if (countryEl) setFieldState(countryEl, 'success');
        }

        if (agreedTermsEl && !agreedTermsEl.checked) {
            setFieldError('termsError', 'You must agree to the Terms and Conditions to continue.');
            valid = false;
        } else {
            clearError('termsError');
        }

        if (agreedPrivacyEl && !agreedPrivacyEl.checked) {
            setFieldError('privacyError', 'You must agree to the Privacy Policy to continue.');
            valid = false;
        } else {
            clearError('privacyError');
        }

        if (!valid) {
            const firstError = signupForm.querySelector('.auth-field-error:not(:empty)');
            if (firstError) {
                firstError.closest('.auth-field-group, .auth-form-section')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return valid;
    }

    async function handleSignup() {
        const firstName = firstNameEl.value.trim();
        const lastName = lastNameEl ? (lastNameEl.value.trim() || null) : null;
        const rawUsername = usernameEl.value.trim();
        const normalizedUsername = rawUsername.toLowerCase();
        const displayUsername = rawUsername;
        const email = emailEl.value.trim().toLowerCase();
        const password = passwordEl.value;
        const country = countryEl.value;
        const learningGoal = learningGoalEl ? (learningGoalEl.value || null) : null;
        const referralSource = referralSourceEl ? (referralSourceEl.value || null) : null;
        const referralOther = (referralSource === 'Other' && referralOtherEl)
            ? (referralOtherEl.value.trim() || null)
            : null;

        if (SUPABASE_URL.includes('YOUR_PROJECT_REF') || !supabaseClient) {
            throw new Error('Supabase is not configured. Please check your Supabase credentials in users/auth.js.');
        }

        // Case-insensitive preflight check to avoid race conditions and duplicates
        const isAvail = await checkUsernameAvailability(normalizedUsername);
        if (isAvail === false) {
            setFieldError('usernameError', 'This username is already taken. Please choose another username.');
            setFieldState(usernameEl, 'error');
            setSubmitLoading(false);
            return;
        }

        /*
         * ============================================================
         * TODO: ENABLE EMAIL VERIFICATION (FUTURE ARCHITECTURE)
         *
         * Email verification will be mandatory for EDMITH users.
         * It is intentionally disabled for the current scope.
         *
         * When enabled in future:
         * 1. Pass emailRedirectTo in the options below:
         *      options: {
         *          emailRedirectTo: window.location.origin + '/users/login.html',
         *          data: { ... }
         *      }
         * 2. After signUp call:
         *      if (authData.user && !authData.user.email_confirmed_at) {
         *          showSuccessOverlay(email);
         *          return;
         *      }
         * 3. Prevent unverified users from logging in / accessing
         *    authenticated functionality until verified.
         * 4. Display the appropriate verification message.
         * 5. Provide a resend verification email option.
         *
         * DO NOT ENABLE THIS FOR THE CURRENT IMPLEMENTATION.
         * ============================================================
         */
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name:       firstName,
                    last_name:        lastName,
                    username:         normalizedUsername,
                    username_display: displayUsername,
                    country:          country,
                    learning_goal:    learningGoal,
                    referral_source:  referralSource,
                    referral_other:   referralOther,
                },
            },
        });

        if (authError) {
            const errStr = (authError.message || '').toLowerCase();
            if (errStr.includes('unique') || errStr.includes('already exists') || errStr.includes('23505') || errStr.includes('duplicate key')) {
                throw new Error('This username or email is already taken. Please choose another username.');
            }
            throw new Error(authError.message);
        }
        if (!authData.user) {
            throw new Error('Signup failed — no user returned. Please try again.');
        }

        // Show brief success feedback then redirect
        showSignupSuccessState(firstName);
        setTimeout(() => redirectAfterSignup(), 1600);
    }

    function showSignupSuccessState(firstName) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.background = '#10b981';
            submitBtn.style.boxShadow  = '0 6px 20px rgba(16,185,129,0.4)';
            submitBtn.innerHTML =
                `<i class="fas fa-circle-check"></i> <span>Welcome, ${firstName}! Redirecting…</span>`;
        }
        hideFormError();
    }

    function redirectAfterSignup() {
        const safeUrl = getSafeReturnUrl();
        if (safeUrl) {
            window.location.href = safeUrl;
            return;
        }
        // Default: profile page (same folder as signup.html)
        window.location.href = 'profile.html';
    }

    async function checkUsernameAvailability(username) {
        if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_REF')) return null;
        try {
            const normalized = (username || '').trim().toLowerCase();
            if (!normalized) return null;
            const { data, error } = await supabaseClient
                .from('users')
                .select('username')
                .ilike('username', normalized)
                .maybeSingle();

            if (error) { console.warn('[EDMITH Auth] Username check error:', error); return null; }
            return data === null;
        } catch (e) {
            console.warn('[EDMITH Auth] Username check failed:', e);
            return null;
        }
    }

    function showSuccessOverlay(email) {
        if (verifiedEmailEl) verifiedEmailEl.textContent = email;
        if (successOverlay) {
            successOverlay.style.display = 'flex';
            successOverlay.style.opacity = '0';
            requestAnimationFrame(() => {
                successOverlay.style.transition = 'opacity 0.4s ease';
                successOverlay.style.opacity = '1';
            });
        }
        const card = document.getElementById('authCard');
        if (card) card.style.display = 'none';
    }

    function setSubmitLoading(loading) {
        if (!submitBtn) return;
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML =
                '<i class="fas fa-circle-notch fa-spin"></i> <span>Creating Account...</span>';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML =
                '<i class="fas fa-rocket"></i> <span>Create My Account</span>';
        }
    }
}


// ============================================================
// LOGIN PAGE CONTROLLER
// Only initializes if loginForm exists in the DOM.
// Supports Username (default) and Email authentication modes.
// ============================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    const tabUsername = document.getElementById('tabUsername');
    const tabEmail = document.getElementById('tabEmail');
    const identifierInput = document.getElementById('identifier') || document.getElementById('email');
    const identifierLabelText = document.getElementById('identifierLabelText');
    const identifierIcon = document.getElementById('identifierIcon');
    const loginPasswordEl = document.getElementById('password');
    const loginSubmitBtn = document.getElementById('submitBtn');
    const guestBtn = document.getElementById('guestBtn');
    const signupLink = document.getElementById('signupLink');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    let loginMode = 'username'; // 'username' (default) | 'email'

    // Switch between Username and Email modes dynamically without page reload
    function setLoginMode(mode) {
        loginMode = mode;
        hideFormError();
        clearError('identifierError');
        clearError('emailError');
        clearError('passwordError');

        if (identifierInput) {
            setFieldState(identifierInput, 'idle');
            identifierInput.value = '';
        }

        if (mode === 'username') {
            tabUsername?.classList.add('active');
            tabUsername?.setAttribute('aria-selected', 'true');
            tabEmail?.classList.remove('active');
            tabEmail?.setAttribute('aria-selected', 'false');

            if (identifierLabelText) identifierLabelText.textContent = 'Username';
            if (identifierIcon) identifierIcon.className = 'fas fa-at auth-input-icon';
            if (identifierInput) {
                identifierInput.type = 'text';
                identifierInput.placeholder = 'Enter your username';
                identifierInput.autocomplete = 'username';
            }
        } else {
            tabEmail?.classList.add('active');
            tabEmail?.setAttribute('aria-selected', 'true');
            tabUsername?.classList.remove('active');
            tabUsername?.setAttribute('aria-selected', 'false');

            if (identifierLabelText) identifierLabelText.textContent = 'Email Address';
            if (identifierIcon) identifierIcon.className = 'fas fa-envelope auth-input-icon';
            if (identifierInput) {
                identifierInput.type = 'email';
                identifierInput.placeholder = 'e.g. mrinal@example.com';
                identifierInput.autocomplete = 'email';
            }
        }

        identifierInput?.focus();
    }

    if (tabUsername) tabUsername.addEventListener('click', () => setLoginMode('username'));
    if (tabEmail) tabEmail.addEventListener('click', () => setLoginMode('email'));

    // ── Check if already logged in with a valid session ──────────
    (async function checkExistingSession() {
        if (supabaseClient) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    const safeUrl = getSafeReturnUrl();
                    window.location.href = safeUrl || '../index.html';
                }
            } catch (e) {
                console.warn('[EDMITH Auth] Session check error:', e);
            }
        }
    })();

    // ── Preserve returnTo destination on links ──────────────────
    const safeReturn = getSafeReturnUrl();
    if (safeReturn) {
        if (signupLink) signupLink.href = `signup.html?returnTo=${encodeURIComponent(safeReturn)}`;
        if (forgotPasswordLink) forgotPasswordLink.href = `forgot-password.html?returnTo=${encodeURIComponent(safeReturn)}`;
    }

    // ── Password visibility toggle ──────────────────────────────
    setupPasswordToggle('togglePassword', 'password');

    // ── Live clearing of input error states ──────────────────────
    if (identifierInput) {
        identifierInput.addEventListener('input', () => {
            clearError('identifierError');
            clearError('emailError');
            if (identifierInput.classList.contains('input-error')) {
                setFieldState(identifierInput, 'idle');
            }
        });
    }

    if (loginPasswordEl) {
        loginPasswordEl.addEventListener('input', () => {
            clearError('passwordError');
            if (loginPasswordEl.classList.contains('input-error')) {
                setFieldState(loginPasswordEl, 'idle');
            }
        });
    }

    // ── Continue as Guest Handler ────────────────────────────────
    // Remembers guest preference using sessionStorage for the active session.
    // Does NOT create a fake Supabase account.
    if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('edmith_guest', 'true');
            const safeUrl = getSafeReturnUrl();
            window.location.href = safeUrl || '../index.html';
        });
    }

    // ── Login Form Submission ────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormError();

        let valid = true;
        const rawIdentifier = identifierInput ? identifierInput.value.trim() : '';
        const password = loginPasswordEl ? loginPasswordEl.value : '';
        const errorId = document.getElementById('identifierError') ? 'identifierError' : 'emailError';

        // Identifier validation
        if (!rawIdentifier) {
            const label = loginMode === 'username' ? 'Username' : 'Email address';
            setFieldError(errorId, `${label} is required.`);
            if (identifierInput) setFieldState(identifierInput, 'error');
            valid = false;
        } else if (loginMode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier)) {
            setFieldError(errorId, 'Please enter a valid email address.');
            if (identifierInput) setFieldState(identifierInput, 'error');
            valid = false;
        } else {
            clearError(errorId);
            if (identifierInput) setFieldState(identifierInput, 'success');
        }

        // Password validation
        if (!password) {
            setFieldError('passwordError', 'Password is required.');
            if (loginPasswordEl) setFieldState(loginPasswordEl, 'error');
            valid = false;
        } else {
            clearError('passwordError');
            if (loginPasswordEl) setFieldState(loginPasswordEl, 'idle');
        }

        if (!valid) return;

        // Set Loading state
        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Logging In...</span>';
        }

        try {
            if (!supabaseClient || SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
                throw new Error('Supabase is not configured. Please check your Supabase credentials in users/auth.js.');
            }

            let targetEmail = '';

            if (loginMode === 'username') {
                const normalizedUser = rawIdentifier.toLowerCase();
                // Securely resolve username to account email
                // Query looks up only the email corresponding to this specific normalized username
                const { data: userRow, error: lookupErr } = await supabaseClient
                    .from('users')
                    .select('email')
                    .ilike('username', normalizedUser)
                    .maybeSingle();

                if (lookupErr || !userRow || !userRow.email) {
                    // Safe generic error: avoid disclosing account existence
                    throw new Error('Invalid username or password.');
                }
                targetEmail = userRow.email;
            } else {
                targetEmail = rawIdentifier.toLowerCase();
            }

            // Authenticate with Supabase email & password
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: targetEmail,
                password,
            });

            if (error) throw error;
            if (!data || !data.user) {
                throw new Error(loginMode === 'username' ? 'Invalid username or password.' : 'Invalid email or password.');
            }

            /*
             * ============================================================
             * TODO: EMAIL VERIFICATION CHECK (FUTURE ARCHITECTURE)
             *
             * Email verification is mandatory for EDMITH users in production.
             * Currently disabled because email verification is out of scope
             * for the current EDMITH authentication implementation.
             *
             * When enabled in future:
             * if (data.user && !data.user.email_confirmed_at) {
             *     await supabaseClient.auth.signOut();
             *     throw new Error('Please verify your email before logging in.');
             * }
             *
             * DO NOT ENABLE THIS FOR THE CURRENT IMPLEMENTATION.
             * ============================================================
             */

            // Clear temporary guest flag now that user has an active authenticated session
            sessionStorage.removeItem('edmith_guest');

            // Success feedback
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                loginSubmitBtn.style.background = '#10b981';
                loginSubmitBtn.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)';
                loginSubmitBtn.innerHTML = '<i class="fas fa-circle-check"></i> <span>Welcome back! Redirecting…</span>';
            }

            setTimeout(() => {
                const safeUrl = getSafeReturnUrl();
                window.location.href = safeUrl || '../index.html';
            }, 800);

        } catch (err) {
            console.error('[EDMITH Auth] Login error:', err);
            showFormError(friendlyLoginError(err.message || String(err), loginMode));
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.style.background = '';
                loginSubmitBtn.style.boxShadow = '';
                loginSubmitBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> <span>Log In</span>';
            }
        }
    });
}




