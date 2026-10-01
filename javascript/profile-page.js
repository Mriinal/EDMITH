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

    function formatSubjectName(slug) {
        if (!slug) return 'SQL & Databases';
        const s = String(slug).toLowerCase().trim();
        if (s === 'sql' || s === 'sql_mastery' || s === 'sql & databases') return 'SQL & Databases';
        if (s === 'python' || s === 'python_programming') return 'Python Programming';
        if (s === 'c' || s === 'c_programming') return 'C Programming';
        if (s === 'etl' || s === 'etl_testing') return 'ETL Testing';
        if (s === 'fundamentals' || s === 'programming_fundamentals') return 'Programming Fundamentals';
        return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

            // If not cached, check Supabase session/user with graceful fallback and timeout safeguard
            if (!activeUser) {
                try {
                    const sessionPromise = supabaseClient.auth.getSession();
                    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 4000));
                    const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
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
        if (welcomeSub) welcomeSub.textContent = email;

        const heroCountryVal = document.getElementById('heroCountryVal');
        const heroGoalVal = document.getElementById('heroGoalVal');
        const heroMemberVal = document.getElementById('heroMemberVal');
        if (heroCountryVal) heroCountryVal.textContent = country !== '—' ? country : 'Global';
        if (heroGoalVal) heroGoalVal.textContent = goal !== '—' ? goal : 'Curiosity';
        if (heroMemberVal) heroMemberVal.textContent = createdAt !== '—' ? `Member since ${createdAt}` : 'Verified Member';
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

        const heroRankVal = document.getElementById('heroRankVal');
        if (heroRankVal) {
            heroRankVal.textContent = rankDisplay !== '—' ? `Global Rank ${rankDisplay}` : 'Top Contender';
        }
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
                    ? `<div class="diff-rank"><span>${d.rank ? '#' + d.rank : 'Recorded'}</span></div>`
                    : `<div class="diff-rank not-attempted"><i class="fas fa-lock"></i> Not attempted</div>`;

                const tierName = lvl === 'easy' ? 'Foundational' : (lvl === 'medium' ? 'Intermediate' : 'Master Tier');
                const ctaBtn = d.attempted
                    ? `<a href="../tests/index.html" class="diff-cta-btn retake"><i class="fas fa-rotate-right"></i> Retake ${cap}</a>`
                    : `<a href="../tests/index.html" class="diff-cta-btn"><i class="fas fa-play"></i> Unlock ${cap} Tier</a>`;

                return `
                    <div class="diff-card ${lvl} ${d.attempted ? 'is-attempted' : ''}">
                        <div class="diff-card-header">
                            <div class="diff-title-wrap">
                                <span class="diff-badge ${lvl}">${cap}</span>
                                <span class="diff-tier-label">${tierName}</span>
                            </div>
                            ${rankLabel}
                        </div>
                        <div class="diff-details">
                            <div class="diff-detail-row"><span>MCQ Points</span><strong>${d.attempted ? d.mcq + ' pts' : '—'}</strong></div>
                            <div class="diff-detail-row"><span>Coding Points</span><strong>${d.attempted ? d.coding + ' pts' : '—'}</strong></div>
                            <div class="diff-detail-row"><span>Accuracy</span><strong class="diff-acc">${d.attempted ? d.accuracy + '%' : '—'}</strong></div>
                        </div>
                        <div class="diff-card-footer">
                            ${ctaBtn}
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

    // Tab navigation elements
    const tabsNav = document.getElementById('profileTabsNav');
    const tabBtns = document.querySelectorAll('.profile-tab-btn');
    const tabPanes = document.querySelectorAll('.profile-tab-pane');
    const badgeInProgress = document.getElementById('badgeInProgress');
    const badgeCompletedCourses = document.getElementById('badgeCompletedCourses');
    const badgeCompletedTests = document.getElementById('badgeCompletedTests');
    const inProgressContainer = document.getElementById('inProgressCoursesContainer');
    const completedCoursesContainer = document.getElementById('completedCoursesContainer');
    const allCompletedTestsBody = document.getElementById('allCompletedTestsBody');

    function switchProfileTab(tabId, updateHash = true) {
        if (!tabId) tabId = 'overview';
        tabId = tabId.replace('#', '');
        if (!['overview', 'in-progress', 'completed-courses', 'completed-tests'].includes(tabId)) {
            tabId = 'overview';
        }

        tabBtns.forEach(btn => {
            const matches = btn.getAttribute('data-tab') === tabId;
            btn.classList.toggle('active', matches);
            btn.setAttribute('aria-selected', matches ? 'true' : 'false');
        });

        tabPanes.forEach(pane => {
            const paneTab = pane.id.replace('tabPane', '').toLowerCase();
            const matches = (tabId === 'overview' && pane.id === 'tabPaneOverview') ||
                            (tabId === 'in-progress' && pane.id === 'tabPaneInProgress') ||
                            (tabId === 'completed-courses' && pane.id === 'tabPaneCompletedCourses') ||
                            (tabId === 'completed-tests' && pane.id === 'tabPaneCompletedTests');
            pane.classList.toggle('active', matches);
        });

        if (updateHash && window.location.hash !== '#' + tabId) {
            try {
                history.replaceState(null, '', '#' + tabId);
            } catch (_) {
                window.location.hash = tabId;
            }
        }
    }

    if (tabsNav) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = btn.getAttribute('data-tab');
                switchProfileTab(tab, true);
            });
        });

        window.addEventListener('hashchange', () => {
            if (window.location.hash) {
                switchProfileTab(window.location.hash, false);
            }
        });
    }

    async function renderCourseProgress(user) {
        if (!user || !user.id) return;

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
                        const cId = lp.course_id || (lp.lesson_id.startsWith('etl_') ? 'etl_testing' : (lp.lesson_id.startsWith('c_') ? 'c_programming' : (lp.lesson_id.startsWith('python_') ? 'python_programming' : (lp.lesson_id.startsWith('pf_') ? 'programming_fundamentals' : 'sql_mastery'))));
                        const cleanId = lp.lesson_id.replace(/^(sql_|etl_|c_|python_|pf_)/, '').replace(/[-_]/g, '_');
                        localStorage.setItem(window.EdmithProgress.getScopedLessonKey(user.id, cleanId, cId), 'true');
                    }
                });
            }

            const courses = window.EdmithProgress?.EDMITH_COURSES || {};
            const courseIds = Object.keys(courses);
            let activeCardsHtml = '';
            let inProgressCardsHtml = '';
            let completedCardsHtml = '';
            let inProgressCount = 0;
            let completedCount = 0;
            let startedAny = false;

            courseIds.forEach(cId => {
                const courseDef = courses[cId];
                const progress = window.EdmithProgress?.calculateCourseProgress
                    ? window.EdmithProgress.calculateCourseProgress(cId, user.id)
                    : { progress_percentage: 0, completed_count: 0, total_lessons: courseDef.totalLessons };

                const hasDbProgress = dbCourses.some(c => c.course_id === cId);
                const isStarted = hasDbProgress || progress.is_started || progress.completed_count > 0;

                if (isStarted) {
                    startedAny = true;
                    const pct = Math.min(100, Math.max(0, progress.progress_percentage || 0));
                    const completed = progress.completed_count || 0;
                    const total = progress.total_lessons || courseDef.totalLessons;
                    const courseDir = courseDef.id === 'etl_testing' ? 'etl' : (courseDef.id === 'c_programming' ? 'c' : (courseDef.id === 'python_programming' ? 'python' : (courseDef.id === 'programming_fundamentals' ? 'fundamentals' : 'sql')));
                    const fallbackFile = courseDef.id === 'python_programming' ? 'introduction-to-python.html' : (courseDef.id === 'c_programming' ? 'history-of-c.html' : (courseDef.id === 'programming_fundamentals' ? 'what-is-programming.html' : (courseDef.id === 'etl_testing' ? 'what-is-data.html' : 'intro.html')));
                    const nextFile = progress.next_lesson_file || (courseDef.lessons && courseDef.lessons[0] ? courseDef.lessons[0].file : fallbackFile);
                    const nextUrl = `../${courseDir}/${nextFile}`;
                    const isComplete = pct === 100;

                    const cardHtml = `
                        <div class="progress-course-card" data-course-id="${cId}" style="margin-bottom: 1.25rem;">
                            <div class="progress-course-header">
                                <div class="progress-course-info">
                                    <div class="progress-course-icon"><i class="${courseDef.icon}"></i></div>
                                    <div>
                                        <h4 class="progress-course-title">${courseDef.title}</h4>
                                        <span class="progress-course-meta">${courseDef.module}</span>
                                    </div>
                                </div>
                                ${isComplete ? '<span class="completed-badge-pill"><i class="fas fa-certificate"></i> Completed</span>' : `<span class="progress-percentage-badge">${pct}%</span>`}
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar-fill" style="width: ${pct}%; ${isComplete ? 'background: #10b981;' : ''}"></div>
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
                    `;

                    activeCardsHtml += cardHtml;

                    if (isComplete) {
                        completedCount++;
                        completedCardsHtml += cardHtml;
                    } else {
                        inProgressCount++;
                        inProgressCardsHtml += cardHtml;
                    }
                }
            });

            // Update badge counts
            if (badgeInProgress) badgeInProgress.textContent = inProgressCount;
            if (badgeCompletedCourses) badgeCompletedCourses.textContent = completedCount;

            // 1. Overview Progress Card Body
            if (progressCardBody) {
                if (!startedAny) {
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
                } else {
                    progressCardBody.innerHTML = `
                        <div class="progress-list-container">
                            ${activeCardsHtml}
                        </div>
                    `;
                }
            }

            // 2. In Progress Courses Container
            if (inProgressContainer) {
                if (inProgressCount === 0) {
                    inProgressContainer.innerHTML = `
                        <div class="progress-empty-state">
                            <div class="progress-empty-icon"><i class="fas fa-book-open-reader"></i></div>
                            <h3>No Courses Currently in Progress</h3>
                            <p>All your courses have either been completed or you haven't started one yet.</p>
                            <a href="../course.html" class="btn-enroll" style="display:inline-flex; align-items:center; gap:8px;">
                                <i class="fas fa-compass"></i> Browse All Courses
                            </a>
                        </div>
                    `;
                } else {
                    inProgressContainer.innerHTML = `
                        <div class="profile-course-grid">
                            ${inProgressCardsHtml}
                        </div>
                    `;
                }
            }

            // 3. Completed Courses Container
            if (completedCoursesContainer) {
                if (completedCount === 0) {
                    completedCoursesContainer.innerHTML = `
                        <div class="progress-empty-state">
                            <div class="progress-empty-icon"><i class="fas fa-graduation-cap"></i></div>
                            <h3>No Courses Completed Yet</h3>
                            <p>Complete 100% of the lessons in any track to earn your completion badge here.</p>
                            <a href="../course.html" class="btn-enroll" style="display:inline-flex; align-items:center; gap:8px;">
                                <i class="fas fa-graduation-cap"></i> Continue Learning
                            </a>
                        </div>
                    `;
                } else {
                    completedCoursesContainer.innerHTML = `
                        <div class="profile-course-grid">
                            ${completedCardsHtml}
                        </div>
                    `;
                }
            }

        } catch (err) {
            console.error('[EDMITH Profile] Course progress render error:', err);
            if (progressCardBody) progressCardBody.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Unable to load course progress.</p>';
        }
    }

    function renderRecentAttempts(attempts) {
        const completedCount = attempts ? attempts.length : 0;
        if (badgeCompletedTests) badgeCompletedTests.textContent = completedCount;

        // Render Recent Table (Overview)
        if (recentAttemptsBody) {
            if (!attempts || attempts.length === 0) {
                recentAttemptsBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">
                            No assessment attempts recorded yet.
                            <a href="../tests/index.html" style="color: var(--accent); font-weight: 700; margin-left: 6px;">Take a test</a>
                        </td>
                    </tr>
                `;
            } else {
                recentAttemptsBody.innerHTML = attempts.slice(0, 8).map(a => {
                    const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const type = (a.test_type || 'mcq').toLowerCase();
                    const diff = (a.difficulty || 'easy').toLowerCase();
                    const scoreStr = `${a.score || 0} / ${a.maximum_score || 15}`;
                    const pctVal = Number(a.percentage || 0);
                    const pctStr = `${pctVal.toFixed(1)}%`;

                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td><strong>${esc(formatSubjectName(a.subject_slug))}</strong></td>
                            <td><span class="attempt-type-badge ${type}">${type}</span></td>
                            <td><span class="diff-badge ${diff}">${diff}</span></td>
                            <td><strong>${scoreStr}</strong></td>
                            <td><span style="color:#10b981; font-weight:700;">${pctStr}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Full Completed Tests Table (Tab 4)
        if (allCompletedTestsBody) {
            if (!attempts || attempts.length === 0) {
                allCompletedTestsBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding: 3rem 1.5rem; color: var(--text-secondary);">
                            <div style="font-size: 2.2rem; color: var(--text-secondary); margin-bottom: 0.8rem;"><i class="fas fa-file-signature"></i></div>
                            <h3 style="color: var(--text-primary); margin-bottom: 0.4rem;">No Completed Tests Found</h3>
                            <p style="margin-bottom: 1.25rem;">Assess your skills in SQL, Python, C, ETL Testing, or Fundamentals.</p>
                            <a href="../tests/index.html" class="btn-enroll" style="display:inline-flex; align-items:center; gap:8px;">
                                <i class="fas fa-vial"></i> Explore Assessments
                            </a>
                        </td>
                    </tr>
                `;
            } else {
                allCompletedTestsBody.innerHTML = attempts.map(a => {
                    const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const type = (a.test_type || 'mcq').toLowerCase();
                    const diff = (a.difficulty || 'easy').toLowerCase();
                    const scoreStr = `${a.score || 0} / ${a.maximum_score || 15}`;
                    const pctVal = Number(a.percentage || 0);
                    const pctStr = `${pctVal.toFixed(1)}%`;
                    const isPassed = pctVal >= 60;

                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td><strong style="color: var(--accent);">${esc(formatSubjectName(a.subject_slug))}</strong></td>
                            <td><span class="attempt-type-badge ${type}">${type}</span></td>
                            <td><span class="diff-badge ${diff}">${diff}</span></td>
                            <td><strong>${scoreStr}</strong></td>
                            <td><span style="color:${isPassed ? '#10b981' : '#f59e0b'}; font-weight:700;">${pctStr}</span></td>
                            <td>
                                <span class="completed-badge-pill" style="${isPassed ? '' : 'color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.12);'}">
                                    <i class="fas ${isPassed ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${isPassed ? 'Passed' : 'Completed'}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
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

    // Check URL Hash on initial load
    if (window.location.hash) {
        switchProfileTab(window.location.hash, false);
    }

    // Start
    initProfile();

})();
