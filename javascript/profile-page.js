/**
 * EDMITH - User Profile Dashboard Logic
 * Robust 4-state management (Loading, Authenticated, Unauthenticated, Error)
 * with timeout safeguards, performance statistics, and difficulty rank breakdown.
 */
(function () {
    'use strict';

    const PROFILE_SUPABASE_URL = 'https://jnoigbvvxwpvxefunvfc.supabase.co';
    const PROFILE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impub2lnYnZ2eHdwdnhlZnVudmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDkzMjEsImV4cCI6MjEwNTMyNTMyMX0.kg07-fyqAPdnSqs4RxNvzvbD5VhNR8vtFkg-RS5pMnA';

    let supabaseClient = null;
    if (window.supabase?.createClient) {
        supabaseClient = window.supabase.createClient(PROFILE_SUPABASE_URL, PROFILE_SUPABASE_ANON_KEY);
        window.profileSupabase = supabaseClient;
    }

    // State container elements
    const stateLoading = document.getElementById('profileStateLoading');
    const stateContent = document.getElementById('profileStateContent');
    const stateUnauth = document.getElementById('profileStateUnauth');
    const stateError = document.getElementById('profileStateError');
    const errorMsgEl = document.getElementById('profileErrorMessage');
    const retryBtn = document.getElementById('profileRetryBtn');

    // UI elements
    const avatarInit = document.getElementById('avatarInitial');
    const avatarNameEl = document.getElementById('avatarName');
    const avatarUserEl = document.getElementById('avatarUsername');
    const nameEl = document.getElementById('profileName');
    const usernameEl = document.getElementById('profileUsername');
    const emailEl = document.getElementById('profileEmail');
    const countryEl = document.getElementById('profileCountry');
    const goalEl = document.getElementById('profileGoal');
    const createdEl = document.getElementById('profileCreated');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');

    // Overview Stats
    const statTestsTaken = document.getElementById('statTestsTaken');
    const statTotalScore = document.getElementById('statTotalScore');
    const statAvgAccuracy = document.getElementById('statAvgAccuracy');
    const statHighestRank = document.getElementById('statHighestRank');

    // Difficulties container
    const difficultiesContainer = document.getElementById('difficultiesContainer');

    // Course progress container
    const progressCardBody = document.getElementById('progressCardBody');

    // Recent attempts body
    const recentAttemptsBody = document.getElementById('recentAttemptsBody');

    function esc(v) {
        return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
    }

    function setState(state, errorMsg) {
        if (stateLoading) stateLoading.style.display = state === 'loading' ? 'block' : 'none';
        if (stateContent) stateContent.style.display = state === 'authenticated' ? 'block' : 'none';
        if (stateUnauth) stateUnauth.style.display = state === 'unauthenticated' ? 'block' : 'none';
        if (stateError) stateError.style.display = state === 'error' ? 'block' : 'none';

        if (state === 'error' && errorMsgEl) {
            errorMsgEl.textContent = errorMsg || 'Unable to load profile. Please verify network connectivity.';
        }
    }

    async function initProfile() {
        setState('loading');

        try {
            if (!supabaseClient) {
                setState('error', 'Supabase client library failed to initialize.');
                return;
            }

            // Purge any legacy shared storage
            if (window.EdmithProgress?.purgeLegacyUnscopedStorage) {
                window.EdmithProgress.purgeLegacyUnscopedStorage();
            }

            // 1. Check synchronous cached session for instantaneous loading
            let activeUser = window.EdmithProgress?.getActiveAuthUserSync
                ? window.EdmithProgress.getActiveAuthUserSync()
                : null;

            // If not cached, check Supabase session/user with graceful fallback
            if (!activeUser) {
                try {
                    const { data: sessionData } = await supabaseClient.auth.getSession();
                    if (sessionData && sessionData.session && sessionData.session.user) {
                        activeUser = sessionData.session.user;
                    } else {
                        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
                        if (userData && userData.user && !userError) {
                            activeUser = userData.user;
                        }
                    }
                } catch (authErr) {
                    console.warn('[EDMITH Profile] Auth lookup error:', authErr);
                }
            }

            // If genuinely unauthenticated, transition cleanly to unauth state
            if (!activeUser) {
                setState('unauthenticated');
                return;
            }

            // 2. Render user info immediately and transition to authenticated
            renderUserInfo(activeUser, null);
            setState('authenticated');

            // 3. Asynchronously fetch detailed database records in parallel
            const [usersRes, attemptsRes, legacyAttemptsRes, myLeaderboardRes] = await Promise.allSettled([
                // DB user profile metadata
                activeUser.email ? supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', activeUser.email)
                    .maybeSingle() : Promise.resolve({ data: null }),

                // Completed test attempts
                supabaseClient
                    .from('test_attempts')
                    .select('*')
                    .eq('user_id', activeUser.id)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false }),

                // Legacy test attempts
                supabaseClient
                    .from('sql_exam_attempts')
                    .select('*')
                    .eq('user_id', activeUser.id)
                    .order('completed_at', { ascending: false }),

                // Global leaderboard position
                window.EdmithSqlLeaderboard?.getMyPosition
                    ? window.EdmithSqlLeaderboard.getMyPosition()
                    : Promise.resolve(null)
            ]);

            const profileRow = (usersRes.status === 'fulfilled' && usersRes.value?.data) ? usersRes.value.data : null;
            const primaryAttempts = (attemptsRes.status === 'fulfilled' && Array.isArray(attemptsRes.value?.data)) ? attemptsRes.value.data : [];
            const legacyAttempts = (legacyAttemptsRes.status === 'fulfilled' && Array.isArray(legacyAttemptsRes.value?.data)) ? legacyAttemptsRes.value.data : [];
            const myLeaderboard = (myLeaderboardRes.status === 'fulfilled') ? myLeaderboardRes.value : null;

            // Merge legacy attempts that were not already captured in primary test_attempts
            const combinedAttempts = [...primaryAttempts];
            legacyAttempts.forEach(leg => {
                const legScore = Number(leg.score) || 0;
                const legTime = new Date(leg.completed_at || 0).getTime();
                const alreadyPresent = primaryAttempts.some(p =>
                    (p.test_type === 'mcq' || !p.test_type) &&
                    Number(p.score) === legScore &&
                    Math.abs(new Date(p.completed_at || p.created_at || 0).getTime() - legTime) < 10000
                );
                if (!alreadyPresent) {
                    combinedAttempts.push({
                        id: leg.id,
                        user_id: leg.user_id,
                        subject_slug: 'sql',
                        test_type: 'mcq',
                        difficulty: leg.exam_level || 'easy',
                        score: legScore,
                        maximum_score: leg.total_questions || 15,
                        percentage: leg.percentage || (leg.total_questions ? (legScore / leg.total_questions) * 100 : 0),
                        status: 'completed',
                        completed_at: leg.completed_at,
                        created_at: leg.completed_at
                    });
                }
            });

            // Sort newest first
            combinedAttempts.sort((a, b) => new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0));

            // Re-render with enriched DB metadata & attempts
            renderUserInfo(activeUser, profileRow);
            renderStatsOverview(combinedAttempts, myLeaderboard);
            renderRecentAttempts(combinedAttempts);
            await renderDifficultyBreakdown(activeUser, combinedAttempts);
            await renderCourseProgress(activeUser);

        } catch (err) {
            console.error('[EDMITH Profile] Unhandled load error:', err);
            setState('error', err.message || 'An unexpected error occurred while loading profile.');
        }
    }

    function renderUserInfo(user, dbUser) {
        const meta = { ...(user.user_metadata || {}), ...(dbUser || {}) };
        const firstName = meta.first_name || '';
        const lastName = meta.last_name || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'EDMITH Learner';
        const username = meta.username_display || meta.username || '—';
        const country = meta.country || '—';
        const goal = meta.learning_goal || 'Software Engineering';
        const email = user.email || meta.email || '—';
        const createdAt = user.created_at
            ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '—';

        const initial = firstName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || 'U';

        if (avatarInit) avatarInit.textContent = initial;
        if (avatarNameEl) avatarNameEl.textContent = fullName;
        if (avatarUserEl) avatarUserEl.textContent = username !== '—' ? `@${username}` : '';
        if (nameEl) nameEl.textContent = fullName;
        if (usernameEl) usernameEl.textContent = username !== '—' ? `@${username}` : '—';
        if (emailEl) emailEl.textContent = email;
        if (countryEl) countryEl.textContent = country;
        if (goalEl) goalEl.textContent = goal;
        if (createdEl) createdEl.textContent = createdAt;

        const welcomeHead = document.getElementById('welcomeHeading');
        const welcomeSub = document.getElementById('welcomeSub');
        if (welcomeHead) welcomeHead.textContent = `Welcome back, ${firstName || 'Learner'}!`;
        if (welcomeSub) welcomeSub.textContent = `You're signed in as ${email}`;
    }

    function renderStatsOverview(attempts, myLeaderboard) {
        const completedCount = attempts.length;
        const totalScore = attempts.reduce((acc, a) => acc + Number(a.score || 0), 0);
        const avgAcc = completedCount > 0
            ? (attempts.reduce((acc, a) => acc + Number(a.percentage || 0), 0) / completedCount).toFixed(1)
            : '0.0';

        let rankDisplay = '—';
        if (myLeaderboard && !myLeaderboard.notAttempted && myLeaderboard.rank) {
            rankDisplay = `#${myLeaderboard.rank}`;
        } else if (completedCount > 0 && myLeaderboard && myLeaderboard.rank) {
            rankDisplay = `#${myLeaderboard.rank}`;
        }

        if (statTestsTaken) statTestsTaken.textContent = completedCount;
        if (statTotalScore) statTotalScore.textContent = `${totalScore} pts`;
        if (statAvgAccuracy) statAvgAccuracy.textContent = `${avgAcc}%`;
        if (statHighestRank) statHighestRank.textContent = rankDisplay;
    }

    async function renderDifficultyBreakdown(user, attempts = []) {
        if (!difficultiesContainer) return;
        const levels = ['easy', 'medium', 'hard'];

        // 1. Calculate stats directly from user attempts for instant, reliable render
        let diffData = {};
        for (const lvl of levels) {
            const diffAttempts = attempts.filter(a =>
                (a.difficulty || '').toLowerCase() === lvl &&
                (a.status === 'completed' || !a.status)
            );

            const attempted = diffAttempts.length > 0;
            const mcq = diffAttempts
                .filter(a => (a.test_type || 'mcq').toLowerCase() === 'mcq')
                .reduce((s, a) => s + Number(a.score || 0), 0);
            const coding = diffAttempts
                .filter(a => (a.test_type || '').toLowerCase() === 'coding')
                .reduce((s, a) => s + Number(a.score || 0), 0);
            const accuracy = attempted
                ? (diffAttempts.reduce((s, a) => s + Number(a.percentage || 0), 0) / diffAttempts.length).toFixed(1)
                : '0.0';

            diffData[lvl] = {
                attempted,
                rank: null,
                mcq,
                coding,
                accuracy,
                tests: diffAttempts.length
            };
        }

        // 2. Render immediately
        function drawCards() {
            difficultiesContainer.innerHTML = levels.map(lvl => {
                const d = diffData[lvl];
                const cap = lvl.charAt(0).toUpperCase() + lvl.slice(1);
                const rankLabel = d.attempted
                    ? `<div class="diff-rank"><span style="color:var(--accent);">${d.rank ? '#' + d.rank : 'Recorded'}</span></div>`
                    : `<div class="diff-rank not-attempted"><i class="fas fa-hourglass-start"></i> Not attempted</div>`;

                return `
                    <div class="diff-card">
                        <div class="diff-card-header">
                            <span class="diff-badge ${lvl}">${cap}</span>
                            ${rankLabel}
                        </div>
                        <div class="diff-details">
                            <div>MCQ Points: <strong>${d.attempted ? d.mcq : '—'}</strong></div>
                            <div>Coding Points: <strong>${d.attempted ? d.coding : '—'}</strong></div>
                            <div>Accuracy: <strong>${d.attempted ? d.accuracy + '%' : '—'}</strong></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        drawCards();

        // 3. Fetch difficulty ranks in parallel if attempted
        if (window.EdmithSqlLeaderboard?.getMyPosition) {
            try {
                const rankPromises = levels.map(async (lvl) => {
                    if (!diffData[lvl].attempted) return;
                    try {
                        const pos = await window.EdmithSqlLeaderboard.getMyPosition({ difficulty: lvl });
                        if (pos && !pos.notAttempted && pos.rank) {
                            diffData[lvl].rank = pos.rank;
                        }
                    } catch (_) {}
                });
                await Promise.allSettled(rankPromises);
                drawCards();
            } catch (_) {}
        }
    }

    async function renderCourseProgress(user) {
        if (!progressCardBody || !user || !user.id) return;

        try {
            let dbCourses = [];
            let dbLessons = [];
            try {
                const { data: cData } = await supabaseClient.from('course_progress').select('*').eq('user_id', user.id);
                if (cData) dbCourses = cData;
                const { data: lData } = await supabaseClient.from('lesson_progress').select('*').eq('user_id', user.id);
                if (lData) dbLessons = lData;
            } catch (_) {}

            if (Array.isArray(dbLessons) && window.EdmithProgress?.getScopedLessonKey) {
                dbLessons.forEach(lp => {
                    if (lp.completed && lp.lesson_id) {
                        const cleanId = lp.lesson_id.replace(/^sql_/, '');
                        localStorage.setItem(window.EdmithProgress.getScopedLessonKey(user.id, cleanId), 'true');
                    }
                });
            }

            const progress = window.EdmithProgress?.calculateCourseProgress
                ? window.EdmithProgress.calculateCourseProgress('sql_mastery', user.id)
                : { progress_percentage: 0, completed_count: 0, total_lessons: 47 };

            const hasDbProgress = dbCourses.some(c => c.course_id === 'sql_mastery');
            const isStarted = hasDbProgress || progress.is_started || progress.completed_count > 0;

            if (!isStarted) {
                progressCardBody.innerHTML = `
                    <div class="progress-empty-state">
                        <div class="progress-empty-icon"><i class="fas fa-graduation-cap"></i></div>
                        <h3>No Courses Started Yet</h3>
                        <p>Start learning today and your real-time progress will appear right here.</p>
                        <a href="../course.html" class="btn-enroll" style="display:inline-flex; align-items:center; gap:8px;">
                            <i class="fas fa-book-open"></i> Explore Courses
                        </a>
                    </div>
                `;
                return;
            }

            const pct = Math.min(100, Math.max(0, progress.progress_percentage || 0));
            const completed = progress.completed_count || 0;
            const total = progress.total_lessons || 47;
            const nextFile = progress.next_lesson_file || 'intro.html';
            const nextUrl = `../sql/${nextFile}`;
            const isComplete = pct === 100;

            progressCardBody.innerHTML = `
                <div class="progress-list-container">
                    <div class="progress-course-card">
                        <div class="progress-course-header">
                            <div class="progress-course-info">
                                <div class="progress-course-icon"><i class="fas fa-database"></i></div>
                                <div>
                                    <h4 class="progress-course-title">SQL &amp; Databases Mastery</h4>
                                    <span class="progress-course-meta">Comprehensive 4-Module Curriculum</span>
                                </div>
                            </div>
                            <span class="progress-percentage-badge">${pct}%</span>
                        </div>
                        <div class="progress-bar-wrap">
                            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                        </div>
                        <div class="progress-footer-row">
                            <span class="progress-lessons-count">
                                <i class="fas ${isComplete ? 'fa-circle-check' : 'fa-check-double'}"></i>
                                ${completed} of ${total} lessons completed
                            </span>
                            <a href="${nextUrl}" class="progress-continue-btn">
                                <span>${isComplete ? 'Review Course' : 'Continue Learning'}</span>
                                <i class="fas ${isComplete ? 'fa-rotate-right' : 'fa-arrow-right'}"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('[EDMITH Profile] Course progress render error:', err);
            progressCardBody.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Unable to load course progress.</p>';
        }
    }

    function renderRecentAttempts(attempts) {
        if (!recentAttemptsBody) return;

        if (!attempts || attempts.length === 0) {
            recentAttemptsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">
                        No assessment attempts recorded yet.
                        <a href="../sql/tests/index.html" style="color: var(--accent); font-weight: 700; margin-left: 6px;">Take a test</a>
                    </td>
                </tr>
            `;
            return;
        }

        recentAttemptsBody.innerHTML = attempts.slice(0, 8).map(a => {
            const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
            const type = (a.test_type || 'mcq').toLowerCase();
            const diff = (a.difficulty || 'easy').toLowerCase();
            const scoreStr = `${a.score || 0} / ${a.maximum_score || 15}`;
            const pctStr = `${Number(a.percentage || 0).toFixed(1)}%`;

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong style="text-transform: capitalize;">${esc(a.subject_slug || 'SQL')}</strong></td>
                    <td><span class="attempt-type-badge ${type}">${type}</span></td>
                    <td><span class="diff-badge ${diff}">${diff}</span></td>
                    <td><strong>${scoreStr}</strong></td>
                    <td><span style="color:#10b981; font-weight:700;">${pctStr}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Edit Profile navigation
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function (e) {
            e.preventDefault();
            this.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Opening…</span>';
            this.style.pointerEvents = 'none';
            window.location.href = 'edit-profile.html';
        });
    }

    // Logout handling
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Signing out…';
            sessionStorage.clear();
            if (window.EdmithProgress?.purgeLegacyUnscopedStorage) {
                window.EdmithProgress.purgeLegacyUnscopedStorage();
            }
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            window.location.href = 'login.html';
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', initProfile);
    }

    // Start
    initProfile();

})();
