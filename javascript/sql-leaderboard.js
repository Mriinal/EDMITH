/**
 * EDMITH SQL Leaderboard Client — javascript/sql-leaderboard.js
 * Calculates rankings and scores combining both MCQ and Coding tests.
 * Database is the single source of truth.
 */

(function () {
    'use strict';

    async function getClient() {
        if (window.EdmithProgress?.getEdmithSupabaseClient) {
            return await window.EdmithProgress.getEdmithSupabaseClient();
        }
        return null;
    }

    async function getLeaderboard({ limit = 100 } = {}) {
        const client = await getClient();
        if (!client) throw new Error('Database connection unavailable.');

        // 1. Try RPC get_sql_leaderboard
        try {
            const { data, error } = await client.rpc('get_sql_leaderboard', {
                p_limit: limit
            });
            if (!error && Array.isArray(data) && data.length > 0) {
                return data;
            }
        } catch (_) {}

        // 2. Try View v_sql_leaderboard
        try {
            let viewQuery = client.from('v_sql_leaderboard').select('*');
            const { data: vData, error: vErr } = await viewQuery.limit(limit);
            if (!vErr && Array.isArray(vData) && vData.length > 0) {
                return vData;
            }
        } catch (_) {}

        // 3. Fallback: Query completed attempts directly from test_attempts & sql_exam_attempts
        try {
            const { data: attempts, error: aErr } = await client
                .from('test_attempts')
                .select('user_id, test_type, difficulty, score, maximum_score, completed_at, status')
                .eq('subject_slug', 'sql')
                .eq('status', 'completed');

            if (aErr) throw aErr;

            // Also check legacy sql_exam_attempts
            let legacyRows = [];
            try {
                const { data: legData } = await client
                    .from('sql_exam_attempts')
                    .select('user_id, exam_level, score, total_questions, completed_at');
                if (Array.isArray(legData)) legacyRows = legData;
            } catch (_) {}

            // Combine and aggregate by user_id
            const userStats = {};

            (attempts || []).forEach(row => {
                const uid = row.user_id;
                if (!uid) return;
                if (!userStats[uid]) {
                    userStats[uid] = {
                        user_id: uid,
                        mcq_score: 0,
                        coding_score: 0,
                        total_score: 0,
                        maximum_score: 0,
                        tests_completed: 0,
                        latest_completed_at: row.completed_at
                    };
                }
                const stat = userStats[uid];
                const score = Number(row.score) || 0;
                const max = Number(row.maximum_score) || (row.test_type === 'mcq' ? 15 : 15);
                if (row.test_type === 'mcq') {
                    stat.mcq_score += score;
                } else {
                    stat.coding_score += score;
                }
                stat.total_score += score;
                stat.maximum_score += max;
                stat.tests_completed += 1;
                if (row.completed_at && (!stat.latest_completed_at || new Date(row.completed_at) > new Date(stat.latest_completed_at))) {
                    stat.latest_completed_at = row.completed_at;
                }
            });

            // Import legacy attempts that were not already recorded in test_attempts
            legacyRows.forEach(row => {
                const uid = row.user_id;
                if (!uid) return;
                const score = Number(row.score) || 0;
                const max = Number(row.total_questions) || 15;
                const rowTime = new Date(row.completed_at || 0).getTime();

                const alreadyRecorded = (attempts || []).some(a =>
                    a.user_id === uid &&
                    a.test_type === 'mcq' &&
                    Number(a.score) === score &&
                    Math.abs(new Date(a.completed_at || 0).getTime() - rowTime) < 10000
                );

                if (!alreadyRecorded) {
                    if (!userStats[uid]) {
                        userStats[uid] = {
                            user_id: uid,
                            mcq_score: 0,
                            coding_score: 0,
                            total_score: 0,
                            maximum_score: 0,
                            tests_completed: 0,
                            latest_completed_at: row.completed_at
                        };
                    }
                    const stat = userStats[uid];
                    stat.mcq_score += score;
                    stat.total_score += score;
                    stat.maximum_score += max;
                    stat.tests_completed += 1;
                    if (row.completed_at && (!stat.latest_completed_at || new Date(row.completed_at) > new Date(stat.latest_completed_at))) {
                        stat.latest_completed_at = row.completed_at;
                    }
                }
            });

            const userIds = Object.keys(userStats);
            if (userIds.length === 0) return [];

            // Safe fallback display names
            const profileMap = {};
            try {
                const { data: authUserRes } = await client.auth.getUser();
                const curUser = authUserRes?.user;
                if (curUser) {
                    const meta = curUser.user_metadata || {};
                    const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
                    profileMap[curUser.id] = meta.username_display || meta.username || fullName || 'Learner';
                }
            } catch (_) {}

            // Format, calculate percentage & sort
            const sortedList = Object.values(userStats).map(st => {
                const pct = st.maximum_score > 0 ? Number(((st.total_score / st.maximum_score) * 100).toFixed(2)) : 0;
                return {
                    user_id: st.user_id,
                    display_name: profileMap[st.user_id] || 'Learner',
                    mcq_score: st.mcq_score,
                    coding_score: st.coding_score,
                    total_score: st.total_score,
                    percentage: pct,
                    tests_completed: st.tests_completed,
                    latest_completed_at: st.latest_completed_at
                };
            }).sort((a, b) => {
                if (b.total_score !== a.total_score) return b.total_score - a.total_score;
                return new Date(a.latest_completed_at || 0) - new Date(b.latest_completed_at || 0);
            });

            // Assign ranks (0 score is a valid completed attempt)
            let currentRank = 1;
            return sortedList.slice(0, limit).map((entry, idx) => {
                if (idx > 0 && entry.total_score < sortedList[idx - 1].total_score) {
                    currentRank = idx + 1;
                }
                return {
                    rank: currentRank,
                    ...entry
                };
            });

        } catch (e) {
            console.error('[EDMITH Leaderboard] Failed to fetch leaderboard:', e);
            return [];
        }
    }

    async function getMyPosition() {
        const client = await getClient();
        if (!client) return null;

        const authUser = window.EdmithProgress?.getAuthenticatedUser ? await window.EdmithProgress.getAuthenticatedUser() : null;
        if (!authUser) return null;

        const list = await getLeaderboard({ limit: 1000 });
        const match = list.find(r => r.user_id === authUser.id);
        if (match) {
            return match;
        }

        // Check if user actually has any completed attempt
        return {
            notAttempted: true,
            display_name: authUser.user_metadata?.username_display || authUser.user_metadata?.username || authUser.user_metadata?.first_name || 'You'
        };
    }

    window.EdmithSqlLeaderboard = {
        getLeaderboard,
        getMyPosition
    };

})();