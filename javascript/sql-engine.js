/**
 * EDMITH SQL Engine
 * High-performance, zero-latency in-browser Relational SQL Database powered by AlaSQL.
 * Runs 100% locally and synchronously with zero external network downloads.
 * Pre-loaded with 150+ Enterprise Relational Database Tables, each containing 612 records.
 * Prominently features student & professional records for 'Mrinal Prashar'.
 */

class EdmithSqlEngine {
    constructor() {
        this.isInitialized = false;
        this.engineType = 'AlaSQL In-Memory Engine (612 Records/Table)';
        this.queryHistory = [];
        this.schemaData = EdmithSqlEngine.DATABASE_SCHEMA;
        this.tableNames = Object.keys(this.schemaData);
    }

    /**
     * Strips SQL comments (-- and block comments) before execution
     */
    cleanSql(sql) {
        if (!sql) return '';
        let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '');
        cleaned = cleaned.replace(/--.*$/gm, '');
        return cleaned.trim();
    }

    /**
     * Splits SQL text into individual statements, respecting quotes and comments
     */
    splitStatements(sql) {
        const statements = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        
        for (let i = 0; i < sql.length; i++) {
            const ch = sql[i];
            const prev = i > 0 ? sql[i - 1] : '';

            if (ch === "'" && prev !== '\\') {
                if (!inDoubleQuote) inSingleQuote = !inSingleQuote;
            } else if (ch === '"' && prev !== '\\') {
                if (!inSingleQuote) inDoubleQuote = !inDoubleQuote;
            }

            if (ch === ';' && !inSingleQuote && !inDoubleQuote) {
                const trimmed = current.trim();
                if (trimmed) statements.push(trimmed);
                current = '';
            } else {
                current += ch;
            }
        }
        const trimmed = current.trim();
        if (trimmed) statements.push(trimmed);
        return statements;
    }

    /**
     * Initializes the relational database and seeds all 150+ enterprise tables with 612 rows each
     */
    init() {
        if (this.isInitialized) return true;

        if (typeof alasql === 'undefined') {
            console.warn('[EDMITH SQL Engine] AlaSQL not found, initializing fallback.');
            this.engineType = 'In-Memory Client Engine';
            this.isInitialized = true;
            return true;
        }

        try {
            alasql.options.errorlog = false;
            this.seedDatabase();
            this.isInitialized = true;
            this.engineType = 'AlaSQL v4.2 Engine (150+ Tables, 612 Rows Each)';
            return true;
        } catch (err) {
            console.error('[EDMITH SQL Engine] Failed to seed database:', err);
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * Deterministic, realistic row generator producing exactly 612 records for any table
     */
    generate612RowsForTable(tblName, meta) {
        const rows = [];
        const cols = meta.columns || [];

        const firstNames = ['Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Aisha', 'Alex', 'Elena', 'Carlos', 'Priya', 'Daniel', 'Sophia', 'Liam', 'Olivia', 'Ethan', 'Zoe', 'Lucas', 'Mia', 'Noah'];
        const lastNames = ['Jenkins', 'Chen', 'Rodriguez', 'Patel', 'Kim', 'O\'Connor', 'Nakamura', 'Gupta', 'Taylor', 'Smith', 'Johnson', 'Brown', 'Williams', 'Davis', 'Miller', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White'];
        const departments = ['Engineering', 'Computer Science', 'Data Science', 'Business Analytics', 'Finance', 'Marketing', 'Cybersecurity', 'Operations'];
        const cities = ['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo', 'Toronto', 'Sydney', 'Singapore', 'Chicago', 'Austin'];
        const countries = ['USA', 'USA', 'UK', 'Germany', 'Japan', 'Canada', 'Australia', 'Singapore', 'USA', 'India'];
        const statuses = ['Active', 'Active', 'Active', 'Pending', 'Active', 'Completed', 'Active', 'Suspended'];
        const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'A', 'A+'];
        const titles = ['Software Engineer', 'Senior Database Architect', 'Data Scientist', 'DevOps Specialist', 'Systems Analyst', 'Full Stack Developer', 'Cloud Architect', 'Security Engineer'];

        for (let i = 1; i <= 612; i++) {
            const rowObj = {};
            const isFirst = (i === 1);
            const fn = isFirst ? 'Mrinal' : firstNames[(i - 1) % firstNames.length];
            const ln = isFirst ? 'Prashar' : lastNames[(i - 1) % lastNames.length];
            const fullName = isFirst ? 'Mrinal Prashar' : `${fn} ${ln}`;
            const dept = departments[(i - 1) % departments.length];
            const city = cities[(i - 1) % cities.length];
            const country = countries[(i - 1) % countries.length];
            const status = statuses[(i - 1) % statuses.length];
            const email = isFirst ? 'mrinal.prashar@edmith.com' : `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, '')}${i}@edmith.com`;

            cols.forEach(col => {
                const cname = col.name;
                const ctype = (col.type || 'STRING').toUpperCase();
                const lower = cname.toLowerCase();

                // IDs / Primary Keys
                if (col.isPk || lower.endsWith('_id') || lower === 'id') {
                    if (lower === 'department_id') {
                        rowObj[cname] = ((i - 1) % departments.length) + 1;
                    } else if (lower === 'manager_id') {
                        rowObj[cname] = i === 1 ? null : 1001; // Mrinal is manager #1001
                    } else if (lower === 'student_id') {
                        rowObj[cname] = i;
                    } else if (lower === 'employee_id' || lower === 'emp_id') {
                        rowObj[cname] = 1000 + i;
                    } else if (lower === 'course_id') {
                        rowObj[cname] = ((i - 1) % 20) + 1;
                    } else {
                        rowObj[cname] = i;
                    }
                    return;
                }

                // Name columns
                if (lower === 'first_name') {
                    rowObj[cname] = fn;
                } else if (lower === 'last_name') {
                    rowObj[cname] = ln;
                } else if (lower === 'full_name' || lower === 'name' || lower.endsWith('_name')) {
                    if (lower.includes('department')) {
                        rowObj[cname] = dept;
                    } else if (lower.includes('course')) {
                        rowObj[cname] = isFirst ? 'Advanced SQL Systems & Database Architecture' : `Enterprise Systems Module ${((i - 1) % 15) + 1}`;
                    } else if (lower.includes('product')) {
                        rowObj[cname] = `Enterprise Server Unit ${100 + i}`;
                    } else if (lower.includes('exam')) {
                        rowObj[cname] = 'Midterm Certification';
                    } else if (lower.includes('cert')) {
                        rowObj[cname] = 'Certified Database Administrator';
                    } else if (lower.includes('client') || lower.includes('customer') || lower.includes('user') || lower.includes('student') || lower.includes('employee') || lower.includes('contact') || lower.includes('instructor') || lower.includes('author') || lower.includes('patient') || lower.includes('staff')) {
                        rowObj[cname] = fullName;
                    } else {
                        rowObj[cname] = fullName;
                    }
                } else if (lower === 'email' || lower.includes('email')) {
                    rowObj[cname] = email;
                } else if (lower === 'job_title' || lower === 'title' || lower === 'role' || lower === 'position') {
                    rowObj[cname] = isFirst ? 'Lead Systems Architect' : titles[(i - 1) % titles.length];
                } else if (lower === 'department' || lower === 'dept_name') {
                    rowObj[cname] = dept;
                } else if (lower === 'city' || lower === 'location' || lower === 'building') {
                    rowObj[cname] = city;
                } else if (lower === 'country') {
                    rowObj[cname] = country;
                } else if (lower === 'status' || lower.endsWith('_status')) {
                    rowObj[cname] = status;
                } else if (lower === 'grade') {
                    rowObj[cname] = isFirst ? 'A+' : grades[(i - 1) % grades.length];
                } else if (lower === 'gpa') {
                    rowObj[cname] = isFirst ? 4.0 : Number((2.8 + ((i % 12) * 0.1)).toFixed(2));
                } else if (lower.includes('salary') || lower.includes('budget') || lower.includes('price') || lower.includes('amount') || lower.includes('balance') || lower.includes('revenue') || lower.includes('credit_limit')) {
                    if (lower.includes('salary')) {
                        rowObj[cname] = isFirst ? 165000.00 : Number((60000 + (i % 70) * 1200).toFixed(2));
                    } else if (lower.includes('credit_limit') || lower.includes('balance')) {
                        rowObj[cname] = isFirst ? 250000.00 : Number((15000 + (i % 40) * 2500).toFixed(2));
                    } else {
                        rowObj[cname] = isFirst ? 1200.00 : Number((25.50 + (i % 80) * 14.25).toFixed(2));
                    }
                } else if (lower.includes('date') || lower.includes('hire') || lower.includes('created') || lower.includes('time')) {
                    const month = String(((i - 1) % 12) + 1).padStart(2, '0');
                    const day = String(((i - 1) % 28) + 1).padStart(2, '0');
                    rowObj[cname] = `2025-${month}-${day}`;
                } else if (ctype.includes('INT')) {
                    rowObj[cname] = ((i - 1) % 100) + 1;
                } else if (ctype.includes('FLOAT') || ctype.includes('DECIMAL') || ctype.includes('NUMERIC')) {
                    rowObj[cname] = Number(((i % 50) * 2.5 + 10.0).toFixed(2));
                } else if (ctype.includes('BOOL')) {
                    rowObj[cname] = (i % 4 !== 0);
                } else {
                    rowObj[cname] = `${cname.replace(/_/g, ' ')} ${i}`;
                }
            });

            rows.push(rowObj);
        }

        return rows;
    }

    /**
     * Seeds all 150+ enterprise relational database tables with 612 rows each
     */
    seedDatabase() {
        if (typeof alasql === 'undefined') return;

        const startTime = performance.now();
        const schema = this.schemaData;

        // Clear any previous local storage caches
        try {
            localStorage.removeItem('edmith_sql_db');
        } catch (e) {}

        for (const [tblName, meta] of Object.entries(schema)) {
            try {
                alasql(`DROP TABLE IF EXISTS ${tblName}`);
            } catch (e) {}

            // Build CREATE TABLE statement (strip PRIMARY KEY from DDL to allow clean in-memory array data)
            const colDefs = meta.columnDefs.map(([cname, ctype]) => {
                const cleanType = (ctype || 'STRING').replace(/PRIMARY\s+KEY/ig, '').trim() || 'STRING';
                return `${cname} ${cleanType}`;
            }).join(', ');
            try {
                alasql(`CREATE TABLE ${tblName} (${colDefs})`);
            } catch (e) {
                console.error(`Error creating table ${tblName}:`, e);
                continue;
            }

            // Populate exactly 612 high-quality records directly in AlaSQL memory
            const rows = this.generate612RowsForTable(tblName, meta);
            if (alasql.tables && alasql.tables[tblName]) {
                alasql.tables[tblName].data = rows;
            }
        }

        const elapsed = (performance.now() - startTime).toFixed(1);
        console.log(`[EDMITH SQL Engine] Seeded ${Object.keys(schema).length} tables with 612 records each in ${elapsed}ms.`);
    }

    /**
     * Alias for getSchemaExplorerData for backward compatibility
     */
    getSchema() {
        return this.getSchemaExplorerData();
    }

    /**
     * Returns structured schema information for the Schema Explorer sidebar
     */
    getSchemaExplorerData() {
        const result = [];
        for (const [tblName, meta] of Object.entries(this.schemaData)) {
            let currentCount = 612;
            if (typeof alasql !== 'undefined' && alasql.tables && alasql.tables[tblName] && Array.isArray(alasql.tables[tblName].data)) {
                currentCount = alasql.tables[tblName].data.length;
            }
            result.push({
                name: tblName,
                category: meta.category || 'General Enterprise',
                rowCount: currentCount,
                columns: meta.columns || []
            });
        }
        return result;
    }

    /**
     * Synchronous Query Execution Engine supporting single & sequential multi-statements
     */
    runQuery(sqlText) {
        if (!sqlText || !sqlText.trim()) {
            throw new Error('Please enter a valid SQL query.');
        }

        const cleanedFull = this.cleanSql(sqlText);
        const statements = this.splitStatements(cleanedFull);

        if (statements.length === 0) {
            throw new Error('Please enter a valid SQL query.');
        }

        const startTime = performance.now();
        let finalResult = null;
        let lastSelectResult = null;
        let totalAffected = 0;

        if (typeof alasql !== 'undefined') {
            for (let idx = 0; idx < statements.length; idx++) {
                const stmt = statements[idx];
                try {
                    alasql.options.errorlog = false;
                    const res = alasql(stmt);

                    if (alasql.error) {
                        const err = alasql.error;
                        alasql.error = null;
                        throw err;
                    }

                    if (Array.isArray(res)) {
                        lastSelectResult = res;
                        finalResult = res;
                    } else {
                        totalAffected += (typeof res === 'number' ? res : 1);
                        if (!lastSelectResult) {
                            finalResult = res;
                        }
                    }
                } catch (err) {
                    const executionTimeMs = Math.round(performance.now() - startTime);
                    this.recordHistory(sqlText, false, executionTimeMs);
                    const prefix = statements.length > 1 ? `[Statement ${idx + 1} of ${statements.length}] ` : '';
                    throw new Error(prefix + this.formatErrorMessage(err, stmt));
                }
            }

            const executionTimeMs = Math.round(performance.now() - startTime);
            this.recordHistory(sqlText, true, executionTimeMs);

            // If at least one SELECT query was executed, return that result set
            const displaySet = lastSelectResult || (Array.isArray(finalResult) ? finalResult : null);
            if (displaySet) {
                const columns = displaySet.length > 0 ? Object.keys(displaySet[0]) : [];
                const values = displaySet.map(row => columns.map(col => row[col]));
                return {
                    columns,
                    values,
                    executionTimeMs,
                    affectedRows: displaySet.length,
                    isSelect: true,
                    statementCount: statements.length
                };
            }

            // Otherwise return DDL/DML execution summary
            return {
                columns: ['Status', 'Message', 'Statements Executed', 'Rows Affected'],
                values: [['Success', 'All SQL statements executed successfully.', statements.length, totalAffected]],
                executionTimeMs,
                affectedRows: totalAffected,
                isSelect: false,
                statementCount: statements.length
            };
        }

        throw new Error('AlaSQL engine is not initialized.');
    }

    /**
     * Formats error message for clear presentation to the student
     */
    formatErrorMessage(err, sql) {
        let msg = err ? (err.message || String(err)) : 'Unknown database error occurred';

        if (msg.includes('Cannot read property') || msg.includes('Cannot read properties of undefined')) {
            const fromMatch = sql.match(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_]+)/i);
            if (fromMatch && fromMatch[1]) {
                return `Table '${fromMatch[1]}' does not exist in the enterprise database. Check the Schema Explorer for available tables.`;
            }
        }

        if (msg.includes('Parse error') || msg.includes('syntax error')) {
            return `SQL Syntax Error: ${msg}`;
        }

        return msg;
    }

    recordHistory(sql, success, timeMs) {
        this.queryHistory.unshift({
            sql: sql.trim(),
            success,
            timeMs,
            timestamp: new Date().toLocaleTimeString()
        });
        if (this.queryHistory.length > 50) {
            this.queryHistory.pop();
        }
    }

    resetDatabase() {
        this.seedDatabase();
    }

    static exportToCSV(columns, values, filename = 'query_results.csv') {
        if (!columns || !values || columns.length === 0) return;
        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const headerRow = columns.map(escapeCsv).join(',');
        const dataRows = values.map(row => row.map(escapeCsv).join(','));
        const csvContent = [headerRow, ...dataRows].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 150+ Enterprise Database Table Definitions
EdmithSqlEngine.DATABASE_SCHEMA = {
  "departments": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "department_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "department_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "building",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "budget",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "head_professor",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "department_id",
        "INT PRIMARY KEY"
      ],
      [
        "department_name",
        "STRING"
      ],
      [
        "building",
        "STRING"
      ],
      [
        "budget",
        "FLOAT"
      ],
      [
        "head_professor",
        "STRING"
      ]
    ]
  },
  "students": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "student_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "gpa",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "enrollment_year",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "student_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "department_id",
        "INT"
      ],
      [
        "gpa",
        "FLOAT"
      ],
      [
        "enrollment_year",
        "INT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "courses": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "course_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "course_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "course_title",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "credits",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "max_capacity",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "course_id",
        "INT PRIMARY KEY"
      ],
      [
        "course_code",
        "STRING"
      ],
      [
        "course_title",
        "STRING"
      ],
      [
        "department_id",
        "INT"
      ],
      [
        "credits",
        "INT"
      ],
      [
        "max_capacity",
        "INT"
      ]
    ]
  },
  "enrollments": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "enrollment_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "student_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "course_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "semester",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "grade",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "attendance_pct",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "enrollment_id",
        "INT PRIMARY KEY"
      ],
      [
        "student_id",
        "INT"
      ],
      [
        "course_id",
        "INT"
      ],
      [
        "semester",
        "STRING"
      ],
      [
        "grade",
        "STRING"
      ],
      [
        "attendance_pct",
        "FLOAT"
      ]
    ]
  },
  "certifications": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "cert_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "student_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "certification_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "issued_by",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "issue_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "score_pct",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "cert_id",
        "INT PRIMARY KEY"
      ],
      [
        "student_id",
        "INT"
      ],
      [
        "certification_name",
        "STRING"
      ],
      [
        "issued_by",
        "STRING"
      ],
      [
        "issue_date",
        "STRING"
      ],
      [
        "score_pct",
        "FLOAT"
      ]
    ]
  },
  "examination_results": {
    "category": "Academic & University",
    "columns": [
      {
        "name": "result_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "student_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "course_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "exam_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "exam_score",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "passing_score",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "exam_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "result_id",
        "INT PRIMARY KEY"
      ],
      [
        "student_id",
        "INT"
      ],
      [
        "course_id",
        "INT"
      ],
      [
        "exam_name",
        "STRING"
      ],
      [
        "exam_score",
        "FLOAT"
      ],
      [
        "passing_score",
        "FLOAT"
      ],
      [
        "exam_date",
        "STRING"
      ]
    ]
  },
  "employees": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "emp_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "full_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "job_title",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "manager_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "hire_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "employee_id",
        "INT PRIMARY KEY"
      ],
      [
        "emp_id",
        "INT"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "name",
        "STRING"
      ],
      [
        "full_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "job_title",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "department_id",
        "INT"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "manager_id",
        "INT"
      ],
      [
        "hire_date",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "company_employees": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "location",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "hire_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "employee_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "department_id",
        "INT"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "location",
        "STRING"
      ],
      [
        "hire_date",
        "STRING"
      ]
    ]
  },
  "active_staff": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "full_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "hire_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "employee_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "full_name",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "hire_date",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "active_contractors": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "contractor_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "contractor_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "agency",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "hourly_rate",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "contractor_id",
        "INT PRIMARY KEY"
      ],
      [
        "contractor_name",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "agency",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "hourly_rate",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "company_staff": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "hire_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "employee_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "hire_date",
        "STRING"
      ]
    ]
  },
  "staff_payroll": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "payroll_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "emp_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "base_salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "bonus_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "pay_month",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "payroll_id",
        "INT PRIMARY KEY"
      ],
      [
        "employee_id",
        "INT"
      ],
      [
        "emp_id",
        "INT"
      ],
      [
        "name",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "base_salary",
        "FLOAT"
      ],
      [
        "bonus_usd",
        "FLOAT"
      ],
      [
        "pay_month",
        "STRING"
      ]
    ]
  },
  "company_payroll": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "payroll_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "base_salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "bonus",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "gross_pay",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "pay_period",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "payroll_id",
        "INT PRIMARY KEY"
      ],
      [
        "employee_id",
        "INT"
      ],
      [
        "base_salary",
        "FLOAT"
      ],
      [
        "bonus",
        "FLOAT"
      ],
      [
        "gross_pay",
        "FLOAT"
      ],
      [
        "pay_period",
        "STRING"
      ]
    ]
  },
  "employee_compensation": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "comp_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "emp_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "full_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "base_salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "rating_score",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "hire_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "equity_grant_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "performance_bonus",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "effective_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "comp_id",
        "INT PRIMARY KEY"
      ],
      [
        "employee_id",
        "INT"
      ],
      [
        "emp_id",
        "INT"
      ],
      [
        "full_name",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "base_salary",
        "FLOAT"
      ],
      [
        "rating_score",
        "FLOAT"
      ],
      [
        "hire_date",
        "STRING"
      ],
      [
        "equity_grant_usd",
        "FLOAT"
      ],
      [
        "performance_bonus",
        "FLOAT"
      ],
      [
        "effective_date",
        "STRING"
      ]
    ]
  },
  "employee_payroll": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "payroll_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "employee_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "emp_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "base_salary",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "hourly_rate",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "bonus",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "pay_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "payroll_id",
        "INT PRIMARY KEY"
      ],
      [
        "employee_id",
        "INT"
      ],
      [
        "emp_id",
        "INT"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "salary",
        "FLOAT"
      ],
      [
        "base_salary",
        "FLOAT"
      ],
      [
        "hourly_rate",
        "FLOAT"
      ],
      [
        "bonus",
        "FLOAT"
      ],
      [
        "pay_date",
        "STRING"
      ]
    ]
  },
  "staff_directory": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "staff_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "work_email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "extension",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "staff_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "work_email",
        "STRING"
      ],
      [
        "extension",
        "STRING"
      ]
    ]
  },
  "high_growth_departments": {
    "category": "Corporate HR & Staff",
    "columns": [
      {
        "name": "department_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "department_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "growth_rate_pct",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "headcount_target",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "department_id",
        "INT PRIMARY KEY"
      ],
      [
        "department_name",
        "STRING"
      ],
      [
        "growth_rate_pct",
        "FLOAT"
      ],
      [
        "headcount_target",
        "INT"
      ]
    ]
  },
  "customers": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "cust_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "full_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "contact_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "phone",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "city",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "signup_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "credit_limit",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "cust_id",
        "INT"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "name",
        "STRING"
      ],
      [
        "full_name",
        "STRING"
      ],
      [
        "contact_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "account_tier",
        "STRING"
      ],
      [
        "phone",
        "STRING"
      ],
      [
        "city",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "signup_date",
        "STRING"
      ],
      [
        "credit_limit",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "customer_accounts": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "full_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "loyalty_points",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "credit_balance",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "full_name",
        "STRING"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "loyalty_points",
        "INT"
      ],
      [
        "credit_balance",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "customer_orders": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "order_status",
        "STRING"
      ]
    ]
  },
  "customer_profiles": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "phone_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "mobile_phone",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "work_phone",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "home_phone",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "city",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "phone_number",
        "STRING"
      ],
      [
        "mobile_phone",
        "STRING"
      ],
      [
        "work_phone",
        "STRING"
      ],
      [
        "home_phone",
        "STRING"
      ],
      [
        "city",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ]
    ]
  },
  "customer_metrics": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "metric_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_annual_spend",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "support_plan",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "churn_risk_score",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "lifetime_value_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "support_tickets_30d",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "nps_rating",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "last_login",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "updated_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "metric_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "total_annual_spend",
        "FLOAT"
      ],
      [
        "support_plan",
        "STRING"
      ],
      [
        "churn_risk_score",
        "FLOAT"
      ],
      [
        "lifetime_value_usd",
        "FLOAT"
      ],
      [
        "support_tickets_30d",
        "INT"
      ],
      [
        "nps_rating",
        "INT"
      ],
      [
        "last_login",
        "STRING"
      ],
      [
        "tier",
        "STRING"
      ],
      [
        "updated_at",
        "STRING"
      ]
    ]
  },
  "customer_purchases": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "purchase_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "purchase_amount",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "purchase_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "purchase_amount",
        "FLOAT"
      ]
    ]
  },
  "customer_registrations": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "reg_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "referral_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "reg_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "referral_code",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "customer_subscribers": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "sub_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "plan_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "plan_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "monthly_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "is_test_user",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "renewal_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "sub_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "plan_name",
        "STRING"
      ],
      [
        "plan_tier",
        "STRING"
      ],
      [
        "monthly_usd",
        "FLOAT"
      ],
      [
        "is_test_user",
        "BOOLEAN"
      ],
      [
        "renewal_date",
        "STRING"
      ]
    ]
  },
  "customer_vip_roster": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "vip_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "vip_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "lifetime_spend",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "assigned_manager",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "vip_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "vip_tier",
        "STRING"
      ],
      [
        "lifetime_spend",
        "FLOAT"
      ],
      [
        "assigned_manager",
        "STRING"
      ]
    ]
  },
  "customers_backup_2026": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "account_tier",
        "STRING"
      ],
      [
        "balance",
        "FLOAT"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "customer_addresses": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "address_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "street",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "city",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "state",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "postal_code",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "address_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "street",
        "STRING"
      ],
      [
        "city",
        "STRING"
      ],
      [
        "state",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "postal_code",
        "STRING"
      ]
    ]
  },
  "clients": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "client_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "client_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tier",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "client_id",
        "INT"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "client_name",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "tier",
        "STRING"
      ]
    ]
  },
  "corporate_clients": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "industry",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "annual_contract_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "industry",
        "STRING"
      ],
      [
        "annual_contract_usd",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "retail_customers": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "city",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "loyalty_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "lifetime_spend",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "city",
        "STRING"
      ],
      [
        "loyalty_tier",
        "STRING"
      ],
      [
        "lifetime_spend",
        "FLOAT"
      ]
    ]
  },
  "wholesale_clients": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "client_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "organization_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "client_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tax_id",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "credit_rating",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "annual_volume_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "account_rep",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "client_id",
        "INT PRIMARY KEY"
      ],
      [
        "organization_name",
        "STRING"
      ],
      [
        "client_name",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "tax_id",
        "STRING"
      ],
      [
        "credit_rating",
        "STRING"
      ],
      [
        "annual_volume_usd",
        "FLOAT"
      ],
      [
        "account_rep",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "leads": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "lead_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "lead_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "industry",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "company",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "assigned_rep",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "lead_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "lead_name",
        "STRING"
      ],
      [
        "industry",
        "STRING"
      ],
      [
        "company",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "assigned_rep",
        "STRING"
      ]
    ]
  },
  "calls": {
    "category": "Customers & CRM",
    "columns": [
      {
        "name": "call_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "lead_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "caller_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "rep_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "duration_seconds",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "outcome",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "call_result",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "call_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "call_id",
        "INT PRIMARY KEY"
      ],
      [
        "lead_id",
        "INT"
      ],
      [
        "caller_name",
        "STRING"
      ],
      [
        "rep_name",
        "STRING"
      ],
      [
        "duration_seconds",
        "INT"
      ],
      [
        "outcome",
        "STRING"
      ],
      [
        "call_result",
        "STRING"
      ],
      [
        "call_date",
        "STRING"
      ]
    ]
  },
  "products": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sku",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "category_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "category_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "stock_quantity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "units_in_stock",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "is_discontinued",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "sku",
        "STRING"
      ],
      [
        "category_id",
        "INT"
      ],
      [
        "category_name",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "price",
        "FLOAT"
      ],
      [
        "stock_quantity",
        "INT"
      ],
      [
        "units_in_stock",
        "INT"
      ],
      [
        "is_discontinued",
        "BOOLEAN"
      ]
    ]
  },
  "store_products": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "category_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "units_in_stock",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "clearance_sale",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "category_id",
        "INT"
      ],
      [
        "category",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "price",
        "FLOAT"
      ],
      [
        "units_in_stock",
        "INT"
      ],
      [
        "clearance_sale",
        "BOOLEAN"
      ]
    ]
  },
  "store_catalog": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "sales_count",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "rating",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "units_in_stock",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "clearance_sale",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "category",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "price",
        "FLOAT"
      ],
      [
        "sales_count",
        "INT"
      ],
      [
        "rating",
        "FLOAT"
      ],
      [
        "units_in_stock",
        "INT"
      ],
      [
        "clearance_sale",
        "BOOLEAN"
      ]
    ]
  },
  "product_catalog": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "retail_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "stock_qty",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "promo_active",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "category",
        "STRING"
      ],
      [
        "retail_price",
        "FLOAT"
      ],
      [
        "stock_qty",
        "INT"
      ],
      [
        "promo_active",
        "BOOLEAN"
      ]
    ]
  },
  "store_inventory": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "stock_units",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "reorder_level",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "discount_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "member_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "regular_price",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "stock_units",
        "INT"
      ],
      [
        "reorder_level",
        "INT"
      ],
      [
        "discount_price",
        "FLOAT"
      ],
      [
        "member_price",
        "FLOAT"
      ],
      [
        "regular_price",
        "FLOAT"
      ]
    ]
  },
  "warehouse_inventory": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sku",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "units_in_stock",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "aisle_loc",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "sku",
        "STRING"
      ],
      [
        "units_in_stock",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "aisle_loc",
        "STRING"
      ]
    ]
  },
  "warehouse_products": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "units_in_stock",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "stock_quantity",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "price",
        "FLOAT"
      ],
      [
        "units_in_stock",
        "INT"
      ],
      [
        "stock_quantity",
        "INT"
      ]
    ]
  },
  "categories": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "category_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "category_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "parent_category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tax_code",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "category_id",
        "INT PRIMARY KEY"
      ],
      [
        "category_name",
        "STRING"
      ],
      [
        "parent_category",
        "STRING"
      ],
      [
        "tax_code",
        "STRING"
      ]
    ]
  },
  "product_inventory": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "inventory_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "warehouse_location",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "bin_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quantity_on_hand",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "reorder_point",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "last_cycle_count",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "inventory_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_id",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "warehouse_location",
        "STRING"
      ],
      [
        "bin_number",
        "STRING"
      ],
      [
        "quantity_on_hand",
        "INT"
      ],
      [
        "reorder_point",
        "INT"
      ],
      [
        "last_cycle_count",
        "STRING"
      ]
    ]
  },
  "inventory_items": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "item_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "sku",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "warehouse_aisle",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "stock_quantity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "safety_threshold",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "unit_cost_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "item_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_id",
        "INT"
      ],
      [
        "sku",
        "STRING"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "category",
        "STRING"
      ],
      [
        "warehouse_aisle",
        "STRING"
      ],
      [
        "stock_quantity",
        "INT"
      ],
      [
        "safety_threshold",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "unit_cost_usd",
        "FLOAT"
      ]
    ]
  },
  "inventory_locations": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "location_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "aisle_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "shelf_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "capacity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "warehouse_name",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "location_id",
        "INT PRIMARY KEY"
      ],
      [
        "aisle_number",
        "STRING"
      ],
      [
        "shelf_code",
        "STRING"
      ],
      [
        "capacity",
        "INT"
      ],
      [
        "warehouse_name",
        "STRING"
      ]
    ]
  },
  "orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "payment_method",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "total_amount",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "status_code",
        "STRING"
      ],
      [
        "payment_method",
        "STRING"
      ]
    ]
  },
  "order_items": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_item_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "order_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "product_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "quantity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "subtotal",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_item_id",
        "INT PRIMARY KEY"
      ],
      [
        "order_id",
        "INT"
      ],
      [
        "product_id",
        "INT"
      ],
      [
        "quantity",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "subtotal",
        "FLOAT"
      ]
    ]
  },
  "order_lines": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "line_num",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "item_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "quantity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "discount_pct",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT"
      ],
      [
        "line_num",
        "INT"
      ],
      [
        "item_id",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "quantity",
        "INT"
      ],
      [
        "discount_pct",
        "FLOAT"
      ]
    ]
  },
  "order_invoices": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "invoice_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "order_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "item_qty",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "subtotal",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "tax_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "total_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "invoice_id",
        "INT PRIMARY KEY"
      ],
      [
        "order_id",
        "INT"
      ],
      [
        "item_qty",
        "INT"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "subtotal",
        "FLOAT"
      ],
      [
        "tax_amount",
        "FLOAT"
      ],
      [
        "total_usd",
        "FLOAT"
      ]
    ]
  },
  "order_batches": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "batch_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "revenue",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "item_count",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "batch_id",
        "INT"
      ],
      [
        "revenue",
        "FLOAT"
      ],
      [
        "item_count",
        "INT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "sales_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "payment_method",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "total_amount",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "order_status",
        "STRING"
      ],
      [
        "payment_method",
        "STRING"
      ]
    ]
  },
  "sales_transactions": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "transaction_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_category",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sales_channel",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "gross_revenue",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "discount_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "quarter",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "transaction_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_category",
        "STRING"
      ],
      [
        "sales_channel",
        "STRING"
      ],
      [
        "gross_revenue",
        "FLOAT"
      ],
      [
        "discount_usd",
        "FLOAT"
      ],
      [
        "quarter",
        "STRING"
      ]
    ]
  },
  "shopping_carts": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "cart_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "session_id",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "items_count",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "cart_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "cart_id",
        "INT PRIMARY KEY"
      ],
      [
        "session_id",
        "STRING"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "items_count",
        "INT"
      ],
      [
        "cart_total",
        "FLOAT"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "archived_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "total_amount",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "archived_orders_2025": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "current_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "live_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "total_amount",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "active_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "total_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "total_amount",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "cancelled_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "cancel_reason",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "cancelled_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "cancel_reason",
        "STRING"
      ],
      [
        "cancelled_at",
        "STRING"
      ]
    ]
  },
  "order_cold_storage": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "closed_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "archived_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "closed_date",
        "STRING"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "archived_at",
        "STRING"
      ]
    ]
  },
  "online_orders": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "checkout_channel",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_amount",
        "FLOAT"
      ],
      [
        "checkout_channel",
        "STRING"
      ],
      [
        "order_date",
        "STRING"
      ]
    ]
  },
  "domestic_catalog": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "origin_country",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "origin_country",
        "STRING"
      ]
    ]
  },
  "import_catalog": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "product_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "import_duty_pct",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "product_id",
        "INT PRIMARY KEY"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "import_duty_pct",
        "FLOAT"
      ]
    ]
  },
  "master_inventory": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "item_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "sku",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "product_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "stock_qty",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "unit_cost",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "item_id",
        "INT PRIMARY KEY"
      ],
      [
        "sku",
        "STRING"
      ],
      [
        "product_name",
        "STRING"
      ],
      [
        "stock_qty",
        "INT"
      ],
      [
        "unit_cost",
        "FLOAT"
      ]
    ]
  },
  "empty_staging_template": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "item_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "sku",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "batch_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quantity",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "item_id",
        "INT PRIMARY KEY"
      ],
      [
        "sku",
        "STRING"
      ],
      [
        "batch_number",
        "STRING"
      ],
      [
        "quantity",
        "INT"
      ]
    ]
  },
  "vendor_fulfillments": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "fulfillment_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "vendor_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "orders_shipped",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "lead_time_days",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "on_time_pct",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "fulfillment_id",
        "INT PRIMARY KEY"
      ],
      [
        "vendor_name",
        "STRING"
      ],
      [
        "orders_shipped",
        "INT"
      ],
      [
        "lead_time_days",
        "INT"
      ],
      [
        "on_time_pct",
        "FLOAT"
      ]
    ]
  },
  "colors": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "color_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "color_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "hex_code",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "color_id",
        "INT PRIMARY KEY"
      ],
      [
        "color_name",
        "STRING"
      ],
      [
        "hex_code",
        "STRING"
      ]
    ]
  },
  "sizes": {
    "category": "Products & E-Commerce",
    "columns": [
      {
        "name": "size_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "size_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "code",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "size_id",
        "INT PRIMARY KEY"
      ],
      [
        "size_name",
        "STRING"
      ],
      [
        "code",
        "STRING"
      ]
    ]
  },
  "accounts": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "account_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "acc_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "owner_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "currency",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "permissions",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "account_id",
        "INT PRIMARY KEY"
      ],
      [
        "acc_id",
        "INT"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "owner_name",
        "STRING"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "account_number",
        "STRING"
      ],
      [
        "account_type",
        "STRING"
      ],
      [
        "balance",
        "FLOAT"
      ],
      [
        "balance_usd",
        "FLOAT"
      ],
      [
        "currency",
        "STRING"
      ],
      [
        "permissions",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "user_accounts": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "account_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "unit_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "signup_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "account_id",
        "INT"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "account_type",
        "STRING"
      ],
      [
        "unit_price",
        "FLOAT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "signup_date",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "corporate_accounts": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "account_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "acc_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "legal_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "credit_limit_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount_cents",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "account_id",
        "INT PRIMARY KEY"
      ],
      [
        "acc_id",
        "INT"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "legal_name",
        "STRING"
      ],
      [
        "country_code",
        "STRING"
      ],
      [
        "account_type",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ],
      [
        "credit_limit_usd",
        "FLOAT"
      ],
      [
        "amount_cents",
        "INT"
      ]
    ]
  },
  "domestic_accounts": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "account_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "client_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "state_registered",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "account_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "client_name",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ],
      [
        "state_registered",
        "STRING"
      ]
    ]
  },
  "international_accounts": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "account_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "client_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "account_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "client_name",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ],
      [
        "country",
        "STRING"
      ]
    ]
  },
  "payment_transactions": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "txn_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "account_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "risk_score",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "currency",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "payment_method",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "txn_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "error_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "txn_id",
        "INT PRIMARY KEY"
      ],
      [
        "account_id",
        "INT"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "risk_score",
        "FLOAT"
      ],
      [
        "currency",
        "STRING"
      ],
      [
        "payment_method",
        "STRING"
      ],
      [
        "txn_type",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "error_code",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "billing_transactions": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "billing_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "invoice_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "billing_cycle",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "amount_billed",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "tax_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "paid_status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "due_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "billing_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "invoice_number",
        "STRING"
      ],
      [
        "billing_cycle",
        "STRING"
      ],
      [
        "amount_billed",
        "FLOAT"
      ],
      [
        "tax_usd",
        "FLOAT"
      ],
      [
        "paid_status",
        "STRING"
      ],
      [
        "due_date",
        "STRING"
      ]
    ]
  },
  "subscription_invoices": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "invoice_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "plan_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "monthly_fee",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "seats_purchased",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "invoice_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "invoice_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "plan_type",
        "STRING"
      ],
      [
        "monthly_fee",
        "FLOAT"
      ],
      [
        "seats_purchased",
        "INT"
      ],
      [
        "invoice_total",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "transfers_audit": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "transfer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "from_acc",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "to_acc",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "transfer_id",
        "INT PRIMARY KEY"
      ],
      [
        "from_acc",
        "INT"
      ],
      [
        "to_acc",
        "INT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "internal_ledger": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "entry_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "txn_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "account_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "debit_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "credit_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "posted_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "entry_id",
        "INT PRIMARY KEY"
      ],
      [
        "txn_id",
        "INT"
      ],
      [
        "account_code",
        "STRING"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "debit_usd",
        "FLOAT"
      ],
      [
        "credit_usd",
        "FLOAT"
      ],
      [
        "posted_at",
        "STRING"
      ]
    ]
  },
  "fedwire_settlement": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "settlement_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "txn_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "imad_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "sending_bank",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "receiving_bank",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "amount_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "settlement_id",
        "INT PRIMARY KEY"
      ],
      [
        "txn_id",
        "INT"
      ],
      [
        "imad_number",
        "STRING"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "sending_bank",
        "STRING"
      ],
      [
        "receiving_bank",
        "STRING"
      ],
      [
        "amount_usd",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "live_customer_balances": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "cust_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "legal_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "credit_limit",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "cust_id",
        "INT PRIMARY KEY"
      ],
      [
        "legal_name",
        "STRING"
      ],
      [
        "tier",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ],
      [
        "credit_limit",
        "FLOAT"
      ]
    ]
  },
  "migration_backup_tier1_2026": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "cust_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "legal_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "cust_id",
        "INT PRIMARY KEY"
      ],
      [
        "legal_name",
        "STRING"
      ],
      [
        "tier",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ]
    ]
  },
  "staging_balances_template": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "cust_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "legal_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "cust_id",
        "INT PRIMARY KEY"
      ],
      [
        "legal_name",
        "STRING"
      ],
      [
        "tier",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ]
    ]
  },
  "daily_revenue_summary": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "summary_date",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "total_orders",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "gross_revenue",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "net_revenue",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "refund_amount",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "summary_date",
        "STRING PRIMARY KEY"
      ],
      [
        "total_orders",
        "INT"
      ],
      [
        "gross_revenue",
        "FLOAT"
      ],
      [
        "net_revenue",
        "FLOAT"
      ],
      [
        "refund_amount",
        "FLOAT"
      ]
    ]
  },
  "monthly_revenue_ledger": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "ledger_month",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "total_orders",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "gross_sales",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "net_margin",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "ledger_month",
        "STRING PRIMARY KEY"
      ],
      [
        "total_orders",
        "INT"
      ],
      [
        "gross_sales",
        "FLOAT"
      ],
      [
        "net_margin",
        "FLOAT"
      ]
    ]
  },
  "financial_annual_accruals": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "accrual_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "fiscal_year",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "cost_center",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "accrued_expense_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "accrual_id",
        "INT PRIMARY KEY"
      ],
      [
        "fiscal_year",
        "INT"
      ],
      [
        "cost_center",
        "STRING"
      ],
      [
        "accrued_expense_usd",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "corporate_tax_filings": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "filing_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "corp_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "tax_year",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "jurisdiction",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "entity_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "gross_revenue",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "total_tax_paid",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "filing_status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "filing_id",
        "INT PRIMARY KEY"
      ],
      [
        "corp_id",
        "INT"
      ],
      [
        "tax_year",
        "INT"
      ],
      [
        "jurisdiction",
        "STRING"
      ],
      [
        "entity_name",
        "STRING"
      ],
      [
        "gross_revenue",
        "FLOAT"
      ],
      [
        "total_tax_paid",
        "FLOAT"
      ],
      [
        "filing_status",
        "STRING"
      ]
    ]
  },
  "stock_ticks": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "tick_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "ticker",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "price_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "execution_price",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "volume",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "trade_volume",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "day_high",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "day_low",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "recorded_time",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "trade_time",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "tick_id",
        "INT PRIMARY KEY"
      ],
      [
        "ticker",
        "STRING"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "price_usd",
        "FLOAT"
      ],
      [
        "execution_price",
        "FLOAT"
      ],
      [
        "volume",
        "INT"
      ],
      [
        "trade_volume",
        "INT"
      ],
      [
        "day_high",
        "FLOAT"
      ],
      [
        "day_low",
        "FLOAT"
      ],
      [
        "recorded_time",
        "STRING"
      ],
      [
        "trade_time",
        "STRING"
      ]
    ]
  },
  "sales_q1_2026": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quarter",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "quarter",
        "STRING"
      ]
    ]
  },
  "sales_q2_2026": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quarter",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "quarter",
        "STRING"
      ]
    ]
  },
  "sales_q3_2026": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quarter",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "quarter",
        "STRING"
      ]
    ]
  },
  "sales_q4_2026": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "order_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "order_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "quarter",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "order_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "order_date",
        "STRING"
      ],
      [
        "quarter",
        "STRING"
      ]
    ]
  },
  "terminal_1_sales": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "transaction_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "sale_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "transaction_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "sale_amount",
        "FLOAT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "terminal_2_sales": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "transaction_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "sale_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "transaction_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "sale_amount",
        "FLOAT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "transactions": {
    "category": "Finance & Ledger",
    "columns": [
      {
        "name": "transaction_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "purchase_amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "amount",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "transaction_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "customer_name",
        "STRING"
      ],
      [
        "purchase_amount",
        "FLOAT"
      ],
      [
        "amount",
        "FLOAT"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "cloud_server_instances": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "instance_id",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "hostname",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "region",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "hourly_cost_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "monthly_cost",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "ram_gb",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "instance_id",
        "STRING PRIMARY KEY"
      ],
      [
        "hostname",
        "STRING"
      ],
      [
        "region",
        "STRING"
      ],
      [
        "hourly_cost_usd",
        "FLOAT"
      ],
      [
        "monthly_cost",
        "FLOAT"
      ],
      [
        "ram_gb",
        "INT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "cluster_nodes": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "node_id",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "cluster_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "datacenter",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "cpu_cores",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "memory_gb",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "disk_nvme_tb",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "response_ms",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "error_rate_pct",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "is_healthy",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "node_id",
        "STRING PRIMARY KEY"
      ],
      [
        "cluster_name",
        "STRING"
      ],
      [
        "datacenter",
        "STRING"
      ],
      [
        "cpu_cores",
        "INT"
      ],
      [
        "memory_gb",
        "INT"
      ],
      [
        "disk_nvme_tb",
        "FLOAT"
      ],
      [
        "response_ms",
        "INT"
      ],
      [
        "error_rate_pct",
        "FLOAT"
      ],
      [
        "is_healthy",
        "BOOLEAN"
      ]
    ]
  },
  "hardware_assets": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "asset_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "parent_chassis_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "device_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "asset_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "asset_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "serial_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "purchase_cost",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "assigned_to",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "depreciation_year",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "asset_id",
        "INT PRIMARY KEY"
      ],
      [
        "parent_chassis_id",
        "INT"
      ],
      [
        "device_name",
        "STRING"
      ],
      [
        "asset_name",
        "STRING"
      ],
      [
        "asset_type",
        "STRING"
      ],
      [
        "serial_number",
        "STRING"
      ],
      [
        "purchase_cost",
        "FLOAT"
      ],
      [
        "assigned_to",
        "STRING"
      ],
      [
        "depreciation_year",
        "INT"
      ]
    ]
  },
  "servers": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "server_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "hostname",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "rack_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "server_id",
        "INT PRIMARY KEY"
      ],
      [
        "hostname",
        "STRING"
      ],
      [
        "rack_id",
        "INT"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "racks": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "rack_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "rack_label",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "rack_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "datacenter_hall",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "power_kw_capacity",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "max_kw_power",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "rack_id",
        "INT PRIMARY KEY"
      ],
      [
        "rack_label",
        "STRING"
      ],
      [
        "rack_code",
        "STRING"
      ],
      [
        "datacenter_hall",
        "STRING"
      ],
      [
        "power_kw_capacity",
        "FLOAT"
      ],
      [
        "max_kw_power",
        "FLOAT"
      ]
    ]
  },
  "security_access_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "access_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "log_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "role_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "resource_accessed",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "vpn_connected",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "mfa_enabled",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "access_granted",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "access_id",
        "INT PRIMARY KEY"
      ],
      [
        "log_id",
        "INT"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "role_tier",
        "STRING"
      ],
      [
        "resource_accessed",
        "STRING"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "vpn_connected",
        "BOOLEAN"
      ],
      [
        "mfa_enabled",
        "BOOLEAN"
      ],
      [
        "access_granted",
        "BOOLEAN"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "security_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "severity",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "message",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "service_source",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "logged_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "severity",
        "STRING"
      ],
      [
        "message",
        "STRING"
      ],
      [
        "service_source",
        "STRING"
      ],
      [
        "logged_at",
        "STRING"
      ]
    ]
  },
  "application_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "service_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "severity",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "message",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "logged_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "service_name",
        "STRING"
      ],
      [
        "severity",
        "STRING"
      ],
      [
        "message",
        "STRING"
      ],
      [
        "logged_at",
        "STRING"
      ]
    ]
  },
  "auth_service_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "service_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "level",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "action",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "message",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "ip",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "event_time",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "service_name",
        "STRING"
      ],
      [
        "level",
        "STRING"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "action",
        "STRING"
      ],
      [
        "message",
        "STRING"
      ],
      [
        "ip",
        "STRING"
      ],
      [
        "event_time",
        "STRING"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "billing_service_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "service_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "level",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "invoice_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "action",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "message",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "charge_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "event_time",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "service_name",
        "STRING"
      ],
      [
        "level",
        "STRING"
      ],
      [
        "invoice_id",
        "INT"
      ],
      [
        "action",
        "STRING"
      ],
      [
        "message",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "charge_usd",
        "FLOAT"
      ],
      [
        "event_time",
        "STRING"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "web_access_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "request_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "log_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "request_path",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "endpoint_url",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "http_method",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "response_code",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "http_code",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "latency_ms",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "user_agent",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "request_id",
        "INT PRIMARY KEY"
      ],
      [
        "log_id",
        "INT"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "request_path",
        "STRING"
      ],
      [
        "endpoint_url",
        "STRING"
      ],
      [
        "http_method",
        "STRING"
      ],
      [
        "response_code",
        "INT"
      ],
      [
        "http_code",
        "INT"
      ],
      [
        "latency_ms",
        "FLOAT"
      ],
      [
        "user_agent",
        "STRING"
      ]
    ]
  },
  "page_views": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "view_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "page_path",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "session_id",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "view_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "page_path",
        "STRING"
      ],
      [
        "session_id",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "ui_clicks": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "click_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "element_id",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "click_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "element_id",
        "STRING"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "service_health_metrics": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "metric_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "service_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "latency_ms",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "error_rate_pct",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "cpu_util_pct",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "recorded_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "metric_id",
        "INT PRIMARY KEY"
      ],
      [
        "service_name",
        "STRING"
      ],
      [
        "latency_ms",
        "FLOAT"
      ],
      [
        "error_rate_pct",
        "FLOAT"
      ],
      [
        "cpu_util_pct",
        "FLOAT"
      ],
      [
        "recorded_at",
        "STRING"
      ]
    ]
  },
  "system_configuration": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "config_key",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "config_value",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "data_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_modified",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "config_key",
        "STRING PRIMARY KEY"
      ],
      [
        "config_value",
        "STRING"
      ],
      [
        "data_type",
        "STRING"
      ],
      [
        "last_modified",
        "STRING"
      ]
    ]
  },
  "audit_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "action",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "table_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "report_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "notes",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "action",
        "STRING"
      ],
      [
        "table_name",
        "STRING"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "timestamp",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "report_id",
        "INT"
      ],
      [
        "notes",
        "STRING"
      ]
    ]
  },
  "audit_log_history": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "history_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "event_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "action_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "logged_by",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "log_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "event_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "details",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "recorded_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "history_id",
        "INT PRIMARY KEY"
      ],
      [
        "event_id",
        "INT"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "action_name",
        "STRING"
      ],
      [
        "logged_by",
        "STRING"
      ],
      [
        "log_id",
        "INT"
      ],
      [
        "event_type",
        "STRING"
      ],
      [
        "details",
        "STRING"
      ],
      [
        "recorded_at",
        "STRING"
      ]
    ]
  },
  "temp_security_events": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "event_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "log_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "account_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "event_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "source_ip",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "user_agent",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "event_id",
        "INT PRIMARY KEY"
      ],
      [
        "log_id",
        "INT"
      ],
      [
        "account_id",
        "INT"
      ],
      [
        "event_type",
        "STRING"
      ],
      [
        "source_ip",
        "STRING"
      ],
      [
        "user_agent",
        "STRING"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "temporary_import_logs": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "file_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "imported_rows",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "imported_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "file_name",
        "STRING"
      ],
      [
        "imported_rows",
        "INT"
      ],
      [
        "imported_at",
        "STRING"
      ]
    ]
  },
  "system_assets": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "file_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "file_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "file_extension",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "size_kb",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "file_id",
        "INT PRIMARY KEY"
      ],
      [
        "file_name",
        "STRING"
      ],
      [
        "file_extension",
        "STRING"
      ],
      [
        "size_kb",
        "INT"
      ],
      [
        "created_at",
        "STRING"
      ]
    ]
  },
  "support_tickets": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "ticket_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "assigned_agent",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "resolution_min",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "priority",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "created_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "ticket_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "assigned_agent",
        "STRING"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "resolution_min",
        "INT"
      ],
      [
        "priority",
        "STRING"
      ],
      [
        "created_date",
        "STRING"
      ]
    ]
  },
  "project_tasks": {
    "category": "Cloud & Infrastructure",
    "columns": [
      {
        "name": "task_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "title",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "assigned_engineer",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "priority",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "story_points",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sprint",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "due_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "completed_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "task_id",
        "INT PRIMARY KEY"
      ],
      [
        "title",
        "STRING"
      ],
      [
        "assigned_engineer",
        "STRING"
      ],
      [
        "priority",
        "STRING"
      ],
      [
        "story_points",
        "INT"
      ],
      [
        "status",
        "STRING"
      ],
      [
        "sprint",
        "STRING"
      ],
      [
        "due_date",
        "STRING"
      ],
      [
        "completed_at",
        "STRING"
      ]
    ]
  },
  "surgeons": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "surgeon_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "doctor_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "doctor_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "specialty",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "board_certified",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "years_experience",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "hospital_affil",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "surgeon_id",
        "INT PRIMARY KEY"
      ],
      [
        "doctor_id",
        "INT"
      ],
      [
        "doctor_name",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "specialty",
        "STRING"
      ],
      [
        "board_certified",
        "BOOLEAN"
      ],
      [
        "years_experience",
        "INT"
      ],
      [
        "hospital_affil",
        "STRING"
      ]
    ]
  },
  "surgeries": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "surgery_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "surgeon_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "patient_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "patient_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "procedure_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "procedure_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "scheduled_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "duration_min",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "or_room",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "theater_room",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "outcome",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "complications",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "surgery_id",
        "INT PRIMARY KEY"
      ],
      [
        "surgeon_id",
        "INT"
      ],
      [
        "patient_id",
        "INT"
      ],
      [
        "patient_name",
        "STRING"
      ],
      [
        "procedure_code",
        "STRING"
      ],
      [
        "procedure_name",
        "STRING"
      ],
      [
        "scheduled_date",
        "STRING"
      ],
      [
        "duration_min",
        "INT"
      ],
      [
        "or_room",
        "STRING"
      ],
      [
        "theater_room",
        "STRING"
      ],
      [
        "outcome",
        "STRING"
      ],
      [
        "complications",
        "BOOLEAN"
      ]
    ]
  },
  "clinical_discharges": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "discharge_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "record_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "patient_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "patient_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "admit_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "discharge_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "follow_up_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "lab_result_mg",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "discharge_disposition",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "discharge_id",
        "INT PRIMARY KEY"
      ],
      [
        "record_id",
        "INT"
      ],
      [
        "patient_id",
        "INT"
      ],
      [
        "patient_name",
        "STRING"
      ],
      [
        "admit_date",
        "STRING"
      ],
      [
        "discharge_date",
        "STRING"
      ],
      [
        "follow_up_date",
        "STRING"
      ],
      [
        "lab_result_mg",
        "FLOAT"
      ],
      [
        "discharge_disposition",
        "STRING"
      ]
    ]
  },
  "emergency_triage": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "patient_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "patient_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "age",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "acuity_level",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "systolic_bp",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "heart_rate",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "oxygen_sat",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "trauma_flag",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "chief_complaint",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "patient_id",
        "INT PRIMARY KEY"
      ],
      [
        "patient_name",
        "STRING"
      ],
      [
        "age",
        "INT"
      ],
      [
        "acuity_level",
        "INT"
      ],
      [
        "systolic_bp",
        "INT"
      ],
      [
        "heart_rate",
        "INT"
      ],
      [
        "oxygen_sat",
        "INT"
      ],
      [
        "trauma_flag",
        "BOOLEAN"
      ],
      [
        "chief_complaint",
        "STRING"
      ]
    ]
  },
  "pharmacy_dispensations": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "dispense_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "dispensation_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "rx_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "drug_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "medication_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "patient_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "prescriber_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "doctor_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "dosage_mg",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "quantity",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "dispensed_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "dispense_id",
        "INT PRIMARY KEY"
      ],
      [
        "dispensation_id",
        "INT"
      ],
      [
        "rx_number",
        "STRING"
      ],
      [
        "drug_code",
        "STRING"
      ],
      [
        "medication_name",
        "STRING"
      ],
      [
        "patient_id",
        "INT"
      ],
      [
        "prescriber_id",
        "INT"
      ],
      [
        "doctor_id",
        "INT"
      ],
      [
        "dosage_mg",
        "INT"
      ],
      [
        "quantity",
        "INT"
      ],
      [
        "dispensed_at",
        "STRING"
      ]
    ]
  },
  "flight_inventory": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "flight_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "flight_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "departure_airport",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "arrival_airport",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "departure_time",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "seats_available",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "seats_left",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "base_fare_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "fare_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "flight_id",
        "INT PRIMARY KEY"
      ],
      [
        "flight_code",
        "STRING"
      ],
      [
        "departure_airport",
        "STRING"
      ],
      [
        "arrival_airport",
        "STRING"
      ],
      [
        "departure_time",
        "STRING"
      ],
      [
        "seats_available",
        "INT"
      ],
      [
        "seats_left",
        "INT"
      ],
      [
        "base_fare_usd",
        "FLOAT"
      ],
      [
        "fare_usd",
        "FLOAT"
      ]
    ]
  },
  "shipping_manifests": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "manifest_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "container_code",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "carrier_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "courier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "port_of_origin",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "port_of_entry",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "dest_country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "dest_city",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "manifest_id",
        "INT PRIMARY KEY"
      ],
      [
        "container_code",
        "STRING"
      ],
      [
        "carrier_name",
        "STRING"
      ],
      [
        "courier",
        "STRING"
      ],
      [
        "port_of_origin",
        "STRING"
      ],
      [
        "port_of_entry",
        "STRING"
      ],
      [
        "dest_country",
        "STRING"
      ],
      [
        "dest_city",
        "STRING"
      ]
    ]
  },
  "vehicles": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "vehicle_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "vin",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "license_plate",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "make",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "model",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "year",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "mileage",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "vehicle_id",
        "INT PRIMARY KEY"
      ],
      [
        "vin",
        "STRING"
      ],
      [
        "license_plate",
        "STRING"
      ],
      [
        "make",
        "STRING"
      ],
      [
        "model",
        "STRING"
      ],
      [
        "year",
        "INT"
      ],
      [
        "mileage",
        "INT"
      ]
    ]
  },
  "gamer_leaderboards": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "rank_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "player_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "player_tag",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "gamertag",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "match_score",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "elo_rating",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "win_streak",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "matches_won",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "win_rate_pct",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "tier_division",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "region",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "rank_id",
        "INT PRIMARY KEY"
      ],
      [
        "player_id",
        "INT"
      ],
      [
        "player_tag",
        "STRING"
      ],
      [
        "gamertag",
        "STRING"
      ],
      [
        "match_score",
        "INT"
      ],
      [
        "elo_rating",
        "INT"
      ],
      [
        "win_streak",
        "INT"
      ],
      [
        "matches_won",
        "INT"
      ],
      [
        "win_rate_pct",
        "FLOAT"
      ],
      [
        "tier_division",
        "STRING"
      ],
      [
        "region",
        "STRING"
      ]
    ]
  },
  "users": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "role",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "is_active",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "failed_attempts",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "created_at",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_login",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "last_name",
        "STRING"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "role",
        "STRING"
      ],
      [
        "is_active",
        "BOOLEAN"
      ],
      [
        "failed_attempts",
        "INT"
      ],
      [
        "created_at",
        "STRING"
      ],
      [
        "last_login",
        "STRING"
      ]
    ]
  },
  "user_profiles": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "phone_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "bio",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "account_status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "phone_number",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "bio",
        "STRING"
      ],
      [
        "account_status",
        "STRING"
      ]
    ]
  },
  "user_roles": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "role_map_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "role_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "granted_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "role_map_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "role_name",
        "STRING"
      ],
      [
        "granted_at",
        "STRING"
      ]
    ]
  },
  "role_permissions": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "role_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "role_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "permission_mask",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "description",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "role_id",
        "INT PRIMARY KEY"
      ],
      [
        "role_name",
        "STRING"
      ],
      [
        "permission_mask",
        "INT"
      ],
      [
        "description",
        "STRING"
      ]
    ]
  },
  "user_bans": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "ban_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "reason",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "banned_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "ban_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "reason",
        "STRING"
      ],
      [
        "banned_at",
        "STRING"
      ]
    ]
  },
  "user_credentials": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "account_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "password_hash",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "email_verified",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "mfa_enabled",
        "type": "BOOLEAN",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "account_id",
        "INT PRIMARY KEY"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "password_hash",
        "STRING"
      ],
      [
        "email_verified",
        "BOOLEAN"
      ],
      [
        "mfa_enabled",
        "BOOLEAN"
      ]
    ]
  },
  "user_contacts": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "direct_email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "work_email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sms_number",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "billing_contact",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "direct_email",
        "STRING"
      ],
      [
        "work_email",
        "STRING"
      ],
      [
        "sms_number",
        "STRING"
      ],
      [
        "billing_contact",
        "STRING"
      ]
    ]
  },
  "user_memberships": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "tier_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "is_active",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "renewal_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "tier_name",
        "STRING"
      ],
      [
        "is_active",
        "BOOLEAN"
      ],
      [
        "renewal_date",
        "STRING"
      ]
    ]
  },
  "user_sessions": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "session_id",
        "type": "STRING",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "last_active",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "session_id",
        "STRING PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "order_id",
        "INT"
      ],
      [
        "ip_address",
        "STRING"
      ],
      [
        "last_active",
        "STRING"
      ]
    ]
  },
  "user_activity_logs": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "log_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "action",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "duration_sec",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "timestamp",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "log_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "action",
        "STRING"
      ],
      [
        "duration_sec",
        "INT"
      ],
      [
        "timestamp",
        "STRING"
      ]
    ]
  },
  "account_snapshots": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "snapshot_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "account_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "log_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "balance_usd",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "snapshot_id",
        "INT PRIMARY KEY"
      ],
      [
        "account_id",
        "INT"
      ],
      [
        "log_date",
        "STRING"
      ],
      [
        "balance_usd",
        "FLOAT"
      ]
    ]
  },
  "active_subscribers": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "subscriber_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "plan_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "monthly_fee",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "subscriber_id",
        "INT PRIMARY KEY"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "plan_tier",
        "STRING"
      ],
      [
        "monthly_fee",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "active_subscriptions": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "subscription_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "plan_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "mrr",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "subscription_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "plan_name",
        "STRING"
      ],
      [
        "mrr",
        "FLOAT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "api_entitlements": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "entitlement_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "org_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "rate_limit_per_min",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "scope",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "entitlement_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "org_id",
        "INT"
      ],
      [
        "rate_limit_per_min",
        "INT"
      ],
      [
        "scope",
        "STRING"
      ]
    ]
  },
  "community_members": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "user_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "username",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "is_banned",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "reputation",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "joined_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "user_id",
        "INT PRIMARY KEY"
      ],
      [
        "username",
        "STRING"
      ],
      [
        "is_banned",
        "BOOLEAN"
      ],
      [
        "reputation",
        "INT"
      ],
      [
        "joined_date",
        "STRING"
      ]
    ]
  },
  "members": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "membership_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "points_balance",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "status",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "name",
        "STRING"
      ],
      [
        "membership_tier",
        "STRING"
      ],
      [
        "points_balance",
        "INT"
      ],
      [
        "status",
        "STRING"
      ]
    ]
  },
  "newsletter_signups": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "signup_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "email",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "first_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "source",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "signed_up_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "signup_id",
        "INT PRIMARY KEY"
      ],
      [
        "email",
        "STRING"
      ],
      [
        "first_name",
        "STRING"
      ],
      [
        "source",
        "STRING"
      ],
      [
        "signed_up_at",
        "STRING"
      ]
    ]
  },
  "organizations": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "org_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "org_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "plan_type",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "billing_tier",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "is_active",
        "type": "BOOLEAN",
        "isPk": false
      },
      {
        "name": "seat_count",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "org_id",
        "INT PRIMARY KEY"
      ],
      [
        "org_name",
        "STRING"
      ],
      [
        "plan_type",
        "STRING"
      ],
      [
        "billing_tier",
        "STRING"
      ],
      [
        "is_active",
        "BOOLEAN"
      ],
      [
        "seat_count",
        "INT"
      ]
    ]
  },
  "retail_outlets": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "store_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "store_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "city",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "manager_name",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "store_id",
        "INT PRIMARY KEY"
      ],
      [
        "store_name",
        "STRING"
      ],
      [
        "city",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "manager_name",
        "STRING"
      ]
    ]
  },
  "sales_records": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "record_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "department",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "sales_rep",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "recorded_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "record_id",
        "INT PRIMARY KEY"
      ],
      [
        "department",
        "STRING"
      ],
      [
        "sales_rep",
        "STRING"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "recorded_at",
        "STRING"
      ]
    ]
  },
  "suspended_accounts": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "company_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "suspension_reason",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "suspended_at",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "customer_id",
        "INT PRIMARY KEY"
      ],
      [
        "company_name",
        "STRING"
      ],
      [
        "suspension_reason",
        "STRING"
      ],
      [
        "suspended_at",
        "STRING"
      ]
    ]
  },
  "high_value_contracts": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "contract_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "contract_value",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "start_date",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "renewal_year",
        "type": "INT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "contract_id",
        "INT PRIMARY KEY"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "contract_value",
        "FLOAT"
      ],
      [
        "start_date",
        "STRING"
      ],
      [
        "renewal_year",
        "INT"
      ]
    ]
  },
  "high_value_orders_snapshot": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "snapshot_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "order_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "order_total",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "snapshot_date",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "snapshot_id",
        "INT PRIMARY KEY"
      ],
      [
        "order_id",
        "INT"
      ],
      [
        "customer_id",
        "INT"
      ],
      [
        "order_total",
        "FLOAT"
      ],
      [
        "snapshot_date",
        "STRING"
      ]
    ]
  },
  "inactive_sessions": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "session_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "user_id",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "last_login",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "ip_address",
        "type": "STRING",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "session_id",
        "INT PRIMARY KEY"
      ],
      [
        "user_id",
        "INT"
      ],
      [
        "last_login",
        "STRING"
      ],
      [
        "ip_address",
        "STRING"
      ]
    ]
  },
  "international_clients": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "client_id",
        "type": "INT",
        "isPk": true
      },
      {
        "name": "client_name",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "country",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "annual_revenue_usd",
        "type": "FLOAT",
        "isPk": false
      },
      {
        "name": "contract_value",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "client_id",
        "INT PRIMARY KEY"
      ],
      [
        "client_name",
        "STRING"
      ],
      [
        "country",
        "STRING"
      ],
      [
        "annual_revenue_usd",
        "FLOAT"
      ],
      [
        "contract_value",
        "FLOAT"
      ]
    ]
  },
  "table_name": {
    "category": "Healthcare & Specialized",
    "columns": [
      {
        "name": "column1",
        "type": "STRING",
        "isPk": false
      },
      {
        "name": "column2",
        "type": "INT",
        "isPk": false
      },
      {
        "name": "column3",
        "type": "FLOAT",
        "isPk": false
      }
    ],
    "columnDefs": [
      [
        "column1",
        "STRING"
      ],
      [
        "column2",
        "INT"
      ],
      [
        "column3",
        "FLOAT"
      ]
    ]
  }
};

// Create global singleton instance
window.edmithSql = new EdmithSqlEngine();
