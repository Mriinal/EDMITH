/**
 * EDMITH - SQL Coding Assessment Page Logic
 * Handles code editor, anti-paste restrictions, live SQL query evaluation via AlaSQL engine,
 * testcase output preview, timer countdown, and score submission to Supabase.
 */
(async function () {
    'use strict';

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const level = (params.get('level') || 'easy').toLowerCase();
    const round = parseInt(params.get('round') || '1', 10);

    // 1. Mandatory Sign-in Check
    if (window.EdmithAuthModal?.requireAuth) {
        await window.EdmithAuthModal.requireAuth({
            returnTo: window.location.href,
            title: 'Sign In Required for Coding Test',
            subtitle: 'You must be logged in to take practical SQL assessments and post verified scores to the Leaderboard.'
        });
    }

    // 2. Check 15% Course Eligibility
    if (window.EdmithProgress?.checkTestEligibility) {
        const eligibility = await window.EdmithProgress.checkTestEligibility('sql_mastery');
        if (!eligibility.eligible) {
            const mainEl = document.getElementById('codingTestMain');
            const alertEl = document.getElementById('courseEligibilityAlert');
            const msgEl = document.getElementById('eligibilityMessage');
            const contBtn = document.getElementById('continueCourseBtn');
            if (mainEl) mainEl.style.display = 'none';
            if (alertEl) alertEl.style.display = 'block';
            if (msgEl) {
                msgEl.textContent = `Complete at least 15% of the SQL & Databases Mastery course before starting tests. Your current progress is ${eligibility.percentage}%.`;
            }
            if (contBtn) {
                contBtn.href = `../${eligibility.nextLessonFile}`;
            }
            return;
        }
    }

    // Show main test UI
    const mainEl = document.getElementById('codingTestMain');
    if (mainEl) mainEl.style.display = 'block';

    // 3. Initialize Coding Test State
    if (!window.EdmithCodingExamEngine) {
        console.error('[EDMITH] EdmithCodingExamEngine not found.');
        return;
    }

    const examState = window.EdmithCodingExamEngine.initExam({
        subject: 'sql',
        difficulty: level,
        roundNumber: round,
        questionBank: window.SQL_CODING_QUESTIONS
    });

    // DOM elements
    const pillsContainer = document.getElementById('questionPills');
    const textarea = document.getElementById('sqlEditorTextarea');
    const problemHeading = document.getElementById('problemHeading');
    const problemMarks = document.getElementById('problemMarks');
    const problemTitle = document.getElementById('problemTitle');
    const problemStatement = document.getElementById('problemStatement');
    const problemInputDesc = document.getElementById('problemInputDesc');
    const problemOutputDesc = document.getElementById('problemOutputDesc');
    const problemConstraints = document.getElementById('problemConstraints');
    const timerEl = document.getElementById('timer');
    const pasteAlert = document.getElementById('pasteAlert');
    const pasteAlertText = document.getElementById('pasteAlertText');
    const testStatusBadge = document.getElementById('testStatusBadge');
    const outputMessage = document.getElementById('outputMessage');
    const tablePreview = document.getElementById('tablePreviewContainer');
    const examHeaderLevel = document.getElementById('examHeaderLevel');

    if (examHeaderLevel) {
        examHeaderLevel.textContent = `${level.charAt(0).toUpperCase() + level.slice(1)} · Round ${round}`;
    }

    // Anti-paste enforcement
    if (textarea) {
        window.EdmithCodingExamEngine.setupAntiPasteRestrictions(textarea, (reason) => {
            if (pasteAlertText) pasteAlertText.textContent = reason;
            if (pasteAlert) {
                pasteAlert.style.display = 'block';
                setTimeout(() => { pasteAlert.style.display = 'none'; }, 4000);
            }
        });
    }

    // Render question pills
    function renderPills() {
        if (!pillsContainer) return;
        pillsContainer.innerHTML = '';
        examState.questions.forEach((q, idx) => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `q-pill ${idx === examState.currentIndex ? 'active' : ''} ${examState.answers[idx].passed ? 'passed' : ''}`;
            pill.textContent = `Q${idx + 1}`;
            pill.addEventListener('click', () => switchQuestion(idx));
            pillsContainer.appendChild(pill);
        });
    }

    // Load Question details
    function switchQuestion(newIdx) {
        if (!textarea) return;
        // Save current code
        examState.answers[examState.currentIndex].submittedCode = textarea.value;
        examState.currentIndex = newIdx;

        const q = examState.questions[newIdx];
        const ans = examState.answers[newIdx];

        if (problemHeading) problemHeading.textContent = `Question ${newIdx + 1} of ${examState.questions.length}`;
        if (problemMarks) problemMarks.textContent = `${examState.marksPerQuestion} Marks`;
        if (problemTitle) problemTitle.textContent = q.title;
        if (problemStatement) problemStatement.textContent = q.problem_statement;
        if (problemInputDesc) problemInputDesc.textContent = q.input_description || 'Standard banking database relational tables.';
        if (problemOutputDesc) problemOutputDesc.textContent = q.output_description || 'Query output schema.';
        if (problemConstraints) problemConstraints.textContent = q.constraints || 'Standard SQL.';

        // If candidate previously typed code, restore it; otherwise display clean starter placeholder
        const hasCandidateCode = typeof ans.submittedCode === 'string' && ans.submittedCode.trim().length > 0;
        textarea.value = hasCandidateCode ? ans.submittedCode : (q.starter_code || '-- Write your code here\n');

        if (testStatusBadge) {
            if (ans.passed) {
                testStatusBadge.className = 'status-badge status-passed';
                testStatusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Passed';
            } else if (ans.executed) {
                testStatusBadge.className = 'status-badge status-failed';
                testStatusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Not Passed';
            } else {
                testStatusBadge.className = 'status-badge status-idle';
                testStatusBadge.innerHTML = '<i class="fas fa-circle-notch"></i> Ready to run';
            }
        }

        if (outputMessage) {
            outputMessage.textContent = ans.lastError || (ans.passed ? 'Solution verified! Passed all test cases.' : 'Click "Run Code" to test your query.');
        }
        if (tablePreview) {
            tablePreview.style.display = 'none';
        }

        renderPills();
    }

    // Run Code logic
    const runCodeBtn = document.getElementById('runCodeBtn');
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', () => {
            if (!textarea) return;
            const sql = textarea.value;
            const q = examState.questions[examState.currentIndex];
            const evalResult = window.EdmithCodingExamEngine.evaluateQuery(sql, q.id);

            if (testStatusBadge) {
                if (evalResult.passed) {
                    testStatusBadge.className = 'status-badge status-passed';
                    testStatusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Output matches test case';
                    if (outputMessage) outputMessage.textContent = '✓ Query executed successfully and returned the expected records.';
                } else {
                    testStatusBadge.className = 'status-badge status-failed';
                    testStatusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Test case failed';
                    if (outputMessage) outputMessage.textContent = evalResult.error || 'Output did not match expected records.';
                }
            }

            if (evalResult.actualData && Array.isArray(evalResult.actualData) && evalResult.actualData.length > 0) {
                renderTablePreview(evalResult.actualData);
            }
        });
    }

    // Submit Answer logic
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener('click', () => {
            if (!textarea) return;
            const sql = textarea.value;
            const q = examState.questions[examState.currentIndex];
            const ans = examState.answers[examState.currentIndex];
            ans.submittedCode = sql;
            ans.executed = true;

            const evalResult = window.EdmithCodingExamEngine.evaluateQuery(sql, q.id);
            ans.passed = evalResult.passed;
            ans.lastError = evalResult.error;

            if (testStatusBadge) {
                if (evalResult.passed) {
                    testStatusBadge.className = 'status-badge status-passed';
                    testStatusBadge.innerHTML = `<i class="fas fa-check-circle"></i> Passed (+${examState.marksPerQuestion} Marks)`;
                    if (outputMessage) outputMessage.textContent = '✓ Passed test case evaluation! Marks awarded for this problem.';
                } else {
                    testStatusBadge.className = 'status-badge status-failed';
                    testStatusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Incorrect Solution';
                    if (outputMessage) outputMessage.textContent = evalResult.error || 'Output did not match expected records.';
                }
            }

            renderPills();
        });
    }

    // Reset code logic
    const resetCodeBtn = document.getElementById('resetCodeBtn');
    if (resetCodeBtn) {
        resetCodeBtn.addEventListener('click', () => {
            if (!textarea) return;
            const q = examState.questions[examState.currentIndex];
            const ans = examState.answers[examState.currentIndex];
            textarea.value = q.starter_code || '-- Write your code here\n';
            if (ans) {
                ans.submittedCode = '';
            }
        });
    }

    function renderTablePreview(rows) {
        if (!tablePreview || !rows.length) return;
        tablePreview.style.display = 'block';
        const keys = Object.keys(rows[0]).slice(0, 8);
        let html = '<table class="coding-table-preview"><thead><tr>';
        keys.forEach(k => { html += `<th>${k}</th>`; });
        html += '</tr></thead><tbody>';
        rows.slice(0, 10).forEach(r => {
            html += '<tr>';
            keys.forEach(k => { html += `<td>${r[k] !== null ? r[k] : '<em style="color:var(--text-secondary);">NULL</em>'}</td>`; });
            html += '</tr>';
        });
        html += '</tbody></table>';
        tablePreview.innerHTML = html;
    }

    // Timer
    if (timerEl) {
        examState.timerId = setInterval(() => {
            examState.timeRemainingSeconds -= 1;
            const m = Math.floor(examState.timeRemainingSeconds / 60);
            const s = examState.timeRemainingSeconds % 60;
            timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (examState.timeRemainingSeconds <= 120) {
                timerEl.style.color = '#ef4444';
            }
            if (examState.timeRemainingSeconds <= 0) {
                clearInterval(examState.timerId);
                finishCodingExam();
            }
        }, 1000);
    }

    // Finish Exam Button
    const finishExamBtn = document.getElementById('finishExamBtn');
    if (finishExamBtn) {
        finishExamBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to submit your coding test?')) {
                finishCodingExam();
            }
        });
    }

    async function finishCodingExam() {
        if (examState.completed) return;
        examState.completed = true;
        if (examState.timerId) clearInterval(examState.timerId);

        // Save last question code
        if (textarea) {
            examState.answers[examState.currentIndex].submittedCode = textarea.value;
        }

        // Compute score
        const passedCount = examState.answers.filter(a => a.passed).length;
        const score = passedCount * examState.marksPerQuestion;
        const maxScore = examState.maximumScore;
        const percentage = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;
        const timeTaken = Math.max(0, Math.round((new Date() - examState.startedAt) / 1000));

        let rating = 'Below Average';
        if (percentage >= 90) rating = 'Excellent';
        else if (percentage >= 70) rating = 'Good';
        else if (percentage >= 40) rating = 'Average';

        const resultScore = document.getElementById('resultScore');
        const resultPercentage = document.getElementById('resultPercentage');
        const resultRating = document.getElementById('resultRating');
        const resultSolved = document.getElementById('resultSolved');
        const resultTime = document.getElementById('resultTime');
        const resultSubtitle = document.getElementById('resultSubtitle');

        if (resultScore) resultScore.textContent = `${score} / ${maxScore}`;
        if (resultPercentage) resultPercentage.textContent = `${percentage}%`;
        if (resultRating) resultRating.textContent = rating;
        if (resultSolved) resultSolved.textContent = `${passedCount} / ${examState.questions.length}`;
        if (resultTime) resultTime.textContent = `${Math.floor(timeTaken / 60)}:${String(timeTaken % 60).padStart(2, '0')}`;
        if (resultSubtitle) resultSubtitle.textContent = `SQL Coding Test · Level: ${level.toUpperCase()} · Round ${round}`;

        const modal = document.getElementById('resultModal');
        if (modal) {
            modal.hidden = false;
            modal.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => modal.classList.add('is-visible'));
        }

        // Save attempt to Supabase
        await saveCodingAttempt({
            subject: 'sql',
            testType: 'coding',
            difficulty: level,
            roundNumber: round,
            totalQuestions: examState.questions.length,
            correctAnswers: passedCount,
            incorrectAnswers: examState.questions.length - passedCount,
            unanswered: examState.answers.filter(a => !a.executed).length,
            score: score,
            maximumScore: maxScore,
            percentage: percentage,
            rating: rating,
            timeTaken: timeTaken,
            answers: examState.answers
        });
    }

    async function saveCodingAttempt(res) {
        const saveEl = document.getElementById('saveStatus');
        if (saveEl) saveEl.textContent = 'Saving your attempt to EDMITH Leaderboard...';
        try {
            const client = await window.EdmithProgress.getEdmithSupabaseClient();
            const user = await window.EdmithProgress.getAuthenticatedUser();
            if (!client || !user) {
                if (saveEl) saveEl.textContent = 'Test completed. Sign in to record your score to the official Leaderboard.';
                return;
            }

            const { data: attempt, error: aErr } = await client.from('test_attempts').insert({
                user_id: user.id,
                subject_slug: res.subject,
                test_type: res.testType,
                difficulty: res.difficulty,
                round_number: res.roundNumber,
                total_questions: res.totalQuestions,
                correct_answers: res.correctAnswers,
                incorrect_answers: res.incorrectAnswers,
                unanswered: res.unanswered,
                score: res.score,
                maximum_score: res.maximumScore,
                percentage: res.percentage,
                rating: res.rating,
                status: 'completed',
                time_taken: res.timeTaken
            }).select('id').single();

            if (aErr) throw aErr;

            // Save individual answers
            if (attempt && attempt.id && res.answers.length) {
                const rows = res.answers.map(a => ({
                    attempt_id: attempt.id,
                    question_id: a.questionId,
                    submitted_answer: a.submittedCode,
                    is_correct: a.passed,
                    marks_awarded: a.passed ? examState.marksPerQuestion : 0
                }));
                await client.from('test_attempt_answers').insert(rows);
            }

            if (saveEl) saveEl.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Your attempt was saved successfully to the Leaderboard!</span>';
        } catch (err) {
            console.warn('[EDMITH Coding Test] Save attempt error:', err);
            if (saveEl) saveEl.textContent = 'Test complete. Local attempt recorded.';
        }
    }

    // Modal close
    const resultClose = document.getElementById('resultClose');
    if (resultClose) {
        resultClose.addEventListener('click', () => {
            const modal = document.getElementById('resultModal');
            if (modal) {
                modal.classList.remove('is-visible');
                setTimeout(() => { modal.hidden = true; }, 200);
            }
        });
    }

    const retryBtn = document.getElementById('retryButton');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Initialize question 1
    switchQuestion(0);

})();
