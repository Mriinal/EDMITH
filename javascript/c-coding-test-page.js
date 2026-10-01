/**
 * EDMITH C Coding Examination Page Controller
 * Powers interactive C problem evaluations using Web Worker compilation (JSCPP).
 * Features:
 * - Anti-paste examination protection
 * - Web Worker client-side compilation & execution with sandbox timeout
 * - Test case assertion and output normalization
 * - 20-25 minute countdown timer
 * - Persistence to Supabase test_attempts
 */
(async function () {
    'use strict';

    const els = {
        main: document.getElementById('codingTestMain'),
        eligibilityAlert: document.getElementById('courseEligibilityAlert'),
        eligibilityMessage: document.getElementById('eligibilityMessage'),
        continueCourseBtn: document.getElementById('continueCourseBtn'),
        headerTitle: document.getElementById('examHeaderTitle'),
        headerLevel: document.getElementById('examHeaderLevel'),
        questionPills: document.getElementById('questionPills'),
        timer: document.getElementById('timer'),
        finishBtn: document.getElementById('finishExamBtn'),
        pasteAlert: document.getElementById('pasteAlert'),
        pasteAlertText: document.getElementById('pasteAlertText'),
        problemHeading: document.getElementById('problemHeading'),
        problemMarks: document.getElementById('problemMarks'),
        problemTitle: document.getElementById('problemTitle'),
        problemStatement: document.getElementById('problemStatement'),
        problemInputDesc: document.getElementById('problemInputDesc'),
        problemOutputDesc: document.getElementById('problemOutputDesc'),
        problemConstraints: document.getElementById('problemConstraints'),
        editorTextarea: document.getElementById('cEditorTextarea'),
        resetBtn: document.getElementById('resetCodeBtn'),
        runBtn: document.getElementById('runCodeBtn'),
        submitBtn: document.getElementById('submitAnswerBtn'),
        statusBadge: document.getElementById('testStatusBadge'),
        outputMessage: document.getElementById('outputMessage'),
        modal: document.getElementById('resultModal'),
        closeModal: document.getElementById('resultClose'),
        retryBtn: document.getElementById('retryButton'),
        resultScore: document.getElementById('resultScore'),
        resultPercentage: document.getElementById('resultPercentage'),
        resultRating: document.getElementById('resultRating'),
        resultSolved: document.getElementById('resultSolved'),
        resultTime: document.getElementById('resultTime'),
        saveStatus: document.getElementById('saveStatus')
    };

    // 1. Mandatory Sign-in Check
    if (window.EdmithAuthModal?.requireAuth) {
        await window.EdmithAuthModal.requireAuth({
            returnTo: window.location.href,
            title: 'Sign In Required for C Coding Test',
            subtitle: 'You must be logged in to participate in the C Coding examination and record scores.'
        });
    }

    // 2. Course Eligibility Verification (15%)
    if (window.EdmithProgress?.checkTestEligibility) {
        const eligibility = await window.EdmithProgress.checkTestEligibility('c_programming');
        if (!eligibility.eligible) {
            if (els.main) els.main.style.display = 'none';
            if (els.eligibilityAlert) {
                els.eligibilityAlert.style.display = 'block';
                if (els.eligibilityMessage) {
                    els.eligibilityMessage.textContent = `Complete at least 15% of the C Programming course before taking the coding examination. Current progress: ${eligibility.percentage}%.`;
                }
                if (els.continueCourseBtn) {
                    els.continueCourseBtn.href = `../c/${eligibility.nextLessonFile || 'history-of-c.html'}`;
                }
            }
            return;
        }
    }

    if (els.main) els.main.style.display = 'block';

    const urlParams = new URLSearchParams(window.location.search);
    const difficulty = (urlParams.get('level') || 'easy').toLowerCase();
    const roundNumber = parseInt(urlParams.get('round') || '1', 10);

    const questions = (window.C_CODING_QUESTIONS || []).filter(q => q.difficulty === difficulty);
    const activeQuestions = questions.length ? questions : (window.C_CODING_QUESTIONS || []);

    let currentIndex = 0;
    let marksPerQ = difficulty === 'easy' ? 3 : (difficulty === 'medium' ? 6 : 12);
    let totalTime = (difficulty === 'easy' ? 20 : 25) * 60;
    let timerId = null;
    let startedAt = new Date();

    const state = {
        questions: activeQuestions,
        answers: activeQuestions.map(q => ({
            questionId: q.id,
            title: q.title,
            marks: q.marks || marksPerQ,
            submittedCode: q.starter_code || '#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n',
            passed: false,
            executed: false
        }))
    };

    function startTimer() {
        timerId = setInterval(() => {
            totalTime--;
            if (totalTime <= 0) {
                clearInterval(timerId);
                finishExam(true);
            }
            const mins = Math.floor(totalTime / 60);
            const secs = totalTime % 60;
            if (els.timer) {
                els.timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                if (totalTime <= 120) els.timer.style.color = '#ef4444';
            }
        }, 1000);
    }

    function renderQuestionPills() {
        if (!els.questionPills) return;
        els.questionPills.innerHTML = state.questions.map((q, idx) => {
            const ans = state.answers[idx];
            const statusClass = ans.passed ? 'q-pill-passed' : (ans.executed ? 'q-pill-failed' : '');
            const activeClass = idx === currentIndex ? 'q-pill-active' : '';
            return `<button type="button" class="q-pill ${statusClass} ${activeClass}" data-idx="${idx}">P${idx + 1}</button>`;
        }).join('');

        els.questionPills.querySelectorAll('.q-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                saveCurrentEditorContent();
                currentIndex = parseInt(btn.dataset.idx, 10);
                loadCurrentProblem();
            });
        });
    }

    function saveCurrentEditorContent() {
        if (els.editorTextarea && state.answers[currentIndex]) {
            state.answers[currentIndex].submittedCode = els.editorTextarea.value;
        }
    }

    function loadCurrentProblem() {
        const q = state.questions[currentIndex];
        const ans = state.answers[currentIndex];
        if (!q) return;

        if (els.headerLevel) els.headerLevel.textContent = `${difficulty.toUpperCase()} · Problem ${currentIndex + 1} of ${state.questions.length}`;
        if (els.problemHeading) els.problemHeading.textContent = `Problem ${currentIndex + 1}`;
        if (els.problemMarks) els.problemMarks.textContent = `${q.marks || marksPerQ} Marks`;
        if (els.problemTitle) els.problemTitle.textContent = q.title;
        if (els.problemStatement) els.problemStatement.textContent = q.problem_statement;
        if (els.problemInputDesc) els.problemInputDesc.textContent = q.input_description;
        if (els.problemOutputDesc) els.problemOutputDesc.textContent = q.output_description;
        if (els.problemConstraints) els.problemConstraints.textContent = q.constraints;

        if (els.editorTextarea) {
            els.editorTextarea.value = ans.submittedCode;
        }

        if (els.statusBadge) {
            if (ans.passed) {
                els.statusBadge.className = 'status-badge status-passed';
                els.statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Passed';
            } else if (ans.executed) {
                els.statusBadge.className = 'status-badge status-failed';
                els.statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
            } else {
                els.statusBadge.className = 'status-badge status-idle';
                els.statusBadge.innerHTML = '<i class="fas fa-circle-notch"></i> Ready to run';
            }
        }

        renderQuestionPills();
    }

    // In-browser C execution via Web Worker
    function executeC(code, stdinInput) {
        return new Promise((resolve) => {
            let worker;
            try {
                worker = new Worker('../javascript/c-compiler-worker.js');
            } catch (e) {
                resolve({ success: false, error: 'Web Worker creation failed.' });
                return;
            }

            const timeoutId = setTimeout(() => {
                worker.terminate();
                resolve({ success: false, error: 'Execution Timed Out (Time limit: 4000ms).' });
            }, 4500);

            worker.onmessage = function (e) {
                clearTimeout(timeoutId);
                const msg = e.data || {};
                if (msg.type === 'done') {
                    worker.terminate();
                    resolve({ success: true, stdout: msg.stdout || '', duration: msg.duration });
                } else if (msg.type === 'error') {
                    worker.terminate();
                    resolve({ success: false, error: msg.message || 'Compilation or runtime error.' });
                }
            };

            worker.onerror = function (err) {
                clearTimeout(timeoutId);
                worker.terminate();
                resolve({ success: false, error: err.message || 'Worker thread error.' });
            };

            worker.postMessage({ action: 'run', code: code, input: stdinInput });
        });
    }

    async function runCode() {
        saveCurrentEditorContent();
        const q = state.questions[currentIndex];
        const ans = state.answers[currentIndex];
        if (!q || !els.editorTextarea) return;

        const code = els.editorTextarea.value.trim();
        if (!code) {
            alert('Please write your C code before running.');
            return;
        }

        if (els.statusBadge) {
            els.statusBadge.className = 'status-badge status-running';
            els.statusBadge.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Compiling &amp; Testing...';
        }

        if (els.outputMessage) {
            els.outputMessage.innerHTML = '<span style="color:var(--text-secondary);">Running test cases...</span>';
        }

        const testCases = q.test_cases || [];
        let allPassed = true;
        let outputLog = [];

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const res = await executeC(code, tc.input);
            if (!res.success) {
                allPassed = false;
                outputLog.push(`Test Case ${i + 1}: FAILED\nInput: ${tc.input}\nError: ${res.error}\n`);
                break;
            } else {
                const actual = (res.stdout || '').trim();
                const expected = (tc.expected || '').trim();
                if (actual === expected) {
                    outputLog.push(`Test Case ${i + 1}: PASSED (Input: "${tc.input}" -> Output: "${actual}")`);
                } else {
                    allPassed = false;
                    outputLog.push(`Test Case ${i + 1}: FAILED\nInput: ${tc.input}\nExpected: "${expected}"\nActual: "${actual}"`);
                    break;
                }
            }
        }

        ans.executed = true;
        ans.passed = allPassed;

        if (els.statusBadge) {
            if (allPassed) {
                els.statusBadge.className = 'status-badge status-passed';
                els.statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> All Test Cases Passed!';
            } else {
                els.statusBadge.className = 'status-badge status-failed';
                els.statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Some Tests Failed';
            }
        }

        if (els.outputMessage) {
            els.outputMessage.innerHTML = `<pre style="font-family:var(--font-mono); white-space:pre-wrap; color:${allPassed ? '#10b981' : '#ef4444'};">${outputLog.join('\n')}</pre>`;
        }

        renderQuestionPills();
    }

    async function finishExam(isTimeout = false) {
        saveCurrentEditorContent();
        clearInterval(timerId);

        let totalScore = 0;
        let solvedCount = 0;
        const maxScore = state.questions.length * marksPerQ;

        state.answers.forEach(a => {
            if (a.passed) {
                totalScore += a.marks;
                solvedCount++;
            }
        });

        const pct = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;
        let rating = 'Below Average';
        if (pct >= 90) rating = 'Excellent';
        else if (pct >= 75) rating = 'Good';
        else if (pct >= 50) rating = 'Average';

        const timeTaken = Math.max(0, Math.round((new Date() - startedAt) / 1000));

        if (els.resultScore) els.resultScore.textContent = `${totalScore} / ${maxScore}`;
        if (els.resultPercentage) els.resultPercentage.textContent = `${pct}%`;
        if (els.resultRating) els.resultRating.textContent = rating;
        if (els.resultSolved) els.resultSolved.textContent = `${solvedCount} / ${state.questions.length}`;
        const mins = Math.floor(timeTaken / 60);
        const secs = timeTaken % 60;
        if (els.resultTime) els.resultTime.textContent = `${mins}m ${secs}s`;

        if (els.modal) {
            els.modal.hidden = false;
            els.modal.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => els.modal.classList.add('is-visible'));
        }

        // Persist to Supabase
        if (els.saveStatus) els.saveStatus.textContent = 'Saving coding examination result...';
        try {
            let user = window.EdmithProgress?.getActiveAuthUserSync ? window.EdmithProgress.getActiveAuthUserSync() : null;
            if (!user && window.EdmithProgress?.getAuthenticatedUser) {
                user = await window.EdmithProgress.getAuthenticatedUser();
            }
            if (user) {
                const client = window.EdmithProgress?.getEdmithSupabaseClient ? await window.EdmithProgress.getEdmithSupabaseClient() : null;
                if (client) {
                    await client.from('test_attempts').insert({
                        user_id: user.id,
                        subject_slug: 'c',
                        test_type: 'coding',
                        difficulty: difficulty,
                        round_number: roundNumber,
                        total_questions: state.questions.length,
                        correct_answers: solvedCount,
                        incorrect_answers: state.questions.length - solvedCount,
                        unanswered: 0,
                        score: totalScore,
                        maximum_score: maxScore,
                        percentage: pct,
                        rating: rating,
                        status: 'completed',
                        time_taken: timeTaken
                    });
                    if (els.saveStatus) els.saveStatus.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Examination successfully recorded!</span>';
                }
            }
        } catch (e) {
            console.warn('[EDMITH C Coding] DB save warning:', e);
            if (els.saveStatus) els.saveStatus.textContent = 'Test completed! Local score recorded.';
        }
    }

    // Anti-paste examination protection
    if (els.editorTextarea) {
        els.editorTextarea.addEventListener('paste', (e) => {
            e.preventDefault();
            if (els.pasteAlert) {
                els.pasteAlert.classList.add('show');
                setTimeout(() => els.pasteAlert.classList.remove('show'), 3500);
            }
        });
        els.editorTextarea.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if (els.runBtn) els.runBtn.addEventListener('click', runCode);
    if (els.submitBtn) {
        els.submitBtn.addEventListener('click', async () => {
            await runCode();
            if (currentIndex < state.questions.length - 1) {
                currentIndex++;
                loadCurrentProblem();
            } else {
                finishExam(false);
            }
        });
    }
    if (els.finishBtn) els.finishBtn.addEventListener('click', () => finishExam(false));
    if (els.resetBtn) {
        els.resetBtn.addEventListener('click', () => {
            const q = state.questions[currentIndex];
            if (q && els.editorTextarea) {
                els.editorTextarea.value = q.starter_code || '';
            }
        });
    }
    if (els.closeModal) {
        els.closeModal.addEventListener('click', () => {
            if (els.modal) els.modal.classList.remove('is-visible');
        });
    }
    if (els.retryBtn) {
        els.retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    loadCurrentProblem();
    startTimer();
})();
