/**
 * EDMITH C Code Workbench & Compiler Frontend Controller
 * (javascript/c-editor.js)
 * 
 * Features:
 * - Line numbering & smooth scroll sync
 * - Tab key indentation & bracket pair management
 * - Web Worker client-side compilation & execution (with 4s timeout kill)
 * - Interactive stdin input support (for scanf)
 * - Real-time syntax/compilation error reporting with beginner tips
 * - Copy, Reset, Clear Output, & Run controls
 * - Cross-tab communication and URL code parameter loading
 */

(function () {
    'use strict';

    const DEFAULT_STARTER_CODE = `#include <stdio.h>

int main(void)
{
    printf("Hello, World!\\n");
    return 0;
}`;

    let originalCode = DEFAULT_STARTER_CODE;
    let activeWorker = null;
    let executionTimeoutTimer = null;

    // DOM Elements
    let editorTextarea = null;
    let lineNumbersEl = null;
    let runBtn = null;
    let resetBtn = null;
    let copyBtn = null;
    let clearBtn = null;
    let stdinInputEl = null;
    let outputViewportEl = null;
    let statusTextEl = null;
    let statusDotEl = null;
    let outputMetaEl = null;

    function initElements() {
        editorTextarea = document.getElementById('cEditorText');
        lineNumbersEl = document.getElementById('editorLineNumbers');
        runBtn = document.getElementById('runCodeBtn');
        resetBtn = document.getElementById('resetCodeBtn');
        copyBtn = document.getElementById('copyCodeBtn');
        clearBtn = document.getElementById('clearOutputBtn');
        stdinInputEl = document.getElementById('stdinInput');
        outputViewportEl = document.getElementById('terminalOutput');
        statusTextEl = document.getElementById('executionStatusText');
        statusDotEl = document.getElementById('executionStatusDot');
        outputMetaEl = document.getElementById('outputMetaBadge');
    }

    /**
     * Update line numbers gutter based on editor content
     */
    function updateLineNumbers() {
        if (!editorTextarea || !lineNumbersEl) return;
        const lineCount = editorTextarea.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= Math.max(lineCount, 12); i++) {
            html += `<span>${i}</span>`;
        }
        lineNumbersEl.innerHTML = html;
    }

    /**
     * Synchronize line numbers vertical scroll with textarea
     */
    function syncScroll() {
        if (!editorTextarea || !lineNumbersEl) return;
        lineNumbersEl.scrollTop = editorTextarea.scrollTop;
    }

    /**
     * Handle Tab key indentation inside textarea
     */
    function handleKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;

            // Insert 4 spaces
            this.value = value.substring(0, start) + '    ' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            updateLineNumbers();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
    }

    /**
     * Set status indicator bar
     */
    function setStatus(text, state) {
        if (statusTextEl) statusTextEl.textContent = text;
        if (statusDotEl) {
            statusDotEl.className = 'status-indicator ' + (state || '');
            if (state === 'running') {
                statusDotEl.style.background = '#F59E0B';
            } else if (state === 'error') {
                statusDotEl.style.background = '#EF4444';
            } else if (state === 'success') {
                statusDotEl.style.background = '#10B981';
            } else {
                statusDotEl.style.background = '#6B7280';
            }
        }
    }

    /**
     * Clear terminal output
     */
    function clearOutput() {
        if (!outputViewportEl) return;
        outputViewportEl.innerHTML = `
            <div class="result-empty-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 180px; color: var(--text-secondary); text-align: center;">
                <i class="fas fa-terminal" style="font-size: 2.2rem; margin-bottom: 0.75rem; color: rgba(121, 63, 224, 0.45);"></i>
                <p style="margin: 0; font-size: 0.95rem;">Click <strong>Run Code &raquo;</strong> (or press <kbd style="background: rgba(121,63,224,0.25); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">Ctrl + Enter</kbd>) to compile and run your program.</p>
            </div>
        `;
        if (outputMetaEl) {
            outputMetaEl.innerHTML = '<span class="meta-highlight">Awaiting execution...</span>';
        }
        setStatus('Ready', 'ready');
    }

    /**
     * Render successful execution output
     */
    function renderSuccessOutput(stdout, exitCode, duration) {
        if (!outputViewportEl) return;
        const cleanStdout = stdout || '(Program exited with zero console output)';
        
        let html = `
            <div class="console-run-block" style="font-family: var(--font-mono); font-size: 0.92rem; line-height: 1.6; color: #10B981; padding: 12px 14px; white-space: pre-wrap; word-break: break-all;">
                <div style="color: #9CA3AF; margin-bottom: 8px; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">
                    <i class="fas fa-check-circle" style="color: #10B981; margin-right: 5px;"></i> Compilation &amp; Execution Successful [0 errors]
                </div>
${escapeHtml(cleanStdout)}
                <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); color: #9CA3AF; font-size: 0.78rem;">
                    [Process completed in ${duration}ms with exit code ${exitCode}]
                </div>
            </div>
        `;
        outputViewportEl.innerHTML = html;

        if (outputMetaEl) {
            outputMetaEl.innerHTML = `<span style="color: #10B981; font-weight: 700;"><i class="fas fa-check"></i> Exit Code ${exitCode} (${duration}ms)</span>`;
        }
        setStatus('Execution Completed', 'success');
    }

    /**
     * Render compilation or runtime error
     */
    function renderErrorOutput(errData) {
        if (!outputViewportEl) return;
        const errorType = errData.errorType || 'Compilation Error';
        const msg = errData.message || 'Unknown error';
        const line = errData.line;
        const tip = errData.tip || 'Check syntax carefully.';
        const stdout = errData.stdout || '';

        let stdoutSection = '';
        if (stdout.trim()) {
            stdoutSection = `
                <div style="color: #E5E7EB; margin-bottom: 12px; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                    <div style="font-size: 0.75rem; color: #9CA3AF; margin-bottom: 4px;">Partial Program Output:</div>
                    <pre style="margin: 0; font-family: var(--font-mono); font-size: 0.85rem; color: #10B981;">${escapeHtml(stdout)}</pre>
                </div>
            `;
        }

        let html = `
            <div class="console-error-card" style="padding: 14px 16px; background: rgba(239, 68, 68, 0.08); border-left: 4px solid #EF4444; border-radius: 8px; margin: 10px 0; font-family: var(--font-sans);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <i class="fas fa-circle-exclamation" style="color: #EF4444; font-size: 1.1rem;"></i>
                    <h4 style="margin: 0; color: #EF4444; font-size: 1rem; font-weight: 700;">${errorType}${line ? ` on Line ${line}` : ''}</h4>
                </div>
                
                ${stdoutSection}

                <div style="font-family: var(--font-mono); font-size: 0.88rem; color: #FCA5A5; background: rgba(0,0,0,0.4); padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; overflow-x: auto; white-space: pre-wrap;">
${escapeHtml(msg)}
                </div>

                <div style="padding: 10px 14px; background: rgba(121, 63, 224, 0.12); border: 1px solid rgba(121, 63, 224, 0.25); border-radius: 6px;">
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                        <i class="fas fa-lightbulb" style="color: #F59E0B; margin-top: 3px;"></i>
                        <div style="color: var(--text-primary); font-size: 0.86rem; line-height: 1.5;">
                            <strong>Fresher Tip:</strong> ${escapeHtml(tip)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        outputViewportEl.innerHTML = html;

        if (outputMetaEl) {
            outputMetaEl.innerHTML = `<span style="color: #EF4444; font-weight: 700;"><i class="fas fa-triangle-exclamation"></i> ${errorType}</span>`;
        }
        setStatus(errorType, 'error');
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Execute C Code inside Web Worker with 4-second timeout protection
     */
    function runCode() {
        if (!editorTextarea) return;
        const code = editorTextarea.value.trim();
        if (!code) {
            if (outputViewportEl) {
                outputViewportEl.innerHTML = '<div style="color: #F59E0B; padding: 15px;">Please write or paste C code into the editor before running.</div>';
            }
            return;
        }

        const stdin = stdinInputEl ? stdinInputEl.value : '';

        // Terminate any currently running worker
        if (activeWorker) {
            try { activeWorker.terminate(); } catch (e) {}
            activeWorker = null;
        }
        if (executionTimeoutTimer) {
            clearTimeout(executionTimeoutTimer);
            executionTimeoutTimer = null;
        }

        setStatus('Compiling & Running...', 'running');
        if (outputMetaEl) {
            outputMetaEl.innerHTML = '<span style="color: #F59E0B;"><i class="fas fa-circle-notch fa-spin"></i> Running program...</span>';
        }
        if (outputViewportEl) {
            outputViewportEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 160px; color: var(--text-secondary); gap: 10px;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; color: var(--accent);"></i>
                    <span>Compiling C source code and executing in browser...</span>
                </div>
            `;
        }

        // Initialize Web Worker
        try {
            // Resolve worker URL
            const workerUrl = '../javascript/c-compiler-worker.js';
            activeWorker = new Worker(workerUrl);
        } catch (workerInitErr) {
            // Fallback: If blob worker needed
            console.warn('[C Editor] Direct worker initialization failed, trying blob worker:', workerInitErr);
            runCodeFallback(code, stdin);
            return;
        }

        // Setup 4-second timeout protection against infinite loops
        executionTimeoutTimer = setTimeout(() => {
            if (activeWorker) {
                try { activeWorker.terminate(); } catch (e) {}
                activeWorker = null;
                renderErrorOutput({
                    errorType: 'Runtime Error (Timeout)',
                    message: 'Execution timed out: The program exceeded the 4-second runtime limit.\nThis typically occurs due to an infinite loop (e.g. while(1) or a loop condition that never becomes false).',
                    tip: 'Inspect your loop termination conditions (e.g. loop counters i++, condition i < N) and ensure loops can complete normally.',
                    stdout: ''
                });
            }
        }, 4000);

        activeWorker.onmessage = function(e) {
            if (executionTimeoutTimer) {
                clearTimeout(executionTimeoutTimer);
                executionTimeoutTimer = null;
            }

            const data = e.data || {};
            if (data.type === 'done') {
                renderSuccessOutput(data.stdout, data.exitCode, data.duration);
            } else if (data.type === 'error') {
                renderErrorOutput(data);
            }
        };

        activeWorker.onerror = function(err) {
            if (executionTimeoutTimer) {
                clearTimeout(executionTimeoutTimer);
                executionTimeoutTimer = null;
            }
            renderErrorOutput({
                errorType: 'Worker Execution Error',
                message: err.message || 'Worker thread failed',
                tip: 'Check your syntax and try again.'
            });
        };

        activeWorker.postMessage({
            action: 'run',
            code: code,
            input: stdin
        });
    }

    /**
     * Fallback execution for restrictive file:// protocols without worker permission
     */
    function runCodeFallback(code, stdin) {
        if (typeof JSCPP === 'undefined') {
            const script = document.createElement('script');
            script.src = '../javascript/jscpp.min.js';
            script.onload = () => executeWithJSCPPDirect(code, stdin);
            script.onerror = () => {
                renderErrorOutput({
                    errorType: 'Engine Load Error',
                    message: 'Could not load JSCPP engine',
                    tip: 'Ensure javascript/jscpp.min.js exists.'
                });
            };
            document.head.appendChild(script);
        } else {
            executeWithJSCPPDirect(code, stdin);
        }
    }

    function executeWithJSCPPDirect(rawCode, stdin) {
        const startTime = performance.now();
        let stdout = '';
        let cleanCode = rawCode.replace(/\bint\s+main\s*\(\s*void\s*\)/g, 'int main()');
        try {
            const exit = JSCPP.run(cleanCode, stdin, {
                stdio: { write: (t) => stdout += t }
            });
            const dur = Math.round(performance.now() - startTime);
            renderSuccessOutput(stdout, exit !== undefined ? exit : 0, dur);
        } catch (err) {
            const dur = Math.round(performance.now() - startTime);
            renderErrorOutput({
                errorType: 'Execution Error',
                message: err.message || String(err),
                stdout: stdout,
                duration: dur
            });
        }
    }

    /**
     * Reset code to original or starter template
     */
    function resetCode() {
        if (!editorTextarea) return;
        editorTextarea.value = originalCode || DEFAULT_STARTER_CODE;
        updateLineNumbers();
        clearOutput();
        setStatus('Ready (Code Reset)', 'ready');

        if (resetBtn) {
            const orig = resetBtn.innerHTML;
            resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Done';
            setTimeout(() => { resetBtn.innerHTML = orig; }, 1500);
        }
    }

    /**
     * Copy current code to clipboard
     */
    function copyCode() {
        if (!editorTextarea) return;
        navigator.clipboard.writeText(editorTextarea.value).then(() => {
            if (copyBtn) {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
            }
        }).catch(() => {
            editorTextarea.select();
            document.execCommand('copy');
        });
    }

    /**
     * Load new code into the editor (from URL or cross-tab message)
     */
    function loadIncomingCode(codeString) {
        if (!codeString || typeof codeString !== 'string') return;
        originalCode = codeString;
        if (editorTextarea) {
            editorTextarea.value = codeString;
            updateLineNumbers();
        }
        clearOutput();
        setStatus('Code Loaded from Lesson', 'ready');

        // Check if code contains scanf and auto-suggest input
        if (codeString.includes('scanf(') && stdinInputEl && !stdinInputEl.value.trim()) {
            stdinInputEl.placeholder = 'Enter input for scanf here (e.g. 42 or names)...';
        }
    }

    /**
     * Check URL parameter `?code=...` or storage
     */
    function checkIncomingCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || urlParams.get('query');
        if (codeParam) {
            try {
                loadIncomingCode(codeParam);
                return;
            } catch (e) {}
        }

        // Check localStorage
        try {
            const stored = localStorage.getItem('edmith_c_editor_incoming');
            if (stored) {
                const parsed = JSON.parse(stored);
                // If set within the last 15 minutes
                if (parsed.code && (Date.now() - (parsed.ts || 0) < 15 * 60 * 1000)) {
                    loadIncomingCode(parsed.code);
                    localStorage.removeItem('edmith_c_editor_incoming');
                    return;
                }
            }
        } catch (e) {}

        // Default code
        if (editorTextarea) {
            editorTextarea.value = DEFAULT_STARTER_CODE;
            updateLineNumbers();
        }
    }

    // Setup cross-tab listeners
    function setupCrossTabListeners() {
        // BroadcastChannel
        try {
            if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('edmith_c_channel');
                bc.onmessage = function(e) {
                    if (e.data && e.data.action === 'load_code') {
                        loadIncomingCode(e.data.code);
                    }
                };
            }
        } catch (e) {}

        // window message
        window.addEventListener('message', function(e) {
            if (e.data && e.data.action === 'load_code') {
                loadIncomingCode(e.data.code);
            }
        });
    }

    // Initialization
    function init() {
        initElements();

        if (editorTextarea) {
            editorTextarea.addEventListener('input', updateLineNumbers);
            editorTextarea.addEventListener('scroll', syncScroll);
            editorTextarea.addEventListener('keydown', handleKeyDown);
        }

        if (runBtn) runBtn.addEventListener('click', runCode);
        if (resetBtn) resetBtn.addEventListener('click', resetCode);
        if (copyBtn) copyBtn.addEventListener('click', copyCode);
        if (clearBtn) clearBtn.addEventListener('click', clearOutput);

        checkIncomingCode();
        setupCrossTabListeners();
        updateLineNumbers();
        clearOutput();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
