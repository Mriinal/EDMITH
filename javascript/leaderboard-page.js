/**
 * EDMITH - SQL Leaderboard Page Logic
 * Renders global standings, personal position banner, and handles the Scoring System modal dialog.
 */
(async function () {
    'use strict';

    const tbody = document.getElementById('leaderboardBody');
    const posBanner = document.getElementById('userPositionBanner');
    const posTitle = document.getElementById('myPositionTitle');
    const posMeta = document.getElementById('myPositionMeta');
    const posBadge = document.getElementById('myPositionBadge');

    // Modal elements
    const gradingModal = document.getElementById('gradingModal');
    const openScoringModalBtn = document.getElementById('openScoringModalBtn');
    const closeGradingModalBtn = document.getElementById('closeGradingModalBtn');
    const gotItBtn = document.getElementById('gotItBtn');

    function esc(v) {
        return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
    }

    // --- Scoring Modal Logic ---
    function openModal() {
        if (!gradingModal) return;
        gradingModal.hidden = false;
        gradingModal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            gradingModal.classList.add('is-visible');
        });
    }

    function closeModal() {
        if (!gradingModal) return;
        gradingModal.classList.remove('is-visible');
        setTimeout(() => {
            gradingModal.hidden = true;
            gradingModal.setAttribute('aria-hidden', 'true');
        }, 220);
    }

    if (openScoringModalBtn) openScoringModalBtn.addEventListener('click', openModal);
    if (closeGradingModalBtn) closeGradingModalBtn.addEventListener('click', closeModal);
    if (gotItBtn) gotItBtn.addEventListener('click', closeModal);

    if (gradingModal) {
        gradingModal.addEventListener('click', (e) => {
            if (e.target === gradingModal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gradingModal && !gradingModal.hidden) {
            closeModal();
        }
    });

    // --- Leaderboard Rendering ---
    async function renderLeaderboard() {
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                    Loading official SQL Leaderboard standings...
                </td>
            </tr>
        `;

        try {
            const rows = await window.EdmithSqlLeaderboard.getLeaderboard();

            if (!rows || rows.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                            <i class="fas fa-trophy" style="font-size: 2rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
                            No completed assessment attempts recorded yet. Be the first to appear on the SQL leaderboard!
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = rows.map(r => {
                    let rankBadge = `<strong>#${r.rank}</strong>`;
                    if (r.rank === 1) rankBadge = `<span class="rank-medal rank-1"><i class="fas fa-crown"></i></span>`;
                    else if (r.rank === 2) rankBadge = `<span class="rank-medal rank-2">2</span>`;
                    else if (r.rank === 3) rankBadge = `<span class="rank-medal rank-3">3</span>`;

                    return `
                        <tr>
                            <td>${rankBadge}</td>
                            <td><strong style="color:var(--text-primary); font-size:0.95rem;">${esc(r.display_name)}</strong></td>
                            <td><span class="score-pill">${r.mcq_score}</span></td>
                            <td><span class="score-pill" style="color:var(--accent);">${r.coding_score}</span></td>
                            <td><strong style="font-size:1.05rem; color:var(--text-primary);">${r.total_score}</strong></td>
                            <td><span style="color:#10b981; font-weight:700;">${Number(r.percentage).toFixed(1)}%</span></td>
                            <td><span style="color:var(--text-secondary);">${r.tests_completed} tests</span></td>
                        </tr>
                    `;
                }).join('');
            }

            // Render User Position
            if (window.EdmithSqlLeaderboard?.getMyPosition) {
                const myPos = await window.EdmithSqlLeaderboard.getMyPosition();
                if (myPos && posBanner) {
                    posBanner.style.display = 'flex';
                    if (myPos.notAttempted) {
                        if (posTitle) posTitle.innerHTML = `Hello, ${esc(myPos.display_name)}`;
                        if (posMeta) posMeta.textContent = 'You have not completed any tests yet. Take an assessment to earn your rank!';
                        if (posBadge) posBadge.innerHTML = `<span class="round-btn" style="background:var(--bg-secondary); color:var(--text-secondary);"><i class="fas fa-hourglass-start"></i> Not Attempted</span>`;
                    } else {
                        if (posTitle) posTitle.innerHTML = `Rank #${myPos.rank} — ${esc(myPos.display_name)}`;
                        if (posMeta) posMeta.textContent = `Score: ${myPos.total_score} pts (${myPos.mcq_score} MCQ + ${myPos.coding_score} Coding) · Accuracy: ${Number(myPos.percentage).toFixed(1)}% · Tests: ${myPos.tests_completed}`;
                        if (posBadge) posBadge.innerHTML = `<div style="font-size:2rem; font-weight:900; color:var(--accent);">#${myPos.rank}</div>`;
                    }
                } else if (posBanner) {
                    posBanner.style.display = 'none';
                }
            }

        } catch (err) {
            console.error('[EDMITH Leaderboard Page] Load failed:', err);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #ef4444;">
                            <i class="fas fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                            Unable to load leaderboard data. Please check connection and try again.
                        </td>
                    </tr>
                `;
            }
            if (posBanner) posBanner.style.display = 'none';
        }
    }

    // Initialize
    renderLeaderboard();

})();
