/**
 * EDMITH - World-Class Leaderboard UI Controller
 * javascript/leaderboard-ui.js
 * Renders Champions Podium, Top 5 Standings, 6th User Pinned Card,
 * and handles track tabs, live search, timeframes, and scoring modal.
 */

(function () {
    'use strict';

    // State
    let currentSubject = 'all';
    let currentTimeframe = 'all';
    let searchQuery = '';
    let currentData = null;

    // DOM Elements
    const heroTitle = document.getElementById('lbHeroTitle');
    const heroDesc = document.getElementById('lbHeroDesc');
    const heroPillIcon = document.getElementById('lbPillIcon');
    const heroPillText = document.getElementById('lbPillText');

    // Stats
    const statCompetitors = document.getElementById('statCompetitors');
    const statTests = document.getElementById('statTests');
    const statHighScore = document.getElementById('statHighScore');
    const statAccuracy = document.getElementById('statAccuracy');

    // Podium & Table Containers
    const podiumWrap = document.getElementById('podiumWrap');
    const tableBody = document.getElementById('leaderboardBody');
    const userPinnedCard = document.getElementById('userPinnedStandingCard');

    // Filters
    const searchInput = document.getElementById('lbSearchInput');
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    const subjectTabBtns = document.querySelectorAll('.subject-tab-btn');

    // Modal
    const scoringModal = document.getElementById('gradingModal');
    const openScoringBtn = document.getElementById('openScoringModalBtn');
    const closeScoringBtn = document.getElementById('closeGradingModalBtn');
    const gotItBtn = document.getElementById('gotItBtn');

    function esc(s) {
        return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
    }

    // Modal Handlers
    function openModal() {
        if (!scoringModal) return;
        scoringModal.hidden = false;
        scoringModal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => scoringModal.classList.add('is-visible'));
    }

    function closeModal() {
        if (!scoringModal) return;
        scoringModal.classList.remove('is-visible');
        setTimeout(() => {
            scoringModal.hidden = true;
            scoringModal.setAttribute('aria-hidden', 'true');
        }, 220);
    }

    if (openScoringBtn) openScoringBtn.addEventListener('click', openModal);
    if (closeScoringBtn) closeScoringBtn.addEventListener('click', closeModal);
    if (gotItBtn) gotItBtn.addEventListener('click', closeModal);
    if (scoringModal) {
        scoringModal.addEventListener('click', (e) => {
            if (e.target === scoringModal) closeModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && scoringModal && !scoringModal.hidden) closeModal();
    });

    /**
     * Renders Top 3 Champions Podium
     */
    function renderPodium(top5) {
        if (!podiumWrap) return;
        if (!top5 || top5.length === 0) {
            podiumWrap.innerHTML = '';
            return;
        }

        const rank1 = top5[0];
        const rank2 = top5[1];
        const rank3 = top5[2];

        if (top5.length >= 3) {
            podiumWrap.innerHTML = `
                <div class="podium-grid">
                    <!-- Rank 2: Silver -->
                    <div class="podium-card rank-second">
                        <div class="podium-avatar-wrap">
                            <div class="podium-avatar" style="background: ${rank2.color || '#94a3b8'};">
                                ${esc(rank2.avatar || rank2.name.slice(0, 2).toUpperCase())}
                            </div>
                            <span class="podium-badge-icon">2</span>
                        </div>
                        <div class="podium-name">${esc(rank2.name)}</div>
                        <div class="podium-title">${esc(rank2.title || 'Verified Contender')}</div>
                        <div class="podium-score-pill">
                            <span class="podium-score-val">${rank2.total}</span>
                            <span class="podium-score-lbl">pts</span>
                        </div>
                        <div class="podium-meta-pills">
                            <span class="podium-accuracy"><i class="fas fa-bullseye"></i> ${rank2.acc}% Acc</span>
                            <span>·</span>
                            <span>${rank2.tests} Tests</span>
                        </div>
                    </div>

                    <!-- Rank 1: Gold Champion -->
                    <div class="podium-card rank-first">
                        <div class="podium-crown"><i class="fas fa-crown"></i></div>
                        <div class="podium-avatar-wrap">
                            <div class="podium-avatar" style="background: ${rank1.color || '#eab308'};">
                                ${esc(rank1.avatar || rank1.name.slice(0, 2).toUpperCase())}
                            </div>
                            <span class="podium-badge-icon"><i class="fas fa-star"></i></span>
                        </div>
                        <div class="podium-name">
                            ${esc(rank1.name)}
                            <span class="badge-you" style="background: var(--leaderboard-gold); color: #78350f;">#1</span>
                        </div>
                        <div class="podium-title">${esc(rank1.title || 'Leaderboard Champion')}</div>
                        <div class="podium-score-pill" style="border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.1);">
                            <span class="podium-score-val" style="color: var(--leaderboard-gold);">${rank1.total}</span>
                            <span class="podium-score-lbl" style="color: var(--leaderboard-gold);">pts</span>
                        </div>
                        <div class="podium-meta-pills">
                            <span class="podium-accuracy"><i class="fas fa-bullseye"></i> ${rank1.acc}% Acc</span>
                            <span>·</span>
                            <span>${rank1.tests} Tests</span>
                        </div>
                    </div>

                    <!-- Rank 3: Bronze -->
                    <div class="podium-card rank-third">
                        <div class="podium-avatar-wrap">
                            <div class="podium-avatar" style="background: ${rank3.color || '#f97316'};">
                                ${esc(rank3.avatar || rank3.name.slice(0, 2).toUpperCase())}
                            </div>
                            <span class="podium-badge-icon">3</span>
                        </div>
                        <div class="podium-name">${esc(rank3.name)}</div>
                        <div class="podium-title">${esc(rank3.title || 'Verified Contender')}</div>
                        <div class="podium-score-pill">
                            <span class="podium-score-val">${rank3.total}</span>
                            <span class="podium-score-lbl">pts</span>
                        </div>
                        <div class="podium-meta-pills">
                            <span class="podium-accuracy"><i class="fas fa-bullseye"></i> ${rank3.acc}% Acc</span>
                            <span>·</span>
                            <span>${rank3.tests} Tests</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 1 or 2 champions
            podiumWrap.innerHTML = `
                <div class="podium-grid" style="display: flex; justify-content: center; max-width: 480px; margin: 0 auto;">
                    <div class="podium-card rank-first" style="width: 100%;">
                        <div class="podium-crown"><i class="fas fa-crown"></i></div>
                        <div class="podium-avatar-wrap">
                            <div class="podium-avatar" style="background: ${rank1.color || '#eab308'};">
                                ${esc(rank1.avatar || rank1.name.slice(0, 2).toUpperCase())}
                            </div>
                            <span class="podium-badge-icon"><i class="fas fa-star"></i></span>
                        </div>
                        <div class="podium-name">
                            ${esc(rank1.name)}
                            <span class="badge-you" style="background: var(--leaderboard-gold); color: #78350f;">#1</span>
                        </div>
                        <div class="podium-title">${esc(rank1.title || 'Leaderboard Champion')}</div>
                        <div class="podium-score-pill" style="border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.1);">
                            <span class="podium-score-val" style="color: var(--leaderboard-gold);">${rank1.total}</span>
                            <span class="podium-score-lbl" style="color: var(--leaderboard-gold);">pts</span>
                        </div>
                        <div class="podium-meta-pills">
                            <span class="podium-accuracy"><i class="fas fa-bullseye"></i> ${rank1.acc}% Acc</span>
                            <span>·</span>
                            <span>${rank1.tests} Tests</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Renders Main Top 5 Table
     */
    function renderTop5Table(top5, userStanding) {
        if (!tableBody) return;

        let filtered = top5;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = top5.filter(c => c.name.toLowerCase().includes(q) || (c.title && c.title.toLowerCase().includes(q)));
        }

        if (filtered.length === 0) {
            const trackName = currentData?.config?.shortTitle || 'this category';
            const msg = searchQuery
                ? `No contenders found matching "${esc(searchQuery)}".`
                : `No completed assessment attempts recorded in the database yet for ${esc(trackName)}.<br>Be the first learner to complete the assessment and claim the #1 rank!`;
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <i class="fas fa-trophy" style="font-size: 2rem; opacity: 0.35; margin-bottom: 0.75rem; display: block;"></i>
                        ${msg}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(row => {
            let rankBadgeHtml = `<span class="rank-badge-cell rank-default-badge">#${row.rank}</span>`;
            if (row.rank === 1) {
                rankBadgeHtml = `<span class="rank-badge-cell rank-1-badge" title="Champion"><i class="fas fa-crown"></i></span>`;
            } else if (row.rank === 2) {
                rankBadgeHtml = `<span class="rank-badge-cell rank-2-badge" title="2nd Place">2</span>`;
            } else if (row.rank === 3) {
                rankBadgeHtml = `<span class="rank-badge-cell rank-3-badge" title="3rd Place">3</span>`;
            }

            const isYou = (userStanding && userStanding.isLoggedIn && (row.isCurrentUser || (userStanding.inTop5 && userStanding.rank === row.rank)));

            return `
                <tr style="${isYou ? 'background: rgba(121, 63, 224, 0.08); font-weight: 700;' : ''}">
                    <td>${rankBadgeHtml}</td>
                    <td>
                        <div class="user-profile-cell">
                            <div class="cell-avatar" style="background: ${row.color || 'var(--accent)'};">
                                ${esc(row.avatar || row.name.slice(0, 2).toUpperCase())}
                            </div>
                            <div class="cell-user-info">
                                <span class="cell-user-name">
                                    ${esc(row.name)}
                                    ${isYou ? '<span class="badge-you">You</span>' : ''}
                                </span>
                                <span class="cell-user-title">${esc(row.title || 'Verified Learner')}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="score-cell-pill">${row.mcq || 0} pts</span></td>
                    <td><span class="score-cell-pill" style="color: var(--accent);">${row.coding || 0} pts</span></td>
                    <td><span class="score-cell-total">${row.total}</span></td>
                    <td><span class="accuracy-cell-pill">${row.acc}%</span></td>
                    <td><span style="color: var(--text-secondary); font-size: 0.88rem;">${row.tests} tests</span></td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Renders 6th Pinned Card (User Current Ranking)
     */
    function renderUserStandingCard(userStanding) {
        if (!userPinnedCard) return;
        if (!userStanding) {
            userPinnedCard.style.display = 'none';
            return;
        }

        userPinnedCard.style.display = 'flex';

        // Guest / Logged out user state
        if (!userStanding.isLoggedIn) {
            userPinnedCard.innerHTML = `
                <div style="flex: 1; min-width: 280px;">
                    <div class="user-pinned-kicker"><i class="fas fa-lock"></i> Your Standings (Position #6)</div>
                    <div class="user-pinned-profile">
                        <div class="user-pinned-avatar" style="background: var(--bg-secondary); color: var(--text-secondary); border: 2px dashed var(--card-border);">
                            <i class="fas fa-user-lock"></i>
                        </div>
                        <div class="user-pinned-details">
                            <h3>Track Your Standing <span class="badge-you" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--card-border);">Guest</span></h3>
                            <div class="user-pinned-meta">
                                Log in to record verified test attempts, compute your rank, and see your personal standing pinned alongside the Top 5 champions!
                            </div>
                        </div>
                    </div>
                </div>
                <div class="user-pinned-stats-group">
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: var(--text-secondary);">-</div>
                        <div class="stat-item-label">Current Rank</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: var(--text-secondary);">-</div>
                        <div class="stat-item-label">Total Points</div>
                    </div>
                </div>
                <div>
                    <button type="button" class="user-pinned-cta-btn" id="leaderboardLoginBtn" style="border:none; cursor:pointer;">
                        <i class="fas fa-right-to-bracket"></i> Log In to View Rank
                    </button>
                </div>
            `;
            const loginBtn = document.getElementById('leaderboardLoginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.EdmithAuthModal && typeof window.EdmithAuthModal.show === 'function') {
                        window.EdmithAuthModal.show({ returnTo: window.location.href });
                    } else {
                        window.location.href = '../users/login.html?returnTo=' + encodeURIComponent(window.location.href);
                    }
                });
            }
            return;
        }

        if (!userStanding.hasAttempted) {
            userPinnedCard.innerHTML = `
                <div style="flex: 1; min-width: 280px;">
                    <div class="user-pinned-kicker"><i class="fas fa-user-astronaut"></i> Your Standings (Position #6)</div>
                    <div class="user-pinned-profile">
                        <div class="user-pinned-avatar" style="background: var(--bg-secondary); color: var(--text-secondary); border: 2px dashed var(--card-border);">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-pinned-details">
                            <h3>${esc(userStanding.name)} <span class="badge-you" style="background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--card-border);">Unranked</span></h3>
                            <div class="user-pinned-meta">
                                You haven't taken an assessment in this track yet. Take a test to earn your official rank!
                            </div>
                        </div>
                    </div>
                </div>
                <div class="user-pinned-stats-group">
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: var(--text-secondary);">-</div>
                        <div class="stat-item-label">Current Rank</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: var(--text-secondary);">0</div>
                        <div class="stat-item-label">Total Points</div>
                    </div>
                </div>
                <div>
                    <a href="${userStanding.testUrl}" class="user-pinned-cta-btn">
                        <i class="fas fa-bolt"></i> ${esc(userStanding.testLabel || 'Take Test')}
                    </a>
                </div>
            `;
        } else if (userStanding.inTop5) {
            userPinnedCard.innerHTML = `
                <div style="flex: 1; min-width: 280px;">
                    <div class="user-pinned-kicker" style="color: #10b981;"><i class="fas fa-trophy"></i> Elite Top 5 Achieved! (Your Profile)</div>
                    <div class="user-pinned-profile">
                        <div class="user-pinned-avatar">
                            ${esc(userStanding.avatar || 'ME')}
                        </div>
                        <div class="user-pinned-details">
                            <h3>${esc(userStanding.name)} <span class="badge-you" style="background: #10b981;">Rank #${userStanding.rank}</span></h3>
                            <div class="user-pinned-meta">
                                Congratulations! You are currently among the Top 5 Champions in this category.
                            </div>
                        </div>
                    </div>
                </div>
                <div class="user-pinned-stats-group">
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: #10b981;">#${userStanding.rank}</div>
                        <div class="stat-item-label">Your Rank</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number">${userStanding.total}</div>
                        <div class="stat-item-label">Total Points</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: #10b981;">${userStanding.acc}%</div>
                        <div class="stat-item-label">Accuracy</div>
                    </div>
                </div>
                <div>
                    <a href="${userStanding.testUrl}" class="user-pinned-cta-btn" style="background: #10b981;">
                        <i class="fas fa-arrows-rotate"></i> Retake / Improve Score
                    </a>
                </div>
            `;
        } else {
            // Rank > 5
            userPinnedCard.innerHTML = `
                <div style="flex: 1; min-width: 280px;">
                    <div class="user-pinned-kicker"><i class="fas fa-user-tag"></i> Your Current Ranking (Pinned #6)</div>
                    <div class="user-pinned-profile">
                        <div class="user-pinned-avatar">
                            ${esc(userStanding.avatar || 'ME')}
                        </div>
                        <div class="user-pinned-details">
                            <h3>${esc(userStanding.name)} <span class="badge-you">Rank #${userStanding.rank}</span></h3>
                            <div class="user-pinned-meta">
                                You are only <strong style="color: var(--accent);">${userStanding.pointsToTop5} points</strong> away from entering the Top 5!
                            </div>
                        </div>
                    </div>
                </div>
                <div class="user-pinned-stats-group">
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: var(--accent);">#${userStanding.rank}</div>
                        <div class="stat-item-label">Global Rank</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number">${userStanding.total}</div>
                        <div class="stat-item-label">Your Points</div>
                    </div>
                    <div class="user-pinned-stat-item">
                        <div class="stat-item-number" style="color: #10b981;">${userStanding.acc}%</div>
                        <div class="stat-item-label">Accuracy</div>
                    </div>
                </div>
                <div>
                    <a href="${userStanding.testUrl}" class="user-pinned-cta-btn">
                        <i class="fas fa-rocket"></i> Take Test to Climb Top 5
                    </a>
                </div>
            `;
        }
    }

    /**
     * Loads and updates UI for the specified track
     */
    async function loadTrack(subjectKey, tfKey = currentTimeframe) {
        currentSubject = subjectKey;
        currentTimeframe = tfKey;

        // Update active tab buttons
        subjectTabBtns.forEach(btn => {
            const track = btn.getAttribute('data-subject');
            btn.classList.toggle('is-active', track === subjectKey);
        });

        // Update Hero text
        const cfg = window.EdmithLeaderboard.SUBJECT_CONFIGS[subjectKey] || window.EdmithLeaderboard.SUBJECT_CONFIGS.all;
        if (heroTitle) heroTitle.textContent = `${cfg.shortTitle} Leaderboard`;
        if (heroDesc) heroDesc.textContent = cfg.description;
        if (heroPillIcon) heroPillIcon.className = cfg.icon;
        if (heroPillText) heroPillText.textContent = `${cfg.shortTitle} Standings`;

        // Render skeleton loading
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block; color: var(--accent);"></i>
                        Synchronizing official ${esc(cfg.shortTitle)} rankings...
                    </td>
                </tr>
            `;
        }

        try {
            const data = await window.EdmithLeaderboard.getLeaderboardData(subjectKey, tfKey);
            currentData = data;

            // Update stats ticker
            if (statCompetitors) statCompetitors.textContent = `${data.stats.totalCompetitors.toLocaleString()}+`;
            if (statTests) statTests.textContent = `${data.stats.totalTestsCompleted.toLocaleString()}+`;
            if (statHighScore) statHighScore.textContent = `${data.stats.highestScore} pts`;
            if (statAccuracy) statAccuracy.textContent = `${data.stats.highestAccuracy}%`;

            // Render Podium (Ranks 1 to 3)
            renderPodium(data.top5);

            // Render Top 5 Table
            renderTop5Table(data.top5, data.userStanding);

            // Render 6th Pinned Card (User Position)
            renderUserStandingCard(data.userStanding);

        } catch (err) {
            console.error('[EDMITH Leaderboard UI] Load error:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #ef4444;">
                            <i class="fas fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                            Failed to load leaderboard data. Please check your connection and retry.
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Attach Event Listeners
    subjectTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const track = btn.getAttribute('data-subject');
            if (track) {
                e.preventDefault();
                history.replaceState(null, '', `#${track}`);
                loadTrack(track);
            }
        });
    });

    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeframeBtns.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const tf = btn.getAttribute('data-timeframe') || 'all';
            loadTrack(currentSubject, tf);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            if (currentData) {
                renderTop5Table(currentData.top5, currentData.userStanding);
            }
        });
    }

    // Hash deep linking & page default initialization (#sql, #python, #c, #fundamentals, #etl, #all)
    function initFromHash() {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        const validSubjects = ['all', 'sql', 'python', 'c', 'fundamentals', 'etl'];
        const pageDefault = (window.EDMITH_INITIAL_TRACK || '').toLowerCase();
        const initial = validSubjects.includes(hash) ? hash : (validSubjects.includes(pageDefault) ? pageDefault : 'all');
        loadTrack(initial);
    }

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (hash && hash !== currentSubject) {
            loadTrack(hash);
        }
    });

    // Auto-sync when auth state changes (login / logout)
    window.addEventListener('edmith:auth-changed', () => {
        loadTrack(currentSubject, currentTimeframe);
    });

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFromHash);
    } else {
        initFromHash();
    }

})();
