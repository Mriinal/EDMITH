/**
 * EDMITH Unified Leaderboard Engine — javascript/leaderboard-engine.js
 * 100% Authentic Database-Driven Rankings across:
 * - Overall Global Championship ('all')
 * - SQL & Databases ('sql')
 * - Python Programming ('python')
 * - C Programming ('c')
 * - Programming Fundamentals ('fundamentals')
 * - ETL & Data Warehousing ('etl')
 *
 * ZERO DUMMY DATA. Strictly aggregates authentic completed attempts from
 * Supabase `test_attempts` and resolves learner identities from `public.users`.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.EdmithLeaderboard = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Subject track metadata and test action routes
    const SUBJECT_CONFIGS = {
        all: {
            title: 'Overall Global Championship',
            shortTitle: 'Global Championship',
            icon: 'fas fa-globe',
            color: '#793FE0',
            testUrl: '../tests/index.html',
            testLabel: 'Explore All Assessments',
            hasCoding: true,
            description: 'Cumulative scores aggregated strictly from all completed assessments recorded in the database.'
        },
        sql: {
            title: 'SQL & Databases Mastery',
            shortTitle: 'SQL & Databases',
            icon: 'fas fa-database',
            color: '#10b981',
            testUrl: '../sql/tests/sql_basics.html',
            codingTestUrl: '../sql/tests/coding_test.html',
            testLabel: 'Take SQL Assessment',
            hasCoding: true,
            description: 'Combined points from timed SQL relational MCQ queries and hands-on coding tests.'
        },
        python: {
            title: 'Python Programming',
            shortTitle: 'Python',
            icon: 'fab fa-python',
            color: '#3b82f6',
            testUrl: '../tests/python-test.html',
            codingTestUrl: '../tests/python-coding.html',
            testLabel: 'Take Python Assessment',
            hasCoding: true,
            description: 'Rankings determined by verified Python MCQ and coding exam attempts.'
        },
        c: {
            title: 'C Programming',
            shortTitle: 'C Language',
            icon: 'fas fa-c',
            color: '#6366f1',
            testUrl: '../tests/c-test.html',
            codingTestUrl: '../tests/c-coding.html',
            testLabel: 'Take C Assessment',
            hasCoding: true,
            description: 'Rigorous rankings across memory management, pointer arithmetic, data structures & C coding.'
        },
        fundamentals: {
            title: 'Programming Fundamentals',
            shortTitle: 'Fundamentals',
            icon: 'fas fa-brain',
            color: '#ec4899',
            testUrl: '../tests/fundamentals-test.html',
            testLabel: 'Take Fundamentals Assessment',
            hasCoding: false,
            description: 'Computational thinking, problem solving, flowcharts, pseudocode, and algorithm design.'
        },
        etl: {
            title: 'ETL & Data Warehousing',
            shortTitle: 'ETL Testing',
            icon: 'fas fa-shuffle',
            color: '#14b8a6',
            testUrl: '../tests/etl-test.html',
            testLabel: 'Take ETL Assessment',
            hasCoding: false,
            description: 'Data transformation validation, business rule checks, schema mapping, and pipeline QA.'
        }
    };

    /**
     * Resolves the current authenticated user from Supabase or cached session.
     */
    async function getCurrentUser() {
        let authUser = null;
        if (window.EdmithProgress?.getAuthenticatedUser) {
            try {
                authUser = await window.EdmithProgress.getAuthenticatedUser();
            } catch (_) {}
        }

        if (!authUser && window.EdmithProgress?.getEdmithSupabaseClient) {
            try {
                const client = await window.EdmithProgress.getEdmithSupabaseClient();
                if (client) {
                    const { data: { user } } = await client.auth.getUser();
                    if (user) authUser = user;
                }
            } catch (_) {}
        }

        // Check cached localStorage auth token
        if (!authUser) {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                        const raw = localStorage.getItem(k);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            const u = parsed.user || (parsed.currentSession && parsed.currentSession.user);
                            if (u && u.id) {
                                authUser = u;
                                break;
                            }
                        }
                    }
                }
            } catch (_) {}
        }

        if (!authUser) {
            return {
                id: null,
                isLoggedIn: false,
                displayName: '',
                email: '',
                avatar: ''
            };
        }

        // Authenticated user profile attributes
        const meta = authUser.user_metadata || {};
        const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
        const displayName = meta.username_display || meta.username || fullName || authUser.email?.split('@')[0] || 'Learner';

        return {
            id: authUser.id,
            isLoggedIn: true,
            displayName: displayName,
            email: authUser.email || '',
            avatar: displayName.slice(0, 2).toUpperCase()
        };
    }

    /**
     * Queries database test attempts and aggregates strictly authentic records.
     * ZERO DUMMY DATA.
     * @param {string} subject 'all' | 'sql' | 'python' | 'c' | 'fundamentals' | 'etl'
     * @param {string} timeframe 'all' | 'month' | 'week'
     * @returns {Promise<{ standings: Array, top5: Array, userStanding: Object, stats: Object }>}
     */
    async function getLeaderboardData(subject = 'all', timeframe = 'all') {
        const client = window.EdmithProgress?.getEdmithSupabaseClient
            ? await window.EdmithProgress.getEdmithSupabaseClient()
            : null;

        const currentUser = await getCurrentUser();
        const userStats = {};
        const userProfileMap = {};

        if (client) {
            try {
                // 1. Fetch user profiles to display authentic learner names
                try {
                    const { data: usersData, error: uErr } = await client
                        .from('users')
                        .select('auth_user_id, username, first_name, last_name, email');

                    if (!uErr && Array.isArray(usersData)) {
                        usersData.forEach(u => {
                            if (!u.auth_user_id) return;
                            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
                            userProfileMap[u.auth_user_id] = fullName || u.username || u.email?.split('@')[0] || 'Learner';
                        });
                    }
                } catch (_) {}

                // Always ensure current user's display name is mapped if logged in
                if (currentUser && currentUser.isLoggedIn && currentUser.id) {
                    userProfileMap[currentUser.id] = currentUser.displayName;
                }

                // 2. Fetch completed attempts from test_attempts
                let query = client
                    .from('test_attempts')
                    .select('user_id, subject_slug, test_type, difficulty, score, maximum_score, percentage, completed_at, status')
                    .eq('status', 'completed');

                if (subject !== 'all') {
                    query = query.eq('subject_slug', subject);
                }

                // Timeframe filtering
                if (timeframe === 'week') {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    query = query.gte('completed_at', d.toISOString());
                } else if (timeframe === 'month') {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    query = query.gte('completed_at', d.toISOString());
                }

                const { data: attempts, error: aErr } = await query;

                if (!aErr && Array.isArray(attempts)) {
                    attempts.forEach(row => {
                        const uid = row.user_id;
                        if (!uid) return;

                        if (!userStats[uid]) {
                            const name = userProfileMap[uid] || (uid === currentUser.id ? currentUser.displayName : 'Learner');
                            userStats[uid] = {
                                id: uid,
                                name: name,
                                title: 'Verified Challenger',
                                avatar: name.slice(0, 2).toUpperCase(),
                                color: uid === currentUser.id ? 'var(--accent)' : '#3b82f6',
                                total: 0,
                                mcq: 0,
                                coding: 0,
                                maxScore: 0,
                                tests: 0,
                                acc: 0,
                                badge: 'Active Learner',
                                latestCompletedAt: row.completed_at,
                                isCurrentUser: uid === currentUser.id
                            };
                        }

                        const stat = userStats[uid];
                        const score = Number(row.score) || 0;
                        const max = Number(row.maximum_score) || 15;

                        if (row.test_type === 'mcq') {
                            stat.mcq += score;
                        } else {
                            stat.coding += score;
                        }

                        stat.total += score;
                        stat.maxScore += max;
                        stat.tests += 1;

                        if (row.completed_at && (!stat.latestCompletedAt || new Date(row.completed_at) > new Date(stat.latestCompletedAt))) {
                            stat.latestCompletedAt = row.completed_at;
                        }
                    });
                }

                // 3. Backward compatibility: Merge legacy sql_exam_attempts if subject is 'all' or 'sql'
                if (subject === 'all' || subject === 'sql') {
                    try {
                        const { data: legAttempts } = await client
                            .from('sql_exam_attempts')
                            .select('user_id, score, total_questions, completed_at');

                        if (Array.isArray(legAttempts)) {
                            legAttempts.forEach(row => {
                                const uid = row.user_id;
                                if (!uid) return;

                                // Prevent duplicate counting if already present in test_attempts
                                const existing = attempts?.some(a =>
                                    a.user_id === uid &&
                                    a.test_type === 'mcq' &&
                                    Number(a.score) === Number(row.score)
                                );
                                if (existing) return;

                                if (!userStats[uid]) {
                                    const name = userProfileMap[uid] || (uid === currentUser.id ? currentUser.displayName : 'Learner');
                                    userStats[uid] = {
                                        id: uid,
                                        name: name,
                                        title: 'SQL Specialist',
                                        avatar: name.slice(0, 2).toUpperCase(),
                                        color: uid === currentUser.id ? 'var(--accent)' : '#10b981',
                                        total: 0,
                                        mcq: 0,
                                        coding: 0,
                                        maxScore: 0,
                                        tests: 0,
                                        acc: 0,
                                        badge: 'SQL Contender',
                                        latestCompletedAt: row.completed_at,
                                        isCurrentUser: uid === currentUser.id
                                    };
                                }
                                const stat = userStats[uid];
                                const score = Number(row.score) || 0;
                                stat.mcq += score;
                                stat.total += score;
                                stat.maxScore += Number(row.total_questions) || 15;
                                stat.tests += 1;
                            });
                        }
                    } catch (_) {}
                }

            } catch (e) {
                console.warn('[EDMITH Leaderboard Engine] Query error:', e.message);
            }
        }

        // Calculate accuracy percentages for real users
        Object.values(userStats).forEach(u => {
            u.acc = u.maxScore > 0 ? Number(((u.total / u.maxScore) * 100).toFixed(1)) : 0;
        });

        // 4. Sort strictly authentic records
        const sortedStandings = Object.values(userStats).sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            if (b.acc !== a.acc) return b.acc - a.acc;
            return (b.tests || 0) - (a.tests || 0);
        });

        // Assign dense ranks
        let currentRank = 1;
        sortedStandings.forEach((entry, idx) => {
            if (idx > 0 && entry.total < sortedStandings[idx - 1].total) {
                currentRank = idx + 1;
            }
            entry.rank = currentRank;
        });

        // 5. Strictly extract Top 5 authentic records
        const top5 = sortedStandings.slice(0, 5);

        // 6. Calculate Current User's Standing (Position #6)
        const config = SUBJECT_CONFIGS[subject] || SUBJECT_CONFIGS.all;
        let userStanding = null;

        if (currentUser && currentUser.isLoggedIn && currentUser.id) {
            const userEntry = sortedStandings.find(e => e.id === currentUser.id || e.isCurrentUser);

            if (userEntry) {
                const fifthPlaceTotal = top5.length >= 5 ? top5[4].total : 0;
                const pointsToTop5 = userEntry.rank > 5 ? Math.max(1, (fifthPlaceTotal - userEntry.total) + 1) : 0;

                userStanding = {
                    ...userEntry,
                    name: currentUser.displayName,
                    avatar: currentUser.avatar,
                    isCurrentUser: true,
                    inTop5: userEntry.rank <= 5,
                    pointsToTop5: pointsToTop5,
                    hasAttempted: true,
                    isLoggedIn: true,
                    testUrl: config.testUrl,
                    testLabel: config.testLabel
                };
            } else {
                // Authenticated user with no completed attempts in this track in the DB
                const fifthPlaceTotal = top5.length >= 5 ? top5[4].total : (top5.length > 0 ? top5[top5.length - 1].total : 0);
                userStanding = {
                    id: currentUser.id,
                    name: currentUser.displayName,
                    title: 'Aspiring Challenger',
                    avatar: currentUser.avatar,
                    color: 'var(--accent)',
                    rank: null,
                    total: 0,
                    mcq: 0,
                    coding: 0,
                    acc: 0,
                    tests: 0,
                    badge: 'Unranked',
                    isCurrentUser: true,
                    inTop5: false,
                    pointsToTop5: fifthPlaceTotal + 1,
                    hasAttempted: false,
                    isLoggedIn: true,
                    testUrl: config.testUrl,
                    testLabel: config.testLabel
                };
            }
        } else {
            // Visitor is not logged in / guest
            userStanding = {
                isLoggedIn: false,
                testUrl: config.testUrl,
                testLabel: config.testLabel
            };
        }

        // 7. Aggregate Real Stats for Live Ticker (ZERO INVENTED NUMBERS)
        const totalCompetitors = sortedStandings.length;
        const totalTestsCompleted = sortedStandings.reduce((sum, s) => sum + (s.tests || 0), 0);
        const highestScore = top5.length > 0 ? top5[0].total : 0;
        const highestAccuracy = top5.length > 0 ? top5[0].acc : 0;

        return {
            subject: subject,
            config: config,
            allStandings: sortedStandings,
            top5: top5,
            userStanding: userStanding,
            stats: {
                totalCompetitors,
                totalTestsCompleted,
                highestScore,
                highestAccuracy
            }
        };
    }

    return {
        SUBJECT_CONFIGS,
        getCurrentUser,
        getLeaderboardData
    };
}));
