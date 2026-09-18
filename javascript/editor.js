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
    const exportJsonBtn = document.getElementById('exportJsonBtn');
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
            badge.textContent = `${filteredTables.length} ${filteredTables.length === 1 ? 'Table' : 'Tables'}`;
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
                        <div class="table-info" onclick="insertTableQuery('${escapeHtml(t.name)}')" title="Click to SELECT * FROM ${escapeHtml(t.name)}">
                            <span class="table-toggle-btn" onclick="event.stopPropagation(); toggleTableDetails('${escapeHtml(t.name)}')" title="Toggle column list">
                                <i class="fas fa-chevron-right table-chevron"></i>
                            </span>
                            <i class="fas fa-table table-icon"></i>
                            <span class="table-name">${escapeHtml(t.name)}</span>
                        </div>
                        <div class="table-actions">
                            <span class="row-count-pill" onclick="insertTableQuery('${escapeHtml(t.name)}')" title="Total records in table">${t.rowCount}</span>
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

    // Quick query insertion (W3Schools style)
    window.insertTableQuery = function(tableName) {
        if (!editorTextarea) return;
        editorTextarea.value = `SELECT * FROM ${tableName} LIMIT 20;`;
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
            : ['customers', 'branches', 'accounts', 'transactions', 'transfers', 'cards', 'loans', 'loan_payments', 'beneficiaries', 'merchants', 'merchant_payments', 'departments', 'employees', 'audit_logs', 'exchange_rates'];

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

    // Syntax highlighting removed — plain textarea approach used instead
    function updateSyntaxHighlight() { /* no-op */ }

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
            // Sync line number gutter with textarea scroll position
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

                if (!results.success) {
                    showError(results.error || 'SQL syntax error or unknown database object.');
                    if (executionStatusDot) executionStatusDot.className = 'status-indicator error';
                    if (resultMetaBadge) {
                        resultMetaBadge.innerHTML = `<span class="meta-error"><i class="fas fa-times-circle"></i> Error</span> &bull; <span class="meta-time">${results.executionTimeMs}ms</span>`;
                    }
                } else {
                    renderResultsGrid(results);
                    if (executionStatusDot) executionStatusDot.className = 'status-indicator success';
                }

                // Refresh schema tree in case DDL (CREATE/DROP/ALTER TABLE) was run
                renderSchema(schemaSearch ? schemaSearch.value.trim() : '');
                updateHistoryUI();
            } catch (err) {
                showError(err.message || String(err));
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

        // Check if query was DDL or DML (CREATE, DROP, ALTER, TRUNCATE, INSERT, UPDATE, DELETE)
        if (results.isDdl || results.isDml) {
            const actionIcon = results.isDdl ? 'fa-layer-group' : 'fa-check-double';
            const actionTitle = results.isDdl ? 'Database Schema Updated' : 'Data Manipulation Completed';
            const actionMsg = results.message || (results.isDdl ? 'Schema command completed successfully.' : `${results.rowCount} row(s) affected.`);

            resultsContainer.innerHTML = `
                <div class="sql-success-callout">
                    <div class="success-header">
                        <i class="fas ${actionIcon}"></i>
                        <h4>${actionTitle}</h4>
                    </div>
                    <div class="success-body">
                        <code>${escapeHtml(actionMsg)}</code>
                    </div>
                    <p class="success-hint">Tip: Check the <strong>Schema Explorer</strong> on the left to see updated tables and columns, or run <code>SELECT * FROM [table]</code> to inspect data.</p>
                </div>
            `;
            if (resultMetaBadge) {
                resultMetaBadge.innerHTML = `
                    <span class="meta-highlight"><i class="fas fa-check"></i> ${results.isDdl ? 'DDL' : 'DML'} OK</span>
                    &bull;
                    <span class="meta-time">${results.executionTimeMs}ms</span>
                `;
            }
            return;
        }

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
                <p class="error-hint">Tip: Verify that the table or column exists in the <strong>Schema Explorer</strong> on the left, check syntax grammar, or execute a <code>CREATE TABLE</code> statement to define a temporary table.</p>
            </div>
        `;
        if (resultMetaBadge) resultMetaBadge.innerHTML = `<span class="meta-error"><i class="fas fa-times-circle"></i> Execution Error</span>`;
    }



    // 7. Template Queries (Covering Banking Relational Tables)
    const queryTemplates = {
        'banking_accounts': `-- 1. Query Active High-Balance Accounts
SELECT account_number, account_type, balance, currency, status 
FROM accounts 
WHERE status = 'Active' AND balance >= 25000.00 
ORDER BY balance DESC;`,

        'customer_accounts_join': `-- 2. Relational JOIN: Customers, Accounts & Branches
SELECT 
    c.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.city,
    a.account_number,
    a.account_type,
    a.balance,
    b.branch_name
FROM customers c
INNER JOIN accounts a ON c.customer_id = a.customer_id
INNER JOIN branches b ON a.branch_id = b.branch_id
ORDER BY a.balance DESC
LIMIT 15;`,

        'branch_deposits_group': `-- 3. Aggregations & Grouping: Branch Liquidity Metrics
SELECT 
    b.branch_name,
    b.city,
    COUNT(a.account_id) AS total_accounts,
    ROUND(SUM(a.balance), 2) AS total_deposits,
    ROUND(AVG(a.balance), 2) AS average_balance
FROM branches b
INNER JOIN accounts a ON b.branch_id = a.branch_id
GROUP BY b.branch_name, b.city
ORDER BY total_deposits DESC;`,

        'management_hierarchy': `-- 4. Hierarchical SELF JOIN: Bank Staff & Managers
SELECT 
    e.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.role,
    e.department,
    e.salary,
    COALESCE(m.first_name || ' ' || m.last_name, 'BOARD OF DIRECTORS') AS reports_to
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id
ORDER BY e.salary DESC;`,

        'credit_score_case': `-- 5. Conditional CASE Logic: Customer Credit Risk Evaluation
SELECT 
    customer_id,
    first_name || ' ' || last_name AS customer_name,
    credit_score,
    kyc_status,
    CASE 
        WHEN credit_score >= 800 THEN 'Tier 1 - Exceptional'
        WHEN credit_score >= 740 THEN 'Tier 2 - Prime'
        WHEN credit_score >= 670 THEN 'Tier 3 - Good'
        WHEN credit_score >= 600 THEN 'Tier 4 - Fair'
        ELSE 'Tier 5 - High Risk'
    END AS credit_risk_tier,
    CASE 
        WHEN credit_score >= 700 AND kyc_status = 'Verified' THEN 'PRE-APPROVED'
        WHEN kyc_status = 'Pending' THEN 'KYC REVIEW REQUIRED'
        ELSE 'ADDITIONAL COLLATERAL REQUIRED'
    END AS lending_status
FROM customers
ORDER BY credit_score DESC
LIMIT 20;`
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

    // 9. Export to CSV / JSON & Copy Result
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (currentResults && currentResults.columns && currentResults.values) {
                EdmithSqlEngine.exportToCSV(currentResults.columns, currentResults.values);
            } else {
                alert('No results available to export. Run a query first.');
            }
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (currentResults && currentResults.data && currentResults.data.length > 0) {
                EdmithSqlEngine.exportToJSON(currentResults.data);
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
                    <span class="history-time">${item.timestamp} (${item.executionTimeMs !== undefined ? item.executionTimeMs : (item.timeMs || 0)}ms)</span>
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
            if (window.edmithSql) {
                if (typeof window.edmithSql.clearQueryHistory === 'function') {
                    window.edmithSql.clearQueryHistory();
                } else {
                    window.edmithSql.queryHistory = [];
                }
            }
            updateHistoryUI();
        });
    }

    // Close History Drawer with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && historyDrawer && historyDrawer.classList.contains('open')) {
            historyDrawer.classList.remove('open');
        }
    });

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
        sql = codeEl ? (codeEl.innerText || codeEl.textContent || '').trim() : '';
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
    let editorPath = 'editors/editor.html';
    if (window.location.pathname.includes('/sql/') || window.location.href.includes('/sql/')) {
        editorPath = '../editors/editor.html';
    } else if (window.location.pathname.includes('/editors/') || window.location.href.includes('/editors/')) {
        editorPath = 'editor.html';
    }
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


