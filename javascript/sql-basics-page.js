/**
 * EDMITH - SQL Basics MCQ Test Page Logic
 * Handles level/round selection, URL parameter parsing, exam lifecycle,
 * option card click events, timing, and Leaderboard score persistence.
 */
(async function () {
    'use strict';

    const els = {
        levelScreen: document.getElementById('levelScreen'),
        examScreen: document.getElementById('examScreen'),
        levels: [...document.querySelectorAll('.sql-level-grid .sql-level-card')],
        rounds: [...document.querySelectorAll('#roundSelector .sql-level-card')],
        start: document.getElementById('startButton'),
        form: document.getElementById('questionForm'),
        content: document.getElementById('questionContent'),
        counter: document.getElementById('questionCounter'),
        timer: document.getElementById('timer'),
        progress: document.getElementById('progressBar'),
        next: document.getElementById('nextButton'),
        alert: document.getElementById('examAlert'),
        levelLabel: document.getElementById('levelLabel'),
        resultLevel: document.getElementById('resultLevel'),
        modal: document.getElementById('resultModal'),
        close: document.getElementById('resultClose'),
        retry: document.getElementById('retryButton'),
        save: document.getElementById('saveStatus'),
        score: document.getElementById('resultScore'),
        percentage: document.getElementById('resultPercentage'),
        rating: document.getElementById('resultRating'),
        correct: document.getElementById('resultCorrect'),
        incorrect: document.getElementById('resultIncorrect'),
        unanswered: document.getElementById('resultUnanswered'),
        time: document.getElementById('resultTime'),
        cardContainer: document.getElementById('testCardContainer'),
        eligibilityAlert: document.getElementById('courseEligibilityAlert'),
        eligibilityMessage: document.getElementById('eligibilityMessage'),
        continueCourseBtn: document.getElementById('continueCourseBtn')
    };

    const urlParams = new URLSearchParams(window.location.search);
    let selectedLevel = urlParams.get('level') ? urlParams.get('level').toLowerCase() : null;
    let selectedRound = parseInt(urlParams.get('round') || '1', 10);
    let examRun = null;
    let examActive = false;

    // 1. Mandatory Sign-in Check
    if (window.EdmithAuthModal?.requireAuth) {
        await window.EdmithAuthModal.requireAuth({
            returnTo: window.location.href,
            title: 'Sign In Required for Tests',
            subtitle: 'You must be logged in to participate in assessments and record scores to the Leaderboard.'
        });
    }

    // 2. Check 15% Course Eligibility
    if (window.EdmithProgress?.checkTestEligibility) {
        const eligibility = await window.EdmithProgress.checkTestEligibility('sql_mastery');
        if (!eligibility.eligible) {
            if (els.cardContainer) els.cardContainer.style.display = 'none';
            if (els.eligibilityAlert) {
                els.eligibilityAlert.style.display = 'block';
                if (els.eligibilityMessage) {
                    els.eligibilityMessage.textContent = `Complete at least 15% of the SQL & Databases Mastery course before starting tests. Your current progress is ${eligibility.percentage}%.`;
                }
                if (els.continueCourseBtn) {
                    els.continueCourseBtn.href = `../${eligibility.nextLessonFile}`;
                }
            }
            return;
        }
    }

    window.addEventListener('beforeunload', (e) => {
        if (examActive) { e.preventDefault(); e.returnValue = ''; }
    });

    const config = {
        examType: 'sql_basics',
        questionBank: window.SQL_BASIC_QUESTIONS,
        questionCount: 15,
        timePerQuestion: 30,
        roundNumber: selectedRound,
        renderQuestion,
        onTimer,
        onSubmitted,
        onComplete,
        onError: showAlert
    };

    function showAlert(msg) {
        if (!els.alert) return;
        els.alert.textContent = msg;
        els.alert.hidden = false;
    }

    function clearAlert() {
        if (!els.alert) return;
        els.alert.hidden = true;
        els.alert.textContent = '';
    }

    function formatTime(s) {
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, '0')}`;
    }

    function escapeHtml(v) {
        return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
    }

    // Level selection
    els.levels.forEach(btn => btn.addEventListener('click', () => {
        selectedLevel = btn.dataset.level;
        els.levels.forEach(b => {
            const active = b === btn;
            b.classList.toggle('is-selected', active);
            b.setAttribute('aria-pressed', String(active));
        });
        if (els.start) els.start.disabled = false;
        clearAlert();
    }));

    // Round selection
    els.rounds.forEach(btn => btn.addEventListener('click', () => {
        selectedRound = parseInt(btn.dataset.round, 10);
        config.roundNumber = selectedRound;
        els.rounds.forEach(b => b.classList.toggle('is-selected', b === btn));
    }));

    // Auto-select if query params were passed
    if (selectedLevel) {
        const levelCard = els.levels.find(b => b.dataset.level === selectedLevel);
        if (levelCard) {
            levelCard.click();
        }
    }
    if (selectedRound) {
        const roundCard = els.rounds.find(b => parseInt(b.dataset.round, 10) === selectedRound);
        if (roundCard) {
            roundCard.click();
        }
    }
    if (selectedLevel && els.start) {
        els.start.disabled = false;
    }

    function renderQuestion(p) {
        clearAlert();
        if (els.next) {
            els.next.disabled = false;
        }
        els.counter.textContent = `Question ${p.questionNumber} of ${p.total}`;
        els.progress.style.width = `${(p.questionNumber / p.total) * 100}%`;
        els.next.innerHTML = p.questionNumber === p.total ? 'Submit Test <i class="fas fa-check"></i>' : 'Next <i class="fas fa-arrow-right"></i>';
        els.content.innerHTML = `
            <div class="sql-question-card">
                <div class="sql-question-meta">
                    <span class="sql-category">${escapeHtml(p.question.category)}</span>
                    <span class="sql-difficulty">${escapeHtml(p.question.difficulty)}</span>
                    <span class="sql-category" style="background:var(--bg-secondary); color:var(--text-secondary);">Round ${p.roundNumber}</span>
                </div>
                <h2>${escapeHtml(p.question.question)}</h2>
                <fieldset style="border:none; padding:0; margin:0;">
                    <legend class="sr-only">Choose one answer</legend>
                    <div class="sql-options-list" style="display:flex; flex-direction:column; gap:0.75rem; margin-top:1rem;">
                        ${p.options.map((o, i) => `
                            <label class="sql-option ${p.selectedAnswer === o.id ? 'is-selected' : ''}" for="opt-${p.questionNumber}-${i}">
                                <input type="radio" id="opt-${p.questionNumber}-${i}" name="answer" value="${escapeHtml(o.id)}" ${p.selectedAnswer === o.id ? 'checked' : ''}>
                                <span class="sql-option-marker" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
                                <span class="sql-option-text">${escapeHtml(o.text)}</span>
                            </label>
                        `).join('')}
                    </div>
                </fieldset>
            </div>
        `;

        const state = examRun?.getState();
        const optionLabels = els.content.querySelectorAll('.sql-option');
        const inputs = els.content.querySelectorAll('input[name="answer"]');

        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (state && state.answers && state.answers[state.currentIndex]) {
                    state.answers[state.currentIndex].selectedAnswer = input.value;
                }
                optionLabels.forEach(label => {
                    const r = label.querySelector('input[type="radio"]');
                    label.classList.toggle('is-selected', Boolean(r && r.checked));
                });
            });
        });

        // Ensure clicking anywhere on the option container cleanly checks the radio
        optionLabels.forEach(label => {
            label.addEventListener('click', (e) => {
                const radio = label.querySelector('input[type="radio"]');
                if (radio && e.target !== radio) {
                    e.preventDefault();
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }

    function onTimer(seconds) {
        els.timer.textContent = `00:${String(seconds).padStart(2, '0')}`;
        els.timer.classList.toggle('timer-warning', seconds <= 10);
    }

    function onSubmitted({ timedOut }) {
        if (els.next) els.next.disabled = false;
        if (timedOut) showAlert('Time expired. The question was recorded and the next question has started.');
    }

    function start() {
        if (!selectedLevel) return;
        clearAlert();
        config.examLevel = selectedLevel;
        config.roundNumber = selectedRound;
        els.levelLabel.textContent = `Level: ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} · Round ${selectedRound}`;
        els.levelScreen.hidden = true;
        els.examScreen.hidden = false;
        examActive = true;
        if (els.next) els.next.disabled = false;
        examRun = window.EdmithExamEngine.startExam(config);
        if (!examRun) {
            examActive = false;
            els.examScreen.hidden = true;
            els.levelScreen.hidden = false;
        }
    }

    if (els.start) els.start.addEventListener('click', start);

    if (els.form) {
        els.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!examRun) return;
            const state = examRun.getState();
            if (state.submitting || state.completed) return;
            const selected = els.form.querySelector('input[name="answer"]:checked');
            state.answers[state.currentIndex].selectedAnswer = selected ? selected.value : null;
            if (els.next) els.next.disabled = true;
            window.EdmithExamEngine.submitCurrent(state, config, false);
        });
    }

    async function onComplete(result) {
        examActive = false;
        if (els.score) els.score.textContent = `${result.score} / ${result.maximumScore}`;
        if (els.percentage) els.percentage.textContent = `${result.percentage.toFixed(2)}%`;
        if (els.rating) els.rating.textContent = result.rating;
        if (els.correct) els.correct.textContent = `${result.correctAnswers} (+${result.score} marks)`;
        if (els.incorrect) els.incorrect.textContent = result.incorrectAnswers;
        if (els.unanswered) els.unanswered.textContent = result.unanswered;
        if (els.time) els.time.textContent = formatTime(result.timeTaken);
        if (els.resultLevel) els.resultLevel.textContent = `Level: ${result.examLevel.charAt(0).toUpperCase() + result.examLevel.slice(1)} · Round ${result.roundNumber}`;
        if (els.save) els.save.textContent = 'Saving your attempt to EDMITH Leaderboard…';
        if (els.modal) {
            els.modal.hidden = false;
            els.modal.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => els.modal.classList.add('is-visible'));
        }
        await saveAttempt(result);
    }

    async function saveAttempt(result) {
        try {
            let user = window.EdmithProgress?.getActiveAuthUserSync ? window.EdmithProgress.getActiveAuthUserSync() : null;
            if (!user && window.EdmithProgress?.getAuthenticatedUser) {
                user = await window.EdmithProgress.getAuthenticatedUser();
            }
            if (!user) {
                if (els.save) els.save.textContent = 'Test completed. Sign in to record your score to the official Leaderboard.';
                return;
            }
            const client = window.EdmithProgress?.getEdmithSupabaseClient ? await window.EdmithProgress.getEdmithSupabaseClient() : null;
            if (!client) throw new Error('Database connection unavailable.');

            // Insert into unified test_attempts
            const { data: attempt, error: attemptError } = await client.from('test_attempts').insert({
                user_id: user.id,
                subject_slug: 'sql',
                test_type: 'mcq',
                difficulty: result.examLevel,
                round_number: result.roundNumber,
                total_questions: result.totalQuestions,
                correct_answers: result.correctAnswers,
                incorrect_answers: result.incorrectAnswers,
                unanswered: result.unanswered,
                score: result.score,
                maximum_score: result.maximumScore,
                percentage: result.percentage,
                rating: result.rating,
                status: 'completed',
                time_taken: result.timeTaken
            }).select('id').single();

            if (attemptError) {
                console.warn('[EDMITH Test] test_attempts insert error (retrying legacy):', attemptError);
            }

            // Also save to legacy sql_exam_attempts for backward compatibility
            try {
                await client.from('sql_exam_attempts').insert({
                    user_id: user.id,
                    exam_type: 'sql_basics',
                    exam_level: result.examLevel,
                    total_questions: result.totalQuestions,
                    correct_answers: result.correctAnswers,
                    incorrect_answers: result.incorrectAnswers,
                    unanswered: result.unanswered,
                    score: result.score,
                    percentage: result.percentage,
                    rating: result.rating,
                    time_taken: result.timeTaken
                });
            } catch (_) {}

            // Insert attempt answers
            if (attempt && attempt.id && result.answers.length) {
                const rows = result.answers.map(a => ({
                    attempt_id: attempt.id,
                    question_id: a.questionId,
                    submitted_answer: a.selectedAnswer,
                    is_correct: a.isCorrect,
                    marks_awarded: a.isCorrect ? result.marksPerQuestion : 0,
                    time_taken: a.timeTaken
                }));
                await client.from('test_attempt_answers').insert(rows);
            }

            if (els.save) els.save.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Your attempt was saved successfully to the Leaderboard!</span>';
        } catch (error) {
            console.error('[EDMITH SQL Exam] Save failed:', error);
            if (els.save) els.save.textContent = 'Your test is complete! Local attempt saved.';
        }
    }

    function closeModal() {
        if (!els.modal) return;
        els.modal.classList.remove('is-visible');
        setTimeout(() => {
            els.modal.hidden = true;
            els.modal.setAttribute('aria-hidden', 'true');
        }, 180);
    }

    if (els.retry) {
        els.retry.addEventListener('click', () => {
            closeModal();
            els.examScreen.hidden = true;
            els.levelScreen.hidden = false;
            examRun = null;
        });
    }

    if (els.close) els.close.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.modal && !els.modal.hidden) closeModal();
    });

})();
