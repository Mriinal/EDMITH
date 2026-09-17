/**
 * EDMITH SQL Engine
 * High-performance, zero-latency in-browser Relational SQL Database powered by AlaSQL.
 * Runs 100% locally and synchronously with zero external network downloads.
 * Database initialized with clean, verified tables.
 */

class EdmithSqlEngine {
    constructor() {
        this.isInitialized = false;
        this.engineType = 'AlaSQL In-Memory Engine (Clean Schema)';
        this.queryHistory = [];
        this.schemaData = EdmithSqlEngine.DATABASE_SCHEMA;
        this.tableNames = Object.keys(this.schemaData);
    }

    cleanSql(sql) {
        if (!sql) return '';
        let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '');
        cleaned = cleaned.replace(/--.*$/gm, '');
        return cleaned.trim();
    }

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

    init() {
        if (this.isInitialized) return true;

        if (typeof alasql === 'undefined') {
            console.warn('[EDMITH SQL Engine] AlaSQL not found.');
            this.engineType = 'In-Memory Client Engine';
            this.isInitialized = true;
            return true;
        }

        try {
            alasql.options.errorlog = false;
            
            // Register utility SQL helper functions
            alasql.fn.IFNULL = function(val, alt) {
                return (val !== null && val !== undefined) ? val : alt;
            };
            alasql.fn.COALESCE = function(...args) {
                for (let a of args) {
                    if (a !== null && a !== undefined) return a;
                }
                return null;
            };

            this.seedDatabase();
            this.isInitialized = true;
            this.engineType = 'AlaSQL Engine (3 Tables: 697 Rows)';
            return true;
        } catch (err) {
            console.error('[EDMITH SQL Engine] Failed to seed database:', err);
            this.isInitialized = true;
            return false;
        }
    }

    seedDatabase() {
        if (typeof alasql === 'undefined') return;

        try {
            localStorage.removeItem('edmith_sql_db');
        } catch (e) {}

        alasql.options.casesensitive = false;

        // Drop all existing tables to ensure a clean slate
        if (alasql.tables) {
            for (const t in alasql.tables) {
                try { alasql(`DROP TABLE IF EXISTS ${t}`); } catch (e) {}
            }
        }

        // 1. Create and seed customers table
        try {
            alasql('CREATE TABLE customers (customer_id INT, first_name STRING, middle_name STRING, last_name STRING)');
        } catch (e) {
            console.error('Error creating customers table:', e);
        }

        const customerRows = this.generateCustomersData();
        if (alasql.tables && alasql.tables.customers) {
            alasql.tables.customers.data = customerRows;
        }

        // 2. Create and seed product_list table
        try {
            alasql('CREATE TABLE product_list (product_id INT, product_name STRING, category STRING, price DECIMAL, stock_quantity INT)');
        } catch (e) {
            console.error('Error creating product_list table:', e);
        }

        const productRows = this.generateProductListData();
        if (alasql.tables && alasql.tables.product_list) {
            alasql.tables.product_list.data = productRows;
        }

        // 3. Create and seed sells_list table
        try {
            alasql('CREATE TABLE sells_list (sale_id INT, customer_id INT, product_id INT, quantity INT, total_price DECIMAL, sale_date STRING, payment_status STRING)');
        } catch (e) {
            console.error('Error creating sells_list table:', e);
        }

        const sellsRows = this.generateSellsListData(productRows);
        if (alasql.tables && alasql.tables.sells_list) {
            alasql.tables.sells_list.data = sellsRows;
        }

        // 4. Create and seed employees table
        try {
            alasql('CREATE TABLE employees (employee_id INT, first_name STRING, last_name STRING, department STRING, salary DECIMAL, manager_id INT)');
        } catch (e) {
            console.error('Error creating employees table:', e);
        }

        const employeeRows = this.generateEmployeesData();
        if (alasql.tables && alasql.tables.employees) {
            alasql.tables.employees.data = employeeRows;
        }

        // Also alias capitalized versions for convenience
        if (alasql.tables) {
            alasql.tables.Product_List = alasql.tables.product_list;
            alasql.tables.PRODUCT_LIST = alasql.tables.product_list;
            alasql.tables.SELLS_LIST = alasql.tables.sells_list;
            alasql.tables.Sells_List = alasql.tables.sells_list;
            alasql.tables.EMPLOYEES = alasql.tables.employees;
            alasql.tables.Employees = alasql.tables.employees;
        }

        console.log(`[EDMITH SQL Engine] Clean database initialized: 'customers' (${customerRows.length}), 'product_list' (${productRows.length}), 'sells_list' (${sellsRows.length}), 'employees' (${employeeRows.length}).`);
    }

    generateCustomersData() {
        const indian_first = [
            "Mrinal", "Ripunjay", "Amritesh", "Abhishek", "Unnayan", "Utpal",
            "Aarav", "Rohan", "Priya", "Ananya", "Rajesh", "Vikram", "Neha",
            "Rahul", "Sneha", "Aditya", "Pooja", "Deepak", "Kavita", "Sanjay",
            "Alok", "Nikhil", "Manish", "Swati", "Ritu", "Amit", "Sunil", "Preeti"
        ];
        
        const english_first = [
            "Sarah", "Michael", "Emily", "David", "Jessica", "James", "Alex", 
            "Elena", "Daniel", "Sophia", "Liam", "Olivia", "Ethan", "Zoe", 
            "Lucas", "Mia", "Noah", "Emma", "Oliver", "Ava", "William", "Isabella"
        ];
        
        const indian_middle = ["Kumar", "Chandra", "Nath", "Kant", "Prasad", "Lal", "Deo", null, null, null];
        const english_middle = ["Alexander", "Marie", "Lee", "Rose", "James", "Anne", "Grace", null, null, null];
        
        const indian_last = [
            "Prashar", "Kumar", "Sharma", "Verma", "Singh", "Gupta", "Patel", 
            "Mishra", "Das", "Reddy", "Choudhury", "Bose", "Joshi", "Iyer", 
            "Nair", "Saxena", "Agarwal", "Bhatia", null
        ];
        
        const english_last = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", 
            "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", 
            "Martin", "Clark", "Lewis", "Robinson", null
        ];
        
        const rows = [];
        
        // Exact prominent records
        rows.push({ customer_id: 1, first_name: "Mrinal", middle_name: "Kumar", last_name: "Prashar" });
        rows.push({ customer_id: 2, first_name: "Ripunjay", middle_name: null, last_name: "Kumar" });
        rows.push({ customer_id: 3, first_name: "Amritesh", middle_name: null, last_name: "Kumar" });
        rows.push({ customer_id: 4, first_name: "Abhishek", middle_name: null, last_name: "Kumar" });
        rows.push({ customer_id: 5, first_name: "Unnayan", middle_name: null, last_name: "Kumar" });
        rows.push({ customer_id: 6, first_name: "Utpal", middle_name: null, last_name: "Kumar" });
        
        for (let cid = 7; cid <= 612; cid++) {
            const is_indian = (cid % 2 === 1);
            let fn, mn, ln;
            if (is_indian) {
                fn = indian_first[(cid - 7) % indian_first.length];
                mn = indian_middle[(cid * 3) % indian_middle.length];
                ln = indian_last[(cid * 7) % indian_last.length];
            } else {
                fn = english_first[(cid - 7) % english_first.length];
                mn = english_middle[(cid * 5) % english_middle.length];
                ln = english_last[(cid * 11) % english_last.length];
            }
            
            rows.push({
                customer_id: cid,
                first_name: fn,
                middle_name: mn,
                last_name: ln
            });
        }
        
        return rows;
    }

    generateProductListData() {
        return [
            { product_id: 1, product_name: 'Pro Laptop 15"', category: 'Electronics', price: 1299.99, stock_quantity: 25 },
            { product_id: 2, product_name: 'Wireless Noise-Canceling Headphones', category: 'Electronics', price: 199.99, stock_quantity: 80 },
            { product_id: 3, product_name: 'Smart Fitness Watch', category: 'Electronics', price: 149.99, stock_quantity: 120 },
            { product_id: 4, product_name: 'Mechanical Gaming Keyboard', category: 'Electronics', price: 89.99, stock_quantity: 65 },
            { product_id: 5, product_name: 'Ergonomic Wireless Mouse', category: 'Electronics', price: 49.99, stock_quantity: 150 },
            { product_id: 6, product_name: '4K Ultra HD Monitor 27"', category: 'Electronics', price: 349.99, stock_quantity: 40 },
            { product_id: 7, product_name: 'Running Shoes Pro', category: 'Footwear', price: 119.99, stock_quantity: 90 },
            { product_id: 8, product_name: 'Trail Hiking Boots', category: 'Footwear', price: 159.99, stock_quantity: 35 },
            { product_id: 9, product_name: 'Classic Leather Loafers', category: 'Footwear', price: 89.99, stock_quantity: 50 },
            { product_id: 10, product_name: 'Breathable Training Sneakers', category: 'Footwear', price: 69.99, stock_quantity: 110 },
            { product_id: 11, product_name: 'Organic Cotton Crewneck T-Shirt', category: 'Apparel', price: 24.99, stock_quantity: 200 },
            { product_id: 12, product_name: 'Slim Fit Denim Jeans', category: 'Apparel', price: 59.99, stock_quantity: 140 },
            { product_id: 13, product_name: 'Waterproof Winter Jacket', category: 'Apparel', price: 189.99, stock_quantity: 45 },
            { product_id: 14, product_name: 'Merino Wool Pullover Sweater', category: 'Apparel', price: 79.99, stock_quantity: 60 },
            { product_id: 15, product_name: 'Thermal Athletic Socks (3-Pack)', category: 'Apparel', price: 14.99, stock_quantity: 300 },
            { product_id: 16, product_name: 'Stainless Steel Water Bottle 32oz', category: 'Accessories', price: 29.99, stock_quantity: 180 },
            { product_id: 17, product_name: 'Anti-Theft Laptop Backpack', category: 'Accessories', price: 79.99, stock_quantity: 75 },
            { product_id: 18, product_name: 'Polarized Aviator Sunglasses', category: 'Accessories', price: 45.99, stock_quantity: 95 },
            { product_id: 19, product_name: 'Genuine Leather Wallet', category: 'Accessories', price: 39.99, stock_quantity: 130 },
            { product_id: 20, product_name: 'Fast Wireless Charging Pad', category: 'Accessories', price: 25.99, stock_quantity: 210 },
            { product_id: 21, product_name: 'Programmable Drip Coffee Maker', category: 'Home & Kitchen', price: 69.99, stock_quantity: 55 },
            { product_id: 22, product_name: 'Cast Iron Dutch Oven 6-Qt', category: 'Home & Kitchen', price: 84.99, stock_quantity: 30 },
            { product_id: 23, product_name: 'Precision Chef Knife 8"', category: 'Home & Kitchen', price: 49.99, stock_quantity: 85 },
            { product_id: 24, product_name: 'Aromatherapy Essential Oil Diffuser', category: 'Home & Kitchen', price: 34.99, stock_quantity: 115 },
            { product_id: 25, product_name: 'High-Speed Immersion Blender', category: 'Home & Kitchen', price: 39.99, stock_quantity: 70 }
        ];
    }

    generateSellsListData(products) {
        const sales = [
            { sale_id: 1, customer_id: 1, product_id: 1, quantity: 1, total_price: 1299.99, sale_date: '2026-01-15', payment_status: 'PAID' },
            { sale_id: 2, customer_id: 1, product_id: 4, quantity: 1, total_price: 89.99, sale_date: '2026-02-10', payment_status: 'PAID' },
            { sale_id: 3, customer_id: 2, product_id: 2, quantity: 2, total_price: 399.98, sale_date: '2026-01-20', payment_status: 'PAID' },
            { sale_id: 4, customer_id: 3, product_id: 6, quantity: 1, total_price: 349.99, sale_date: '2026-02-05', payment_status: 'PAID' },
            { sale_id: 5, customer_id: 4, product_id: 7, quantity: 1, total_price: 119.99, sale_date: '2026-02-14', payment_status: 'PAID' },
            { sale_id: 6, customer_id: 5, product_id: 17, quantity: 2, total_price: 159.98, sale_date: '2026-02-18', payment_status: 'PENDING' },
            { sale_id: 7, customer_id: 6, product_id: 3, quantity: 1, total_price: 149.99, sale_date: '2026-03-01', payment_status: 'PAID' }
        ];

        const dates = [
            '2026-01-08', '2026-01-12', '2026-01-19', '2026-01-25', '2026-01-30', 
            '2026-02-02', '2026-02-08', '2026-02-15', '2026-02-22', '2026-02-28',
            '2026-03-03', '2026-03-07', '2026-03-11', '2026-03-14'
        ];
        const statuses = ['PAID', 'PAID', 'PAID', 'PENDING', 'PAID', 'REFUNDED', 'CANCELLED'];

        for (let sid = 8; sid <= 60; sid++) {
            const cid = ((sid * 7) % 612) + 1;
            const pid = ((sid * 3) % 25) + 1;
            const p = products[pid - 1];
            const qty = (sid % 4) + 1;
            const tot = Math.round(p.price * qty * 100) / 100;
            const s_date = dates[sid % dates.length];
            const st = statuses[sid % statuses.length];
            sales.push({
                sale_id: sid,
                customer_id: cid,
                product_id: pid,
                quantity: qty,
                total_price: tot,
                sale_date: s_date,
                payment_status: st
            });
        }
        return sales;
    }

    generateEmployeesData() {
        return [
            { employee_id: 1, first_name: 'Mrinal', last_name: 'Prashar', department: 'Executive', salary: 150000.00, manager_id: null },
            { employee_id: 2, first_name: 'Ripunjay', last_name: 'Kumar', department: 'Engineering', salary: 120000.00, manager_id: 1 },
            { employee_id: 3, first_name: 'Amritesh', last_name: 'Nath', department: 'Engineering', salary: 95000.00, manager_id: 2 },
            { employee_id: 4, first_name: 'Sarah', last_name: 'Jenkins', department: 'Engineering', salary: 88000.00, manager_id: 2 },
            { employee_id: 5, first_name: 'Abhishek', last_name: 'Prasad', department: 'Engineering', salary: 75000.00, manager_id: 3 },
            { employee_id: 6, first_name: 'David', last_name: 'Miller', department: 'Sales', salary: 110000.00, manager_id: 1 },
            { employee_id: 7, first_name: 'Elena', last_name: 'Rostova', department: 'Sales', salary: 82000.00, manager_id: 6 },
            { employee_id: 8, first_name: 'Aarav', last_name: 'Sharma', department: 'Sales', salary: 62000.00, manager_id: 7 },
            { employee_id: 9, first_name: 'Emily', last_name: 'Clark', department: 'Marketing', salary: 90000.00, manager_id: 1 },
            { employee_id: 10, first_name: 'Priya', last_name: 'Verma', department: 'Marketing', salary: 68000.00, manager_id: 9 },
            { employee_id: 11, first_name: 'Michael', last_name: 'Chang', department: 'Operations', salary: 105000.00, manager_id: 1 },
            { employee_id: 12, first_name: 'Ananya', last_name: 'Iyer', department: 'Operations', salary: 72000.00, manager_id: 11 },
            { employee_id: 13, first_name: 'Jessica', last_name: 'Taylor', department: 'HR', salary: 85000.00, manager_id: 1 },
            { employee_id: 14, first_name: 'Rohan', last_name: 'Gupta', department: 'HR', salary: 58000.00, manager_id: 13 },
            { employee_id: 15, first_name: 'Vikram', last_name: 'Singh', department: 'Operations', salary: 64000.00, manager_id: 11 }
        ];
    }

    getSchema() {
        return this.getSchemaExplorerData();
    }

    getSchemaExplorerData() {
        const result = [];
        for (const [tblName, meta] of Object.entries(this.schemaData)) {
            let currentCount = 0;
            if (typeof alasql !== 'undefined' && alasql.tables && alasql.tables[tblName] && Array.isArray(alasql.tables[tblName].data)) {
                currentCount = alasql.tables[tblName].data.length;
            }
            result.push({
                name: tblName,
                category: meta.category || 'Core Tables',
                rowCount: currentCount,
                columns: meta.columns || []
            });
        }
        return result;
    }

    runQuery(sqlText) {
        if (!this.isInitialized) {
            this.init();
        }

        if (!sqlText || !sqlText.trim()) {
            return {
                success: false,
                error: 'Please enter a valid SQL query.',
                data: null,
                rowCount: 0,
                executionTimeMs: 0
            };
        }

        const cleanedFull = this.cleanSql(sqlText);
        const statements = this.splitStatements(cleanedFull);

        if (statements.length === 0) {
            return {
                success: false,
                error: 'Please enter a valid SQL query.',
                data: null,
                rowCount: 0,
                executionTimeMs: 0
            };
        }

        const startTime = performance.now();
        let lastResult = null;
        let totalRows = 0;

        try {
            for (let idx = 0; idx < statements.length; idx++) {
                const stmt = statements[idx];
                if (!stmt) continue;

                // Handle SELECT ... INTO target_table FROM ...
                const selectIntoMatch = stmt.match(/^\s*SELECT\s+([\s\S]+?)\s+INTO\s+([a-zA-Z0-9_#]+)\s+FROM\s+([\s\S]+)$/i);
                if (selectIntoMatch) {
                    const selectCols = selectIntoMatch[1];
                    const targetTable = selectIntoMatch[2].replace(/^#/, '');
                    const restFrom = selectIntoMatch[3];
                    const selectSql = "SELECT " + selectCols + " FROM " + restFrom;
                    const rows = alasql(selectSql);
                    try { alasql('DROP TABLE IF EXISTS ' + targetTable); } catch(e) {}
                    alasql('CREATE TABLE ' + targetTable);
                    if (alasql.tables && alasql.tables[targetTable]) {
                        alasql.tables[targetTable].data = rows;
                    }
                    lastResult = rows ? rows.length : 0;
                } else {
                    lastResult = alasql(stmt);
                }
            }

            const executionTimeMs = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
            let formattedData = lastResult;

            if (Array.isArray(lastResult)) {
                totalRows = lastResult.length;
            } else if (typeof lastResult === 'number') {
                totalRows = lastResult;
                formattedData = [{ 'AFFECTED_ROWS': lastResult }];
            } else {
                totalRows = lastResult ? 1 : 0;
                formattedData = lastResult ? [{ 'STATUS': String(lastResult) }] : [];
            }

            let columns = [];
            let values = [];

            if (Array.isArray(formattedData) && formattedData.length > 0) {
                columns = Object.keys(formattedData[0]);
                values = formattedData.map(row => columns.map(col => row[col]));
            }

            this.queryHistory.unshift({
                sql: sqlText.trim(),
                timestamp: new Date().toLocaleTimeString(),
                rowCount: totalRows,
                executionTimeMs: executionTimeMs,
                success: true
            });

            if (this.queryHistory.length > 50) this.queryHistory.pop();

            return {
                success: true,
                error: null,
                data: formattedData,
                columns: columns,
                values: values,
                rowCount: totalRows,
                executionTimeMs: executionTimeMs
            };
        } catch (err) {
            const executionTimeMs = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
            const errorMsg = (err && err.message) ? err.message : String(err);

            this.queryHistory.unshift({
                sql: sqlText.trim(),
                timestamp: new Date().toLocaleTimeString(),
                rowCount: 0,
                executionTimeMs: executionTimeMs,
                success: false,
                error: errorMsg
            });

            return {
                success: false,
                error: errorMsg,
                data: null,
                columns: [],
                values: [],
                rowCount: 0,
                executionTimeMs: executionTimeMs
            };
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

EdmithSqlEngine.DATABASE_SCHEMA = {
    "customers": {
        "category": "Customer Directory",
        "description": "Authoritative Customer Registry (612 records)",
        "columns": [
            { "name": "customer_id", "type": "INT", "isPk": true },
            { "name": "first_name", "type": "STRING", "isPk": false },
            { "name": "middle_name", "type": "STRING", "isPk": false },
            { "name": "last_name", "type": "STRING", "isPk": false }
        ]
    },
    "product_list": {
        "category": "E-Commerce Catalog",
        "description": "Product Inventory & Pricing Catalog (25 records)",
        "columns": [
            { "name": "product_id", "type": "INT", "isPk": true },
            { "name": "product_name", "type": "STRING", "isPk": false },
            { "name": "category", "type": "STRING", "isPk": false },
            { "name": "price", "type": "DECIMAL", "isPk": false },
            { "name": "stock_quantity", "type": "INT", "isPk": false }
        ]
    },
    "sells_list": {
        "category": "Sales & Orders",
        "description": "Customer Purchases & Order Fulfillment (60 records)",
        "columns": [
            { "name": "sale_id", "type": "INT", "isPk": true },
            { "name": "customer_id", "type": "INT", "isPk": false },
            { "name": "product_id", "type": "INT", "isPk": false },
            { "name": "quantity", "type": "INT", "isPk": false },
            { "name": "total_price", "type": "DECIMAL", "isPk": false },
            { "name": "sale_date", "type": "STRING", "isPk": false },
            { "name": "payment_status", "type": "STRING", "isPk": false }
        ]
    },
    "employees": {
        "category": "Corporate Directory",
        "description": "Company Staff, Departments & Reporting Hierarchy (15 records)",
        "columns": [
            { "name": "employee_id", "type": "INT", "isPk": true },
            { "name": "first_name", "type": "STRING", "isPk": false },
            { "name": "last_name", "type": "STRING", "isPk": false },
            { "name": "department", "type": "STRING", "isPk": false },
            { "name": "salary", "type": "DECIMAL", "isPk": false },
            { "name": "manager_id", "type": "INT", "isPk": false }
        ]
    }
};

window.edmithSql = new EdmithSqlEngine();
