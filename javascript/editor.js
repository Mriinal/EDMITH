/**
 * EDMITH SQL Editor Controller
 * Handles UI interactions, syntax shortcuts, schema navigation, results rendering, and query history
 */

function initEdmithEditor() {
    const editorTextarea = document.getElementById('sqlEditorText');
    const lineNumbers = document.getElementById('editorLineNumbers');
    const highlightBackdrop = document.getElementById('editorHighlightBackdrop');
    const highlightedCode = document.getElementById('editorHighlightedCode');
    const runBtn = document.getElementById('runQueryBtn');
    const clearBtn = document.getElementById('clearQueryBtn');
    const formatBtn = document.getElementById('formatQueryBtn');
    const resetDbBtn = document.getElementById('resetDbBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const copyResultBtn = document.getElementById('copyResultBtn');
    const templateSelect = document.getElementById('queryTemplateSelect');
    const schemaContainer = document.getElementById('schemaListContainer');
    const schemaSearch = document.getElementById('schemaSearchInput');
    const resultsContainer = document.getElementById('resultsTableContainer');
    const resultMetaBadge = document.getElementById('resultMetaBadge');
    const executionStatusDot = document.getElementById('executionStatusDot');
    const engineBadge = document.getElementById('engineBadge');
    const historyDrawer = document.getElementById('historyDrawer');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyListContainer = document.getElementById('historyListContainer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    let currentResults = null;

    // 1. Initialize SQL Engine (Synchronous & Instant 0ms)
    if (window.edmithSql) {
        try {
            window.edmithSql.init();
            if (engineBadge) {
                engineBadge.innerHTML = `<span class="pulse-dot"></span> <span>${window.edmithSql.engineType}</span>`;
            }
        } catch (e) {
            console.error('SQL Engine initialization error:', e);
            if (engineBadge) {
                engineBadge.innerHTML = `<span class="pulse-dot warning"></span> <span>Engine Warning</span>`;
            }
        }
    }

    // Helper to safely escape HTML
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 2. Render Schema Explorer Immediately
    function renderSchema(filterText = '') {
        if (!schemaContainer) return;
        if (!window.edmithSql) {
            schemaContainer.innerHTML = '<div class="schema-empty-state"><p>Engine initializing...</p></div>';
            return;
        }

        const schemaData = window.edmithSql.getSchemaExplorerData();
        const cleanFilter = filterText.trim().toLowerCase();

        const filteredTables = schemaData.filter(t => {
            if (!cleanFilter) return true;
            if (t.name.toLowerCase().includes(cleanFilter)) return true;
            if (t.category && t.category.toLowerCase().includes(cleanFilter)) return true;
            return t.columns.some(c => c.name.toLowerCase().includes(cleanFilter));
        });

        // Update badge
        const badge = document.querySelector('.schema-badge');
        if (badge) {
            badge.textContent = `${filteredTables.length} Tables`;
        }

        if (filteredTables.length === 0) {
            schemaContainer.innerHTML = `
                <div class="schema-empty-state">
                    <i class="fas fa-search"></i>
                    <p>No tables matching "${escapeHtml(filterText)}"</p>
                </div>
            `;
            return;
        }

        let html = '';
        filteredTables.forEach(t => {
            const colsHtml = t.columns.map(c => `
                <li class="schema-col-item">
                    <span class="col-name">${c.isPk ? '<i class="fas fa-key" style="color:#F59E0B; font-size: 0.68rem; margin-right: 4px;"></i>' : ''}${escapeHtml(c.name)}</span>
                    <span class="col-type">${escapeHtml(c.type)}</span>
                </li>
            `).join('');

            html += `
                <div class="schema-table-card" data-table="${escapeHtml(t.name)}">
                    <div class="schema-table-header">
                        <div class="table-info" onclick="toggleTableDetails('${escapeHtml(t.name)}')">
                            <i class="fas fa-chevron-right table-chevron"></i>
                            <i class="fas fa-table table-icon"></i>
                            <span class="table-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
                        </div>
                        <div class="table-actions">
                            <span class="row-count-pill">${t.rowCount} rows</span>
                            <button class="table-quick-query" onclick="insertTableQuery('${escapeHtml(t.name)}')" title="Query table ${escapeHtml(t.name)}">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                    <div class="schema-table-details" id="schema-details-${escapeHtml(t.name)}">
                        <ul class="schema-col-list">
                            ${colsHtml}
                        </ul>
                    </div>
                </div>
            `;
        });

        schemaContainer.innerHTML = html;
    }

    // Toggle table card expand/collapse
    window.toggleTableDetails = function(tableName) {
        const details = document.getElementById(`schema-details-${tableName}`);
        if (!details) return;
        const card = details.closest('.schema-table-card');
        const chevron = card ? card.querySelector('.table-chevron') : null;
        
        const isOpen = details.classList.contains('open');
        if (isOpen) {
            details.classList.remove('open');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        } else {
            details.classList.add('open');
            if (chevron) chevron.style.transform = 'rotate(90deg)';
        }
    };

    // Quick query insertion
    window.insertTableQuery = function(tableName) {
        if (!editorTextarea) return;
        editorTextarea.value = `SELECT * FROM ${tableName} LIMIT 10;`;
        updateLineNumbers();
        updateSyntaxHighlight();
        executeEditorQuery();
    };
    window.quickSelectTable = window.insertTableQuery;

    // Live search filter
    if (schemaSearch) {
        schemaSearch.addEventListener('input', (e) => {
            renderSchema(e.target.value);
        });
    }

    renderSchema();

    // 3. Syntax Highlighting Engine (Tokens match EDMITH Project Colors)
    function highlightSQL(code) {
        if (!code) return '';

        const knownTables = window.edmithSql && window.edmithSql.tableNames 
            ? window.edmithSql.tableNames 
            : ['departments', 'students', 'courses', 'enrollments', 'certifications', 'employees', 'orders'];

        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER BY', 'GROUP BY', 'HAVING',
            'LIMIT', 'OFFSET', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
            'JOIN', 'ON', 'AS', 'DISTINCT', 'TOP', 'INSERT INTO', 'INSERT', 'INTO', 'VALUES',
            'UPDATE', 'SET', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'CREATE',
            'TABLE', 'DROP', 'ALTER', 'UNION ALL', 'UNION', 'CASE', 'WHEN', 'THEN', 'ELSE',
            'END', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'IS', 'NULL', 'EXISTS',
            'ANY', 'ALL', 'DESC', 'ASC', 'PRIMARY KEY', 'PRIMARY', 'KEY', 'FOREIGN KEY',
            'FOREIGN', 'REFERENCES', 'DEFAULT', 'CHECK', 'UNIQUE', 'INDEX', 'VIEW', 'BY', 'WITH'
        ];

        const functions = [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'UPPER', 'LOWER',
            'LENGTH', 'SUBSTR', 'SUBSTRING', 'TRIM', 'ABS', 'CONCAT', 'IFNULL', 'NOW',
            'DATE', 'YEAR', 'MONTH', 'DAY', 'DATEADD', 'DATEDIFF'
        ];

        // Regex token priority:
        // 1. Comments (-- ... or /* ... */)
        // 2. Strings ('...' or "...")
        // 3. Numbers (integers, floats)
        // 4. Identifiers / words (keywords, functions, tables)
        // 5. Operators (=, !=, <>, >=, <=, ||, +, -, *, /, %)
        const tokenRegex = /(\/\*[\s\S]*?\*\/|--.*$)|('(?:''|[^'\\]|\\.)*'|"(?:""|[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(>=|<=|!=|<>|\|\||[=+*\/<>%-])/gim;

        return code.replace(tokenRegex, (match, comment, str, num, word, op) => {
            if (comment) {
                return `<span class="code-comment">${escapeHtml(comment)}</span>`;
            }
            if (str) {
                return `<span class="code-string">${escapeHtml(str)}</span>`;
            }
            if (num) {
                return `<span class="code-num">${escapeHtml(num)}</span>`;
            }
            if (word) {
                const upper = word.toUpperCase();
                if (keywords.includes(upper)) {
                    return `<span class="code-keyword">${escapeHtml(word)}</span>`;
                }
                if (functions.includes(upper)) {
                    return `<span class="code-func">${escapeHtml(word)}</span>`;
                }
                if (knownTables.includes(word.toLowerCase())) {
                    return `<span class="code-table">${escapeHtml(word)}</span>`;
                }
                return escapeHtml(word);
            }
            if (op) {
                return `<span class="code-op">${escapeHtml(op)}</span>`;
            }
            return escapeHtml(match);
        });
    }

    function updateSyntaxHighlight() {
        if (!editorTextarea || !highlightedCode) return;
        let val = editorTextarea.value;
        if (val.endsWith('\n')) {
            val += ' ';
        }
        highlightedCode.innerHTML = highlightSQL(val);
    }

    // 4. Synchronize Line Numbers & Scrolling
    function updateLineNumbers() {
        if (!editorTextarea || !lineNumbers) return;
        const lines = editorTextarea.value.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= Math.max(lines, 8); i++) {
            numbersHtml += `<span>${i}</span>`;
        }
        lineNumbers.innerHTML = numbersHtml;
    }

    if (editorTextarea) {
        editorTextarea.addEventListener('input', () => {
            updateLineNumbers();
            updateSyntaxHighlight();
        });

        editorTextarea.addEventListener('scroll', () => {
            if (highlightBackdrop) {
                highlightBackdrop.scrollTop = editorTextarea.scrollTop;
                highlightBackdrop.scrollLeft = editorTextarea.scrollLeft;
            }
            if (lineNumbers) {
                lineNumbers.scrollTop = editorTextarea.scrollTop;
            }
        });

        // Tab key support & Ctrl+Enter to Run
        editorTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editorTextarea.selectionStart;
                const end = editorTextarea.selectionEnd;
                editorTextarea.value = editorTextarea.value.substring(0, start) + '    ' + editorTextarea.value.substring(end);
                editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 4;
                updateLineNumbers();
                updateSyntaxHighlight();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                executeEditorQuery();
            }
        });

        updateLineNumbers();
        updateSyntaxHighlight();
    }

    // 4. Execute Query Function
    function executeEditorQuery() {
        if (!editorTextarea || !window.edmithSql) return;
        const sql = editorTextarea.value.trim();

        if (!sql) {
            showError('Query editor is empty. Please type an SQL query or select a template.');
            return;
        }

        // Running visual feedback
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Running...</span>';
        }
        if (executionStatusDot) {
            executionStatusDot.className = 'status-indicator running';
        }

        setTimeout(() => {
            try {
                const results = window.edmithSql.runQuery(sql);
                currentResults = results;
                renderResultsGrid(results);
                if (executionStatusDot) executionStatusDot.className = 'status-indicator success';
                renderSchema(schemaSearch ? schemaSearch.value.trim() : '');
                updateHistoryUI();
            } catch (err) {
                showError(err.message);
                if (executionStatusDot) executionStatusDot.className = 'status-indicator error';
            } finally {
                if (runBtn) {
                    runBtn.disabled = false;
                    runBtn.innerHTML = '<i class="fas fa-play"></i> <span>Run Query</span>';
                }
            }
        }, 30);
    }

    if (runBtn) runBtn.addEventListener('click', executeEditorQuery);

    // 6. Render Results Grid
    function renderResultsGrid(results) {
        if (!resultsContainer) return;

        if (!results || !results.columns || results.columns.length === 0) {
            resultsContainer.innerHTML = `
                <div class="result-empty-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Query executed successfully with 0 columns returned.</p>
                </div>
            `;
            if (resultMetaBadge) resultMetaBadge.innerHTML = `0 rows &bull; ${results.executionTimeMs}ms`;
            return;
        }

        let tableHtml = `
            <table class="sql-result-table">
                <thead>
                    <tr>
                        <th class="row-num-col">#</th>
                        ${results.columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        if (results.values.length === 0) {
            tableHtml += `
                <tr>
                    <td colspan="${results.columns.length + 1}" class="no-rows-cell">
                        <i class="fas fa-inbox"></i> No matching records found for this query.
                    </td>
                </tr>
            `;
        } else {
            results.values.forEach((row, idx) => {
                tableHtml += `<tr><td class="row-num-cell">${idx + 1}</td>`;
                row.forEach(cell => {
                    if (cell === null || cell === undefined) {
                        tableHtml += `<td><span class="null-pill">NULL</span></td>`;
                    } else if (typeof cell === 'number') {
                        tableHtml += `<td class="num-cell">${escapeHtml(String(cell))}</td>`;
                    } else {
                        tableHtml += `<td>${escapeHtml(String(cell))}</td>`;
                    }
                });
                tableHtml += `</tr>`;
            });
        }

        tableHtml += `</tbody></table>`;
        resultsContainer.innerHTML = tableHtml;

        if (resultMetaBadge) {
            resultMetaBadge.innerHTML = `
                <span class="meta-highlight">${results.values.length} ${results.values.length === 1 ? 'row' : 'rows'}</span>
                &bull;
                <span class="meta-time">${results.executionTimeMs}ms</span>
            `;
        }
    }

    function showError(errorMessage) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = `
            <div class="sql-error-callout">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>SQL Execution Error</h4>
                </div>
                <div class="error-body">
                    <code>${escapeHtml(errorMessage)}</code>
                </div>
                <p class="error-hint">Tip: Check table/column names, verify syntax grammar, or select a sample query from the templates above.</p>
            </div>
        `;
        if (resultMetaBadge) resultMetaBadge.innerHTML = `<span class="meta-error">Execution Error</span>`;
    }



    // 7. Template Queries
    const queryTemplates = {
        'select_basic': `-- 1. Basic Projection & Filtering
SELECT student_id, first_name, last_name, gpa, status
FROM students
WHERE gpa >= 3.8
ORDER BY gpa DESC;`,

        'inner_join': `-- 2. Multi-Table Relational Join
SELECT s.first_name, s.last_name, d.department_name, s.gpa
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
WHERE s.status = 'Active'
ORDER BY s.gpa DESC;`,

        'aggregate_groupby': `-- 3. Aggregates & Group By
SELECT 
    d.department_name,
    COUNT(s.student_id) AS total_students,
    ROUND(AVG(s.gpa), 2) AS avg_gpa,
    MAX(s.gpa) AS highest_gpa
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id
GROUP BY d.department_name
ORDER BY total_students DESC;`,

        'complex_enrollments': `-- 4. Three-Way Relational Join
SELECT 
    s.first_name,
    s.last_name,
    c.course_code,
    c.course_title,
    e.semester,
    e.grade,
    e.attendance_pct
FROM enrollments e
INNER JOIN students s ON e.student_id = s.student_id
INNER JOIN courses c ON e.course_id = c.course_id
WHERE e.grade IN ('A+', 'A')
ORDER BY e.attendance_pct DESC;`,

        'self_join': `-- 5. Organizational Self-Join
SELECT 
    e.full_name AS employee_name,
    e.job_title,
    e.salary,
    COALESCE(m.full_name, 'None (Executive Lead)') AS reporting_manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id
ORDER BY e.salary DESC;`,

        'analytics_orders': `-- 6. Financial Analytics & HAVING
SELECT 
    shipping_city,
    COUNT(order_id) AS total_orders,
    ROUND(SUM(total_amount), 2) AS total_revenue,
    ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'Delivered'
GROUP BY shipping_city
HAVING total_revenue > 2000
ORDER BY total_revenue DESC;`,

        'subquery': `-- 7. Subquery Filtering
SELECT first_name, last_name, gpa, department_id
FROM students
WHERE gpa > 3.6
ORDER BY gpa DESC;`,

        'case_expression': `-- 8. CASE Conditional Transformation
SELECT 
    first_name, 
    last_name, 
    gpa,
    CASE 
        WHEN gpa >= 3.9 THEN 'Summa Cum Laude'
        WHEN gpa >= 3.7 THEN 'Magna Cum Laude'
        WHEN gpa >= 3.5 THEN 'Cum Laude'
        ELSE 'Standard Standing'
    END AS academic_honor
FROM students
ORDER BY gpa DESC;`
    };

    if (templateSelect) {
        templateSelect.addEventListener('change', (e) => {
            const templateKey = e.target.value;
            if (templateKey && queryTemplates[templateKey]) {
                editorTextarea.value = queryTemplates[templateKey];
                updateLineNumbers();
                updateSyntaxHighlight();
                executeEditorQuery();
            }
        });
    }

    // 8. Clear, Format & Reset Handlers
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            editorTextarea.value = '';
            updateLineNumbers();
            updateSyntaxHighlight();
            editorTextarea.focus();
        });
    }

    if (formatBtn) {
        formatBtn.addEventListener('click', () => {
            if (!editorTextarea) return;
            let val = editorTextarea.value;
            const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'ON', 'AS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC', 'DISTINCT', 'COUNT', 'AVG', 'SUM', 'MIN', 'MAX', 'IN', 'LIKE', 'BETWEEN', 'UNION', 'UNION ALL'];
            keywords.forEach(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                val = val.replace(regex, kw);
            });
            editorTextarea.value = val;
            updateLineNumbers();
            updateSyntaxHighlight();
        });
    }

    if (resetDbBtn) {
        resetDbBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset the database? All tables will be restored to the clean default enterprise dataset.')) {
                if (window.edmithSql) {
                    window.edmithSql.resetDatabase();
                    renderSchema();
                    executeEditorQuery();
                }
            }
        });
    }

    // 9. Export to CSV & Copy Result
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (currentResults && currentResults.columns && currentResults.values) {
                EdmithSqlEngine.exportToCSV(currentResults.columns, currentResults.values);
            } else {
                alert('No results available to export. Run a query first.');
            }
        });
    }

    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', () => {
            if (!currentResults || !currentResults.columns || !currentResults.values) return;
            const headers = currentResults.columns.join('\t');
            const rows = currentResults.values.map(r => r.join('\t')).join('\n');
            const fullText = headers + '\n' + rows;
            navigator.clipboard.writeText(fullText).then(() => {
                const originalHtml = copyResultBtn.innerHTML;
                copyResultBtn.innerHTML = '<i class="fas fa-check"></i> Copied Table';
                setTimeout(() => { copyResultBtn.innerHTML = originalHtml; }, 2000);
            });
        });
    }

    // 10. Query History Drawer
    function updateHistoryUI() {
        if (!historyListContainer || !window.edmithSql) return;
        const history = window.edmithSql.queryHistory;
        if (history.length === 0) {
            historyListContainer.innerHTML = '<div class="history-empty"><p>No queries executed yet.</p></div>';
            return;
        }

        historyListContainer.innerHTML = history.map((item, idx) => `
            <div class="history-item ${item.success ? 'success' : 'failed'}" onclick="loadHistoryItem(${idx})">
                <div class="history-item-top">
                    <span class="history-status ${item.success ? 'ok' : 'err'}">${item.success ? 'SUCCESS' : 'ERROR'}</span>
                    <span class="history-time">${item.timestamp} (${item.timeMs}ms)</span>
                </div>
                <pre class="history-sql"><code>${escapeHtml(item.sql)}</code></pre>
            </div>
        `).join('');
    }

    window.loadHistoryItem = function(idx) {
        if (!window.edmithSql || !window.edmithSql.queryHistory[idx]) return;
        editorTextarea.value = window.edmithSql.queryHistory[idx].sql;
        updateLineNumbers();
        updateSyntaxHighlight();
        executeEditorQuery();
        if (historyDrawer) historyDrawer.classList.remove('open');
    };

    if (toggleHistoryBtn && historyDrawer) {
        toggleHistoryBtn.addEventListener('click', () => {
            historyDrawer.classList.toggle('open');
            updateHistoryUI();
        });
    }

    if (closeHistoryBtn && historyDrawer) {
        closeHistoryBtn.addEventListener('click', () => {
            historyDrawer.classList.remove('open');
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (window.edmithSql) window.edmithSql.queryHistory = [];
            updateHistoryUI();
        });
    }

    // Helper function to load query into editor, highlight, and execute
    window.loadQueryIntoEditor = function(sql, autoRun = true) {
        if (!editorTextarea) return;
        const cleaned = (sql || '').trim();
        if (!cleaned) return;
        editorTextarea.value = cleaned;
        updateLineNumbers();
        updateSyntaxHighlight();
        if (autoRun) {
            executeEditorQuery();
        }
    };

    // 11. Deep Linking: Handle ?query= and ?table= from URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('query');
    const tableParam = urlParams.get('table');

    if (queryParam !== null && queryParam.trim() !== '') {
        // NOTE: URLSearchParams.get() ALREADY performs full percent-decoding!
        // Never call decodeURIComponent(queryParam) because strings with % (e.g. LIKE '%dev%')
        // will throw URIError: URI malformed and corrupt the query.
        window.loadQueryIntoEditor(queryParam, true);
    } else if (tableParam !== null && tableParam.trim() !== '') {
        window.loadQueryIntoEditor(`SELECT * FROM ${tableParam.trim()} LIMIT 10;`, true);
    } else {
        // Check if there is an incoming pending query from localStorage
        let pendingQuery = null;
        try {
            const raw = localStorage.getItem('edmith_sql_editor_incoming');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && data.query && (Date.now() - (data.ts || 0) < 60000)) {
                    pendingQuery = data.query;
                }
            }
        } catch (e) {}

        if (pendingQuery) {
            window.loadQueryIntoEditor(pendingQuery, true);
        } else {
            // Default initial query
            window.loadQueryIntoEditor(queryTemplates['select_basic'], true);
        }
    }

    // 12. Cross-Tab / Cross-Window Live Query Receiver
    // Allows any tutorial lesson to send queries to an ALREADY OPEN editor tab!
    if ('BroadcastChannel' in window) {
        try {
            const bc = new BroadcastChannel('edmith_sql_channel');
            bc.onmessage = (event) => {
                if (event.data && event.data.action === 'load_query' && event.data.query) {
                    window.loadQueryIntoEditor(event.data.query, true);
                }
            };
        } catch (e) {}
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'edmith_sql_editor_incoming' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.query) {
                    window.loadQueryIntoEditor(data.query, true);
                }
            } catch (err) {}
        }
    });

    window.addEventListener('message', (e) => {
        if (e.data && e.data.action === 'load_query' && e.data.query) {
            window.loadQueryIntoEditor(e.data.query, true);
        }
    });

    window.addEventListener('pageshow', () => {
        const freshParams = new URLSearchParams(window.location.search);
        const q = freshParams.get('query');
        if (q && q.trim() !== '') {
            window.loadQueryIntoEditor(q, true);
        }
    });
}

/**
 * Global helper to open or update the EDMITH SQL Editor with specified code.
 * Works whether called with a code string or a button element (using `this`).
 */
window.openEdmithEditor = function(target) {
    let sql = '';
    if (typeof target === 'string') {
        sql = target.trim();
    } else if (target && target.closest) {
        const terminal = target.closest('.code-terminal');
        const codeEl = terminal ? terminal.querySelector('code') : null;
        sql = codeEl ? codeEl.innerText.trim() : '';
    }

    if (!sql) return;

    // 1. Save to localStorage for instant cross-tab catch
    try {
        localStorage.setItem('edmith_sql_editor_incoming', JSON.stringify({
            query: sql,
            ts: Date.now()
        }));
    } catch (e) {}

    // 2. Broadcast to any already-open editor tabs
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('edmith_sql_channel');
            bc.postMessage({ action: 'load_query', query: sql });
            bc.close();
        }
    } catch (e) {}

    // 3. Resolve target URL based on current page location
    const isSqlSubdir = window.location.pathname.includes('/sql/') || window.location.href.includes('/sql/');
    const editorPath = isSqlSubdir ? 'editor.html' : 'sql/editor.html';
    const targetUrl = editorPath + '?query=' + encodeURIComponent(sql);

    // 4. Open or focus the named editor window
    const editorWin = window.open(targetUrl, 'edmith_sql_editor');
    if (editorWin) {
        try {
            editorWin.focus();
            editorWin.postMessage({ action: 'load_query', query: sql }, '*');
        } catch (e) {}
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEdmithEditor);
} else {
    initEdmithEditor();
}


