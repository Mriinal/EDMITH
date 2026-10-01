// EDMITH ETL Testing Assessment Question Bank (225 MCQs)
window.ETL_BASIC_QUESTIONS = [
  {
    "id": 1,
    "category": "ETL Basics",
    "difficulty": "Easy",
    "round": 1,
    "question": "What does the acronym ETL stand for?",
    "options": [
      "Extract, Transform, Load",
      "Evaluate, Transfer, Link",
      "Execute, Test, Log",
      "Export, Transmit, Lock"
    ],
    "correctAnswer": 0
  },
  {
    "id": 2,
    "category": "Data Warehousing",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is the primary purpose of a Data Warehouse in enterprise engineering?",
    "options": [
      "To provide a centralized, subject-oriented, integrated repository for analytical reporting and decision-making",
      "To replace live transaction processing databases",
      "To store temporary cache files only",
      "To host source code repositories"
    ],
    "correctAnswer": 0
  },
  {
    "id": 3,
    "category": "Extraction",
    "difficulty": "Easy",
    "round": 1,
    "question": "What occurs during the 'Extract' phase of an ETL pipeline?",
    "options": [
      "Data is ingested or extracted from various heterogeneous source systems",
      "Data is encrypted and purged",
      "Data is committed into production tables",
      "Reports are printed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 4,
    "category": "Transformation",
    "difficulty": "Easy",
    "round": 1,
    "question": "What occurs during the 'Transform' phase of an ETL pipeline?",
    "options": [
      "Data is cleaned, standardized, validated, aggregated, and mapped to target business rules",
      "Data is physically archived to tape",
      "Data is erased from source systems",
      "Database users are created"
    ],
    "correctAnswer": 0
  },
  {
    "id": 5,
    "category": "Loading",
    "difficulty": "Easy",
    "round": 1,
    "question": "What occurs during the 'Load' phase of an ETL pipeline?",
    "options": [
      "Transformed data is written into target tables, staging areas, or data marts",
      "Source databases are dropped",
      "Indexes are permanently deleted",
      "Network connections are closed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 6,
    "category": "Data Staging",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is the purpose of an ETL Staging Area?",
    "options": [
      "A temporary storage landing zone where source data can be validated and transformed without impacting source systems",
      "The permanent client reporting dashboard",
      "The cold tape backup zone",
      "A public file directory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 7,
    "category": "Schemas",
    "difficulty": "Easy",
    "round": 1,
    "question": "Which schema design centers a fact table surrounded by non-normalized dimension tables?",
    "options": [
      "Star Schema",
      "Snowflake Schema",
      "Third Normal Form",
      "Flat CSV layout"
    ],
    "correctAnswer": 0
  },
  {
    "id": 8,
    "category": "Fact Tables",
    "difficulty": "Easy",
    "round": 1,
    "question": "What primarily constitutes a Fact Table in dimensional modeling?",
    "options": [
      "Quantitative business metrics (measures) and foreign keys referencing dimension tables",
      "Customer names and addresses only",
      "Source system connection strings",
      "Audit log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 9,
    "category": "Dimension Tables",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is the primary role of Dimension Tables in a Data Warehouse?",
    "options": [
      "To provide contextual, descriptive business attributes (Who, What, Where, When) filtering facts",
      "To calculate CPU utilization",
      "To store backup logs",
      "To store SQL queries"
    ],
    "correctAnswer": 0
  },
  {
    "id": 10,
    "category": "Surrogate Keys",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is a Surrogate Key in Data Warehousing?",
    "options": [
      "A sequential artificial integer primary key with no business meaning used to uniquely identify dimension records",
      "A natural business key from the source",
      "A database user password",
      "A foreign key to the source CRM"
    ],
    "correctAnswer": 0
  },
  {
    "id": 11,
    "category": "Natural Keys",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is a Natural Key in ETL pipelines?",
    "options": [
      "A primary key originating from the source transactional system (e.g. customer_ssn, order_id)",
      "A surrogate key generated in DW",
      "A database port number",
      "An auto-increment sequence"
    ],
    "correctAnswer": 0
  },
  {
    "id": 12,
    "category": "Data Quality",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is the objective of Record Count Reconciliation testing in ETL QA?",
    "options": [
      "Verifying that the count of extracted records matches expected target records accounting for filtered rows",
      "Counting the lines of SQL scripts",
      "Measuring network speed",
      "Counting active database connections"
    ],
    "correctAnswer": 0
  },
  {
    "id": 13,
    "category": "Null Testing",
    "difficulty": "Easy",
    "round": 1,
    "question": "Why are Mandatory/NOT NULL constraint checks performed during ETL testing?",
    "options": [
      "To ensure critical business keys and non-nullable dimensions are never loaded with NULL values",
      "To speed up hard drives",
      "To save table space",
      "To prevent table creation"
    ],
    "correctAnswer": 0
  },
  {
    "id": 14,
    "category": "Duplicate Testing",
    "difficulty": "Easy",
    "round": 1,
    "question": "Which SQL query pattern is typically used to detect duplicate primary keys in a target table?",
    "options": [
      "SELECT pk, COUNT(*) FROM target GROUP BY pk HAVING COUNT(*) > 1;",
      "SELECT * FROM target WHERE pk IS NULL;",
      "SELECT DISTINCT pk FROM target;",
      "SELECT pk FROM target ORDER BY pk;"
    ],
    "correctAnswer": 0
  },
  {
    "id": 15,
    "category": "Truncation",
    "difficulty": "Easy",
    "round": 1,
    "question": "What is a Data Truncation defect in ETL testing?",
    "options": [
      "When string data exceeds column width limits and is sliced off, losing critical characters",
      "When a file is encrypted",
      "When an index is rebuilt",
      "When a query finishes early"
    ],
    "correctAnswer": 0
  },
  {
    "id": 16,
    "category": "ETL Basics",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What does the acronym ETL stand for?",
    "options": [
      "Extract, Transform, Load",
      "Evaluate, Transfer, Link",
      "Execute, Test, Log",
      "Export, Transmit, Lock"
    ],
    "correctAnswer": 0
  },
  {
    "id": 17,
    "category": "Data Warehousing",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is the primary purpose of a Data Warehouse in enterprise engineering?",
    "options": [
      "To provide a centralized, subject-oriented, integrated repository for analytical reporting and decision-making",
      "To replace live transaction processing databases",
      "To store temporary cache files only",
      "To host source code repositories"
    ],
    "correctAnswer": 0
  },
  {
    "id": 18,
    "category": "Extraction",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What occurs during the 'Extract' phase of an ETL pipeline?",
    "options": [
      "Data is ingested or extracted from various heterogeneous source systems",
      "Data is encrypted and purged",
      "Data is committed into production tables",
      "Reports are printed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 19,
    "category": "Transformation",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What occurs during the 'Transform' phase of an ETL pipeline?",
    "options": [
      "Data is cleaned, standardized, validated, aggregated, and mapped to target business rules",
      "Data is physically archived to tape",
      "Data is erased from source systems",
      "Database users are created"
    ],
    "correctAnswer": 0
  },
  {
    "id": 20,
    "category": "Loading",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What occurs during the 'Load' phase of an ETL pipeline?",
    "options": [
      "Transformed data is written into target tables, staging areas, or data marts",
      "Source databases are dropped",
      "Indexes are permanently deleted",
      "Network connections are closed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 21,
    "category": "Data Staging",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is the purpose of an ETL Staging Area?",
    "options": [
      "A temporary storage landing zone where source data can be validated and transformed without impacting source systems",
      "The permanent client reporting dashboard",
      "The cold tape backup zone",
      "A public file directory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 22,
    "category": "Schemas",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] Which schema design centers a fact table surrounded by non-normalized dimension tables?",
    "options": [
      "Star Schema",
      "Snowflake Schema",
      "Third Normal Form",
      "Flat CSV layout"
    ],
    "correctAnswer": 0
  },
  {
    "id": 23,
    "category": "Fact Tables",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What primarily constitutes a Fact Table in dimensional modeling?",
    "options": [
      "Quantitative business metrics (measures) and foreign keys referencing dimension tables",
      "Customer names and addresses only",
      "Source system connection strings",
      "Audit log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 24,
    "category": "Dimension Tables",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is the primary role of Dimension Tables in a Data Warehouse?",
    "options": [
      "To provide contextual, descriptive business attributes (Who, What, Where, When) filtering facts",
      "To calculate CPU utilization",
      "To store backup logs",
      "To store SQL queries"
    ],
    "correctAnswer": 0
  },
  {
    "id": 25,
    "category": "Surrogate Keys",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is a Surrogate Key in Data Warehousing?",
    "options": [
      "A sequential artificial integer primary key with no business meaning used to uniquely identify dimension records",
      "A natural business key from the source",
      "A database user password",
      "A foreign key to the source CRM"
    ],
    "correctAnswer": 0
  },
  {
    "id": 26,
    "category": "Natural Keys",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is a Natural Key in ETL pipelines?",
    "options": [
      "A primary key originating from the source transactional system (e.g. customer_ssn, order_id)",
      "A surrogate key generated in DW",
      "A database port number",
      "An auto-increment sequence"
    ],
    "correctAnswer": 0
  },
  {
    "id": 27,
    "category": "Data Quality",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is the objective of Record Count Reconciliation testing in ETL QA?",
    "options": [
      "Verifying that the count of extracted records matches expected target records accounting for filtered rows",
      "Counting the lines of SQL scripts",
      "Measuring network speed",
      "Counting active database connections"
    ],
    "correctAnswer": 0
  },
  {
    "id": 28,
    "category": "Null Testing",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] Why are Mandatory/NOT NULL constraint checks performed during ETL testing?",
    "options": [
      "To ensure critical business keys and non-nullable dimensions are never loaded with NULL values",
      "To speed up hard drives",
      "To save table space",
      "To prevent table creation"
    ],
    "correctAnswer": 0
  },
  {
    "id": 29,
    "category": "Duplicate Testing",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] Which SQL query pattern is typically used to detect duplicate primary keys in a target table?",
    "options": [
      "SELECT pk, COUNT(*) FROM target GROUP BY pk HAVING COUNT(*) > 1;",
      "SELECT * FROM target WHERE pk IS NULL;",
      "SELECT DISTINCT pk FROM target;",
      "SELECT pk FROM target ORDER BY pk;"
    ],
    "correctAnswer": 0
  },
  {
    "id": 30,
    "category": "Truncation",
    "difficulty": "Easy",
    "round": 2,
    "question": "[Round 2] What is a Data Truncation defect in ETL testing?",
    "options": [
      "When string data exceeds column width limits and is sliced off, losing critical characters",
      "When a file is encrypted",
      "When an index is rebuilt",
      "When a query finishes early"
    ],
    "correctAnswer": 0
  },
  {
    "id": 31,
    "category": "ETL Basics",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What does the acronym ETL stand for?",
    "options": [
      "Extract, Transform, Load",
      "Evaluate, Transfer, Link",
      "Execute, Test, Log",
      "Export, Transmit, Lock"
    ],
    "correctAnswer": 0
  },
  {
    "id": 32,
    "category": "Data Warehousing",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is the primary purpose of a Data Warehouse in enterprise engineering?",
    "options": [
      "To provide a centralized, subject-oriented, integrated repository for analytical reporting and decision-making",
      "To replace live transaction processing databases",
      "To store temporary cache files only",
      "To host source code repositories"
    ],
    "correctAnswer": 0
  },
  {
    "id": 33,
    "category": "Extraction",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What occurs during the 'Extract' phase of an ETL pipeline?",
    "options": [
      "Data is ingested or extracted from various heterogeneous source systems",
      "Data is encrypted and purged",
      "Data is committed into production tables",
      "Reports are printed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 34,
    "category": "Transformation",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What occurs during the 'Transform' phase of an ETL pipeline?",
    "options": [
      "Data is cleaned, standardized, validated, aggregated, and mapped to target business rules",
      "Data is physically archived to tape",
      "Data is erased from source systems",
      "Database users are created"
    ],
    "correctAnswer": 0
  },
  {
    "id": 35,
    "category": "Loading",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What occurs during the 'Load' phase of an ETL pipeline?",
    "options": [
      "Transformed data is written into target tables, staging areas, or data marts",
      "Source databases are dropped",
      "Indexes are permanently deleted",
      "Network connections are closed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 36,
    "category": "Data Staging",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is the purpose of an ETL Staging Area?",
    "options": [
      "A temporary storage landing zone where source data can be validated and transformed without impacting source systems",
      "The permanent client reporting dashboard",
      "The cold tape backup zone",
      "A public file directory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 37,
    "category": "Schemas",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] Which schema design centers a fact table surrounded by non-normalized dimension tables?",
    "options": [
      "Star Schema",
      "Snowflake Schema",
      "Third Normal Form",
      "Flat CSV layout"
    ],
    "correctAnswer": 0
  },
  {
    "id": 38,
    "category": "Fact Tables",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What primarily constitutes a Fact Table in dimensional modeling?",
    "options": [
      "Quantitative business metrics (measures) and foreign keys referencing dimension tables",
      "Customer names and addresses only",
      "Source system connection strings",
      "Audit log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 39,
    "category": "Dimension Tables",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is the primary role of Dimension Tables in a Data Warehouse?",
    "options": [
      "To provide contextual, descriptive business attributes (Who, What, Where, When) filtering facts",
      "To calculate CPU utilization",
      "To store backup logs",
      "To store SQL queries"
    ],
    "correctAnswer": 0
  },
  {
    "id": 40,
    "category": "Surrogate Keys",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is a Surrogate Key in Data Warehousing?",
    "options": [
      "A sequential artificial integer primary key with no business meaning used to uniquely identify dimension records",
      "A natural business key from the source",
      "A database user password",
      "A foreign key to the source CRM"
    ],
    "correctAnswer": 0
  },
  {
    "id": 41,
    "category": "Natural Keys",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is a Natural Key in ETL pipelines?",
    "options": [
      "A primary key originating from the source transactional system (e.g. customer_ssn, order_id)",
      "A surrogate key generated in DW",
      "A database port number",
      "An auto-increment sequence"
    ],
    "correctAnswer": 0
  },
  {
    "id": 42,
    "category": "Data Quality",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is the objective of Record Count Reconciliation testing in ETL QA?",
    "options": [
      "Verifying that the count of extracted records matches expected target records accounting for filtered rows",
      "Counting the lines of SQL scripts",
      "Measuring network speed",
      "Counting active database connections"
    ],
    "correctAnswer": 0
  },
  {
    "id": 43,
    "category": "Null Testing",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] Why are Mandatory/NOT NULL constraint checks performed during ETL testing?",
    "options": [
      "To ensure critical business keys and non-nullable dimensions are never loaded with NULL values",
      "To speed up hard drives",
      "To save table space",
      "To prevent table creation"
    ],
    "correctAnswer": 0
  },
  {
    "id": 44,
    "category": "Duplicate Testing",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] Which SQL query pattern is typically used to detect duplicate primary keys in a target table?",
    "options": [
      "SELECT pk, COUNT(*) FROM target GROUP BY pk HAVING COUNT(*) > 1;",
      "SELECT * FROM target WHERE pk IS NULL;",
      "SELECT DISTINCT pk FROM target;",
      "SELECT pk FROM target ORDER BY pk;"
    ],
    "correctAnswer": 0
  },
  {
    "id": 45,
    "category": "Truncation",
    "difficulty": "Easy",
    "round": 3,
    "question": "[Round 3] What is a Data Truncation defect in ETL testing?",
    "options": [
      "When string data exceeds column width limits and is sliced off, losing critical characters",
      "When a file is encrypted",
      "When an index is rebuilt",
      "When a query finishes early"
    ],
    "correctAnswer": 0
  },
  {
    "id": 46,
    "category": "ETL Basics",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What does the acronym ETL stand for?",
    "options": [
      "Extract, Transform, Load",
      "Evaluate, Transfer, Link",
      "Execute, Test, Log",
      "Export, Transmit, Lock"
    ],
    "correctAnswer": 0
  },
  {
    "id": 47,
    "category": "Data Warehousing",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is the primary purpose of a Data Warehouse in enterprise engineering?",
    "options": [
      "To provide a centralized, subject-oriented, integrated repository for analytical reporting and decision-making",
      "To replace live transaction processing databases",
      "To store temporary cache files only",
      "To host source code repositories"
    ],
    "correctAnswer": 0
  },
  {
    "id": 48,
    "category": "Extraction",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What occurs during the 'Extract' phase of an ETL pipeline?",
    "options": [
      "Data is ingested or extracted from various heterogeneous source systems",
      "Data is encrypted and purged",
      "Data is committed into production tables",
      "Reports are printed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 49,
    "category": "Transformation",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What occurs during the 'Transform' phase of an ETL pipeline?",
    "options": [
      "Data is cleaned, standardized, validated, aggregated, and mapped to target business rules",
      "Data is physically archived to tape",
      "Data is erased from source systems",
      "Database users are created"
    ],
    "correctAnswer": 0
  },
  {
    "id": 50,
    "category": "Loading",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What occurs during the 'Load' phase of an ETL pipeline?",
    "options": [
      "Transformed data is written into target tables, staging areas, or data marts",
      "Source databases are dropped",
      "Indexes are permanently deleted",
      "Network connections are closed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 51,
    "category": "Data Staging",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is the purpose of an ETL Staging Area?",
    "options": [
      "A temporary storage landing zone where source data can be validated and transformed without impacting source systems",
      "The permanent client reporting dashboard",
      "The cold tape backup zone",
      "A public file directory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 52,
    "category": "Schemas",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] Which schema design centers a fact table surrounded by non-normalized dimension tables?",
    "options": [
      "Star Schema",
      "Snowflake Schema",
      "Third Normal Form",
      "Flat CSV layout"
    ],
    "correctAnswer": 0
  },
  {
    "id": 53,
    "category": "Fact Tables",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What primarily constitutes a Fact Table in dimensional modeling?",
    "options": [
      "Quantitative business metrics (measures) and foreign keys referencing dimension tables",
      "Customer names and addresses only",
      "Source system connection strings",
      "Audit log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 54,
    "category": "Dimension Tables",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is the primary role of Dimension Tables in a Data Warehouse?",
    "options": [
      "To provide contextual, descriptive business attributes (Who, What, Where, When) filtering facts",
      "To calculate CPU utilization",
      "To store backup logs",
      "To store SQL queries"
    ],
    "correctAnswer": 0
  },
  {
    "id": 55,
    "category": "Surrogate Keys",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is a Surrogate Key in Data Warehousing?",
    "options": [
      "A sequential artificial integer primary key with no business meaning used to uniquely identify dimension records",
      "A natural business key from the source",
      "A database user password",
      "A foreign key to the source CRM"
    ],
    "correctAnswer": 0
  },
  {
    "id": 56,
    "category": "Natural Keys",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is a Natural Key in ETL pipelines?",
    "options": [
      "A primary key originating from the source transactional system (e.g. customer_ssn, order_id)",
      "A surrogate key generated in DW",
      "A database port number",
      "An auto-increment sequence"
    ],
    "correctAnswer": 0
  },
  {
    "id": 57,
    "category": "Data Quality",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is the objective of Record Count Reconciliation testing in ETL QA?",
    "options": [
      "Verifying that the count of extracted records matches expected target records accounting for filtered rows",
      "Counting the lines of SQL scripts",
      "Measuring network speed",
      "Counting active database connections"
    ],
    "correctAnswer": 0
  },
  {
    "id": 58,
    "category": "Null Testing",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] Why are Mandatory/NOT NULL constraint checks performed during ETL testing?",
    "options": [
      "To ensure critical business keys and non-nullable dimensions are never loaded with NULL values",
      "To speed up hard drives",
      "To save table space",
      "To prevent table creation"
    ],
    "correctAnswer": 0
  },
  {
    "id": 59,
    "category": "Duplicate Testing",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] Which SQL query pattern is typically used to detect duplicate primary keys in a target table?",
    "options": [
      "SELECT pk, COUNT(*) FROM target GROUP BY pk HAVING COUNT(*) > 1;",
      "SELECT * FROM target WHERE pk IS NULL;",
      "SELECT DISTINCT pk FROM target;",
      "SELECT pk FROM target ORDER BY pk;"
    ],
    "correctAnswer": 0
  },
  {
    "id": 60,
    "category": "Truncation",
    "difficulty": "Easy",
    "round": 4,
    "question": "[Round 4] What is a Data Truncation defect in ETL testing?",
    "options": [
      "When string data exceeds column width limits and is sliced off, losing critical characters",
      "When a file is encrypted",
      "When an index is rebuilt",
      "When a query finishes early"
    ],
    "correctAnswer": 0
  },
  {
    "id": 61,
    "category": "ETL Basics",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What does the acronym ETL stand for?",
    "options": [
      "Extract, Transform, Load",
      "Evaluate, Transfer, Link",
      "Execute, Test, Log",
      "Export, Transmit, Lock"
    ],
    "correctAnswer": 0
  },
  {
    "id": 62,
    "category": "Data Warehousing",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is the primary purpose of a Data Warehouse in enterprise engineering?",
    "options": [
      "To provide a centralized, subject-oriented, integrated repository for analytical reporting and decision-making",
      "To replace live transaction processing databases",
      "To store temporary cache files only",
      "To host source code repositories"
    ],
    "correctAnswer": 0
  },
  {
    "id": 63,
    "category": "Extraction",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What occurs during the 'Extract' phase of an ETL pipeline?",
    "options": [
      "Data is ingested or extracted from various heterogeneous source systems",
      "Data is encrypted and purged",
      "Data is committed into production tables",
      "Reports are printed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 64,
    "category": "Transformation",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What occurs during the 'Transform' phase of an ETL pipeline?",
    "options": [
      "Data is cleaned, standardized, validated, aggregated, and mapped to target business rules",
      "Data is physically archived to tape",
      "Data is erased from source systems",
      "Database users are created"
    ],
    "correctAnswer": 0
  },
  {
    "id": 65,
    "category": "Loading",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What occurs during the 'Load' phase of an ETL pipeline?",
    "options": [
      "Transformed data is written into target tables, staging areas, or data marts",
      "Source databases are dropped",
      "Indexes are permanently deleted",
      "Network connections are closed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 66,
    "category": "Data Staging",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is the purpose of an ETL Staging Area?",
    "options": [
      "A temporary storage landing zone where source data can be validated and transformed without impacting source systems",
      "The permanent client reporting dashboard",
      "The cold tape backup zone",
      "A public file directory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 67,
    "category": "Schemas",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] Which schema design centers a fact table surrounded by non-normalized dimension tables?",
    "options": [
      "Star Schema",
      "Snowflake Schema",
      "Third Normal Form",
      "Flat CSV layout"
    ],
    "correctAnswer": 0
  },
  {
    "id": 68,
    "category": "Fact Tables",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What primarily constitutes a Fact Table in dimensional modeling?",
    "options": [
      "Quantitative business metrics (measures) and foreign keys referencing dimension tables",
      "Customer names and addresses only",
      "Source system connection strings",
      "Audit log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 69,
    "category": "Dimension Tables",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is the primary role of Dimension Tables in a Data Warehouse?",
    "options": [
      "To provide contextual, descriptive business attributes (Who, What, Where, When) filtering facts",
      "To calculate CPU utilization",
      "To store backup logs",
      "To store SQL queries"
    ],
    "correctAnswer": 0
  },
  {
    "id": 70,
    "category": "Surrogate Keys",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is a Surrogate Key in Data Warehousing?",
    "options": [
      "A sequential artificial integer primary key with no business meaning used to uniquely identify dimension records",
      "A natural business key from the source",
      "A database user password",
      "A foreign key to the source CRM"
    ],
    "correctAnswer": 0
  },
  {
    "id": 71,
    "category": "Natural Keys",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is a Natural Key in ETL pipelines?",
    "options": [
      "A primary key originating from the source transactional system (e.g. customer_ssn, order_id)",
      "A surrogate key generated in DW",
      "A database port number",
      "An auto-increment sequence"
    ],
    "correctAnswer": 0
  },
  {
    "id": 72,
    "category": "Data Quality",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is the objective of Record Count Reconciliation testing in ETL QA?",
    "options": [
      "Verifying that the count of extracted records matches expected target records accounting for filtered rows",
      "Counting the lines of SQL scripts",
      "Measuring network speed",
      "Counting active database connections"
    ],
    "correctAnswer": 0
  },
  {
    "id": 73,
    "category": "Null Testing",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] Why are Mandatory/NOT NULL constraint checks performed during ETL testing?",
    "options": [
      "To ensure critical business keys and non-nullable dimensions are never loaded with NULL values",
      "To speed up hard drives",
      "To save table space",
      "To prevent table creation"
    ],
    "correctAnswer": 0
  },
  {
    "id": 74,
    "category": "Duplicate Testing",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] Which SQL query pattern is typically used to detect duplicate primary keys in a target table?",
    "options": [
      "SELECT pk, COUNT(*) FROM target GROUP BY pk HAVING COUNT(*) > 1;",
      "SELECT * FROM target WHERE pk IS NULL;",
      "SELECT DISTINCT pk FROM target;",
      "SELECT pk FROM target ORDER BY pk;"
    ],
    "correctAnswer": 0
  },
  {
    "id": 75,
    "category": "Truncation",
    "difficulty": "Easy",
    "round": 5,
    "question": "[Round 5] What is a Data Truncation defect in ETL testing?",
    "options": [
      "When string data exceeds column width limits and is sliced off, losing critical characters",
      "When a file is encrypted",
      "When an index is rebuilt",
      "When a query finishes early"
    ],
    "correctAnswer": 0
  },
  {
    "id": 101,
    "category": "SCD Types",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is a Slowly Changing Dimension (SCD) Type 1?",
    "options": [
      "An overwrite method where old values are replaced with new values, maintaining zero historical tracking",
      "Adding a new row with date tracking",
      "Creating a separate history table",
      "Preserving only original values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 102,
    "category": "SCD Type 2",
    "difficulty": "Medium",
    "round": 1,
    "question": "How does an SCD Type 2 dimension preserve historical record accuracy?",
    "options": [
      "By creating a new record row with versioning flags (is_current) and effective date ranges (start_date, end_date)",
      "By overwriting the existing row",
      "By appending a new column",
      "By deleting the table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 103,
    "category": "SCD Type 3",
    "difficulty": "Medium",
    "round": 1,
    "question": "How does an SCD Type 3 dimension track historical changes?",
    "options": [
      "By maintaining a 'previous_value' and 'current_value' column within the existing record",
      "By creating infinite historical rows",
      "By generating surrogate keys only",
      "By logging changes to text files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 104,
    "category": "Snowflake Schema",
    "difficulty": "Medium",
    "round": 1,
    "question": "What characterizes a Snowflake Schema compared to a Star Schema?",
    "options": [
      "Dimension tables are normalized into multiple related sub-tables (e.g., product -> subcategory -> category)",
      "It contains no fact tables",
      "It uses only one single flat table",
      "It is stored entirely in memory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 105,
    "category": "Incremental Loading",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is the purpose of a High Watermark or Timestamp column in incremental ETL?",
    "options": [
      "To extract only records created or modified since the last successful pipeline execution",
      "To measure database RAM usage",
      "To record database user logins",
      "To clean up temporary logs"
    ],
    "correctAnswer": 0
  },
  {
    "id": 106,
    "category": "Reconciliation",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is Source-to-Target Data Reconciliation testing?",
    "options": [
      "Comparing aggregate metrics (e.g. SUM, AVG) between source and target systems to verify zero financial variance",
      "Running unit tests on HTML templates",
      "Testing website latency",
      "Checking network cables"
    ],
    "correctAnswer": 0
  },
  {
    "id": 107,
    "category": "Data Lineage",
    "difficulty": "Medium",
    "round": 1,
    "question": "What does Data Lineage describe in enterprise data architecture?",
    "options": [
      "The complete lifecycle, flow, and transformation path of data from origin systems to final reporting dashboards",
      "The SQL version history",
      "The hardware manufacturing date",
      "The software license expiry"
    ],
    "correctAnswer": 0
  },
  {
    "id": 108,
    "category": "ELT vs ETL",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is the primary architectural difference between ETL and ELT?",
    "options": [
      "ELT loads raw data into the target warehouse first and uses the warehouse's MPP compute engine for transformations",
      "ETL does not transform data",
      "ELT only works on CSV files",
      "ELT does not support databases"
    ],
    "correctAnswer": 0
  },
  {
    "id": 109,
    "category": "Factless Facts",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is a Factless Fact Table in Kimball dimensional modeling?",
    "options": [
      "A fact table that contains no numeric measures, capturing events or relationships (e.g. student course attendance)",
      "A table with no primary key",
      "A dimension table without names",
      "An empty database table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 110,
    "category": "Granularity",
    "difficulty": "Medium",
    "round": 1,
    "question": "What does 'Grain' define in a dimensional fact table?",
    "options": [
      "The exact level of detail or atomic event represented by a single row in the fact table",
      "The size of database storage blocks",
      "The number of users allowed",
      "The speed of ETL pipelines"
    ],
    "correctAnswer": 0
  },
  {
    "id": 111,
    "category": "CDC",
    "difficulty": "Medium",
    "round": 1,
    "question": "What does Change Data Capture (CDC) achieve in modern data integration?",
    "options": [
      "Detects and streams real-time row-level changes (INSERT, UPDATE, DELETE) directly from database transaction logs",
      "Deletes old records",
      "Re-indexes database clusters",
      "Compresses log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 112,
    "category": "Data Profiling",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is the goal of exploratory Data Profiling prior to writing ETL transformation mappings?",
    "options": [
      "Analyzing source data for value distributions, null frequencies, format patterns, and anomalies",
      "Writing final production ETL jobs",
      "Testing hardware reliability",
      "Installing database servers"
    ],
    "correctAnswer": 0
  },
  {
    "id": 113,
    "category": "Boundary Testing",
    "difficulty": "Medium",
    "round": 1,
    "question": "Why are Boundary Value Tests executed on transformed numeric columns in ETL?",
    "options": [
      "To confirm precision and scale limits (e.g., DECIMAL(10,2)) do not cause overflow or rounding errors",
      "To check screen brightness",
      "To test keyboard inputs",
      "To verify network firewall rules"
    ],
    "correctAnswer": 0
  },
  {
    "id": 114,
    "category": "Junk Dimensions",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is a Junk Dimension in Data Warehousing?",
    "options": [
      "A single dimension combining miscellaneous low-cardinality flags and indicators to avoid cluttering fact tables",
      "A corrupted database table",
      "An unindexed staging table",
      "A deleted table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 115,
    "category": "Degenerate Dimensions",
    "difficulty": "Medium",
    "round": 1,
    "question": "What is a Degenerate Dimension?",
    "options": [
      "A dimension key stored directly in the fact table without a corresponding dimension table (e.g. order_number)",
      "A table containing corrupt records",
      "A dimension with no primary key",
      "A foreign key to nowhere"
    ],
    "correctAnswer": 0
  },
  {
    "id": 116,
    "category": "SCD Types",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is a Slowly Changing Dimension (SCD) Type 1?",
    "options": [
      "An overwrite method where old values are replaced with new values, maintaining zero historical tracking",
      "Adding a new row with date tracking",
      "Creating a separate history table",
      "Preserving only original values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 117,
    "category": "SCD Type 2",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] How does an SCD Type 2 dimension preserve historical record accuracy?",
    "options": [
      "By creating a new record row with versioning flags (is_current) and effective date ranges (start_date, end_date)",
      "By overwriting the existing row",
      "By appending a new column",
      "By deleting the table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 118,
    "category": "SCD Type 3",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] How does an SCD Type 3 dimension track historical changes?",
    "options": [
      "By maintaining a 'previous_value' and 'current_value' column within the existing record",
      "By creating infinite historical rows",
      "By generating surrogate keys only",
      "By logging changes to text files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 119,
    "category": "Snowflake Schema",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What characterizes a Snowflake Schema compared to a Star Schema?",
    "options": [
      "Dimension tables are normalized into multiple related sub-tables (e.g., product -> subcategory -> category)",
      "It contains no fact tables",
      "It uses only one single flat table",
      "It is stored entirely in memory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 120,
    "category": "Incremental Loading",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is the purpose of a High Watermark or Timestamp column in incremental ETL?",
    "options": [
      "To extract only records created or modified since the last successful pipeline execution",
      "To measure database RAM usage",
      "To record database user logins",
      "To clean up temporary logs"
    ],
    "correctAnswer": 0
  },
  {
    "id": 121,
    "category": "Reconciliation",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is Source-to-Target Data Reconciliation testing?",
    "options": [
      "Comparing aggregate metrics (e.g. SUM, AVG) between source and target systems to verify zero financial variance",
      "Running unit tests on HTML templates",
      "Testing website latency",
      "Checking network cables"
    ],
    "correctAnswer": 0
  },
  {
    "id": 122,
    "category": "Data Lineage",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What does Data Lineage describe in enterprise data architecture?",
    "options": [
      "The complete lifecycle, flow, and transformation path of data from origin systems to final reporting dashboards",
      "The SQL version history",
      "The hardware manufacturing date",
      "The software license expiry"
    ],
    "correctAnswer": 0
  },
  {
    "id": 123,
    "category": "ELT vs ETL",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is the primary architectural difference between ETL and ELT?",
    "options": [
      "ELT loads raw data into the target warehouse first and uses the warehouse's MPP compute engine for transformations",
      "ETL does not transform data",
      "ELT only works on CSV files",
      "ELT does not support databases"
    ],
    "correctAnswer": 0
  },
  {
    "id": 124,
    "category": "Factless Facts",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is a Factless Fact Table in Kimball dimensional modeling?",
    "options": [
      "A fact table that contains no numeric measures, capturing events or relationships (e.g. student course attendance)",
      "A table with no primary key",
      "A dimension table without names",
      "An empty database table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 125,
    "category": "Granularity",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What does 'Grain' define in a dimensional fact table?",
    "options": [
      "The exact level of detail or atomic event represented by a single row in the fact table",
      "The size of database storage blocks",
      "The number of users allowed",
      "The speed of ETL pipelines"
    ],
    "correctAnswer": 0
  },
  {
    "id": 126,
    "category": "CDC",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What does Change Data Capture (CDC) achieve in modern data integration?",
    "options": [
      "Detects and streams real-time row-level changes (INSERT, UPDATE, DELETE) directly from database transaction logs",
      "Deletes old records",
      "Re-indexes database clusters",
      "Compresses log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 127,
    "category": "Data Profiling",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is the goal of exploratory Data Profiling prior to writing ETL transformation mappings?",
    "options": [
      "Analyzing source data for value distributions, null frequencies, format patterns, and anomalies",
      "Writing final production ETL jobs",
      "Testing hardware reliability",
      "Installing database servers"
    ],
    "correctAnswer": 0
  },
  {
    "id": 128,
    "category": "Boundary Testing",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] Why are Boundary Value Tests executed on transformed numeric columns in ETL?",
    "options": [
      "To confirm precision and scale limits (e.g., DECIMAL(10,2)) do not cause overflow or rounding errors",
      "To check screen brightness",
      "To test keyboard inputs",
      "To verify network firewall rules"
    ],
    "correctAnswer": 0
  },
  {
    "id": 129,
    "category": "Junk Dimensions",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is a Junk Dimension in Data Warehousing?",
    "options": [
      "A single dimension combining miscellaneous low-cardinality flags and indicators to avoid cluttering fact tables",
      "A corrupted database table",
      "An unindexed staging table",
      "A deleted table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 130,
    "category": "Degenerate Dimensions",
    "difficulty": "Medium",
    "round": 2,
    "question": "[Round 2] What is a Degenerate Dimension?",
    "options": [
      "A dimension key stored directly in the fact table without a corresponding dimension table (e.g. order_number)",
      "A table containing corrupt records",
      "A dimension with no primary key",
      "A foreign key to nowhere"
    ],
    "correctAnswer": 0
  },
  {
    "id": 131,
    "category": "SCD Types",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is a Slowly Changing Dimension (SCD) Type 1?",
    "options": [
      "An overwrite method where old values are replaced with new values, maintaining zero historical tracking",
      "Adding a new row with date tracking",
      "Creating a separate history table",
      "Preserving only original values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 132,
    "category": "SCD Type 2",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] How does an SCD Type 2 dimension preserve historical record accuracy?",
    "options": [
      "By creating a new record row with versioning flags (is_current) and effective date ranges (start_date, end_date)",
      "By overwriting the existing row",
      "By appending a new column",
      "By deleting the table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 133,
    "category": "SCD Type 3",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] How does an SCD Type 3 dimension track historical changes?",
    "options": [
      "By maintaining a 'previous_value' and 'current_value' column within the existing record",
      "By creating infinite historical rows",
      "By generating surrogate keys only",
      "By logging changes to text files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 134,
    "category": "Snowflake Schema",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What characterizes a Snowflake Schema compared to a Star Schema?",
    "options": [
      "Dimension tables are normalized into multiple related sub-tables (e.g., product -> subcategory -> category)",
      "It contains no fact tables",
      "It uses only one single flat table",
      "It is stored entirely in memory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 135,
    "category": "Incremental Loading",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is the purpose of a High Watermark or Timestamp column in incremental ETL?",
    "options": [
      "To extract only records created or modified since the last successful pipeline execution",
      "To measure database RAM usage",
      "To record database user logins",
      "To clean up temporary logs"
    ],
    "correctAnswer": 0
  },
  {
    "id": 136,
    "category": "Reconciliation",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is Source-to-Target Data Reconciliation testing?",
    "options": [
      "Comparing aggregate metrics (e.g. SUM, AVG) between source and target systems to verify zero financial variance",
      "Running unit tests on HTML templates",
      "Testing website latency",
      "Checking network cables"
    ],
    "correctAnswer": 0
  },
  {
    "id": 137,
    "category": "Data Lineage",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What does Data Lineage describe in enterprise data architecture?",
    "options": [
      "The complete lifecycle, flow, and transformation path of data from origin systems to final reporting dashboards",
      "The SQL version history",
      "The hardware manufacturing date",
      "The software license expiry"
    ],
    "correctAnswer": 0
  },
  {
    "id": 138,
    "category": "ELT vs ETL",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is the primary architectural difference between ETL and ELT?",
    "options": [
      "ELT loads raw data into the target warehouse first and uses the warehouse's MPP compute engine for transformations",
      "ETL does not transform data",
      "ELT only works on CSV files",
      "ELT does not support databases"
    ],
    "correctAnswer": 0
  },
  {
    "id": 139,
    "category": "Factless Facts",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is a Factless Fact Table in Kimball dimensional modeling?",
    "options": [
      "A fact table that contains no numeric measures, capturing events or relationships (e.g. student course attendance)",
      "A table with no primary key",
      "A dimension table without names",
      "An empty database table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 140,
    "category": "Granularity",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What does 'Grain' define in a dimensional fact table?",
    "options": [
      "The exact level of detail or atomic event represented by a single row in the fact table",
      "The size of database storage blocks",
      "The number of users allowed",
      "The speed of ETL pipelines"
    ],
    "correctAnswer": 0
  },
  {
    "id": 141,
    "category": "CDC",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What does Change Data Capture (CDC) achieve in modern data integration?",
    "options": [
      "Detects and streams real-time row-level changes (INSERT, UPDATE, DELETE) directly from database transaction logs",
      "Deletes old records",
      "Re-indexes database clusters",
      "Compresses log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 142,
    "category": "Data Profiling",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is the goal of exploratory Data Profiling prior to writing ETL transformation mappings?",
    "options": [
      "Analyzing source data for value distributions, null frequencies, format patterns, and anomalies",
      "Writing final production ETL jobs",
      "Testing hardware reliability",
      "Installing database servers"
    ],
    "correctAnswer": 0
  },
  {
    "id": 143,
    "category": "Boundary Testing",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] Why are Boundary Value Tests executed on transformed numeric columns in ETL?",
    "options": [
      "To confirm precision and scale limits (e.g., DECIMAL(10,2)) do not cause overflow or rounding errors",
      "To check screen brightness",
      "To test keyboard inputs",
      "To verify network firewall rules"
    ],
    "correctAnswer": 0
  },
  {
    "id": 144,
    "category": "Junk Dimensions",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is a Junk Dimension in Data Warehousing?",
    "options": [
      "A single dimension combining miscellaneous low-cardinality flags and indicators to avoid cluttering fact tables",
      "A corrupted database table",
      "An unindexed staging table",
      "A deleted table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 145,
    "category": "Degenerate Dimensions",
    "difficulty": "Medium",
    "round": 3,
    "question": "[Round 3] What is a Degenerate Dimension?",
    "options": [
      "A dimension key stored directly in the fact table without a corresponding dimension table (e.g. order_number)",
      "A table containing corrupt records",
      "A dimension with no primary key",
      "A foreign key to nowhere"
    ],
    "correctAnswer": 0
  },
  {
    "id": 146,
    "category": "SCD Types",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is a Slowly Changing Dimension (SCD) Type 1?",
    "options": [
      "An overwrite method where old values are replaced with new values, maintaining zero historical tracking",
      "Adding a new row with date tracking",
      "Creating a separate history table",
      "Preserving only original values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 147,
    "category": "SCD Type 2",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] How does an SCD Type 2 dimension preserve historical record accuracy?",
    "options": [
      "By creating a new record row with versioning flags (is_current) and effective date ranges (start_date, end_date)",
      "By overwriting the existing row",
      "By appending a new column",
      "By deleting the table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 148,
    "category": "SCD Type 3",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] How does an SCD Type 3 dimension track historical changes?",
    "options": [
      "By maintaining a 'previous_value' and 'current_value' column within the existing record",
      "By creating infinite historical rows",
      "By generating surrogate keys only",
      "By logging changes to text files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 149,
    "category": "Snowflake Schema",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What characterizes a Snowflake Schema compared to a Star Schema?",
    "options": [
      "Dimension tables are normalized into multiple related sub-tables (e.g., product -> subcategory -> category)",
      "It contains no fact tables",
      "It uses only one single flat table",
      "It is stored entirely in memory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 150,
    "category": "Incremental Loading",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is the purpose of a High Watermark or Timestamp column in incremental ETL?",
    "options": [
      "To extract only records created or modified since the last successful pipeline execution",
      "To measure database RAM usage",
      "To record database user logins",
      "To clean up temporary logs"
    ],
    "correctAnswer": 0
  },
  {
    "id": 151,
    "category": "Reconciliation",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is Source-to-Target Data Reconciliation testing?",
    "options": [
      "Comparing aggregate metrics (e.g. SUM, AVG) between source and target systems to verify zero financial variance",
      "Running unit tests on HTML templates",
      "Testing website latency",
      "Checking network cables"
    ],
    "correctAnswer": 0
  },
  {
    "id": 152,
    "category": "Data Lineage",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What does Data Lineage describe in enterprise data architecture?",
    "options": [
      "The complete lifecycle, flow, and transformation path of data from origin systems to final reporting dashboards",
      "The SQL version history",
      "The hardware manufacturing date",
      "The software license expiry"
    ],
    "correctAnswer": 0
  },
  {
    "id": 153,
    "category": "ELT vs ETL",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is the primary architectural difference between ETL and ELT?",
    "options": [
      "ELT loads raw data into the target warehouse first and uses the warehouse's MPP compute engine for transformations",
      "ETL does not transform data",
      "ELT only works on CSV files",
      "ELT does not support databases"
    ],
    "correctAnswer": 0
  },
  {
    "id": 154,
    "category": "Factless Facts",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is a Factless Fact Table in Kimball dimensional modeling?",
    "options": [
      "A fact table that contains no numeric measures, capturing events or relationships (e.g. student course attendance)",
      "A table with no primary key",
      "A dimension table without names",
      "An empty database table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 155,
    "category": "Granularity",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What does 'Grain' define in a dimensional fact table?",
    "options": [
      "The exact level of detail or atomic event represented by a single row in the fact table",
      "The size of database storage blocks",
      "The number of users allowed",
      "The speed of ETL pipelines"
    ],
    "correctAnswer": 0
  },
  {
    "id": 156,
    "category": "CDC",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What does Change Data Capture (CDC) achieve in modern data integration?",
    "options": [
      "Detects and streams real-time row-level changes (INSERT, UPDATE, DELETE) directly from database transaction logs",
      "Deletes old records",
      "Re-indexes database clusters",
      "Compresses log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 157,
    "category": "Data Profiling",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is the goal of exploratory Data Profiling prior to writing ETL transformation mappings?",
    "options": [
      "Analyzing source data for value distributions, null frequencies, format patterns, and anomalies",
      "Writing final production ETL jobs",
      "Testing hardware reliability",
      "Installing database servers"
    ],
    "correctAnswer": 0
  },
  {
    "id": 158,
    "category": "Boundary Testing",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] Why are Boundary Value Tests executed on transformed numeric columns in ETL?",
    "options": [
      "To confirm precision and scale limits (e.g., DECIMAL(10,2)) do not cause overflow or rounding errors",
      "To check screen brightness",
      "To test keyboard inputs",
      "To verify network firewall rules"
    ],
    "correctAnswer": 0
  },
  {
    "id": 159,
    "category": "Junk Dimensions",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is a Junk Dimension in Data Warehousing?",
    "options": [
      "A single dimension combining miscellaneous low-cardinality flags and indicators to avoid cluttering fact tables",
      "A corrupted database table",
      "An unindexed staging table",
      "A deleted table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 160,
    "category": "Degenerate Dimensions",
    "difficulty": "Medium",
    "round": 4,
    "question": "[Round 4] What is a Degenerate Dimension?",
    "options": [
      "A dimension key stored directly in the fact table without a corresponding dimension table (e.g. order_number)",
      "A table containing corrupt records",
      "A dimension with no primary key",
      "A foreign key to nowhere"
    ],
    "correctAnswer": 0
  },
  {
    "id": 161,
    "category": "SCD Types",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is a Slowly Changing Dimension (SCD) Type 1?",
    "options": [
      "An overwrite method where old values are replaced with new values, maintaining zero historical tracking",
      "Adding a new row with date tracking",
      "Creating a separate history table",
      "Preserving only original values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 162,
    "category": "SCD Type 2",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] How does an SCD Type 2 dimension preserve historical record accuracy?",
    "options": [
      "By creating a new record row with versioning flags (is_current) and effective date ranges (start_date, end_date)",
      "By overwriting the existing row",
      "By appending a new column",
      "By deleting the table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 163,
    "category": "SCD Type 3",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] How does an SCD Type 3 dimension track historical changes?",
    "options": [
      "By maintaining a 'previous_value' and 'current_value' column within the existing record",
      "By creating infinite historical rows",
      "By generating surrogate keys only",
      "By logging changes to text files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 164,
    "category": "Snowflake Schema",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What characterizes a Snowflake Schema compared to a Star Schema?",
    "options": [
      "Dimension tables are normalized into multiple related sub-tables (e.g., product -> subcategory -> category)",
      "It contains no fact tables",
      "It uses only one single flat table",
      "It is stored entirely in memory"
    ],
    "correctAnswer": 0
  },
  {
    "id": 165,
    "category": "Incremental Loading",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is the purpose of a High Watermark or Timestamp column in incremental ETL?",
    "options": [
      "To extract only records created or modified since the last successful pipeline execution",
      "To measure database RAM usage",
      "To record database user logins",
      "To clean up temporary logs"
    ],
    "correctAnswer": 0
  },
  {
    "id": 166,
    "category": "Reconciliation",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is Source-to-Target Data Reconciliation testing?",
    "options": [
      "Comparing aggregate metrics (e.g. SUM, AVG) between source and target systems to verify zero financial variance",
      "Running unit tests on HTML templates",
      "Testing website latency",
      "Checking network cables"
    ],
    "correctAnswer": 0
  },
  {
    "id": 167,
    "category": "Data Lineage",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What does Data Lineage describe in enterprise data architecture?",
    "options": [
      "The complete lifecycle, flow, and transformation path of data from origin systems to final reporting dashboards",
      "The SQL version history",
      "The hardware manufacturing date",
      "The software license expiry"
    ],
    "correctAnswer": 0
  },
  {
    "id": 168,
    "category": "ELT vs ETL",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is the primary architectural difference between ETL and ELT?",
    "options": [
      "ELT loads raw data into the target warehouse first and uses the warehouse's MPP compute engine for transformations",
      "ETL does not transform data",
      "ELT only works on CSV files",
      "ELT does not support databases"
    ],
    "correctAnswer": 0
  },
  {
    "id": 169,
    "category": "Factless Facts",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is a Factless Fact Table in Kimball dimensional modeling?",
    "options": [
      "A fact table that contains no numeric measures, capturing events or relationships (e.g. student course attendance)",
      "A table with no primary key",
      "A dimension table without names",
      "An empty database table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 170,
    "category": "Granularity",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What does 'Grain' define in a dimensional fact table?",
    "options": [
      "The exact level of detail or atomic event represented by a single row in the fact table",
      "The size of database storage blocks",
      "The number of users allowed",
      "The speed of ETL pipelines"
    ],
    "correctAnswer": 0
  },
  {
    "id": 171,
    "category": "CDC",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What does Change Data Capture (CDC) achieve in modern data integration?",
    "options": [
      "Detects and streams real-time row-level changes (INSERT, UPDATE, DELETE) directly from database transaction logs",
      "Deletes old records",
      "Re-indexes database clusters",
      "Compresses log files"
    ],
    "correctAnswer": 0
  },
  {
    "id": 172,
    "category": "Data Profiling",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is the goal of exploratory Data Profiling prior to writing ETL transformation mappings?",
    "options": [
      "Analyzing source data for value distributions, null frequencies, format patterns, and anomalies",
      "Writing final production ETL jobs",
      "Testing hardware reliability",
      "Installing database servers"
    ],
    "correctAnswer": 0
  },
  {
    "id": 173,
    "category": "Boundary Testing",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] Why are Boundary Value Tests executed on transformed numeric columns in ETL?",
    "options": [
      "To confirm precision and scale limits (e.g., DECIMAL(10,2)) do not cause overflow or rounding errors",
      "To check screen brightness",
      "To test keyboard inputs",
      "To verify network firewall rules"
    ],
    "correctAnswer": 0
  },
  {
    "id": 174,
    "category": "Junk Dimensions",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is a Junk Dimension in Data Warehousing?",
    "options": [
      "A single dimension combining miscellaneous low-cardinality flags and indicators to avoid cluttering fact tables",
      "A corrupted database table",
      "An unindexed staging table",
      "A deleted table"
    ],
    "correctAnswer": 0
  },
  {
    "id": 175,
    "category": "Degenerate Dimensions",
    "difficulty": "Medium",
    "round": 5,
    "question": "[Round 5] What is a Degenerate Dimension?",
    "options": [
      "A dimension key stored directly in the fact table without a corresponding dimension table (e.g. order_number)",
      "A table containing corrupt records",
      "A dimension with no primary key",
      "A foreign key to nowhere"
    ],
    "correctAnswer": 0
  },
  {
    "id": 201,
    "category": "Late Arriving Facts",
    "difficulty": "Hard",
    "round": 1,
    "question": "What is a Late Arriving Fact in Data Warehouse ETL processing?",
    "options": [
      "A fact event record that arrives after its corresponding dimension records have already changed or closed",
      "A query that runs past its timeout",
      "A record with no timestamp",
      "A duplicate payment record"
    ],
    "correctAnswer": 0
  },
  {
    "id": 202,
    "category": "Late Arriving Dimensions",
    "difficulty": "Hard",
    "round": 1,
    "question": "How should an ETL pipeline handle a Late Arriving Dimension when processing facts?",
    "options": [
      "Insert a dummy placeholder dimension record with a known surrogate key and backfill attributes once received",
      "Reject and discard the fact record permanently",
      "Crash the ETL pipeline immediately",
      "Assign NULL to all fact foreign keys"
    ],
    "correctAnswer": 0
  },
  {
    "id": 203,
    "category": "SCD Type 6",
    "difficulty": "Hard",
    "round": 1,
    "question": "What is an SCD Type 6 (hybrid) dimensional model?",
    "options": [
      "A hybrid implementation combining Type 1 (overwrite), Type 2 (historical rows), and Type 3 (current value column)",
      "A schema with 6 fact tables",
      "A model using 6 surrogate keys",
      "An archived historical tape"
    ],
    "correctAnswer": 0
  },
  {
    "id": 204,
    "category": "Idempotency",
    "difficulty": "Hard",
    "round": 1,
    "question": "What makes an ETL job truly Idempotent in data engineering?",
    "options": [
      "Executing the job multiple times on the same input produces the exact same result without duplicate rows or errors",
      "The job runs in under 1 second",
      "The job requires no memory",
      "The job cannot be paused"
    ],
    "correctAnswer": 0
  },
  {
    "id": 205,
    "category": "Re-load Strategy",
    "difficulty": "Hard",
    "round": 1,
    "question": "Which loading strategy prevents duplicate records when re-running an incremental ETL batch for a specific date partition?",
    "options": [
      "DELETE partition rows for that date followed by INSERT (or atomic MERGE/UPSERT)",
      "Unconditional append INSERT",
      "Dropping the entire database",
      "Ignoring duplicates silently"
    ],
    "correctAnswer": 0
  },
  {
    "id": 206,
    "category": "Deadlock Resolution",
    "difficulty": "Hard",
    "round": 1,
    "question": "How can ETL pipelines minimize database deadlocks when executing high-concurrency batch loads?",
    "options": [
      "Ensuring all transactions acquire and update database tables in a consistent, standardized alphabetical order",
      "Disabling foreign key constraints forever",
      "Running only one query per day",
      "Increasing network timeouts only"
    ],
    "correctAnswer": 0
  },
  {
    "id": 207,
    "category": "Data Quality SLA",
    "difficulty": "Hard",
    "round": 1,
    "question": "What does a Data Completeness SLA verify in mission-critical ETL systems?",
    "options": [
      "Ensures 100% of expected source transactions are ingested into target analytical models within agreed time windows",
      "Verifies monitor resolution",
      "Measures employee typing speed",
      "Verifies code repository commits"
    ],
    "correctAnswer": 0
  },
  {
    "id": 208,
    "category": "Accumulating Snapshot",
    "difficulty": "Hard",
    "round": 1,
    "question": "What is an Accumulating Snapshot Fact Table designed to track?",
    "options": [
      "Processes with distinct progressive milestone stages and lifecycles (e.g., order placed -> paid -> shipped -> delivered)",
      "Real-time stock ticker prices",
      "Permanent immutable sensor logs",
      "Static customer demographics"
    ],
    "correctAnswer": 0
  },
  {
    "id": 209,
    "category": "Additive Measures",
    "difficulty": "Hard",
    "round": 1,
    "question": "Which type of metric can be legitimately summed across ALL dimensions including time?",
    "options": [
      "Fully Additive Facts (e.g. Sales Amount)",
      "Semi-Additive Facts (e.g. Bank Account Balance)",
      "Non-Additive Facts (e.g. Unit Ratios)",
      "Surrogate Key values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 210,
    "category": "Semi-Additive Measures",
    "difficulty": "Hard",
    "round": 1,
    "question": "Why can an account balance metric NOT be summed across the Time dimension?",
    "options": [
      "Because adding balances across different days yields a meaningless, artificially inflated total (requires end-of-period snapshot)",
      "Because databases cannot sum decimal numbers",
      "Because balances are always negative",
      "Because time dimensions have no dates"
    ],
    "correctAnswer": 0
  },
  {
    "id": 211,
    "category": "Audit Columns",
    "difficulty": "Hard",
    "round": 1,
    "question": "Which standard metadata audit columns should exist in every enterprise Data Warehouse target table?",
    "options": [
      "created_at, updated_at, etl_batch_id, source_system_id",
      "user_password, session_token",
      "file_size_kb, cpu_load",
      "screen_width, browser_name"
    ],
    "correctAnswer": 0
  },
  {
    "id": 212,
    "category": "Hash Collision",
    "difficulty": "Hard",
    "round": 1,
    "question": "When using MD5 or SHA-256 hash keys to detect row changes in CDC, how are hash collisions mitigated?",
    "options": [
      "By combining multiple algorithms or secondary attribute verification before committing updates",
      "By never updating records",
      "By using only 4-bit hashes",
      "By restarting the server"
    ],
    "correctAnswer": 0
  },
  {
    "id": 213,
    "category": "Schema Drift",
    "difficulty": "Hard",
    "round": 1,
    "question": "What is Schema Drift in modern enterprise ETL pipelines?",
    "options": [
      "Unannounced additions, deletions, or data type changes in source tables that break downstream ingestion pipelines",
      "Moving a server between racks",
      "Renaming database passwords",
      "Exporting tables to Excel"
    ],
    "correctAnswer": 0
  },
  {
    "id": 214,
    "category": "Synthetic Data",
    "difficulty": "Hard",
    "round": 1,
    "question": "Why is synthetic test data generated in ETL QA environments rather than copying live production databases directly?",
    "options": [
      "To ensure zero leakage of Personally Identifiable Information (PII) and adhere to GDPR/HIPAA compliance",
      "Because production data is too clean",
      "Because production databases cannot be queried",
      "Because synthetic data is always smaller"
    ],
    "correctAnswer": 0
  },
  {
    "id": 215,
    "category": "Regression Testing",
    "difficulty": "Hard",
    "round": 1,
    "question": "What is automated Regression Testing in an ETL pipeline refactor?",
    "options": [
      "Comparing baseline historical target extracts against new refactored pipeline outputs using automated diffing tools",
      "Writing code in older SQL versions",
      "Reverting git commits",
      "Testing rollback speed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 216,
    "category": "Late Arriving Facts",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What is a Late Arriving Fact in Data Warehouse ETL processing?",
    "options": [
      "A fact event record that arrives after its corresponding dimension records have already changed or closed",
      "A query that runs past its timeout",
      "A record with no timestamp",
      "A duplicate payment record"
    ],
    "correctAnswer": 0
  },
  {
    "id": 217,
    "category": "Late Arriving Dimensions",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] How should an ETL pipeline handle a Late Arriving Dimension when processing facts?",
    "options": [
      "Insert a dummy placeholder dimension record with a known surrogate key and backfill attributes once received",
      "Reject and discard the fact record permanently",
      "Crash the ETL pipeline immediately",
      "Assign NULL to all fact foreign keys"
    ],
    "correctAnswer": 0
  },
  {
    "id": 218,
    "category": "SCD Type 6",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What is an SCD Type 6 (hybrid) dimensional model?",
    "options": [
      "A hybrid implementation combining Type 1 (overwrite), Type 2 (historical rows), and Type 3 (current value column)",
      "A schema with 6 fact tables",
      "A model using 6 surrogate keys",
      "An archived historical tape"
    ],
    "correctAnswer": 0
  },
  {
    "id": 219,
    "category": "Idempotency",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What makes an ETL job truly Idempotent in data engineering?",
    "options": [
      "Executing the job multiple times on the same input produces the exact same result without duplicate rows or errors",
      "The job runs in under 1 second",
      "The job requires no memory",
      "The job cannot be paused"
    ],
    "correctAnswer": 0
  },
  {
    "id": 220,
    "category": "Re-load Strategy",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] Which loading strategy prevents duplicate records when re-running an incremental ETL batch for a specific date partition?",
    "options": [
      "DELETE partition rows for that date followed by INSERT (or atomic MERGE/UPSERT)",
      "Unconditional append INSERT",
      "Dropping the entire database",
      "Ignoring duplicates silently"
    ],
    "correctAnswer": 0
  },
  {
    "id": 221,
    "category": "Deadlock Resolution",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] How can ETL pipelines minimize database deadlocks when executing high-concurrency batch loads?",
    "options": [
      "Ensuring all transactions acquire and update database tables in a consistent, standardized alphabetical order",
      "Disabling foreign key constraints forever",
      "Running only one query per day",
      "Increasing network timeouts only"
    ],
    "correctAnswer": 0
  },
  {
    "id": 222,
    "category": "Data Quality SLA",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What does a Data Completeness SLA verify in mission-critical ETL systems?",
    "options": [
      "Ensures 100% of expected source transactions are ingested into target analytical models within agreed time windows",
      "Verifies monitor resolution",
      "Measures employee typing speed",
      "Verifies code repository commits"
    ],
    "correctAnswer": 0
  },
  {
    "id": 223,
    "category": "Accumulating Snapshot",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What is an Accumulating Snapshot Fact Table designed to track?",
    "options": [
      "Processes with distinct progressive milestone stages and lifecycles (e.g., order placed -> paid -> shipped -> delivered)",
      "Real-time stock ticker prices",
      "Permanent immutable sensor logs",
      "Static customer demographics"
    ],
    "correctAnswer": 0
  },
  {
    "id": 224,
    "category": "Additive Measures",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] Which type of metric can be legitimately summed across ALL dimensions including time?",
    "options": [
      "Fully Additive Facts (e.g. Sales Amount)",
      "Semi-Additive Facts (e.g. Bank Account Balance)",
      "Non-Additive Facts (e.g. Unit Ratios)",
      "Surrogate Key values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 225,
    "category": "Semi-Additive Measures",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] Why can an account balance metric NOT be summed across the Time dimension?",
    "options": [
      "Because adding balances across different days yields a meaningless, artificially inflated total (requires end-of-period snapshot)",
      "Because databases cannot sum decimal numbers",
      "Because balances are always negative",
      "Because time dimensions have no dates"
    ],
    "correctAnswer": 0
  },
  {
    "id": 226,
    "category": "Audit Columns",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] Which standard metadata audit columns should exist in every enterprise Data Warehouse target table?",
    "options": [
      "created_at, updated_at, etl_batch_id, source_system_id",
      "user_password, session_token",
      "file_size_kb, cpu_load",
      "screen_width, browser_name"
    ],
    "correctAnswer": 0
  },
  {
    "id": 227,
    "category": "Hash Collision",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] When using MD5 or SHA-256 hash keys to detect row changes in CDC, how are hash collisions mitigated?",
    "options": [
      "By combining multiple algorithms or secondary attribute verification before committing updates",
      "By never updating records",
      "By using only 4-bit hashes",
      "By restarting the server"
    ],
    "correctAnswer": 0
  },
  {
    "id": 228,
    "category": "Schema Drift",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What is Schema Drift in modern enterprise ETL pipelines?",
    "options": [
      "Unannounced additions, deletions, or data type changes in source tables that break downstream ingestion pipelines",
      "Moving a server between racks",
      "Renaming database passwords",
      "Exporting tables to Excel"
    ],
    "correctAnswer": 0
  },
  {
    "id": 229,
    "category": "Synthetic Data",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] Why is synthetic test data generated in ETL QA environments rather than copying live production databases directly?",
    "options": [
      "To ensure zero leakage of Personally Identifiable Information (PII) and adhere to GDPR/HIPAA compliance",
      "Because production data is too clean",
      "Because production databases cannot be queried",
      "Because synthetic data is always smaller"
    ],
    "correctAnswer": 0
  },
  {
    "id": 230,
    "category": "Regression Testing",
    "difficulty": "Hard",
    "round": 2,
    "question": "[Round 2] What is automated Regression Testing in an ETL pipeline refactor?",
    "options": [
      "Comparing baseline historical target extracts against new refactored pipeline outputs using automated diffing tools",
      "Writing code in older SQL versions",
      "Reverting git commits",
      "Testing rollback speed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 231,
    "category": "Late Arriving Facts",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What is a Late Arriving Fact in Data Warehouse ETL processing?",
    "options": [
      "A fact event record that arrives after its corresponding dimension records have already changed or closed",
      "A query that runs past its timeout",
      "A record with no timestamp",
      "A duplicate payment record"
    ],
    "correctAnswer": 0
  },
  {
    "id": 232,
    "category": "Late Arriving Dimensions",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] How should an ETL pipeline handle a Late Arriving Dimension when processing facts?",
    "options": [
      "Insert a dummy placeholder dimension record with a known surrogate key and backfill attributes once received",
      "Reject and discard the fact record permanently",
      "Crash the ETL pipeline immediately",
      "Assign NULL to all fact foreign keys"
    ],
    "correctAnswer": 0
  },
  {
    "id": 233,
    "category": "SCD Type 6",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What is an SCD Type 6 (hybrid) dimensional model?",
    "options": [
      "A hybrid implementation combining Type 1 (overwrite), Type 2 (historical rows), and Type 3 (current value column)",
      "A schema with 6 fact tables",
      "A model using 6 surrogate keys",
      "An archived historical tape"
    ],
    "correctAnswer": 0
  },
  {
    "id": 234,
    "category": "Idempotency",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What makes an ETL job truly Idempotent in data engineering?",
    "options": [
      "Executing the job multiple times on the same input produces the exact same result without duplicate rows or errors",
      "The job runs in under 1 second",
      "The job requires no memory",
      "The job cannot be paused"
    ],
    "correctAnswer": 0
  },
  {
    "id": 235,
    "category": "Re-load Strategy",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] Which loading strategy prevents duplicate records when re-running an incremental ETL batch for a specific date partition?",
    "options": [
      "DELETE partition rows for that date followed by INSERT (or atomic MERGE/UPSERT)",
      "Unconditional append INSERT",
      "Dropping the entire database",
      "Ignoring duplicates silently"
    ],
    "correctAnswer": 0
  },
  {
    "id": 236,
    "category": "Deadlock Resolution",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] How can ETL pipelines minimize database deadlocks when executing high-concurrency batch loads?",
    "options": [
      "Ensuring all transactions acquire and update database tables in a consistent, standardized alphabetical order",
      "Disabling foreign key constraints forever",
      "Running only one query per day",
      "Increasing network timeouts only"
    ],
    "correctAnswer": 0
  },
  {
    "id": 237,
    "category": "Data Quality SLA",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What does a Data Completeness SLA verify in mission-critical ETL systems?",
    "options": [
      "Ensures 100% of expected source transactions are ingested into target analytical models within agreed time windows",
      "Verifies monitor resolution",
      "Measures employee typing speed",
      "Verifies code repository commits"
    ],
    "correctAnswer": 0
  },
  {
    "id": 238,
    "category": "Accumulating Snapshot",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What is an Accumulating Snapshot Fact Table designed to track?",
    "options": [
      "Processes with distinct progressive milestone stages and lifecycles (e.g., order placed -> paid -> shipped -> delivered)",
      "Real-time stock ticker prices",
      "Permanent immutable sensor logs",
      "Static customer demographics"
    ],
    "correctAnswer": 0
  },
  {
    "id": 239,
    "category": "Additive Measures",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] Which type of metric can be legitimately summed across ALL dimensions including time?",
    "options": [
      "Fully Additive Facts (e.g. Sales Amount)",
      "Semi-Additive Facts (e.g. Bank Account Balance)",
      "Non-Additive Facts (e.g. Unit Ratios)",
      "Surrogate Key values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 240,
    "category": "Semi-Additive Measures",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] Why can an account balance metric NOT be summed across the Time dimension?",
    "options": [
      "Because adding balances across different days yields a meaningless, artificially inflated total (requires end-of-period snapshot)",
      "Because databases cannot sum decimal numbers",
      "Because balances are always negative",
      "Because time dimensions have no dates"
    ],
    "correctAnswer": 0
  },
  {
    "id": 241,
    "category": "Audit Columns",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] Which standard metadata audit columns should exist in every enterprise Data Warehouse target table?",
    "options": [
      "created_at, updated_at, etl_batch_id, source_system_id",
      "user_password, session_token",
      "file_size_kb, cpu_load",
      "screen_width, browser_name"
    ],
    "correctAnswer": 0
  },
  {
    "id": 242,
    "category": "Hash Collision",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] When using MD5 or SHA-256 hash keys to detect row changes in CDC, how are hash collisions mitigated?",
    "options": [
      "By combining multiple algorithms or secondary attribute verification before committing updates",
      "By never updating records",
      "By using only 4-bit hashes",
      "By restarting the server"
    ],
    "correctAnswer": 0
  },
  {
    "id": 243,
    "category": "Schema Drift",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What is Schema Drift in modern enterprise ETL pipelines?",
    "options": [
      "Unannounced additions, deletions, or data type changes in source tables that break downstream ingestion pipelines",
      "Moving a server between racks",
      "Renaming database passwords",
      "Exporting tables to Excel"
    ],
    "correctAnswer": 0
  },
  {
    "id": 244,
    "category": "Synthetic Data",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] Why is synthetic test data generated in ETL QA environments rather than copying live production databases directly?",
    "options": [
      "To ensure zero leakage of Personally Identifiable Information (PII) and adhere to GDPR/HIPAA compliance",
      "Because production data is too clean",
      "Because production databases cannot be queried",
      "Because synthetic data is always smaller"
    ],
    "correctAnswer": 0
  },
  {
    "id": 245,
    "category": "Regression Testing",
    "difficulty": "Hard",
    "round": 3,
    "question": "[Round 3] What is automated Regression Testing in an ETL pipeline refactor?",
    "options": [
      "Comparing baseline historical target extracts against new refactored pipeline outputs using automated diffing tools",
      "Writing code in older SQL versions",
      "Reverting git commits",
      "Testing rollback speed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 246,
    "category": "Late Arriving Facts",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What is a Late Arriving Fact in Data Warehouse ETL processing?",
    "options": [
      "A fact event record that arrives after its corresponding dimension records have already changed or closed",
      "A query that runs past its timeout",
      "A record with no timestamp",
      "A duplicate payment record"
    ],
    "correctAnswer": 0
  },
  {
    "id": 247,
    "category": "Late Arriving Dimensions",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] How should an ETL pipeline handle a Late Arriving Dimension when processing facts?",
    "options": [
      "Insert a dummy placeholder dimension record with a known surrogate key and backfill attributes once received",
      "Reject and discard the fact record permanently",
      "Crash the ETL pipeline immediately",
      "Assign NULL to all fact foreign keys"
    ],
    "correctAnswer": 0
  },
  {
    "id": 248,
    "category": "SCD Type 6",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What is an SCD Type 6 (hybrid) dimensional model?",
    "options": [
      "A hybrid implementation combining Type 1 (overwrite), Type 2 (historical rows), and Type 3 (current value column)",
      "A schema with 6 fact tables",
      "A model using 6 surrogate keys",
      "An archived historical tape"
    ],
    "correctAnswer": 0
  },
  {
    "id": 249,
    "category": "Idempotency",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What makes an ETL job truly Idempotent in data engineering?",
    "options": [
      "Executing the job multiple times on the same input produces the exact same result without duplicate rows or errors",
      "The job runs in under 1 second",
      "The job requires no memory",
      "The job cannot be paused"
    ],
    "correctAnswer": 0
  },
  {
    "id": 250,
    "category": "Re-load Strategy",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] Which loading strategy prevents duplicate records when re-running an incremental ETL batch for a specific date partition?",
    "options": [
      "DELETE partition rows for that date followed by INSERT (or atomic MERGE/UPSERT)",
      "Unconditional append INSERT",
      "Dropping the entire database",
      "Ignoring duplicates silently"
    ],
    "correctAnswer": 0
  },
  {
    "id": 251,
    "category": "Deadlock Resolution",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] How can ETL pipelines minimize database deadlocks when executing high-concurrency batch loads?",
    "options": [
      "Ensuring all transactions acquire and update database tables in a consistent, standardized alphabetical order",
      "Disabling foreign key constraints forever",
      "Running only one query per day",
      "Increasing network timeouts only"
    ],
    "correctAnswer": 0
  },
  {
    "id": 252,
    "category": "Data Quality SLA",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What does a Data Completeness SLA verify in mission-critical ETL systems?",
    "options": [
      "Ensures 100% of expected source transactions are ingested into target analytical models within agreed time windows",
      "Verifies monitor resolution",
      "Measures employee typing speed",
      "Verifies code repository commits"
    ],
    "correctAnswer": 0
  },
  {
    "id": 253,
    "category": "Accumulating Snapshot",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What is an Accumulating Snapshot Fact Table designed to track?",
    "options": [
      "Processes with distinct progressive milestone stages and lifecycles (e.g., order placed -> paid -> shipped -> delivered)",
      "Real-time stock ticker prices",
      "Permanent immutable sensor logs",
      "Static customer demographics"
    ],
    "correctAnswer": 0
  },
  {
    "id": 254,
    "category": "Additive Measures",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] Which type of metric can be legitimately summed across ALL dimensions including time?",
    "options": [
      "Fully Additive Facts (e.g. Sales Amount)",
      "Semi-Additive Facts (e.g. Bank Account Balance)",
      "Non-Additive Facts (e.g. Unit Ratios)",
      "Surrogate Key values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 255,
    "category": "Semi-Additive Measures",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] Why can an account balance metric NOT be summed across the Time dimension?",
    "options": [
      "Because adding balances across different days yields a meaningless, artificially inflated total (requires end-of-period snapshot)",
      "Because databases cannot sum decimal numbers",
      "Because balances are always negative",
      "Because time dimensions have no dates"
    ],
    "correctAnswer": 0
  },
  {
    "id": 256,
    "category": "Audit Columns",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] Which standard metadata audit columns should exist in every enterprise Data Warehouse target table?",
    "options": [
      "created_at, updated_at, etl_batch_id, source_system_id",
      "user_password, session_token",
      "file_size_kb, cpu_load",
      "screen_width, browser_name"
    ],
    "correctAnswer": 0
  },
  {
    "id": 257,
    "category": "Hash Collision",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] When using MD5 or SHA-256 hash keys to detect row changes in CDC, how are hash collisions mitigated?",
    "options": [
      "By combining multiple algorithms or secondary attribute verification before committing updates",
      "By never updating records",
      "By using only 4-bit hashes",
      "By restarting the server"
    ],
    "correctAnswer": 0
  },
  {
    "id": 258,
    "category": "Schema Drift",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What is Schema Drift in modern enterprise ETL pipelines?",
    "options": [
      "Unannounced additions, deletions, or data type changes in source tables that break downstream ingestion pipelines",
      "Moving a server between racks",
      "Renaming database passwords",
      "Exporting tables to Excel"
    ],
    "correctAnswer": 0
  },
  {
    "id": 259,
    "category": "Synthetic Data",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] Why is synthetic test data generated in ETL QA environments rather than copying live production databases directly?",
    "options": [
      "To ensure zero leakage of Personally Identifiable Information (PII) and adhere to GDPR/HIPAA compliance",
      "Because production data is too clean",
      "Because production databases cannot be queried",
      "Because synthetic data is always smaller"
    ],
    "correctAnswer": 0
  },
  {
    "id": 260,
    "category": "Regression Testing",
    "difficulty": "Hard",
    "round": 4,
    "question": "[Round 4] What is automated Regression Testing in an ETL pipeline refactor?",
    "options": [
      "Comparing baseline historical target extracts against new refactored pipeline outputs using automated diffing tools",
      "Writing code in older SQL versions",
      "Reverting git commits",
      "Testing rollback speed"
    ],
    "correctAnswer": 0
  },
  {
    "id": 261,
    "category": "Late Arriving Facts",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What is a Late Arriving Fact in Data Warehouse ETL processing?",
    "options": [
      "A fact event record that arrives after its corresponding dimension records have already changed or closed",
      "A query that runs past its timeout",
      "A record with no timestamp",
      "A duplicate payment record"
    ],
    "correctAnswer": 0
  },
  {
    "id": 262,
    "category": "Late Arriving Dimensions",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] How should an ETL pipeline handle a Late Arriving Dimension when processing facts?",
    "options": [
      "Insert a dummy placeholder dimension record with a known surrogate key and backfill attributes once received",
      "Reject and discard the fact record permanently",
      "Crash the ETL pipeline immediately",
      "Assign NULL to all fact foreign keys"
    ],
    "correctAnswer": 0
  },
  {
    "id": 263,
    "category": "SCD Type 6",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What is an SCD Type 6 (hybrid) dimensional model?",
    "options": [
      "A hybrid implementation combining Type 1 (overwrite), Type 2 (historical rows), and Type 3 (current value column)",
      "A schema with 6 fact tables",
      "A model using 6 surrogate keys",
      "An archived historical tape"
    ],
    "correctAnswer": 0
  },
  {
    "id": 264,
    "category": "Idempotency",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What makes an ETL job truly Idempotent in data engineering?",
    "options": [
      "Executing the job multiple times on the same input produces the exact same result without duplicate rows or errors",
      "The job runs in under 1 second",
      "The job requires no memory",
      "The job cannot be paused"
    ],
    "correctAnswer": 0
  },
  {
    "id": 265,
    "category": "Re-load Strategy",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] Which loading strategy prevents duplicate records when re-running an incremental ETL batch for a specific date partition?",
    "options": [
      "DELETE partition rows for that date followed by INSERT (or atomic MERGE/UPSERT)",
      "Unconditional append INSERT",
      "Dropping the entire database",
      "Ignoring duplicates silently"
    ],
    "correctAnswer": 0
  },
  {
    "id": 266,
    "category": "Deadlock Resolution",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] How can ETL pipelines minimize database deadlocks when executing high-concurrency batch loads?",
    "options": [
      "Ensuring all transactions acquire and update database tables in a consistent, standardized alphabetical order",
      "Disabling foreign key constraints forever",
      "Running only one query per day",
      "Increasing network timeouts only"
    ],
    "correctAnswer": 0
  },
  {
    "id": 267,
    "category": "Data Quality SLA",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What does a Data Completeness SLA verify in mission-critical ETL systems?",
    "options": [
      "Ensures 100% of expected source transactions are ingested into target analytical models within agreed time windows",
      "Verifies monitor resolution",
      "Measures employee typing speed",
      "Verifies code repository commits"
    ],
    "correctAnswer": 0
  },
  {
    "id": 268,
    "category": "Accumulating Snapshot",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What is an Accumulating Snapshot Fact Table designed to track?",
    "options": [
      "Processes with distinct progressive milestone stages and lifecycles (e.g., order placed -> paid -> shipped -> delivered)",
      "Real-time stock ticker prices",
      "Permanent immutable sensor logs",
      "Static customer demographics"
    ],
    "correctAnswer": 0
  },
  {
    "id": 269,
    "category": "Additive Measures",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] Which type of metric can be legitimately summed across ALL dimensions including time?",
    "options": [
      "Fully Additive Facts (e.g. Sales Amount)",
      "Semi-Additive Facts (e.g. Bank Account Balance)",
      "Non-Additive Facts (e.g. Unit Ratios)",
      "Surrogate Key values"
    ],
    "correctAnswer": 0
  },
  {
    "id": 270,
    "category": "Semi-Additive Measures",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] Why can an account balance metric NOT be summed across the Time dimension?",
    "options": [
      "Because adding balances across different days yields a meaningless, artificially inflated total (requires end-of-period snapshot)",
      "Because databases cannot sum decimal numbers",
      "Because balances are always negative",
      "Because time dimensions have no dates"
    ],
    "correctAnswer": 0
  },
  {
    "id": 271,
    "category": "Audit Columns",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] Which standard metadata audit columns should exist in every enterprise Data Warehouse target table?",
    "options": [
      "created_at, updated_at, etl_batch_id, source_system_id",
      "user_password, session_token",
      "file_size_kb, cpu_load",
      "screen_width, browser_name"
    ],
    "correctAnswer": 0
  },
  {
    "id": 272,
    "category": "Hash Collision",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] When using MD5 or SHA-256 hash keys to detect row changes in CDC, how are hash collisions mitigated?",
    "options": [
      "By combining multiple algorithms or secondary attribute verification before committing updates",
      "By never updating records",
      "By using only 4-bit hashes",
      "By restarting the server"
    ],
    "correctAnswer": 0
  },
  {
    "id": 273,
    "category": "Schema Drift",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What is Schema Drift in modern enterprise ETL pipelines?",
    "options": [
      "Unannounced additions, deletions, or data type changes in source tables that break downstream ingestion pipelines",
      "Moving a server between racks",
      "Renaming database passwords",
      "Exporting tables to Excel"
    ],
    "correctAnswer": 0
  },
  {
    "id": 274,
    "category": "Synthetic Data",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] Why is synthetic test data generated in ETL QA environments rather than copying live production databases directly?",
    "options": [
      "To ensure zero leakage of Personally Identifiable Information (PII) and adhere to GDPR/HIPAA compliance",
      "Because production data is too clean",
      "Because production databases cannot be queried",
      "Because synthetic data is always smaller"
    ],
    "correctAnswer": 0
  },
  {
    "id": 275,
    "category": "Regression Testing",
    "difficulty": "Hard",
    "round": 5,
    "question": "[Round 5] What is automated Regression Testing in an ETL pipeline refactor?",
    "options": [
      "Comparing baseline historical target extracts against new refactored pipeline outputs using automated diffing tools",
      "Writing code in older SQL versions",
      "Reverting git commits",
      "Testing rollback speed"
    ],
    "correctAnswer": 0
  }
];
