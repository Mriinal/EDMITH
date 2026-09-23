/**
 * EDMITH Coding Exam Engine — javascript/coding-exam-engine.js
 * In-browser code evaluation workstation powered by AlaSQL.
 * Features:
 * - Anti-paste exam security (blocks Ctrl+V, right-click, paste events, drag & drop)
 * - Test-case execution and schema verification
 * - Round question allocation without repetition
 * - HackerRank-inspired split-screen testing workflow
 * - Marking: Easy (3 marks), Medium (6 marks), Hard (12 marks)
 */

(function () {
    'use strict';

    // Private solution registry so candidate never receives official solution in UI state
    const solutionRegistry = new Map();

    const CodingExamEngine = {
        initExam(config) {
            const level = String(config.difficulty || 'easy').toLowerCase();
            const roundNumber = Math.max(1, Math.min(5, Number(config.roundNumber) || 1));
            
            // Question count per round: Easy = 5, Medium = 3, Hard = 2
            const questionCount = level === 'easy' ? 5 : (level === 'medium' ? 3 : 2);
            const marksPerQuestion = level === 'easy' ? 3 : (level === 'medium' ? 6 : 12);
            const timeLimitMinutes = level === 'easy' ? 20 : (level === 'medium' ? 20 : 25);

            const allBank = Array.isArray(config.questionBank) ? config.questionBank : (window.SQL_CODING_QUESTIONS || []);
            const levelQuestions = allBank.filter(q => String(q.difficulty || '').toLowerCase() === level);

            // Populate private solution registry
            allBank.forEach(q => {
                if (q && q.id && q.expected_sql) {
                    solutionRegistry.set(String(q.id), q.expected_sql);
                }
            });

            // Deterministic non-repeating allocation:
            const startIndex = (roundNumber - 1) * questionCount;
            let roundQuestions = levelQuestions.slice(startIndex, startIndex + questionCount);
            if (roundQuestions.length < questionCount) {
                roundQuestions = levelQuestions.slice(0, questionCount);
            }

            // Create sanitized question objects for frontend UI (strip expected_sql)
            const sanitizedQuestions = roundQuestions.map(q => {
                const safeQ = {
                    id: q.id,
                    title: q.title,
                    difficulty: q.difficulty,
                    subject: q.subject,
                    problem_statement: q.problem_statement,
                    input_description: q.input_description,
                    output_description: q.output_description,
                    constraints: q.constraints,
                    starter_code: q.starter_code || '-- Write your code here\n',
                    marks: q.marks || marksPerQuestion
                };
                return safeQ;
            });

            const state = {
                subject: config.subject || 'sql',
                difficulty: level,
                roundNumber: roundNumber,
                questionCount: sanitizedQuestions.length,
                marksPerQuestion: marksPerQuestion,
                maximumScore: sanitizedQuestions.length * marksPerQuestion,
                questions: sanitizedQuestions,
                currentIndex: 0,
                timeRemainingSeconds: timeLimitMinutes * 60,
                timerId: null,
                startedAt: new Date(),
                completed: false,
                submitting: false,
                answers: sanitizedQuestions.map(q => ({
                    questionId: q.id,
                    title: q.title,
                    marks: marksPerQuestion,
                    submittedCode: '', // Candidate starts with empty editor/starter placeholder
                    passed: false,
                    executed: false,
                    lastError: null,
                    actualOutput: null,
                    expectedOutput: null
                }))
            };

            // Initialize AlaSQL engine if not initialized
            if (window.edmithSql && typeof window.edmithSql.init === 'function') {
                window.edmithSql.init();
            }

            return state;
        },

        // Evaluate user's SQL query against the database using AlaSQL
        evaluateQuery(sql, target) {
            if (!sql || !sql.trim()) {
                return {
                    passed: false,
                    error: 'Query cannot be empty. Please write your SQL solution.',
                    actualData: null,
                    expectedData: null
                };
            }

            // Validate that query is not merely comments
            const codeWithoutComments = sql.replace(/--.*$/gm, '').trim();
            if (!codeWithoutComments) {
                return {
                    passed: false,
                    error: 'Please write your SQL query. The editor currently contains only comments.',
                    actualData: null,
                    expectedData: null
                };
            }

            if (typeof alasql === 'undefined') {
                return {
                    passed: false,
                    error: 'Local SQL execution engine (AlaSQL) is unavailable.',
                    actualData: null,
                    expectedData: null
                };
            }

            // Resolve expected query from private registry or target string
            let expectedSql = '';
            if (typeof target === 'string' && (target.toLowerCase().startsWith('select') || target.toLowerCase().includes('from'))) {
                expectedSql = target;
            } else if (target !== undefined && target !== null) {
                expectedSql = solutionRegistry.get(String(target)) || '';
            }

            if (!expectedSql && window.SQL_CODING_QUESTIONS) {
                const found = window.SQL_CODING_QUESTIONS.find(q => String(q.id) === String(target));
                if (found && found.expected_sql) {
                    expectedSql = found.expected_sql;
                }
            }

            if (!expectedSql) {
                return {
                    passed: false,
                    error: 'Evaluation error: expected test case definition not found.',
                    actualData: null,
                    expectedData: null
                };
            }

            try {
                // Execute expected query to obtain ground-truth dataset
                const cleanExpected = expectedSql.trim().replace(/;+$/, '');
                const expectedData = alasql(cleanExpected);

                // Execute student's submitted query
                const cleanStudent = sql.trim().replace(/;+$/, '');
                const actualData = alasql(cleanStudent);

                // Validation logic:
                // 1. Must return an array of results
                if (!Array.isArray(actualData)) {
                    return {
                        passed: false,
                        error: 'Query must return tabular result records.',
                        actualData,
                        expectedData: null
                    };
                }

                // 2. Row counts must match
                if (actualData.length !== expectedData.length) {
                    return {
                        passed: false,
                        error: `Row count mismatch: expected ${expectedData.length} rows, but your query returned ${actualData.length} rows.`,
                        actualData,
                        expectedData: null
                    };
                }

                // 3. Compare JSON representation of normalized records
                const normActual = normalizeRows(actualData);
                const normExpected = normalizeRows(expectedData);

                if (JSON.stringify(normActual) !== JSON.stringify(normExpected)) {
                    return {
                        passed: false,
                        error: 'Result records do not match the expected dataset.',
                        actualData,
                        expectedData
                    };
                }

                return {
                    passed: true,
                    error: null,
                    actualData,
                    expectedData
                };

            } catch (err) {
                return {
                    passed: false,
                    error: err.message || String(err),
                    actualData: null,
                    expectedData: null
                };
            }
        },

        // Anti-paste exam security bindings
        setupAntiPasteRestrictions(editorTextarea, onViolation) {
            if (!editorTextarea) return;

            function blockAction(e, reason) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof onViolation === 'function') {
                    onViolation(reason);
                }
            }

            // 1. Keydown shortcuts: Ctrl+V, Ctrl+Shift+V, Command+V (Mac)
            editorTextarea.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                    blockAction(e, 'Keyboard pasting (Ctrl+V) is disabled during coding examinations.');
                }
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
                    blockAction(e, 'Keyboard pasting is disabled during coding examinations.');
                }
                if (e.shiftKey && e.key === 'Insert') {
                    blockAction(e, 'Keyboard paste is disabled during coding examinations.');
                }
            });

            // 2. Paste event
            editorTextarea.addEventListener('paste', (e) => {
                blockAction(e, 'Clipboard paste is disabled during coding examinations.');
            });

            // 3. Context menu (Right-click paste)
            editorTextarea.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (typeof onViolation === 'function') {
                    onViolation('Right-click context menu is disabled in the exam editor to preserve test integrity.');
                }
            });

            // 4. Drag and Drop text insertion
            editorTextarea.addEventListener('dragover', (e) => e.preventDefault());
            editorTextarea.addEventListener('drop', (e) => {
                blockAction(e, 'Dragging and dropping code into the exam editor is disabled.');
            });
        }
    };

    function normalizeRows(rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(r => {
            if (typeof r !== 'object' || r === null) return r;
            const sorted = {};
            Object.keys(r).sort().forEach(k => {
                let val = r[k];
                if (typeof val === 'number') {
                    val = Number(val.toFixed(2));
                }
                sorted[k.toLowerCase()] = val;
            });
            return sorted;
        });
    }

    window.EdmithCodingExamEngine = CodingExamEngine;

})();
