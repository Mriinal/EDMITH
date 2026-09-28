/**
 * EDMITH In-Browser C Compilation & Execution Worker
 * 
 * Executes user C code in a dedicated Web Worker thread.
 * Guarantees zero UI freezing, sandboxed memory, and timeout protection.
 * Uses JSCPP (MIT License).
 */

self.onmessage = function(e) {
    const data = e.data || {};
    if (data.action !== 'run') return;

    const rawCode = data.code || '';
    const stdinInput = data.input || '';
    const startTime = performance.now();

    // Ensure JSCPP is loaded
    if (typeof JSCPP === 'undefined') {
        try {
            // Try relative local path first
            importScripts('../javascript/jscpp.min.js');
        } catch (err1) {
            try {
                importScripts('jscpp.min.js');
            } catch (err2) {
                try {
                    // Fallback to CDN if opened via peculiar protocol
                    importScripts('https://cdn.jsdelivr.net/npm/JSCPP@latest/dist/JSCPP.es5.min.js');
                } catch (err3) {
                    self.postMessage({
                        type: 'error',
                        errorType: 'Compiler Initialization Error',
                        message: 'Could not load in-browser C engine. Please check your internet connection or local files.',
                        tip: 'Ensure javascript/jscpp.min.js exists in the workspace.'
                    });
                    return;
                }
            }
        }
    }

    // Preprocess code for beginner C compatibility
    // 1. Normalize `int main(void)` to `int main()`
    let cleanCode = rawCode.replace(/\bint\s+main\s*\(\s*void\s*\)/g, 'int main()');
    
    // 2. Handle `#include <stdbool.h>` if absent
    if (cleanCode.includes('bool ') || cleanCode.includes('true') || cleanCode.includes('false')) {
        if (!cleanCode.includes('<stdbool.h>') && !cleanCode.includes('typedef enum { false, true } bool;')) {
            cleanCode = '#include <stdbool.h>\n' + cleanCode;
        }
    }

    let stdoutBuffer = '';

    try {
        const exitCode = JSCPP.run(cleanCode, stdinInput, {
            stdio: {
                write: function(text) {
                    stdoutBuffer += text;
                    self.postMessage({ type: 'stdout_chunk', data: text });
                }
            }
        });

        const duration = Math.round(performance.now() - startTime);
        self.postMessage({
            type: 'done',
            exitCode: exitCode !== undefined ? exitCode : 0,
            stdout: stdoutBuffer,
            duration: duration
        });

    } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        const errMsg = err ? (err.message || String(err)) : 'Unknown error during execution';
        
        // Extract line and column numbers if available
        let line = null;
        let col = null;
        const lineMatch = errMsg.match(/(\d+):(\d+)/) || errMsg.match(/line\s+(\d+)/i);
        if (lineMatch) {
            line = parseInt(lineMatch[1], 10);
            if (lineMatch[2]) col = parseInt(lineMatch[2], 10);
        }

        // Generate friendly beginner tips based on common mistakes
        let tip = 'Review the syntax near the highlighted line and check for common C syntax rules.';
        if (errMsg.includes("';'") || errMsg.includes('missing semicolon') || errMsg.includes('expected ;')) {
            tip = 'Check whether the statement before line ' + (line || '') + ' is missing a terminating semicolon (;). Every executable statement in C must end with a semicolon.';
        } else if (errMsg.includes('undeclared') || errMsg.includes('not defined') || errMsg.includes('identifier')) {
            tip = 'Make sure the variable or function is properly declared with its type (e.g., int, float, char) before using it.';
        } else if (errMsg.includes('parenthes') || errMsg.includes('(') || errMsg.includes(')')) {
            tip = 'Check for matching opening ( and closing ) parentheses around conditions and function calls.';
        } else if (errMsg.includes('brace') || errMsg.includes('{') || errMsg.includes('}')) {
            tip = 'Ensure every opening curly brace { has a corresponding closing curly brace }.';
        } else if (errMsg.includes('pointer') || errMsg.includes('dereferenc')) {
            tip = 'Ensure pointer variables are initialized to point to valid memory using & before dereferencing with *. Never dereference a NULL or uninitialized pointer.';
        } else if (errMsg.includes('scanf')) {
            tip = 'When using scanf(), remember to pass the memory address using the ampersand operator (&variable), e.g. scanf("%d", &num);';
        }

        const isCompileError = !errMsg.toLowerCase().includes('runtime') && !errMsg.toLowerCase().includes('segfault');

        self.postMessage({
            type: 'error',
            errorType: isCompileError ? 'Compilation Error' : 'Runtime Error',
            message: errMsg,
            line: line,
            col: col,
            tip: tip,
            stdout: stdoutBuffer,
            duration: duration
        });
    }
};
