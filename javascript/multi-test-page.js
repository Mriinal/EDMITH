/**
 * EDMITH Centralized Multi-Subject MCQ Test Controller
 * Powers: Python, C, ETL Testing, and Programming Fundamentals MCQ assessments.
 * Integrates with EdmithExamEngine, EdmithProgress, EdmithAuthModal, and Supabase.
 */
(async function () {
    'use strict';

    // 1. Identify Subject Configuration
    const pageMain = document.querySelector('main[data-subject]');
    const subjectKey = pageMain ? pageMain.getAttribute('data-subject') : 'python_programming';

    const SUBJECT_CONFIGS = {
        python_programming: {
            slug: 'python',
            name: 'Python Programming',
            courseId: 'python_programming',
            courseDir: 'python',
            defaultPage: 'introduction-to-python.html',
            getBank: () => window.PYTHON_BASIC_QUESTIONS || []
        },
        c_programming: {
            slug: 'c',
            name: 'C Programming',
            courseId: 'c_programming',
            courseDir: 'c',
            defaultPage: 'history-of-c.html',
            getBank: () => window.C_BASIC_QUESTIONS || []
        },
        etl_testing: {
            slug: 'etl',
            name: 'ETL Testing',
            courseId: 'etl_testing',
            courseDir: 'etl',
            defaultPage: 'what-is-data.html',
            getBank: () => window.ETL_BASIC_QUESTIONS || []
        },
        programming_fundamentals: {
            slug: 'fundamentals',
            name: 'Programming Fundamentals',
            courseId: 'programming_fundamentals',
            courseDir: 'fundamentals',
            defaultPage: 'what-is-programming.html',
            getBank: () => window.FUNDAMENTALS_BASIC_QUESTIONS || []
        }
    };

    const cfg = SUBJECT_CONFIGS[subjectKey] || SUBJECT_CONFIGS.python_programming;

    // 2. DOM Elements
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

    // 3. Mandatory Sign-in Check
    if (window.EdmithAuthModal?.requireAuth) {
        await window.EdmithAuthModal.requireAuth({
            returnTo: window.location.href,
            title: `Sign In Required for ${cfg.name} Tests`,
            subtitle: 'You must be logged in to participate in assessments and record scores to the official Leaderboard.'
        });
    }

    // 4. Course Eligibility Verification (15% completed required)
    if (window.EdmithProgress?.checkTestEligibility) {
        const eligibility = await window.EdmithProgress.checkTestEligibility(cfg.courseId);
        if (!eligibility.eligible) {
            if (els.cardContainer) els.cardContainer.style.display = 'none';
            if (els.eligibilityAlert) {
                els.eligibilityAlert.style.display = 'block';
                if (els.eligibilityMessage) {
                    els.eligibilityMessage.textContent = `Complete at least 15% of the ${cfg.name} course before starting tests. Your current progress is ${eligibility.percentage}%.`;
                }
                if (els.continueCourseBtn) {
                    const nextFile = eligibility.nextLessonFile || cfg.defaultPage;
                    els.continueCourseBtn.href = `../${cfg.courseDir}/${nextFile}`;
                }
            }
            return;
        }
    }

    // Guard page unload during test
    window.addEventListener('beforeunload', (e) => {
        if (examActive) { e.preventDefault(); e.returnValue = ''; }
    });

    const engineConfig = {
        examType: `${cfg.slug}_basics`,
        questionBank: cfg.getBank(),
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

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function setupLevelSelection() {
        if (!els.levels.length) return;

        els.levels.forEach(btn => {
            btn.addEventListener('click', () => {
                els.levels.forEach(b => {
                    b.classList.remove('is-selected');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('is-selected');
                btn.setAttribute('aria-pressed', 'true');
                selectedLevel = btn.dataset.level;
                clearAlert();
                validateReady();
            });
        });

        if (els.rounds.length) {
            els.rounds.forEach(btn => {
                btn.addEventListener('click', () => {
                    els.rounds.forEach(b => b.classList.remove('is-selected'));
                    btn.classList.add('is-selected');
                    selectedRound = parseInt(btn.dataset.round, 10) || 1;
                    engineConfig.roundNumber = selectedRound;
                });
            });
        }

        if (selectedLevel) {
            const match = els.levels.find(b => b.dataset.level === selectedLevel);
            if (match) {
                match.classList.add('is-selected');
                match.setAttribute('aria-pressed', 'true');
            }
        }
        if (selectedRound && els.rounds.length) {
            const rMatch = els.rounds.find(b => parseInt(b.dataset.round, 10) === selectedRound);
            if (rMatch) {
                els.rounds.forEach(b => b.classList.remove('is-selected'));
                rMatch.classList.add('is-selected');
            }
        }

        validateReady();
    }

    function validateReady() {
        if (!els.start) return;
        const valid = ['easy', 'medium', 'hard'].includes(selectedLevel);
        els.start.disabled = !valid;
    }

    function renderQuestion(payload) {
        clearAlert();
        if (els.counter) els.counter.textContent = `Question ${payload.questionNumber} of ${payload.total}`;
        if (els.levelLabel) {
            const marks = selectedLevel === 'easy' ? 1 : (selectedLevel === 'medium' ? 3 : 6);
            els.levelLabel.textContent = `Level: ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} · Round ${selectedRound} (${marks} Mark${marks > 1 ? 's' : ''}/question)`;
        }
        if (els.progress) {
            const pct = ((payload.questionNumber - 1) / payload.total) * 100;
            els.progress.style.width = `${pct}%`;
        }
        if (!els.content) return;

        const optionsHtml = payload.options.map((opt, idx) => `
            <label class="sql-option-card" for="opt-${opt.id}">
                <input type="radio" name="examAnswer" id="opt-${opt.id}" value="${opt.id}">
                <span class="sql-option-marker">${String.fromCharCode(65 + idx)}</span>
                <span class="sql-option-text">${escapeHtml(opt.text)}</span>
            </label>
        `).join('');

        els.content.innerHTML = `
            <div class="sql-question-card">
                <div class="sql-question-meta">
                    <span class="sql-category"><i class="fas fa-tag"></i> ${escapeHtml(payload.question.category || cfg.name)}</span>
                    <span class="sql-difficulty ${selectedLevel}">${selectedLevel.toUpperCase()}</span>
                </div>
                <h3 class="sql-question-title">${escapeHtml(payload.question.question)}</h3>
                <div class="sql-options-group" role="radiogroup" aria-label="Answer options">
                    ${optionsHtml}
                </div>
            </div>
        `;

        const inputs = els.content.querySelectorAll('input[name="examAnswer"]');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                inputs.forEach(i => i.closest('.sql-option-card')?.classList.remove('is-selected'));
                input.closest('.sql-option-card')?.classList.add('is-selected');
                const state = examRun?.getState();
                if (state && state.answers[state.currentIndex]) {
                    state.answers[state.currentIndex].selectedAnswer = input.value;
                }
            });
        });
    }

    function onTimer(remainingSeconds) {
        if (!els.timer) return;
        els.timer.textContent = formatTime(remainingSeconds);
        if (remainingSeconds <= 5) {
            els.timer.classList.add('timer-warning');
        } else {
            els.timer.classList.remove('timer-warning');
        }
    }

    function onSubmitted(event) {
        // Option highlighting or smooth transition
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
        if (els.save) els.save.textContent = 'Saving your attempt to EDMITH records…';
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
                if (els.save) els.save.textContent = 'Test completed. Sign in to record scores to your account.';
                return;
            }
            const client = window.EdmithProgress?.getEdmithSupabaseClient ? await window.EdmithProgress.getEdmithSupabaseClient() : null;
            if (!client) throw new Error('Database connection unavailable.');

            // Insert into unified test_attempts table
            const { data: attempt, error: attemptError } = await client.from('test_attempts').insert({
                user_id: user.id,
                subject_slug: cfg.slug,
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
                console.warn('[EDMITH Test] test_attempts insert warning:', attemptError);
            }

            // Insert attempt answers
            if (attempt && attempt.id && result.answers && result.answers.length) {
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

            if (els.save) els.save.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Your attempt was saved successfully!</span>';
        } catch (error) {
            console.error('[EDMITH Test] Save failed:', error);
            if (els.save) els.save.textContent = 'Test completed! Local assessment recorded.';
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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Attach form and button listeners
    if (els.start) {
        els.start.addEventListener('click', () => {
            if (!['easy', 'medium', 'hard'].includes(selectedLevel)) {
                showAlert('Please choose an examination difficulty before starting.');
                return;
            }
            engineConfig.examLevel = selectedLevel;
            engineConfig.roundNumber = selectedRound;
            engineConfig.questionBank = cfg.getBank();

            els.levelScreen.hidden = true;
            els.examScreen.hidden = false;
            examActive = true;
            examRun = window.EdmithExamEngine.startExam(engineConfig);
        });
    }

    if (els.form) {
        els.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const state = examRun?.getState();
            if (state) {
                window.EdmithExamEngine.submitCurrent(state, engineConfig, false);
            }
        });
    }

    if (els.close) els.close.addEventListener('click', closeModal);
    if (els.retry) {
        els.retry.addEventListener('click', () => {
            closeModal();
            els.examScreen.hidden = true;
            els.levelScreen.hidden = false;
            examActive = false;
        });
    }

    setupLevelSelection();
})();
