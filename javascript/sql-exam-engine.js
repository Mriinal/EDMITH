/* Reusable EDMITH exam engine for timed MCQ tests.
   Supports multiple non-repeating rounds (1 to 5), deterministic question allocation,
   and accurate marking (Easy: 1, Medium: 3, Hard: 6).
*/
(function () {
    'use strict';

    const ExamEngine = {
        startExam(config) {
            const level = String(config.examLevel || 'easy').toLowerCase();
            const roundNumber = Math.max(1, Math.min(5, Number(config.roundNumber) || 1));
            const questionCount = Number(config.questionCount) || 15;

            const state = {
                examType: config.examType || 'sql_basics',
                examLevel: level,
                roundNumber: roundNumber,
                questionBank: Array.isArray(config.questionBank) ? config.questionBank : [],
                questionCount: questionCount,
                timePerQuestion: Number(config.timePerQuestion) || 30,
                selectedQuestions: [],
                currentIndex: 0,
                answers: [],
                startedAt: new Date(),
                questionStartedAt: Date.now(),
                timerId: null,
                submitting: false,
                completed: false
            };

            const validation = validateBank(state.questionBank, state.questionCount, state.examLevel);
            if (!validation.valid) {
                config.onError?.(validation.message);
                return null;
            }

            const eligibleQuestions = state.questionBank.filter(q => String(q.difficulty || '').toLowerCase() === state.examLevel);
            
            // Deterministic, non-repeating round allocation:
            // Round 1: index 0 to 14
            // Round 2: index 15 to 29
            // Round 3: index 30 to 44
            // Round 4: index 45 to 59
            // Round 5: index 60 to 74
            const startIndex = (roundNumber - 1) * questionCount;
            let roundQuestions = eligibleQuestions.slice(startIndex, startIndex + questionCount);

            if (roundQuestions.length < questionCount) {
                // Fallback if fewer questions in bank
                roundQuestions = eligibleQuestions.slice(0, questionCount);
            }

            // Shuffle display order within the deterministic round partition
            state.selectedQuestions = shuffle([...roundQuestions]);
            state.answers = state.selectedQuestions.map(q => ({
                questionId: q.id,
                selectedAnswer: null,
                correctAnswer: null,
                isCorrect: false,
                isUnanswered: true,
                timeTaken: 0,
                submitted: false
            }));

            config.onStart?.(state);
            renderQuestion(state, config);
            return {
                retry: () => this.startExam(config),
                getState: () => state
            };
        }
    };

    function validateBank(bank, count, level) {
        if (!Array.isArray(bank) || bank.length < count) {
            return { valid: false, message: 'The exam question bank is unavailable or contains too few questions.' };
        }
        if (!['easy', 'medium', 'hard'].includes(level)) {
            return { valid: false, message: 'Please select a valid exam level (Easy, Medium, or Hard) before starting.' };
        }
        return { valid: true };
    }

    function shuffle(items) {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
    }

    function renderQuestion(state, config) {
        if (state.completed) return;
        if (state.currentIndex >= state.selectedQuestions.length) {
            finish(state, config);
            return;
        }

        clearTimer(state);
        state.submitting = false;
        state.questionStartedAt = Date.now();
        const q = state.selectedQuestions[state.currentIndex];
        const answerState = state.answers[state.currentIndex];

        const optionObjects = q.options.map((text, index) => ({
            id: `${q.id}-${index}-${cryptoRandom()}`,
            text,
            originalIndex: index
        }));
        shuffle(optionObjects);
        answerState.optionObjects = optionObjects;
        answerState.correctAnswer = optionObjects.find(o => o.originalIndex === q.correctAnswer)?.id || null;

        config.renderQuestion?.({
            question: q,
            questionNumber: state.currentIndex + 1,
            total: state.selectedQuestions.length,
            roundNumber: state.roundNumber,
            options: optionObjects,
            selectedAnswer: answerState.selectedAnswer,
            timeRemaining: state.timePerQuestion
        });

        let remaining = state.timePerQuestion;
        config.onTimer?.(remaining, state);
        state.timerId = setInterval(() => {
            remaining -= 1;
            config.onTimer?.(Math.max(remaining, 0), state);
            if (remaining <= 0) {
                clearTimer(state);
                submitCurrent(state, config, true);
            }
        }, 1000);
    }

    function submitCurrent(state, config, timedOut) {
        if (state.submitting || state.completed) return;
        state.submitting = true;
        clearTimer(state);
        const answerState = state.answers[state.currentIndex];
        const selected = answerState.selectedAnswer;
        const elapsed = Math.min(state.timePerQuestion, Math.max(0, Math.round((Date.now() - state.questionStartedAt) / 1000)));
        answerState.timeTaken = elapsed;
        answerState.submitted = true;
        answerState.isUnanswered = !selected;
        answerState.isCorrect = Boolean(selected && selected === answerState.correctAnswer);

        config.onSubmitted?.({ answerState, timedOut, state });
        state.currentIndex += 1;
        window.setTimeout(() => renderQuestion(state, config), timedOut ? 250 : 80);
    }

    function finish(state, config) {
        if (state.completed) return;
        state.completed = true;
        clearTimer(state);

        const correct = state.answers.filter(a => a.isCorrect).length;
        const unanswered = state.answers.filter(a => a.isUnanswered).length;
        const incorrect = state.answers.length - correct - unanswered;

        // Marking: Easy = 1, Medium = 3, Hard = 6
        const marksPerQuestion = state.examLevel === 'easy' ? 1 : (state.examLevel === 'medium' ? 3 : 6);
        const score = correct * marksPerQuestion;
        const maximumScore = state.answers.length * marksPerQuestion;
        const percentage = maximumScore > 0 ? Number(((score / maximumScore) * 100).toFixed(2)) : 0;

        let rating;
        if (percentage >= 90) rating = 'Excellent';
        else if (percentage >= 75) rating = 'Good';
        else if (percentage >= 50) rating = 'Average';
        else rating = 'Below Average';

        const completedAt = new Date();
        const timeTaken = Math.max(0, Math.round((completedAt - state.startedAt) / 1000));

        const result = {
            examType: state.examType,
            examLevel: state.examLevel,
            roundNumber: state.roundNumber,
            totalQuestions: state.answers.length,
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            unanswered: unanswered,
            marksPerQuestion: marksPerQuestion,
            score: score,
            maximumScore: maximumScore,
            percentage: percentage,
            rating: rating,
            startedAt: state.startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            timeTaken: timeTaken,
            answers: state.answers.map(a => ({
                questionId: a.questionId,
                selectedAnswer: a.selectedAnswer,
                correctAnswer: a.correctAnswer,
                isCorrect: a.isCorrect,
                isUnanswered: a.isUnanswered,
                timeTaken: a.timeTaken
            }))
        };
        config.onComplete?.(result, state);
    }

    function clearTimer(state) {
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function cryptoRandom() {
        try {
            if (window.crypto?.getRandomValues) return Array.from(window.crypto.getRandomValues(new Uint32Array(2))).join('');
        } catch (_) {}
        return `${Date.now()}-${Math.random()}`;
    }

    window.EdmithExamEngine = {
        startExam: ExamEngine.startExam,
        shuffle,
        validateBank,
        submitCurrent: (state, config, timedOut=false) => submitCurrent(state, config, timedOut)
    };
})();
