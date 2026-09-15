/**
 * EDMITH SQL Engine
 * High-performance, zero-latency in-browser Relational SQL Database powered by AlaSQL.
 * Runs 100% locally and synchronously with zero external network downloads.
 * Pre-loaded with complete 150+ Enterprise Relational Database Tables.
 */

class EdmithSqlEngine {
    constructor() {
        this.isInitialized = false;
        this.engineType = 'AlaSQL In-Memory Engine';
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
     * Initializes the relational database and seeds all 150+ enterprise tables
     */
    init() {
        if (this.isInitialized) return true;

        if (typeof alasql === 'undefined') {
            console.warn('[EDMITH SQL Engine] AlaSQL not found, initializing in-memory fallback.');
            this.initFallbackEngine();
            this.engineType = 'In-Memory Client Engine';
            this.isInitialized = true;
            return true;
        }

        try {
            alasql.options.errorlog = false;
            this.seedDatabase();
            this.isInitialized = true;
            this.engineType = 'AlaSQL v4.2 Engine (150+ Tables Ready)';
            return true;
        } catch (err) {
            console.error('[EDMITH SQL Engine] Failed to seed database:', err);
            this.initFallbackEngine();
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * Seeds all 150+ enterprise relational database tables with rich sample records
     */
    seedDatabase() {
        if (typeof alasql === 'undefined') return;

        const startTime = performance.now();
        const schema = this.schemaData;

        for (const [tblName, meta] of Object.entries(schema)) {
            try {
                alasql(`DROP TABLE IF EXISTS ${tblName}`);
            } catch (e) {}

            // Build CREATE TABLE statement
            const colDefs = meta.columnDefs.map(([cname, ctype]) => `${cname} ${ctype}`).join(', ');
            try {
                alasql(`CREATE TABLE ${tblName} (${colDefs})`);
            } catch (e) {
                console.error(`Error creating table ${tblName}:`, e);
                continue;
            }

            // Insert rows in batch
            if (meta.rows && meta.rows.length > 0) {
                const colNames = meta.columnDefs.map(([cname]) => cname).join(', ');
                for (const row of meta.rows) {
                    const formatted = row.map(val => {
                        if (val === null || val === undefined) return 'NULL';
                        if (typeof val === 'number') return String(val);
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        const escaped = String(val).replace(/'/g, "''");
                        return `'${escaped}'`;
                    }).join(', ');
                    try {
                        alasql(`INSERT INTO ${tblName} (${colNames}) VALUES (${formatted})`);
                    } catch (e) {
                        console.warn(`Error inserting row into ${tblName}:`, e);
                    }
                }
            }
        }

        const elapsed = (performance.now() - startTime).toFixed(1);
        console.log(`[EDMITH SQL Engine] Seeded ${Object.keys(schema).length} tables in ${elapsed}ms.`);
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
            let currentCount = meta.rows ? meta.rows.length : 0;
            if (typeof alasql !== 'undefined' && alasql.tables && alasql.tables[tblName] && Array.isArray(alasql.tables[tblName].data)) {
                currentCount = alasql.tables[tblName].data.length;
            }
            result.push({
                name: tblName,
                tableName: tblName,
                category: meta.category,
                rowCount: currentCount,
                columns: meta.columns
            });
        }
        return result;
    }

    /**
     * Executes an arbitrary SQL statement and returns formatted structured results
     */
    runQuery(sqlText) {
        if (!sqlText || !sqlText.trim()) {
            throw new Error('Please enter an SQL query to execute.');
        }

        const cleaned = this.cleanSql(sqlText);
        if (!cleaned) {
            throw new Error('Query contains only comments. Please enter an executable SQL statement.');
        }

        // Strict leading verb validation
        const validSqlVerbs = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|SHOW|DESCRIBE|EXPLAIN|TRUNCATE)\b/i;
        if (!validSqlVerbs.test(cleaned)) {
            const firstWord = cleaned.split(/\s+/)[0] || 'statement';
            throw new Error(`Syntax Error: Unknown or unsupported SQL command '${firstWord}'. Query must begin with SELECT, INSERT, UPDATE, DELETE, etc.`);
        }

        const startTime = performance.now();

        if (typeof alasql !== 'undefined') {
            try {
                alasql.options.errorlog = false;
                const res = alasql(cleaned);

                if (alasql.error) {
                    const err = alasql.error;
                    alasql.error = null;
                    throw err;
                }

                if (res === undefined) {
                    throw new Error('SQL Execution failed: Query returned undefined without result set.');
                }

                const executionTimeMs = Math.round(performance.now() - startTime);

                // SELECT query returning array of objects
                if (Array.isArray(res)) {
                    const columns = res.length > 0 ? Object.keys(res[0]) : [];
                    const values = res.map(row => columns.map(col => row[col]));
                    
                    this.recordHistory(sqlText, true, executionTimeMs);
                    return {
                        columns,
                        values,
                        executionTimeMs,
                        affectedRows: res.length,
                        isSelect: true
                    };
                }

                // DDL or DML (INSERT, UPDATE, DELETE, CREATE, DROP)
                const affectedRows = typeof res === 'number' ? res : 1;
                this.recordHistory(sqlText, true, executionTimeMs);
                return {
                    columns: ['Status', 'Message', 'Rows Affected'],
                    values: [['Success', 'Query executed successfully.', affectedRows]],
                    executionTimeMs,
                    affectedRows,
                    isSelect: false
                };
            } catch (err) {
                const executionTimeMs = Math.round(performance.now() - startTime);
                this.recordHistory(sqlText, false, executionTimeMs);
                throw new Error(this.formatErrorMessage(err, cleaned));
            }
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

    initFallbackEngine() {
        this.tableNames = ['students', 'courses', 'departments', 'employees'];
    }
}

// Complete 150+ Enterprise Database Schema and Seed Data
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
    ],
    "rows": [
      [
        101,
        "Computer Science",
        "Turing Hall",
        1450000.0,
        "Dr. Alan Turing"
      ],
      [
        102,
        "Data Science & AI",
        "Ada Lovelace Wing",
        1200000.0,
        "Dr. Andrew Ng"
      ],
      [
        103,
        "Information Systems",
        "Shannon Center",
        850000.0,
        "Dr. Claude Shannon"
      ],
      [
        104,
        "Software Engineering",
        "Hopper Tower",
        980000.0,
        "Dr. Grace Hopper"
      ],
      [
        105,
        "Cybersecurity",
        "Diffie Complex",
        920000.0,
        "Dr. Whitfield Diffie"
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
    ],
    "rows": [
      [
        1,
        "Alex",
        "Morgan",
        "alex.morgan@edmith.edu",
        101,
        3.85,
        2022,
        "Active"
      ],
      [
        2,
        "Sophia",
        "Chen",
        "sophia.chen@edmith.edu",
        101,
        3.95,
        2021,
        "Active"
      ],
      [
        3,
        "Marcus",
        "Vance",
        "marcus.v@edmith.edu",
        102,
        3.42,
        2023,
        "Active"
      ],
      [
        4,
        "Elena",
        "Rostova",
        "elena.r@edmith.edu",
        102,
        3.88,
        2022,
        "Active"
      ],
      [
        5,
        "Liam",
        "O'Connor",
        "liam.oc@edmith.edu",
        103,
        2.95,
        2021,
        "Probation"
      ],
      [
        6,
        "Priya",
        "Sharma",
        "priya.s@edmith.edu",
        101,
        3.75,
        2023,
        "Active"
      ],
      [
        7,
        "David",
        "Kim",
        "david.kim@edmith.edu",
        104,
        3.6,
        2022,
        "Active"
      ],
      [
        8,
        "Amara",
        "Okafor",
        "amara.o@edmith.edu",
        105,
        3.9,
        2021,
        "Active"
      ],
      [
        9,
        "Lucas",
        "Silva",
        "lucas.silva@edmith.edu",
        104,
        3.15,
        2023,
        "Active"
      ],
      [
        10,
        "Zoe",
        "Kovacs",
        "zoe.k@edmith.edu",
        null,
        3.5,
        2024,
        "Enrolled"
      ],
      [
        11,
        "Ethan",
        "Hunt",
        "ethan.h@edmith.edu",
        105,
        3.3,
        2022,
        "Active"
      ],
      [
        12,
        "Maya",
        "Lin",
        "maya.lin@edmith.edu",
        102,
        4.0,
        2021,
        "Active"
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
    ],
    "rows": [
      [
        201,
        "CS101",
        "Intro to Algorithms & Structures",
        101,
        4,
        60
      ],
      [
        202,
        "CS204",
        "Relational Database Architecture",
        101,
        3,
        45
      ],
      [
        203,
        "DS301",
        "Machine Learning Foundations",
        102,
        4,
        40
      ],
      [
        204,
        "DS305",
        "Big Data Engineering & Spark",
        102,
        3,
        35
      ],
      [
        205,
        "SE202",
        "Full-Stack Web Architecture",
        104,
        3,
        50
      ],
      [
        206,
        "SE401",
        "Cloud Microservices & DevOps",
        104,
        4,
        30
      ],
      [
        207,
        "SEC101",
        "Applied Cryptography & Security",
        105,
        3,
        40
      ],
      [
        208,
        "IS205",
        "Enterprise Systems & Analytics",
        103,
        3,
        55
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
    ],
    "rows": [
      [
        1,
        1,
        201,
        "Fall 2023",
        "A",
        96.5
      ],
      [
        2,
        1,
        202,
        "Fall 2023",
        "A-",
        94.0
      ],
      [
        3,
        2,
        201,
        "Fall 2023",
        "A+",
        99.0
      ],
      [
        4,
        2,
        203,
        "Spring 2024",
        "A",
        98.0
      ],
      [
        5,
        3,
        203,
        "Fall 2023",
        "B+",
        88.5
      ],
      [
        6,
        3,
        204,
        "Spring 2024",
        "B",
        85.0
      ],
      [
        7,
        4,
        203,
        "Fall 2023",
        "A",
        95.0
      ],
      [
        8,
        4,
        204,
        "Spring 2024",
        "A-",
        92.5
      ],
      [
        9,
        5,
        208,
        "Fall 2023",
        "C+",
        76.0
      ],
      [
        10,
        6,
        201,
        "Spring 2024",
        "A-",
        91.0
      ],
      [
        11,
        7,
        205,
        "Fall 2023",
        "B+",
        89.0
      ],
      [
        12,
        7,
        206,
        "Spring 2024",
        "A",
        94.0
      ],
      [
        13,
        8,
        207,
        "Fall 2023",
        "A",
        97.5
      ],
      [
        14,
        9,
        205,
        "Spring 2024",
        "B",
        83.0
      ],
      [
        15,
        11,
        207,
        "Fall 2023",
        "B+",
        87.0
      ],
      [
        16,
        12,
        203,
        "Fall 2023",
        "A+",
        100.0
      ],
      [
        17,
        12,
        204,
        "Spring 2024",
        "A+",
        99.5
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
    ],
    "rows": [
      [
        1,
        1,
        "PostgreSQL Certified Professional",
        "PostgreSQL Org",
        "2023-08-15",
        94.5
      ],
      [
        2,
        1,
        "AWS Certified Solutions Architect",
        "Amazon Web Services",
        "2024-01-10",
        89.0
      ],
      [
        3,
        2,
        "Oracle Certified Professional: SQL",
        "Oracle University",
        "2023-06-20",
        98.0
      ],
      [
        4,
        2,
        "Google Cloud Professional Data Engineer",
        "Google Cloud",
        "2023-11-12",
        95.0
      ],
      [
        5,
        4,
        "TensorFlow Developer Certificate",
        "Google",
        "2023-09-05",
        92.5
      ],
      [
        6,
        7,
        "Certified Kubernetes Administrator",
        "Linux Foundation",
        "2024-02-18",
        88.0
      ],
      [
        7,
        8,
        "Certified Ethical Hacker (CEH)",
        "EC-Council",
        "2023-10-30",
        96.0
      ],
      [
        8,
        8,
        "CompTIA Security+",
        "CompTIA",
        "2023-04-14",
        91.5
      ],
      [
        9,
        12,
        "Databricks Certified Spark Developer",
        "Databricks",
        "2023-12-01",
        99.0
      ],
      [
        10,
        12,
        "Azure Data Scientist Associate",
        "Microsoft",
        "2024-03-02",
        97.0
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
    ],
    "rows": [
      [
        1,
        1,
        201,
        "Midterm Algorithms",
        94.5,
        70.0,
        "2023-10-15"
      ],
      [
        2,
        2,
        201,
        "Midterm Algorithms",
        98.0,
        70.0,
        "2023-10-15"
      ],
      [
        3,
        3,
        203,
        "Midterm Machine Learning",
        68.5,
        70.0,
        "2023-10-18"
      ],
      [
        4,
        4,
        203,
        "Midterm Machine Learning",
        91.0,
        70.0,
        "2023-10-18"
      ],
      [
        5,
        5,
        208,
        "Midterm Enterprise Systems",
        55.0,
        70.0,
        "2023-10-20"
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
    ],
    "rows": [
      [
        1001,
        1001,
        "Sarah",
        "Connor",
        "Sarah Connor",
        "Sarah Connor",
        "sarah.c@edmith.com",
        "Chief Technology Officer",
        "Executive",
        1,
        225000.0,
        null,
        "2019-03-15",
        "Active"
      ],
      [
        1002,
        1002,
        "David",
        "Miller",
        "David Miller",
        "David Miller",
        "david.m@edmith.com",
        "Lead Data Architect",
        "Engineering",
        2,
        165000.0,
        1001,
        "2020-06-01",
        "Active"
      ],
      [
        1003,
        1003,
        "Rebecca",
        "Hall",
        "Rebecca Hall",
        "Rebecca Hall",
        "rebecca.h@edmith.com",
        "Principal Software Engineer",
        "Engineering",
        2,
        158000.0,
        1001,
        "2020-08-15",
        "Active"
      ],
      [
        1004,
        1004,
        "Jason",
        "Bourne",
        "Jason Bourne",
        "Jason Bourne",
        "jason.b@edmith.com",
        "Senior Database Administrator",
        "Infrastructure",
        3,
        135000.0,
        1002,
        "2021-02-10",
        "Active"
      ],
      [
        1005,
        1005,
        "Amita",
        "Patel",
        "Amita Patel",
        "Amita Patel",
        "amita.p@edmith.com",
        "Senior ETL Developer",
        "Engineering",
        2,
        128000.0,
        1002,
        "2021-05-18",
        "Active"
      ],
      [
        1006,
        1006,
        "Carlos",
        "Mendes",
        "Carlos Mendes",
        "Carlos Mendes",
        "carlos.m@edmith.com",
        "Full-Stack Engineer",
        "Engineering",
        2,
        112000.0,
        1003,
        "2022-01-20",
        "Active"
      ],
      [
        1007,
        1007,
        "Emily",
        "Watson",
        "Emily Watson",
        "Emily Watson",
        "emily.w@edmith.com",
        "Security Operations Analyst",
        "Infrastructure",
        3,
        105000.0,
        1004,
        "2022-07-11",
        "Active"
      ],
      [
        1008,
        1008,
        "Kevin",
        "Hart",
        "Kevin Hart",
        "Kevin Hart",
        "kevin.h@edmith.com",
        "Junior SQL Developer",
        "Engineering",
        2,
        85000.0,
        1005,
        "2023-03-01",
        "Active"
      ],
      [
        1009,
        1009,
        "Priya",
        "Nair",
        "Priya Nair",
        "Priya Nair",
        "priya.n@edmith.com",
        "Data Analyst",
        "Analytics",
        4,
        92000.0,
        1002,
        "2022-11-15",
        "Active"
      ],
      [
        1010,
        1010,
        "Tariq",
        "Mansoor",
        "Tariq Mansoor",
        "Tariq Mansoor",
        "tariq.m@edmith.com",
        "Cloud Infrastructure Engineer",
        "Infrastructure",
        3,
        118000.0,
        1004,
        "2021-09-01",
        "Active"
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
    ],
    "rows": [
      [
        101,
        "Alex",
        "Rivera",
        "alex.rivera@company.com",
        "Engineering",
        101,
        142000.0,
        "San Francisco",
        "2021-03-15"
      ],
      [
        102,
        "Sarah",
        "Chen",
        "sarah.chen@company.com",
        "Engineering",
        101,
        138000.0,
        "New York",
        "2021-08-01"
      ],
      [
        103,
        "Marcus",
        "Vance",
        "marcus.vance@company.com",
        "Analytics",
        102,
        115000.0,
        "Chicago",
        "2022-02-10"
      ],
      [
        104,
        "Elena",
        "Rostova",
        "elena.rostova@company.com",
        "Analytics",
        102,
        122000.0,
        "Boston",
        "2022-06-20"
      ],
      [
        105,
        "David",
        "Kim",
        "david.kim@company.com",
        "Infrastructure",
        103,
        128000.0,
        "Seattle",
        "2020-11-15"
      ],
      [
        106,
        "Priya",
        "Sharma",
        "priya.sharma@company.com",
        "Engineering",
        101,
        148000.0,
        "Austin",
        "2020-04-10"
      ],
      [
        107,
        "Liam",
        "O'Connor",
        "liam.oc@company.com",
        "Support",
        104,
        82000.0,
        "Denver",
        "2023-01-05"
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
    ],
    "rows": [
      [
        101,
        "Sarah",
        "Sarah Connor",
        "Engineering",
        135000.0,
        "2021-04-10",
        "Full-Time"
      ],
      [
        102,
        "David",
        "David Miller",
        "Engineering",
        142000.0,
        "2022-01-15",
        "Full-Time"
      ],
      [
        103,
        "Elena",
        "Elena Rostova",
        "Analytics",
        118000.0,
        "2022-09-01",
        "Full-Time"
      ],
      [
        104,
        "Marcus",
        "Marcus Vance",
        "Security",
        125000.0,
        "2023-03-12",
        "Full-Time"
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
    ],
    "rows": [
      [
        501,
        "Alex Rivera",
        "Alex",
        "Apex Staffing",
        "Engineering",
        95.0,
        "Active"
      ],
      [
        502,
        "Nina Patel",
        "Nina",
        "TechTalent Inc",
        "Infrastructure",
        110.0,
        "Active"
      ],
      [
        503,
        "James Chen",
        "James",
        "Global Resources",
        "Engineering",
        85.0,
        "Active"
      ],
      [
        504,
        "Maria Gomez",
        "Maria",
        "Apex Staffing",
        "Analytics",
        90.0,
        "Active"
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
    ],
    "rows": [
      [
        101,
        "Arthur",
        "Dent",
        "Logistics",
        65000.0,
        "2022-04-01"
      ],
      [
        102,
        "Ford",
        "Prefect",
        "Research",
        85000.0,
        "2021-08-15"
      ],
      [
        103,
        "Trillian",
        "Astra",
        "Engineering",
        120000.0,
        "2020-02-10"
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
    ],
    "rows": [
      [
        1,
        1001,
        1001,
        "Sarah Connor",
        "Sarah",
        "Executive",
        225000.0,
        225000.0,
        45000.0,
        "2026-02"
      ],
      [
        2,
        1002,
        1002,
        "David Miller",
        "David",
        "Engineering",
        165000.0,
        165000.0,
        25000.0,
        "2026-02"
      ],
      [
        3,
        1003,
        1003,
        "Rebecca Hall",
        "Rebecca",
        "Engineering",
        158000.0,
        158000.0,
        22000.0,
        "2026-02"
      ],
      [
        4,
        1004,
        1004,
        "Jason Bourne",
        "Jason",
        "Infrastructure",
        135000.0,
        135000.0,
        15000.0,
        "2026-02"
      ],
      [
        5,
        1005,
        1005,
        "Amita Patel",
        "Amita",
        "Engineering",
        128000.0,
        128000.0,
        14000.0,
        "2026-02"
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
    ],
    "rows": [
      [
        1,
        1001,
        18750.0,
        3000.0,
        21750.0,
        "2026-02"
      ],
      [
        2,
        1002,
        13750.0,
        1500.0,
        15250.0,
        "2026-02"
      ],
      [
        3,
        1003,
        13166.0,
        1200.0,
        14366.0,
        "2026-02"
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
    ],
    "rows": [
      [
        1,
        1001,
        1001,
        "Sarah Connor",
        "Executive",
        225000.0,
        4.9,
        "2019-03-15",
        150000.0,
        45000.0,
        "2024-01-01"
      ],
      [
        2,
        1002,
        1002,
        "David Miller",
        "Engineering",
        165000.0,
        4.8,
        "2020-06-01",
        80000.0,
        25000.0,
        "2024-01-01"
      ],
      [
        3,
        1003,
        1003,
        "Rebecca Hall",
        "Engineering",
        158000.0,
        4.7,
        "2020-08-15",
        75000.0,
        22000.0,
        "2024-01-01"
      ],
      [
        4,
        1004,
        1004,
        "Jason Bourne",
        "Infrastructure",
        135000.0,
        4.5,
        "2021-02-10",
        40000.0,
        15000.0,
        "2024-01-01"
      ],
      [
        5,
        1005,
        1005,
        "Amita Patel",
        "Engineering",
        128000.0,
        4.6,
        "2021-05-18",
        35000.0,
        14000.0,
        "2024-01-01"
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
    ],
    "rows": [
      [
        1,
        1001,
        1001,
        "Sarah",
        "Connor",
        "Executive",
        225000.0,
        225000.0,
        108.17,
        45000.0,
        "2026-02-28"
      ],
      [
        2,
        1002,
        1002,
        "David",
        "Miller",
        "Engineering",
        165000.0,
        165000.0,
        79.33,
        25000.0,
        "2026-02-28"
      ],
      [
        3,
        1003,
        1003,
        "Rebecca",
        "Hall",
        "Engineering",
        158000.0,
        158000.0,
        75.96,
        22000.0,
        "2026-02-28"
      ],
      [
        4,
        1004,
        1004,
        "Jason",
        "Bourne",
        "Infrastructure",
        135000.0,
        135000.0,
        64.9,
        15000.0,
        "2026-02-28"
      ],
      [
        5,
        1005,
        1005,
        "Amita",
        "Patel",
        "Engineering",
        128000.0,
        128000.0,
        61.54,
        14000.0,
        "2026-02-28"
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
    ],
    "rows": [
      [
        1,
        "Alan",
        "Turing",
        "alan.turing@edmith.com",
        "x4101"
      ],
      [
        2,
        "Ada",
        "Lovelace",
        "ada.lovelace@edmith.com",
        "x4102"
      ],
      [
        3,
        "Grace",
        "Hopper",
        "grace.hopper@edmith.com",
        "x4103"
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
    ],
    "rows": [
      [
        101,
        "Computer Science",
        24.5,
        50
      ],
      [
        102,
        "Data Science & AI",
        42.0,
        45
      ],
      [
        105,
        "Cybersecurity",
        35.8,
        30
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
    ],
    "rows": [
      [
        101,
        101,
        "Apex Corp Solutions",
        "Apex Corp Solutions",
        "Apex Corp Solutions",
        "Apex Corp Solutions",
        "Sarah Connor",
        "sarah@apex.com",
        "Enterprise",
        "+1-555-0101",
        "San Jose",
        "USA",
        "2022-03-15",
        50000.0,
        "Active"
      ],
      [
        102,
        102,
        "Vanguard Tech",
        "Vanguard Tech",
        "Vanguard Tech",
        "Vanguard Tech",
        "David Miller",
        "david@vanguard.com",
        "Enterprise",
        "+49-89-123456",
        "Munich",
        "Germany",
        "2021-08-20",
        75000.0,
        "Active"
      ],
      [
        103,
        103,
        "Nippon Systems",
        "Nippon Systems",
        "Nippon Systems",
        "Nippon Systems",
        "Kenji Sato",
        "kenji@nippon.com",
        "Standard",
        "+81-3-555-0199",
        "Tokyo",
        "Japan",
        "2023-01-10",
        40000.0,
        "Active"
      ],
      [
        104,
        104,
        "Helios Quantum",
        "Helios Quantum",
        "Helios Quantum",
        "Helios Quantum",
        "Elena Rostova",
        "elena@helios.com",
        "Enterprise",
        "+44-20-123456",
        "London",
        "UK",
        "2022-11-05",
        60000.0,
        "Active"
      ],
      [
        105,
        105,
        "Cyberdyne Global",
        "Cyberdyne Global",
        "Cyberdyne Global",
        "Cyberdyne Global",
        "Marcus Vance",
        "marcus@cyberdyne.com",
        "Standard",
        "+1-555-0105",
        "Austin",
        "USA",
        "2023-05-12",
        30000.0,
        "Active"
      ],
      [
        106,
        106,
        "Nordic Telecomm",
        "Nordic Telecomm",
        "Nordic Telecomm",
        "Nordic Telecomm",
        "Freja Lind",
        "freja@nordic.se",
        "Enterprise",
        "+46-8-555-012",
        "Stockholm",
        "Sweden",
        "2021-04-18",
        90000.0,
        "Active"
      ],
      [
        107,
        107,
        "Swiss Private Bank",
        "Swiss Private Bank",
        "Swiss Private Bank",
        "Swiss Private Bank",
        "Lucas Weber",
        "lucas@swissbank.ch",
        "Enterprise",
        "+41-44-555-018",
        "Zurich",
        "Switzerland",
        "2020-09-25",
        120000.0,
        "Active"
      ],
      [
        108,
        108,
        "BlueSky Media",
        "BlueSky Media",
        "BlueSky Media",
        "BlueSky Media",
        "Amara Okafor",
        "amara@bluesky.com",
        "Standard",
        "+234-1-555-019",
        "Lagos",
        "Nigeria",
        "2023-09-01",
        35000.0,
        "Active"
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
    ],
    "rows": [
      [
        101,
        "Arthur Pendelton",
        "Arthur Pendelton",
        "arthur.p@corp.com",
        450,
        1420.0,
        "Active",
        "2023-01-15"
      ],
      [
        102,
        "David Miller",
        "David Miller",
        "david.m@corp.com",
        820,
        3500.0,
        "Active",
        "2022-05-20"
      ],
      [
        103,
        "Elena Rostova",
        "Elena Rostova",
        "elena.r@corp.com",
        1200,
        890.0,
        "Active",
        "2021-11-10"
      ],
      [
        104,
        "Marcus Vance",
        "Marcus Vance",
        "marcus.v@corp.com",
        150,
        0.0,
        "Active",
        "2023-08-01"
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
    ],
    "rows": [
      [
        1,
        101,
        "Apex Corp",
        "2026-03-01",
        1450.0,
        "Delivered",
        "Delivered"
      ],
      [
        2,
        102,
        "Vanguard Tech",
        "2026-03-01",
        890.0,
        "Shipped",
        "Shipped"
      ],
      [
        3,
        103,
        "Nippon Systems",
        "2026-03-02",
        2300.0,
        "Processing",
        "Processing"
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
    ],
    "rows": [
      [
        101,
        "Alex",
        "Morgan",
        "alex@apex.com",
        "+1-555-0101",
        "+1-555-0101",
        "+1-555-0102",
        null,
        "San Jose",
        "USA"
      ],
      [
        102,
        "Sophia",
        "Chen",
        "sophia@vanguard.com",
        "+49-89-123456",
        null,
        "+49-89-123456",
        null,
        "Munich",
        "Germany"
      ],
      [
        103,
        "Kenji",
        "Sato",
        "kenji@nippon.com",
        null,
        null,
        null,
        "+81-3-555-0199",
        "Tokyo",
        "Japan"
      ],
      [
        104,
        "Elena",
        "Rostova",
        "elena@russtech.io",
        "+44-20-7946-0950",
        "+44-20-7946-0950",
        null,
        null,
        "London",
        "UK"
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
    ],
    "rows": [
      [
        1,
        101,
        "Apex Corp Solutions",
        142000.0,
        "24/7 Dedicated",
        0.05,
        142000.0,
        1,
        9,
        "2026-03-10",
        "Enterprise Tier 1",
        "2026-03-10"
      ],
      [
        2,
        102,
        "Vanguard Tech",
        98000.0,
        "Priority Business",
        0.12,
        98000.0,
        3,
        8,
        "2026-03-12",
        "Enterprise Tier 2",
        "2026-03-12"
      ],
      [
        3,
        103,
        "Nippon Systems",
        210000.0,
        "24/7 Dedicated",
        0.02,
        210000.0,
        0,
        10,
        "2026-03-14",
        "Enterprise Tier 1",
        "2026-03-14"
      ],
      [
        4,
        104,
        "Helios Quantum",
        34000.0,
        "Standard Business",
        0.45,
        34000.0,
        7,
        5,
        "2026-02-28",
        "Mid-Market",
        "2026-03-01"
      ],
      [
        5,
        105,
        "Cyberdyne Global",
        12000.0,
        "Community",
        0.88,
        12000.0,
        12,
        3,
        "2026-01-15",
        "At-Risk",
        "2026-03-05"
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
    ],
    "rows": [
      [
        1,
        101,
        "Quantum Server",
        4200.0
      ],
      [
        2,
        101,
        "Firewall License",
        1250.0
      ],
      [
        3,
        102,
        "4K Monitor Array",
        2550.0
      ],
      [
        4,
        103,
        "Mechanical Keyboards Batch",
        890.0
      ],
      [
        5,
        104,
        "Optic Transceivers Pack",
        3400.0
      ],
      [
        6,
        101,
        "Extended Warranty Care",
        750.0
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
    ],
    "rows": [
      [
        1,
        101,
        "alex@apex.com",
        "VERIFIED",
        "192.168.1.10",
        "EDMITH2026",
        "2026-01-10"
      ],
      [
        2,
        102,
        "sophia@vanguard.com",
        "VERIFIED",
        "192.168.1.15",
        "DIRECT",
        "2026-01-12"
      ],
      [
        3,
        103,
        "test_bot@dummy.io",
        "SUSPENDED",
        "45.33.32.156",
        "SPAM",
        "2026-02-01"
      ],
      [
        4,
        104,
        "kenji@nippon.com",
        "VERIFIED",
        "192.168.1.20",
        "PARTNER_JP",
        "2026-02-14"
      ],
      [
        5,
        105,
        "fraud_check@temp.xyz",
        "FLAGGED",
        "185.220.101.5",
        "UNKNOWN",
        "2026-02-20"
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
    ],
    "rows": [
      [
        1,
        101,
        "sarah@apex.com",
        "Enterprise Cloud Ultra",
        "Enterprise",
        2499.0,
        false,
        "2026-04-01"
      ],
      [
        2,
        102,
        "david@vanguard.com",
        "Business Scale Pro",
        "Business",
        999.0,
        false,
        "2026-04-15"
      ],
      [
        3,
        103,
        "kenji@nippon.com",
        "Enterprise Cloud Ultra",
        "Enterprise",
        2499.0,
        false,
        "2026-05-01"
      ],
      [
        4,
        104,
        "tester@test.com",
        "Startup Acceleration",
        "Startup",
        299.0,
        true,
        "2026-03-25"
      ],
      [
        5,
        105,
        "dev@test.com",
        "Developer Essential",
        "Starter",
        99.0,
        true,
        "2026-04-10"
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
    ],
    "rows": [
      [
        1,
        101,
        "Black Diamond",
        1250000.0,
        "Sarah Connor"
      ],
      [
        2,
        102,
        "Platinum",
        850000.0,
        "David Miller"
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
    ],
    "rows": [
      [
        101,
        "Apex Corp",
        "Apex Corp",
        "apex@apex.com",
        "Enterprise",
        14500.0,
        "2026-01-01"
      ],
      [
        102,
        102,
        "Vanguard Tech",
        "Vanguard Tech",
        "vanguard@tech.com",
        "Premium",
        8900.0,
        "2026-01-01"
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
    ],
    "rows": [
      [
        1,
        101,
        "100 Silicon Way",
        "San Jose",
        "CA",
        "USA",
        "95112"
      ],
      [
        2,
        102,
        "45 Leopoldstrasse",
        "Munich",
        "Bavaria",
        "Germany",
        "80802"
      ],
      [
        3,
        103,
        "12 Roppongi Hills",
        "Tokyo",
        "Tokyo",
        "Japan",
        "106-6108"
      ],
      [
        4,
        104,
        "221B Baker St",
        "London",
        "London",
        "UK",
        "NW1 6XE"
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
    ],
    "rows": [
      [
        101,
        101,
        "Apex Global",
        "Apex Global",
        "USA",
        "Enterprise"
      ],
      [
        102,
        102,
        "Vanguard Tech",
        "Vanguard Tech",
        "Germany",
        "Premium"
      ],
      [
        103,
        103,
        "Nippon Systems",
        "Nippon Systems",
        "Japan",
        "Enterprise"
      ],
      [
        104,
        104,
        "Quantum Logic",
        "Quantum Logic",
        "UK",
        "Standard"
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
    ],
    "rows": [
      [
        101,
        "Titan Health Systems",
        "Healthcare",
        450000.0,
        "ACTIVE"
      ],
      [
        102,
        "Apex Robotics",
        "Automation",
        280000.0,
        "ACTIVE"
      ],
      [
        103,
        "Nordic Clean Energy",
        "Energy",
        620000.0,
        "ACTIVE"
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
    ],
    "rows": [
      [
        201,
        "Maya",
        "Lin",
        "Maya Lin",
        "maya.lin@gmail.com",
        "New York",
        "Gold VIP",
        4500.0
      ],
      [
        202,
        "Lucas",
        "Silva",
        "Lucas Silva",
        "lucas.silva@gmail.com",
        "Miami",
        "Silver",
        2100.0
      ],
      [
        203,
        "Amara",
        "Okafor",
        "Amara Okafor",
        "amara.o@outlook.com",
        "Chicago",
        "Platinum VIP",
        7800.0
      ],
      [
        204,
        "Ethan",
        "Hunt",
        "Ethan Hunt",
        "ethan.hunt@yahoo.com",
        "Los Angeles",
        "Bronze",
        850.0
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
    ],
    "rows": [
      [
        301,
        "MegaMart Distribution Inc",
        "MegaMart Distribution Inc",
        "procurement@megamart.com",
        "TAX-9941-US",
        "AAA",
        1450000.0,
        "Sarah Connor",
        "Preferred"
      ],
      [
        302,
        "EuroLogistics Logistics SE",
        "EuroLogistics Logistics SE",
        "ops@eurologistics.eu",
        "TAX-2281-EU",
        "AA",
        980000.0,
        "David Miller",
        "Active"
      ],
      [
        303,
        "Nippon Wholesale Supply Co",
        "Nippon Wholesale Supply Co",
        "sales@nippon-ws.jp",
        "TAX-7714-JP",
        "AAA",
        2100000.0,
        "Kenji Sato",
        "Preferred"
      ],
      [
        304,
        "LatinAmer Trading Corp",
        "LatinAmer Trading Corp",
        "trading@latinamer.br",
        "TAX-5520-BR",
        "BBB+",
        620000.0,
        "Elena Rostova",
        "Standard"
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
    ],
    "rows": [
      [
        101,
        101,
        "Apex Corp Solutions",
        "Apex Corp",
        "Technology",
        "Apex Corp Solutions",
        "procurement@apex.com",
        "QUALIFIED",
        "Alex Rivera"
      ],
      [
        102,
        "Beacon Media Global",
        "Beacon Media",
        "Media",
        "Beacon Media Global",
        "ads@beacon.com",
        "CONTACTED",
        "Sarah Chen"
      ],
      [
        103,
        "Cyberdyne Systems",
        "Cyberdyne",
        "Defense",
        "Cyberdyne Systems",
        "contracts@cyberdyne.com",
        "NEW",
        "Marcus Vance"
      ],
      [
        104,
        "Delta Air Logistics",
        "Delta Air",
        "Travel",
        "Delta Air Logistics",
        "ops@delta.com",
        "NEW",
        "Alex Rivera"
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
    ],
    "rows": [
      [
        1,
        101,
        "Miller",
        "Miller",
        420,
        "INTERESTED",
        "DEMO_SCHEDULED",
        "2026-03-01"
      ],
      [
        2,
        101,
        "Miller",
        "Miller",
        180,
        "DEMO_SET",
        "FOLLOW_UP",
        "2026-03-04"
      ],
      [
        3,
        102,
        "Sarah",
        "Sarah",
        90,
        "VOICEMAIL",
        "NO_ANSWER",
        "2026-03-05"
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
    ],
    "rows": [
      [
        101,
        "Quantum Pro Laptop 16\"",
        "TECH-LP-01",
        1,
        "Electronics",
        1899.99,
        1899.99,
        45,
        45,
        false
      ],
      [
        102,
        "Apex 4K UltraWide Monitor",
        "TECH-MN-02",
        1,
        "Electronics",
        849.5,
        849.5,
        32,
        32,
        false
      ],
      [
        103,
        "ErgoMech Mechanical Keyboard",
        "TECH-KB-03",
        1,
        "Electronics",
        179.0,
        179.0,
        120,
        120,
        false
      ],
      [
        104,
        "Titanium Data Server Rack",
        "TECH-SR-04",
        2,
        "Servers",
        4200.0,
        4200.0,
        8,
        8,
        false
      ],
      [
        105,
        "CyberShield UTM Firewall",
        "TECH-FW-05",
        2,
        "Security",
        1250.0,
        1250.0,
        18,
        18,
        false
      ],
      [
        106,
        "AcousticPro Studio Headphones",
        "TECH-HP-06",
        1,
        "Electronics",
        299.99,
        299.99,
        64,
        64,
        false
      ],
      [
        107,
        "Legacy IDE Interface Adapter",
        "TECH-ADP-07",
        3,
        "Accessories",
        35.0,
        35.0,
        0,
        0,
        true
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
    ],
    "rows": [
      [
        101,
        "Quantum Pro Laptop 16\"",
        1,
        "Hardware",
        1899.99,
        1899.99,
        45,
        false
      ],
      [
        102,
        "Apex 4K UltraWide Monitor",
        1,
        "Displays",
        849.5,
        849.5,
        32,
        false
      ],
      [
        103,
        "ErgoMech Mechanical Keyboard",
        1,
        "Peripherals",
        179.0,
        179.0,
        120,
        true
      ],
      [
        104,
        "Titanium Data Server Rack",
        2,
        "Servers",
        4200.0,
        4200.0,
        8,
        false
      ],
      [
        105,
        "CyberShield UTM Firewall",
        2,
        "Security",
        1250.0,
        1250.0,
        18,
        false
      ],
      [
        106,
        "AcousticPro Studio Headphones",
        1,
        "Audio",
        299.99,
        299.99,
        64,
        false
      ],
      [
        107,
        "Legacy IDE Interface Adapter",
        3,
        "Accessories",
        35.0,
        35.0,
        0,
        true
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
    ],
    "rows": [
      [
        101,
        "Precision Tooling Kit",
        "Hardware",
        149.99,
        149.99,
        850,
        4.8,
        450,
        false
      ],
      [
        102,
        "High-Temp Thermal Paste",
        "Hardware",
        24.5,
        24.5,
        1420,
        4.9,
        1200,
        false
      ],
      [
        103,
        "Cat6e Bulk Reel 1000ft",
        "Networking",
        189.0,
        189.0,
        310,
        4.6,
        85,
        true
      ],
      [
        104,
        "4K Studio Webcam",
        "Peripherals",
        129.99,
        129.99,
        620,
        4.7,
        32,
        false
      ],
      [
        105,
        "Studio Noise-Cancelling Mic",
        "Audio",
        199.99,
        199.99,
        410,
        4.9,
        50,
        false
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
    ],
    "rows": [
      [
        1,
        "HyperDrive Pro SSD 2TB",
        "Storage",
        199.99,
        150,
        true
      ],
      [
        2,
        "Titan V2 Gaming GPU",
        "Hardware",
        799.0,
        35,
        false
      ],
      [
        3,
        "ErgoLift Standing Desk",
        "Furniture",
        450.0,
        20,
        true
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
    ],
    "rows": [
      [
        1,
        "Quantum Mouse Pro",
        79.99,
        120,
        20,
        69.99,
        64.99,
        79.99
      ],
      [
        2,
        "UltraQuiet Cooling Pad",
        39.99,
        85,
        15,
        null,
        34.99,
        39.99
      ],
      [
        3,
        "4K Webcam Studio",
        129.99,
        45,
        10,
        109.99,
        99.99,
        129.99
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
    ],
    "rows": [
      [
        101,
        "Precision Tooling Kit",
        "TOOL-101",
        450,
        149.99,
        "A-01"
      ],
      [
        102,
        "High-Temp Thermal Paste",
        "PASTE-102",
        1200,
        24.5,
        "A-04"
      ],
      [
        103,
        "Cat6e Bulk Reel 1000ft",
        "CABLE-103",
        85,
        189.0,
        "B-02"
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
    ],
    "rows": [
      [
        101,
        "Quantum Pro Laptop 16\"",
        1899.99,
        1899.99,
        45,
        45
      ],
      [
        102,
        "Apex 4K UltraWide Monitor",
        849.5,
        849.5,
        32,
        32
      ],
      [
        103,
        "ErgoMech Mechanical Keyboard",
        179.0,
        179.0,
        120,
        120
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
    ],
    "rows": [
      [
        1,
        "Electronics & Computing",
        null,
        "TAX-COMP-01"
      ],
      [
        2,
        "Enterprise Infrastructure",
        "Electronics & Computing",
        "TAX-SRV-02"
      ],
      [
        3,
        "Accessories & Peripherals",
        "Electronics & Computing",
        "TAX-ACC-03"
      ],
      [
        4,
        "Cloud Telemetry Software",
        null,
        "TAX-SOFT-04"
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
    ],
    "rows": [
      [
        1,
        101,
        1899.99,
        "San Jose Hub WH-1",
        "BIN-A-101",
        45,
        10,
        "2026-03-01"
      ],
      [
        2,
        102,
        849.5,
        "San Jose Hub WH-1",
        "BIN-A-102",
        32,
        8,
        "2026-03-01"
      ],
      [
        3,
        103,
        179.0,
        "Frankfurt Logistics Ctr",
        "BIN-E-205",
        120,
        25,
        "2026-02-20"
      ],
      [
        4,
        104,
        4200.0,
        "Singapore Air Cargo Depot",
        "BIN-S-012",
        8,
        2,
        "2026-02-28"
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
    ],
    "rows": [
      [
        1,
        101,
        "SKU-5501",
        "Gigabit Ethernet Switch 48-Port",
        "Networking",
        "Aisle 03-B",
        85,
        20,
        349.99,
        320.0
      ],
      [
        2,
        102,
        "SKU-5502",
        "Cat6A Shielded Patch Cable 10ft",
        "Cabling",
        "Aisle 01-A",
        450,
        100,
        6.99,
        4.5
      ],
      [
        3,
        103,
        "SKU-5503",
        "Server Hot-Swap Fan Assembly",
        "Components",
        "Aisle 05-D",
        34,
        15,
        39.99,
        28.0
      ],
      [
        4,
        104,
        "SKU-5504",
        "Rack Mount PDU 30A 120/208V",
        "Power",
        "Aisle 04-C",
        19,
        5,
        249.99,
        215.0
      ],
      [
        5,
        105,
        "SKU-5505",
        "Fiber Optic Transceiver SFP+ 10G",
        "Networking",
        "Aisle 03-A",
        140,
        30,
        59.99,
        42.0
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
    ],
    "rows": [
      [
        1,
        "A-01",
        "S-01",
        500,
        "North Warehouse"
      ],
      [
        2,
        "A-02",
        "S-04",
        1200,
        "East Distribution"
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
    ],
    "rows": [
      [
        5001,
        101,
        "2024-01-05",
        4850.0,
        4850.0,
        4850.0,
        "Delivered",
        "D",
        "Corporate ACH"
      ],
      [
        5002,
        102,
        "2024-01-12",
        1240.5,
        1240.5,
        1240.5,
        "Delivered",
        "D",
        "Credit Card"
      ],
      [
        5003,
        103,
        "2024-01-18",
        350.0,
        350.0,
        350.0,
        "Cancelled",
        "C",
        "Wire Transfer"
      ],
      [
        5004,
        104,
        "2024-01-22",
        7890.0,
        7890.0,
        7890.0,
        "Delivered",
        "D",
        "Corporate ACH"
      ],
      [
        5005,
        101,
        "2024-02-01",
        940.0,
        940.0,
        940.0,
        "Shipped",
        "S",
        "Credit Card"
      ],
      [
        5006,
        105,
        "2024-02-05",
        15200.0,
        15200.0,
        15200.0,
        "Processing",
        "P",
        "Wire Transfer"
      ],
      [
        5007,
        102,
        "2024-02-10",
        2100.0,
        2100.0,
        2100.0,
        "Shipped",
        "S",
        "Credit Card"
      ],
      [
        5008,
        106,
        "2024-02-14",
        620.0,
        620.0,
        620.0,
        "Delivered",
        "D",
        "Credit Card"
      ],
      [
        5009,
        107,
        "2024-02-18",
        8450.0,
        8450.0,
        8450.0,
        "Processing",
        "P",
        "Corporate ACH"
      ],
      [
        5010,
        104,
        "2024-02-22",
        1100.0,
        1100.0,
        1100.0,
        "Delivered",
        "D",
        "Credit Card"
      ],
      [
        5011,
        108,
        "2024-03-01",
        3400.0,
        3400.0,
        3400.0,
        "Shipped",
        "S",
        "Wire Transfer"
      ],
      [
        5012,
        101,
        "2024-03-05",
        5600.0,
        5600.0,
        5600.0,
        "Processing",
        "P",
        "Corporate ACH"
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
    ],
    "rows": [
      [
        1,
        5001,
        104,
        1,
        4200.0,
        4200.0
      ],
      [
        2,
        5001,
        102,
        1,
        650.0,
        650.0
      ],
      [
        3,
        5002,
        103,
        4,
        179.0,
        716.0
      ],
      [
        4,
        5002,
        106,
        1,
        299.99,
        299.99
      ],
      [
        5,
        5004,
        101,
        4,
        1899.99,
        7599.96
      ],
      [
        6,
        5005,
        106,
        3,
        299.99,
        899.97
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
    ],
    "rows": [
      [
        1001,
        1,
        101,
        149.99,
        2,
        0.05
      ],
      [
        1001,
        2,
        103,
        35.0,
        4,
        0.0
      ],
      [
        1002,
        1,
        104,
        4200.0,
        1,
        0.1
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
    ],
    "rows": [
      [
        1,
        1001,
        36,
        125.0,
        4500.0,
        360.0,
        4860.0
      ],
      [
        2,
        1002,
        12,
        100.0,
        1200.0,
        96.0,
        1296.0
      ],
      [
        3,
        1003,
        24,
        35.42,
        850.0,
        68.0,
        918.0
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
    ],
    "rows": [
      [
        1,
        101,
        4500.0,
        12,
        "COMPLETED"
      ],
      [
        2,
        101,
        1200.0,
        0,
        "PENDING_ITEMS"
      ],
      [
        3,
        102,
        8900.0,
        25,
        "COMPLETED"
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
    ],
    "rows": [
      [
        1001,
        101,
        "2026-03-01",
        4850.0,
        4850.0,
        4850.0,
        "Delivered",
        "Delivered",
        "Credit Card"
      ],
      [
        1002,
        102,
        "2026-03-01",
        1240.5,
        1240.5,
        1240.5,
        "Shipped",
        "Shipped",
        "PayPal"
      ],
      [
        1003,
        103,
        "2026-03-02",
        350.0,
        350.0,
        350.0,
        "Processing",
        "Processing",
        "Corporate ACH"
      ],
      [
        1004,
        104,
        "2026-03-02",
        7890.0,
        7890.0,
        7890.0,
        "Delivered",
        "Delivered",
        "Credit Card"
      ],
      [
        1005,
        101,
        "2026-03-03",
        940.0,
        940.0,
        940.0,
        "Shipped",
        "Shipped",
        "Wire Transfer"
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
    ],
    "rows": [
      [
        1,
        "Hardware & Servers",
        "Direct Enterprise",
        425000.0,
        12000.0,
        "Q1-2026"
      ],
      [
        2,
        "Displays & Monitors",
        "Global Webstore",
        185000.0,
        8500.0,
        "Q1-2026"
      ],
      [
        3,
        "CyberSecurity Licenses",
        "Partner Network",
        310000.0,
        0.0,
        "Q1-2026"
      ],
      [
        4,
        "Accessories & Cables",
        "Global Webstore",
        65000.0,
        4200.0,
        "Q1-2026"
      ],
      [
        5,
        "Cloud Support Contracts",
        "Direct Enterprise",
        540000.0,
        15000.0,
        "Q1-2026"
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
    ],
    "rows": [
      [
        1,
        "sess-982-ab",
        101,
        3,
        2450.0,
        "2026-03-12 14:20:00"
      ],
      [
        2,
        "sess-983-cd",
        102,
        1,
        1899.99,
        "2026-03-12 15:10:00"
      ],
      [
        3,
        "sess-984-ef",
        103,
        5,
        620.0,
        "2026-03-12 15:45:00"
      ],
      [
        4,
        "sess-985-gh",
        null,
        2,
        85.0,
        "2026-03-12 16:00:00"
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
    ],
    "rows": [
      [
        4001,
        101,
        "2023-05-12",
        3400.0,
        3400.0,
        "Archived"
      ],
      [
        4002,
        102,
        "2023-08-20",
        1950.0,
        1950.0,
        "Archived"
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
    ],
    "rows": [
      [
        3001,
        101,
        4500.0,
        "2025-04-12",
        "Archived"
      ],
      [
        3002,
        102,
        1200.0,
        "2025-08-19",
        "Archived"
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
    ],
    "rows": [
      [
        501,
        101,
        2450.0,
        "2026-03-01",
        "Processing"
      ],
      [
        502,
        102,
        890.0,
        "2026-03-02",
        "Shipped"
      ],
      [
        503,
        103,
        3100.0,
        "2026-03-03",
        "Delivered"
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
    ],
    "rows": [
      [
        5001,
        101,
        "2024-01-05",
        4850.0,
        4850.0,
        "COMPLETED"
      ],
      [
        5002,
        102,
        "2024-01-12",
        1240.5,
        1240.5,
        "COMPLETED"
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
    ],
    "rows": [
      [
        5001,
        101,
        "2024-01-05",
        4850.0,
        4850.0,
        "Delivered"
      ],
      [
        5002,
        102,
        "2024-01-12",
        1240.5,
        1240.5,
        "Delivered"
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
    ],
    "rows": [
      [
        5003,
        103,
        "Customer Request",
        "2024-01-18 14:30:00"
      ],
      [
        5020,
        105,
        "Payment Failed",
        "2024-02-05 09:12:00"
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
    ],
    "rows": [
      [
        2001,
        101,
        15400.0,
        "2024-01-15",
        "2024-01-15",
        "2026-01-01"
      ],
      [
        2002,
        102,
        8200.0,
        "2024-02-20",
        "2024-02-20",
        "2026-01-01"
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
    ],
    "rows": [
      [
        1,
        101,
        149.99,
        "Web App",
        "2026-03-01"
      ],
      [
        2,
        102,
        349.5,
        "Mobile iOS",
        "2026-03-01"
      ],
      [
        3,
        101,
        89.0,
        "Mobile Android",
        "2026-03-02"
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
    ],
    "rows": [
      [
        101,
        "Precision Tooling Kit",
        149.99,
        "USA"
      ],
      [
        102,
        "High-Temp Thermal Paste",
        24.5,
        "USA"
      ],
      [
        103,
        "Cat6e Bulk Reel 1000ft",
        189.0,
        "USA"
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
    ],
    "rows": [
      [
        201,
        "Optical Laser Splicer",
        1250.0,
        4.5
      ],
      [
        202,
        "Precision Ceramic Capacitors",
        12.0,
        2.0
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
    ],
    "rows": [
      [
        1,
        "INV-SKU-001",
        "High-Speed Transceiver",
        450,
        48.0
      ],
      [
        2,
        "INV-SKU-002",
        "Fiber Optic Cable 50m",
        1200,
        15.5
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
    ],
    "rows": []
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
    ],
    "rows": [
      [
        1,
        "FastCargo Logistics",
        450,
        2,
        98.5
      ],
      [
        2,
        "Global Freight Direct",
        320,
        5,
        91.2
      ],
      [
        3,
        "Express Airway Express",
        680,
        1,
        99.4
      ],
      [
        4,
        "Pacific Maritime Express",
        210,
        8,
        84.0
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
    ],
    "rows": [
      [
        1,
        "Electric Cyan",
        "#00F2FE"
      ],
      [
        2,
        "Neon Rose",
        "#F472B6"
      ],
      [
        3,
        "Emerald Mint",
        "#34D399"
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
    ],
    "rows": [
      [
        1,
        "Small",
        "S"
      ],
      [
        2,
        "Medium",
        "M"
      ],
      [
        3,
        "Large",
        "L"
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
    ],
    "rows": [
      [
        101,
        101,
        1,
        101,
        "Global Tech Logistics",
        "alex_admin",
        "ACC-88201",
        "Corporate Checking",
        142500.5,
        142500.5,
        "USD",
        "SUPERADMIN",
        "Active"
      ],
      [
        102,
        102,
        2,
        102,
        "Vanguard Cloud Systems",
        "sophia_lead",
        "ACC-99312",
        "Enterprise Treasury",
        350000.0,
        350000.0,
        "USD",
        "ADMIN",
        "Active"
      ],
      [
        103,
        103,
        3,
        103,
        "Apex Financial Analytics",
        "david_dev",
        "ACC-44105",
        "Corporate Escrow",
        89000.75,
        89000.75,
        "USD",
        "READ_ONLY",
        "Active"
      ],
      [
        104,
        104,
        4,
        104,
        "BlueSky Media Group",
        "elena_r",
        "ACC-22941",
        "Commercial Savings",
        42000.0,
        42000.0,
        "USD",
        "OPERATOR",
        "Active"
      ],
      [
        105,
        105,
        5,
        105,
        "Helios Quantum Labs",
        "kenji_s",
        "ACC-77189",
        "Institutional Reserve",
        510000.25,
        510000.25,
        "USD",
        "AUDITOR",
        "Restricted"
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
    ],
    "rows": [
      [
        1,
        1,
        "alex_m",
        "alex@edmith.com",
        "Alex",
        "Morgan",
        "ENTERPRISE",
        49.99,
        1200.0,
        "2022-01-15",
        "2022-01-15"
      ],
      [
        2,
        2,
        "sophia_c",
        "sophia@edmith.com",
        "Sophia",
        "Chen",
        "BUSINESS",
        89.99,
        3400.0,
        "2021-06-20",
        "2021-06-20"
      ],
      [
        3,
        3,
        "marcus_v",
        "marcus@edmith.com",
        "Marcus",
        "Vance",
        "ENTERPRISE",
        19.99,
        850.0,
        "2023-04-10",
        "2023-04-10"
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
    ],
    "rows": [
      [
        101,
        101,
        "Apex Corp Solutions",
        "Apex Corp Solutions LLC",
        "USA",
        "Enterprise Escrow",
        142500.5,
        500000.0,
        14250050
      ],
      [
        102,
        102,
        "Vanguard Tech",
        "Vanguard Technologies SE",
        "DEU",
        "Operating Treasury",
        350000.0,
        1000000.0,
        35000000
      ],
      [
        103,
        103,
        "Nippon Systems",
        "Nippon Systems KK",
        "JPN",
        "Operating Treasury",
        89000.75,
        250000.0,
        8900075
      ],
      [
        104,
        104,
        "Helios Quantum",
        "Helios Quantum PLC",
        "GBR",
        "Enterprise Escrow",
        510000.25,
        1500000.0,
        51000025
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
    ],
    "rows": [
      [
        101,
        101,
        "Apex Corp Solutions",
        "Apex Corp Solutions",
        142500.5,
        "California"
      ],
      [
        102,
        "Cyberdyne Systems",
        "Cyberdyne Systems",
        89000.0,
        "Texas"
      ],
      [
        103,
        "Wayne Enterprises US",
        "Wayne Enterprises US",
        450000.0,
        "New York"
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
    ],
    "rows": [
      [
        201,
        "Vanguard Tech DE",
        "Vanguard Tech DE",
        350000.0,
        "Germany"
      ],
      [
        202,
        "Nippon Systems JP",
        "Nippon Systems JP",
        510000.0,
        "Japan"
      ],
      [
        203,
        "Nordic Telecomm SE",
        "Nordic Telecomm SE",
        220000.0,
        "Sweden"
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
    ],
    "rows": [
      [
        1001,
        101,
        101,
        4850.0,
        0.05,
        "USD",
        "ACH_TRANSFER",
        "PAYMENT",
        "SETTLED",
        null,
        "2026-03-01 09:15:00"
      ],
      [
        1002,
        102,
        102,
        1240.5,
        0.12,
        "USD",
        "CREDIT_CARD",
        "PAYMENT",
        "SETTLED",
        null,
        "2026-03-01 10:20:00"
      ],
      [
        1003,
        103,
        103,
        350.0,
        0.88,
        "USD",
        "WIRE",
        "PAYMENT",
        "FAILED",
        "ERR_INSUFFICIENT_FUNDS",
        "2026-03-02 11:05:00"
      ],
      [
        1004,
        104,
        104,
        7890.0,
        0.02,
        "USD",
        "ACH_TRANSFER",
        "PAYMENT",
        "SETTLED",
        null,
        "2026-03-02 14:40:00"
      ],
      [
        1005,
        101,
        101,
        940.0,
        0.15,
        "USD",
        "CREDIT_CARD",
        "PAYMENT",
        "SETTLED",
        null,
        "2026-03-03 16:10:00"
      ],
      [
        1006,
        105,
        105,
        15200.0,
        0.35,
        "USD",
        "WIRE",
        "PAYMENT",
        "PENDING",
        null,
        "2026-03-03 18:30:00"
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
    ],
    "rows": [
      [
        1,
        101,
        "INV-2026-001",
        "Monthly - March",
        2499.0,
        199.92,
        "PAID",
        "2026-03-15"
      ],
      [
        2,
        102,
        "INV-2026-002",
        "Monthly - March",
        999.0,
        79.92,
        "PAID",
        "2026-03-15"
      ],
      [
        3,
        103,
        "INV-2026-003",
        "Monthly - March",
        2499.0,
        199.92,
        "UNPAID",
        "2026-03-15"
      ],
      [
        4,
        104,
        "INV-2026-004",
        "Quarterly - Q1",
        897.0,
        71.76,
        "OVERDUE",
        "2026-02-28"
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
    ],
    "rows": [
      [
        1,
        101,
        "Enterprise Platinum",
        450.0,
        50,
        22500.0,
        "PAID"
      ],
      [
        2,
        102,
        "Enterprise Gold",
        350.0,
        25,
        8750.0,
        "PAID"
      ],
      [
        3,
        103,
        "Enterprise Platinum",
        450.0,
        80,
        36000.0,
        "PENDING"
      ],
      [
        4,
        104,
        "Scale Up Pro",
        150.0,
        10,
        1500.0,
        "PAID"
      ],
      [
        5,
        105,
        "Developer Essential",
        49.0,
        4,
        196.0,
        "PAID"
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
    ],
    "rows": [
      [
        1,
        101,
        102,
        5000.0,
        "COMPLETED",
        "2026-03-01 10:00:00"
      ],
      [
        2,
        102,
        103,
        12000.0,
        "COMPLETED",
        "2026-03-02 14:30:00"
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
    ],
    "rows": [
      [
        1,
        1001,
        "1010-CASH",
        150000.0,
        150000.0,
        0.0,
        "2026-03-01 09:00:00"
      ],
      [
        2,
        1002,
        "2010-AP",
        350000.0,
        0.0,
        350000.0,
        "2026-03-01 09:00:00"
      ],
      [
        3,
        1003,
        "1020-WIRE",
        85000.0,
        85000.0,
        0.0,
        "2026-03-01 10:30:00"
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
    ],
    "rows": [
      [
        1,
        1001,
        "20260301ABCD1234",
        150000.0,
        "JPMorgan Chase",
        "Federal Reserve NY",
        150000.0,
        "SETTLED"
      ],
      [
        2,
        1004,
        "20260301EFGH5678",
        500000.0,
        "Bank of America",
        "Federal Reserve NY",
        500000.0,
        "SETTLED"
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
    ],
    "rows": [
      [
        101,
        "Vanguard Global Corp",
        "Tier 1",
        450000.0,
        1000000.0
      ],
      [
        102,
        "Weylan Yutani Analytics",
        "Tier 1",
        890000.0,
        2000000.0
      ],
      [
        103,
        "Tyrell Cybernetics",
        "Tier 2",
        75000.0,
        250000.0
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
    ],
    "rows": [
      [
        101,
        "Vanguard Global Corp",
        "Tier 1",
        450000.0
      ],
      [
        102,
        "Weylan Yutani Analytics",
        "Tier 1",
        890000.0
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
    ],
    "rows": []
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
    ],
    "rows": [
      [
        "2026-03-01",
        145,
        84500.0,
        83200.0,
        1300.0
      ],
      [
        "2026-03-02",
        189,
        112000.0,
        110500.0,
        1500.0
      ],
      [
        "2026-03-03",
        162,
        96000.0,
        94800.0,
        1200.0
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
    ],
    "rows": [
      [
        "2026-01",
        3420,
        1450000.0,
        420000.0
      ],
      [
        "2026-02",
        3890,
        1680000.0,
        490000.0
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
    ],
    "rows": [
      [
        1,
        2025,
        "Engineering R&D",
        1450000.0,
        "FINALIZED"
      ],
      [
        2,
        2025,
        "Cloud Infrastructure",
        890000.0,
        "FINALIZED"
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
    ],
    "rows": [
      [
        1,
        101,
        2024,
        "US-FEDERAL",
        "EDMITH Global LLC",
        1850000.0,
        342000.0,
        "ACCEPTED"
      ],
      [
        2,
        101,
        2025,
        "US-FEDERAL",
        "EDMITH Global LLC",
        2150000.0,
        415000.0,
        "PENDING_REVIEW"
      ],
      [
        3,
        102,
        2024,
        "EU-DE",
        "EDMITH Europe GmbH",
        980000.0,
        195000.0,
        "ACCEPTED"
      ],
      [
        4,
        103,
        2024,
        "APAC-JP",
        "EDMITH Asia KK",
        1250000.0,
        260000.0,
        "ACCEPTED"
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
    ],
    "rows": [
      [
        1,
        "NVDA",
        "NVIDIA Corp",
        142.5,
        142.5,
        45200000,
        45200000,
        145.2,
        139.8,
        "2026-03-12 15:59:00",
        "2026-03-12 15:59:00"
      ],
      [
        2,
        "MSFT",
        "Microsoft Corp",
        428.1,
        428.1,
        18400000,
        18400000,
        431.5,
        425.0,
        "2026-03-12 15:59:00",
        "2026-03-12 15:59:00"
      ],
      [
        3,
        "GOOGL",
        "Alphabet Inc",
        182.4,
        182.4,
        22100000,
        22100000,
        184.8,
        180.2,
        "2026-03-12 15:59:00",
        "2026-03-12 15:59:00"
      ],
      [
        4,
        "AMZN",
        "Amazon.com Inc",
        195.8,
        195.8,
        28900000,
        28900000,
        197.4,
        193.1,
        "2026-03-12 15:59:00",
        "2026-03-12 15:59:00"
      ],
      [
        5,
        "AAPL",
        "Apple Inc",
        234.2,
        234.2,
        34500000,
        34500000,
        236.0,
        231.5,
        "2026-03-12 15:59:00",
        "2026-03-12 15:59:00"
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
    ],
    "rows": [
      [
        1001,
        101,
        4850.0,
        "2026-01-15",
        "Q1-2026"
      ],
      [
        1002,
        102,
        1240.5,
        "2026-02-10",
        "Q1-2026"
      ],
      [
        1003,
        103,
        3500.0,
        "2026-03-01",
        "Q1-2026"
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
    ],
    "rows": [
      [
        2001,
        104,
        7890.0,
        "2026-04-12",
        "Q2-2026"
      ],
      [
        2002,
        101,
        940.0,
        "2026-05-20",
        "Q2-2026"
      ],
      [
        2003,
        105,
        15200.0,
        "2026-06-15",
        "Q2-2026"
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
    ],
    "rows": [
      [
        3001,
        102,
        2100.0,
        "2026-07-10",
        "Q3-2026"
      ],
      [
        3002,
        106,
        6200.0,
        "2026-08-22",
        "Q3-2026"
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
    ],
    "rows": [
      [
        4001,
        107,
        8450.0,
        "2026-10-15",
        "Q4-2026"
      ],
      [
        4002,
        108,
        3400.0,
        "2026-11-28",
        "Q4-2026"
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
    ],
    "rows": [
      [
        101,
        1,
        249.99,
        249.99,
        "2026-03-01 10:14:00"
      ],
      [
        102,
        2,
        89.5,
        89.5,
        "2026-03-01 11:32:00"
      ],
      [
        103,
        3,
        1200.0,
        1200.0,
        "2026-03-01 12:45:00"
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
    ],
    "rows": [
      [
        201,
        4,
        340.0,
        340.0,
        "2026-03-01 09:50:00"
      ],
      [
        202,
        5,
        45.0,
        45.0,
        "2026-03-01 14:15:00"
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
    ],
    "rows": [
      [
        1,
        101,
        101,
        "Acme Corp",
        15000.0,
        15000.0,
        "2026-03-01 10:00:00"
      ],
      [
        2,
        101,
        101,
        "Acme Corp",
        12000.0,
        12000.0,
        "2026-03-01 14:00:00"
      ],
      [
        3,
        101,
        101,
        "Acme Corp",
        8000.0,
        8000.0,
        "2026-03-02 09:30:00"
      ],
      [
        4,
        102,
        102,
        "Beta LLC",
        22000.0,
        22000.0,
        "2026-03-01 11:15:00"
      ],
      [
        5,
        102,
        102,
        "Beta LLC",
        18000.0,
        18000.0,
        "2026-03-02 16:45:00"
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
    ],
    "rows": [
      [
        "i-0a81f9b3c4",
        "app-prod-useast-01",
        "us-east-1",
        0.192,
        138.24,
        32,
        "RUNNING"
      ],
      [
        "i-0b92e8a4d5",
        "app-prod-useast-02",
        "us-east-1",
        0.192,
        138.24,
        32,
        "RUNNING"
      ],
      [
        "i-0c73d7f5e6",
        "db-primary-uswest",
        "us-west-2",
        0.768,
        552.96,
        128,
        "RUNNING"
      ],
      [
        "i-0d64c6e6f7",
        "analytics-spark-eu",
        "eu-central-1",
        0.384,
        276.48,
        64,
        "RUNNING"
      ],
      [
        "i-0e55b5d7a8",
        "cache-redis-apac",
        "ap-northeast-1",
        0.096,
        69.12,
        16,
        "STOPPED"
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
    ],
    "rows": [
      [
        "node-alpha-01",
        "Kubernetes Core Cluster",
        "us-east-dc1",
        64,
        256,
        3.84,
        18,
        0.01,
        true
      ],
      [
        "node-alpha-02",
        "Kubernetes Core Cluster",
        "us-east-dc1",
        64,
        256,
        3.84,
        24,
        0.02,
        true
      ],
      [
        "node-alpha-03",
        "Kubernetes Core Cluster",
        "eu-west-dc2",
        64,
        256,
        3.84,
        38,
        0.0,
        true
      ],
      [
        "node-beta-spark",
        "Big Data Analytics Pod",
        "ap-northeast-dc3",
        128,
        512,
        7.68,
        142,
        2.85,
        false
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
    ],
    "rows": [
      [
        1,
        null,
        "Rack Chassis Alpha",
        "Rack Chassis Alpha",
        "CHASSIS",
        "SN-RACK-001",
        12000.0,
        "Infrastructure Hall",
        2030
      ],
      [
        2,
        1,
        "Blade Server Alpha-1",
        "Blade Server Alpha-1",
        "BLADE",
        "SN-BLD-001",
        4500.0,
        "Infrastructure Hall",
        2028
      ],
      [
        3,
        1,
        "Blade Server Alpha-2",
        "Blade Server Alpha-2",
        "BLADE",
        "SN-BLD-002",
        4500.0,
        "Infrastructure Hall",
        2028
      ],
      [
        4,
        null,
        "MacBook Pro M3 Max 64GB",
        "MacBook Pro M3 Max 64GB",
        "LAPTOP",
        "SN-APPL-98214",
        3899.0,
        "Sarah Connor",
        2027
      ],
      [
        5,
        null,
        "Dell Precision 7875 AI Workstation",
        "Dell Precision 7875 AI Workstation",
        "DESKTOP",
        "SN-DELL-44129",
        6450.0,
        "David Miller",
        2028
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
    ],
    "rows": [
      [
        101,
        "srv-core-01.infra.edmith.com",
        1,
        "10.0.1.10",
        "ONLINE"
      ],
      [
        102,
        "srv-db-01.infra.edmith.com",
        1,
        "10.0.1.20",
        "ONLINE"
      ],
      [
        103,
        "srv-cache-01.infra.edmith.com",
        2,
        "10.0.2.10",
        "ONLINE"
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
    ],
    "rows": [
      [
        1,
        "Rack-Alpha-101",
        "RACK-A1",
        "Hall A - Silicon Valley",
        15.0,
        15.0
      ],
      [
        2,
        "Rack-Beta-202",
        "RACK-B2",
        "Hall A - Silicon Valley",
        15.0,
        15.0
      ],
      [
        3,
        "Rack-Gamma-303",
        "RACK-G3",
        "Hall B - Frankfurt",
        20.0,
        20.0
      ],
      [
        4,
        "Rack-Delta-404",
        "RACK-D4",
        "Hall C - Tokyo",
        18.0,
        18.0
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
    ],
    "rows": [
      [
        1,
        1,
        "sarah.c",
        "ADMIN",
        "/api/v1/admin/users",
        "192.168.1.10",
        "US",
        true,
        true,
        true,
        "2026-03-12 10:14:22"
      ],
      [
        2,
        2,
        "guest_unknown",
        "GUEST",
        "/api/v1/auth/token",
        "45.33.32.156",
        "UK",
        false,
        false,
        false,
        "2026-03-12 10:15:01"
      ],
      [
        3,
        3,
        "david.m",
        "ADMIN",
        "/api/v1/database/schemas",
        "192.168.1.15",
        "US",
        true,
        true,
        true,
        "2026-03-12 10:16:45"
      ],
      [
        4,
        4,
        "kevin.h",
        "DEV",
        "/api/v1/admin/billing",
        "192.168.1.55",
        "DE",
        true,
        false,
        false,
        "2026-03-12 10:18:10"
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
    ],
    "rows": [
      [
        1,
        "INFO",
        "TLS certificate auto-renewed successfully for *.edmith.com",
        "CertManager",
        "2026-03-01 00:05:00"
      ],
      [
        2,
        "WARNING",
        "Rate limit triggered for IP block 45.33.32.0/24 on /login endpoint",
        "WAF-Cloud",
        "2026-03-05 14:22:15"
      ],
      [
        3,
        "CRITICAL",
        "Repeated unauthorized SSH attempts on cluster bastion",
        "Fail2Ban",
        "2026-03-10 03:41:00"
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
    ],
    "rows": [
      [
        1,
        "auth-service",
        "INFO",
        "User 1 login successful",
        "2026-03-01 10:00:00"
      ],
      [
        2,
        "payment-gateway",
        "WARNING",
        "Latency spike on Stripe API",
        "2026-03-01 10:05:00"
      ],
      [
        3,
        "api-gateway",
        "ERROR",
        "HTTP 504 gateway timeout",
        "2026-03-01 10:12:00"
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
    ],
    "rows": [
      [
        1,
        "auth-service",
        "INFO",
        101,
        "MFA_SUCCESS",
        "MFA authentication succeeded",
        "192.168.1.1",
        "2026-03-01 08:00:00",
        "2026-03-01 08:00:00"
      ],
      [
        2,
        "auth-service",
        "WARNING",
        102,
        "PASSWORD_RETRY",
        "Invalid password attempt 2 of 5",
        "192.168.1.4",
        "2026-03-01 09:15:00",
        "2026-03-01 09:15:00"
      ],
      [
        3,
        "auth-service",
        "ERROR",
        103,
        "ACCOUNT_LOCKED",
        "Exceeded maximum login retries",
        "10.0.0.52",
        "2026-03-01 10:30:00",
        "2026-03-01 10:30:00"
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
    ],
    "rows": [
      [
        1,
        "billing-service",
        "INFO",
        501,
        "CHARGE_SUCCESS",
        "Charge succeeded",
        "CHARGED",
        1200.0,
        "2026-03-01 00:01:00",
        "2026-03-01 00:01:00"
      ],
      [
        2,
        "billing-service",
        "WARN",
        502,
        "CHARGE_FAILED",
        "Card charge retry failed",
        "FAILED_RETRY",
        450.0,
        "2026-03-01 00:02:00",
        "2026-03-01 00:02:00"
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
    ],
    "rows": [
      [
        1,
        1,
        "192.168.1.10",
        "/api/v2/sql/execute",
        "/api/v2/sql/execute",
        "POST",
        200,
        200,
        14.5,
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      ],
      [
        2,
        2,
        "192.168.1.15",
        "/sql/index.html",
        "/sql/index.html",
        "GET",
        200,
        200,
        22.1,
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      ],
      [
        3,
        3,
        "10.0.0.88",
        "/api/v2/auth/verify",
        "/api/v2/auth/verify",
        "POST",
        401,
        401,
        8.2,
        "curl/8.4.0"
      ],
      [
        4,
        4,
        "172.16.0.4",
        "/downloads/curriculum.pdf",
        "/downloads/curriculum.pdf",
        "GET",
        200,
        200,
        145.8,
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)"
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
    ],
    "rows": [
      [
        1,
        101,
        "/sql/index.html",
        "sess_01",
        "2026-03-01 10:00:00"
      ],
      [
        2,
        102,
        "/editor.html",
        "sess_02",
        "2026-03-01 10:05:00"
      ],
      [
        3,
        103,
        "/sql/inner-join.html",
        "sess_03",
        "2026-03-01 10:12:00"
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
    ],
    "rows": [
      [
        1,
        101,
        "run-query-btn",
        "2026-03-01 10:01:00"
      ],
      [
        2,
        102,
        "schema-filter",
        "2026-03-01 10:06:00"
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
    ],
    "rows": [
      [
        1,
        "auth-service",
        24.5,
        0.01,
        35.2,
        "2026-03-01 12:00:00"
      ],
      [
        2,
        "payment-gateway",
        68.2,
        0.0,
        42.1,
        "2026-03-01 12:00:00"
      ],
      [
        3,
        "sql-executor",
        14.8,
        0.02,
        28.6,
        "2026-03-01 12:00:00"
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
    ],
    "rows": [
      [
        "APP_ENVIRONMENT",
        "production",
        "STRING",
        "2026-01-01"
      ],
      [
        "MAX_QUERY_LIMIT",
        "1000",
        "INT",
        "2026-01-01"
      ],
      [
        "ENABLE_QUERY_CACHE",
        "true",
        "BOOLEAN",
        "2026-02-15"
      ],
      [
        "SYSTEM_TIMEZONE",
        "UTC",
        "STRING",
        "2026-01-01"
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
    ],
    "rows": [
      [
        1,
        1,
        "UPDATE",
        "employees",
        "192.168.1.10",
        "2026-03-01 11:20:00",
        "SUCCESS",
        901,
        "Verified 100% completion in system audit"
      ],
      [
        2,
        2,
        "SELECT",
        "customers",
        "192.168.1.15",
        "2026-03-01 11:25:00",
        "SUCCESS",
        902,
        "Verified 100% completion in system audit"
      ],
      [
        3,
        1,
        "INSERT",
        "sales_orders",
        "192.168.1.10",
        "2026-03-02 09:40:00",
        "SUCCESS",
        903,
        "Verified 100% completion in system audit"
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
    ],
    "rows": [
      [
        1,
        1,
        101,
        "TABLE_CREATE",
        "SYSTEM",
        1,
        "TABLE_CREATE",
        "Created orders table",
        "2025-01-01 00:00:00"
      ],
      [
        2,
        2,
        102,
        "TABLE_ALTER",
        "SYSTEM",
        2,
        "TABLE_ALTER",
        "Added column status to orders",
        "2025-03-15 12:00:00"
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
    ],
    "rows": [
      [
        1,
        1,
        101,
        "FAILED_LOGIN_SPIKE",
        "192.168.1.99",
        "Python-urllib/3.10",
        "2026-03-01 04:12:00"
      ],
      [
        2,
        2,
        102,
        "PORT_SCAN_DETECTED",
        "10.0.0.88",
        "Nmap Script Engine",
        "2026-03-01 04:15:00"
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
    ],
    "rows": [
      [
        1,
        "batch_2025_01.csv",
        1250,
        "2025-01-10"
      ],
      [
        2,
        "batch_2025_02.csv",
        890,
        "2025-02-14"
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
    ],
    "rows": [
      [
        1,
        "annual_report_2025.pdf",
        "pdf",
        4200,
        "2026-01-10"
      ],
      [
        2,
        "temp_invoice_batch.csv",
        "csv",
        150,
        "2026-02-14"
      ],
      [
        3,
        "architecture_diagram.png",
        "png",
        890,
        "2026-02-20"
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
    ],
    "rows": [
      [
        1,
        101,
        "agent_smith",
        "RESOLVED",
        45,
        "HIGH",
        "2026-03-01"
      ],
      [
        2,
        102,
        "agent_jones",
        "RESOLVED",
        90,
        "MEDIUM",
        "2026-03-02"
      ],
      [
        3,
        101,
        "agent_smith",
        "OPEN",
        0,
        "HIGH",
        "2026-03-05"
      ],
      [
        4,
        103,
        "agent_jones",
        "RESOLVED",
        25,
        "LOW",
        "2026-03-08"
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
    ],
    "rows": [
      [
        1,
        "Implement Strict SQL Error Throwing in AlaSQL",
        "David Miller",
        "CRITICAL",
        8,
        "DONE",
        "Sprint 42",
        "2026-03-15",
        "2026-03-15"
      ],
      [
        2,
        "Design High-Speed Color Tokenizer for Syntax Overlay",
        "Sarah Connor",
        "HIGH",
        5,
        "DONE",
        "Sprint 42",
        "2026-03-15",
        "2026-03-15"
      ],
      [
        3,
        "Seed Complete 150+ Enterprise Database Tables",
        "Jason Bourne",
        "HIGH",
        13,
        "IN_PROGRESS",
        "Sprint 42",
        "2026-03-16",
        null
      ],
      [
        4,
        "Deploy Dual-Layer Zero-Latency Editor Highlighting",
        "Elena Rostova",
        "MEDIUM",
        3,
        "DONE",
        "Sprint 42",
        "2026-03-14",
        "2026-03-14"
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
    ],
    "rows": [
      [
        101,
        101,
        "Dr. Robert McCoy",
        "Dr. Robert",
        "McCoy",
        "Cardiovascular Surgery",
        true,
        18,
        "Metro General"
      ],
      [
        102,
        102,
        "Dr. Meredith Grey",
        "Dr. Meredith",
        "Grey",
        "General & Trauma Surgery",
        true,
        14,
        "Grey Sloan Memorial"
      ],
      [
        103,
        103,
        "Dr. Stephen Strange",
        "Dr. Stephen",
        "Strange",
        "Neurosurgery",
        true,
        16,
        "Metro General"
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
    ],
    "rows": [
      [
        1,
        101,
        501,
        "John Doe",
        "CPT-33533",
        "Coronary Artery Bypass Graft (CABG)",
        "2026-03-02",
        240,
        "OR-1",
        "OR-1",
        "SUCCESS",
        false
      ],
      [
        2,
        102,
        502,
        "Jane Smith",
        "CPT-44970",
        "Laparoscopic Appendectomy",
        "2026-03-03",
        45,
        "OR-3",
        "OR-3",
        "SUCCESS",
        false
      ],
      [
        3,
        103,
        503,
        "Robert Brown",
        "CPT-61510",
        "Craniectomy for Brain Tumor Excision",
        "2026-03-04",
        360,
        "OR-2",
        "OR-2",
        "SUCCESS",
        true
      ],
      [
        4,
        101,
        504,
        "Alice Green",
        "CPT-33405",
        "Aortic Valve Replacement",
        "2026-03-05",
        210,
        "OR-1",
        "OR-1",
        "SUCCESS",
        false
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
    ],
    "rows": [
      [
        1,
        1,
        501,
        "John Doe",
        "2026-02-28",
        "2026-03-06",
        "2026-03-20",
        142.5,
        "HOME_HEALTHCARE"
      ],
      [
        2,
        2,
        502,
        "Jane Smith",
        "2026-03-02",
        "2026-03-04",
        "2026-03-18",
        98.0,
        "ROUTINE_HOME"
      ],
      [
        3,
        3,
        503,
        "Robert Brown",
        "2026-03-01",
        null,
        null,
        null,
        "STILL_INPATIENT"
      ],
      [
        4,
        4,
        504,
        "Alice Green",
        "2026-03-03",
        "2026-03-08",
        "2026-03-22",
        115.2,
        "REHAB_FACILITY"
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
    ],
    "rows": [
      [
        1,
        "John Doe",
        54,
        1,
        85,
        135,
        88,
        true,
        "Severe chest trauma"
      ],
      [
        2,
        "Jane Smith",
        29,
        3,
        125,
        78,
        98,
        false,
        "Distal radius fracture"
      ],
      [
        3,
        "Robert Brown",
        68,
        2,
        195,
        115,
        91,
        false,
        "Hypertensive emergency"
      ],
      [
        4,
        "Alice Green",
        42,
        1,
        90,
        140,
        85,
        true,
        "Multi-vehicle collision trauma"
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
    ],
    "rows": [
      [
        1,
        1,
        "RX-88401",
        "DRUG-ATV-20",
        "Atorvastatin",
        501,
        101,
        101,
        20,
        30,
        "2026-03-06 14:00:00"
      ],
      [
        2,
        2,
        "RX-88402",
        "DRUG-AMX-875",
        "Amoxicillin-Clavulanate",
        502,
        102,
        102,
        875,
        20,
        "2026-03-04 11:30:00"
      ],
      [
        3,
        3,
        "RX-88403",
        "DRUG-LVX-100",
        "Levothyroxine Sodium",
        503,
        103,
        103,
        100,
        90,
        "2026-03-05 09:15:00"
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
    ],
    "rows": [
      [
        1,
        "AA-104",
        "JFK",
        "LHR",
        "2026-04-01 19:30:00",
        42,
        42,
        850.0,
        850.0
      ],
      [
        2,
        "UA-882",
        "SFO",
        "HND",
        "2026-04-01 11:15:00",
        18,
        18,
        1250.0,
        1250.0
      ],
      [
        3,
        "DL-405",
        "ATL",
        "CDG",
        "2026-04-02 18:00:00",
        65,
        65,
        920.0,
        920.0
      ],
      [
        4,
        "LH-441",
        "FRA",
        "ORD",
        "2026-04-02 10:45:00",
        5,
        5,
        1480.0,
        1480.0
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
    ],
    "rows": [
      [
        1,
        "CONT-9941-US",
        "Maersk Line",
        "Maersk",
        "Shanghai",
        "Los Angeles",
        "USA",
        "Los Angeles"
      ],
      [
        2,
        "CONT-2281-EU",
        "Hapag-Lloyd",
        "DHL Express",
        "Rotterdam",
        "New York",
        "USA",
        "New York"
      ],
      [
        3,
        "CONT-7714-JP",
        "ONE Ocean Express",
        "FedEx Intl",
        "Yokohama",
        "Long Beach",
        "USA",
        "Long Beach"
      ],
      [
        4,
        "CONT-5520-BR",
        "MSC Mediterranean",
        "UPS Worldwide",
        "Santos",
        "Miami",
        "USA",
        "Miami"
      ],
      [
        5,
        "CONT-1102-SG",
        "Evergreen Marine",
        "DHL Express",
        "Singapore",
        "Oakland",
        "USA",
        "Oakland"
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
    ],
    "rows": [
      [
        1,
        "1HGCR2F83HA001234",
        "7XYZ991",
        "Honda",
        "Accord Hybrid",
        2024,
        14200
      ],
      [
        2,
        "WAUZZZF28NA005678",
        "8ABC123",
        "Audi",
        "A6 Quattro",
        2023,
        28500
      ],
      [
        3,
        "5YJ3E1EB8NF009012",
        "9EVX440",
        "Tesla",
        "Model 3 Long Range",
        2025,
        8400
      ],
      [
        4,
        "1FTFW1ED4NFA33412",
        "6TRK880",
        "Ford",
        "F-150 Lightning EV",
        2024,
        19800
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
    ],
    "rows": [
      [
        1,
        101,
        "ViperShadow",
        "ViperShadow",
        9850,
        2845,
        12,
        412,
        68.4,
        "Grandmaster",
        "NA-EAST"
      ],
      [
        2,
        102,
        "FrostByte",
        "FrostByte",
        9420,
        2790,
        8,
        389,
        65.2,
        "Grandmaster",
        "EU-WEST"
      ],
      [
        3,
        103,
        "SakuraSlash",
        "SakuraSlash",
        9150,
        2765,
        5,
        401,
        64.0,
        "Master",
        "APAC-KR"
      ],
      [
        4,
        104,
        "IronPulse",
        "IronPulse",
        8890,
        2710,
        3,
        345,
        61.8,
        "Master",
        "NA-WEST"
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
    ],
    "rows": [
      [
        1,
        "Alex",
        "Morgan",
        "alex_admin",
        "alex.morgan@edmith.com",
        "SuperAdmin",
        true,
        0,
        "2023-01-10",
        "2026-03-15 08:30:00"
      ],
      [
        2,
        "Sophia",
        "Chen",
        "sophia_lead",
        "sophia.chen@edmith.com",
        "Admin",
        true,
        0,
        "2023-03-15",
        "2026-03-15 09:12:00"
      ],
      [
        3,
        "David",
        "Miller",
        "david_dev",
        "david.miller@edmith.com",
        "Developer",
        true,
        1,
        "2023-06-20",
        "2026-03-14 17:45:00"
      ],
      [
        4,
        "Elena",
        "Rostova",
        "elena_qa",
        "elena.rostova@edmith.com",
        "Analyst",
        true,
        0,
        "2023-09-01",
        "2026-03-15 07:50:00"
      ],
      [
        5,
        "Marcus",
        "Vance",
        "marcus_guest",
        "marcus.vance@edmith.com",
        "Viewer",
        false,
        4,
        "2024-01-05",
        "2026-02-10 11:20:00"
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
    ],
    "rows": [
      [
        1,
        "alex_m",
        "alex@edmith.com",
        "+1-555-0123",
        "USA",
        "Cloud Architect & Database Lead",
        "Active"
      ],
      [
        2,
        "sophia_c",
        "sophia@edmith.com",
        "+49-89-987654",
        "Germany",
        "Senior Data Scientist",
        "Active"
      ],
      [
        3,
        "kenji_s",
        "kenji@edmith.com",
        null,
        "Japan",
        "Full Stack Engineer",
        "Active"
      ],
      [
        4,
        "elena_r",
        "elena@edmith.com",
        "+44-20-123456",
        "UK",
        "Security Researcher",
        "Active"
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
    ],
    "rows": [
      [
        1,
        1,
        "Admin",
        "2023-01-01"
      ],
      [
        2,
        2,
        "Editor",
        "2023-06-15"
      ],
      [
        3,
        3,
        "Viewer",
        "2023-11-20"
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
    ],
    "rows": [
      [
        1,
        "Super Admin",
        15,
        "Read, Write, Execute, Administer"
      ],
      [
        2,
        "Data Analyst",
        5,
        "Read, Execute Reports"
      ],
      [
        3,
        "Auditor",
        4,
        "Read Only Access"
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
    ],
    "rows": [
      [
        1,
        999,
        "Malicious SQL Injection Attempt",
        "2026-01-15"
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
    ],
    "rows": [
      [
        1,
        "alex_admin",
        "$2a$12$e8x...h9K",
        true,
        true
      ],
      [
        2,
        "sophia_lead",
        "$2a$12$k2L...p4Q",
        true,
        true
      ],
      [
        3,
        "david_dev",
        "$2a$12$m9P...q1W",
        true,
        false
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
    ],
    "rows": [
      [
        1,
        "alex.personal@gmail.com",
        "alex@edmith.com",
        "+1-555-0199",
        "accounts@edmith.com"
      ],
      [
        2,
        null,
        "sophia@edmith.com",
        "+1-555-0142",
        "finance@chen-holdings.com"
      ],
      [
        3,
        "david.k@outlook.com",
        null,
        null,
        "billing@kim-tech.io"
      ],
      [
        4,
        null,
        "elena@edmith.com",
        "+1-555-0188",
        null
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
    ],
    "rows": [
      [
        1,
        "Enterprise Lifetime",
        true,
        "2099-12-31"
      ],
      [
        99,
        "Expired Monthly",
        false,
        "2024-12-01"
      ],
      [
        105,
        "Trial Tier",
        false,
        "2025-01-10"
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
    ],
    "rows": [
      [
        "sess_abc123",
        1,
        5003,
        "192.168.1.10",
        "2026-03-01 10:00:00"
      ],
      [
        "sess_xyz789",
        2,
        5020,
        "192.168.1.25",
        "2026-03-01 11:30:00"
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
    ],
    "rows": [
      [
        1,
        101,
        "PAGE_RENDER",
        4,
        "2026-03-01 10:00:00"
      ],
      [
        2,
        102,
        "QUERY_RUN",
        1,
        "2026-03-01 10:05:00"
      ],
      [
        3,
        103,
        "DOWNLOAD_CSV",
        8,
        "2026-03-01 10:15:00"
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
    ],
    "rows": [
      [
        1,
        101,
        "2026-02-01",
        135000.0
      ],
      [
        2,
        101,
        "2026-03-01",
        142500.5
      ],
      [
        3,
        102,
        "2026-02-01",
        340000.0
      ],
      [
        4,
        102,
        "2026-03-01",
        350000.0
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
    ],
    "rows": [
      [
        1,
        "alex@edmith.com",
        "Alex",
        "Enterprise Pro",
        99.0,
        "Active"
      ],
      [
        2,
        "sophia@edmith.com",
        "Sophia",
        "Business Plus",
        49.0,
        "Active"
      ],
      [
        3,
        "marcus@edmith.com",
        "Marcus",
        "Starter Plan",
        19.0,
        "Active"
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
    ],
    "rows": [
      [
        1,
        101,
        "Cloud Enterprise",
        1200.0,
        "Active"
      ],
      [
        2,
        102,
        "Security Suite",
        850.0,
        "Active"
      ],
      [
        3,
        103,
        "Developer Pro",
        450.0,
        "Active"
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
    ],
    "rows": [
      [
        1,
        1,
        101,
        1000,
        "read_write"
      ],
      [
        2,
        2,
        101,
        500,
        "read_only"
      ],
      [
        3,
        3,
        102,
        2500,
        "admin"
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
    ],
    "rows": [
      [
        1,
        "dev_master",
        false,
        450,
        "2024-01-10"
      ],
      [
        2,
        "spammer_99",
        true,
        -20,
        "2025-06-12"
      ],
      [
        3,
        "code_ninja",
        false,
        890,
        "2023-11-20"
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
    ],
    "rows": [
      [
        1,
        "Sarah Connor",
        "Diamond VIP",
        14500,
        "Active"
      ],
      [
        2,
        "David Miller",
        "Platinum",
        8200,
        "Active"
      ],
      [
        3,
        "Elena Rostova",
        "Gold",
        4100,
        "Active"
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
    ],
    "rows": [
      [
        1,
        "alex@edmith.com",
        "Alex",
        "Homepage Banner",
        "2026-02-14"
      ],
      [
        2,
        "dev@acme.com",
        "Devon",
        "Blog Post #12",
        "2026-02-18"
      ],
      [
        3,
        "cto@globalcorp.io",
        "Catherine",
        "Webinar Q1",
        "2026-03-01"
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
    ],
    "rows": [
      [
        1,
        "Stark Industries",
        "ENTERPRISE",
        "Enterprise Unlimited",
        true,
        450
      ],
      [
        2,
        "Wayne Enterprises",
        "ENTERPRISE",
        "Enterprise Unlimited",
        true,
        800
      ],
      [
        3,
        "Cyberdyne Systems",
        "SUSPENDED",
        "Suspended Tier",
        false,
        50
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
    ],
    "rows": [
      [
        1,
        "Paris Champs-Elysees Flagship",
        "Paris",
        "France",
        "Jean Dupont"
      ],
      [
        2,
        "Nice Promenade Store",
        "Nice",
        "France",
        "Claire Martin"
      ],
      [
        3,
        "London Oxford St",
        "London",
        "UK",
        "James Wright"
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
    ],
    "rows": [
      [
        1,
        "Enterprise Software",
        "Sarah Connor",
        45000.0,
        "2026-02-15"
      ],
      [
        2,
        "Cloud Infrastructure",
        "David Miller",
        78000.0,
        "2026-02-20"
      ],
      [
        3,
        "Security Systems",
        "Jason Bourne",
        62000.0,
        "2026-02-25"
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
    ],
    "rows": [
      [
        901,
        "Defunct Media LLC",
        "Non-payment",
        "2025-10-01"
      ],
      [
        902,
        "ScamShield Dummy Corp",
        "Terms Violation",
        "2025-11-15"
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
    ],
    "rows": [
      [
        1,
        101,
        850000.0,
        "2024-01-01",
        2027
      ],
      [
        2,
        102,
        1200000.0,
        "2023-06-01",
        2026
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
    ],
    "rows": [
      [
        1,
        5001,
        101,
        4850.0,
        "2026-03-01"
      ],
      [
        2,
        5004,
        104,
        7890.0,
        "2026-03-01"
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
    ],
    "rows": [
      [
        1,
        99,
        "2024-11-10",
        "192.168.1.144"
      ],
      [
        2,
        105,
        "2025-01-05",
        "10.0.0.52"
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
    ],
    "rows": [
      [
        1,
        "Nordic Telecomm",
        "Sweden",
        2400000.0,
        450000.0
      ],
      [
        2,
        "Swiss Private Bank",
        "Switzerland",
        8500000.0,
        1200000.0
      ],
      [
        3,
        "Tokyo Cloud Corp",
        "Japan",
        3900000.0,
        680000.0
      ],
      [
        4,
        "Singapore FinTech Labs",
        "Singapore",
        1800000.0,
        310000.0
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
    ],
    "rows": [
      [
        "Example Value A",
        101,
        99.5
      ],
      [
        "Example Value B",
        102,
        149.0
      ]
    ]
  }
};

// Create global singleton instance
window.edmithSql = new EdmithSqlEngine();
