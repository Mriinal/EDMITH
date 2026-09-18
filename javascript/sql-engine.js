/**
 * EDMITH SQL Engine
 * Production Banking Relational SQL Engine powered by AlaSQL.
 * Runs 100% locally and synchronously with zero external network downloads.
 * 15 Interconnected Production Banking Tables with realistic relational data.
 */

class EdmithSqlEngine {
    constructor() {
        this.isInitialized = false;
        this.engineType = 'AlaSQL Banking Engine (15 Tables)';
        this.schemaData = EdmithSqlEngine.DATABASE_SCHEMA;
        this.tableNames = Object.keys(this.schemaData);
        this.queryHistory = this.loadQueryHistory();
    }

    loadQueryHistory() {
        try {
            const saved = localStorage.getItem('edmith_sql_history_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.slice(0, 50);
            }
        } catch (e) {
            console.warn('[EDMITH SQL Engine] Unable to load persistent query history:', e);
        }
        return [];
    }

    saveQueryHistory() {
        try {
            localStorage.setItem('edmith_sql_history_v1', JSON.stringify(this.queryHistory));
        } catch (e) {
            console.warn('[EDMITH SQL Engine] Unable to persist query history:', e);
        }
    }

    clearQueryHistory() {
        this.queryHistory = [];
        try {
            localStorage.removeItem('edmith_sql_history_v1');
        } catch (e) {}
    }

    updateEngineMetadata() {
        if (typeof alasql === 'undefined' || !alasql.tables) return;
        const schema = this.getSchemaExplorerData();
        let totalRows = 0;
        for (const t of schema) {
            totalRows += (t.rowCount || 0);
        }
        this.engineType = `AlaSQL Banking Engine (${schema.length} Tables: ${totalRows} Records)`;
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
            this.updateEngineMetadata();
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

        // 1. customers
        alasql('CREATE TABLE customers (customer_id INT, first_name STRING, last_name STRING, email STRING, phone STRING, kyc_status STRING, city STRING, credit_score INT, created_at STRING)');
        const customers = this.generateCustomersData();
        alasql.tables.customers.data = customers;

        // 2. branches
        alasql('CREATE TABLE branches (branch_id INT, branch_name STRING, branch_code STRING, city STRING, state STRING, postal_code STRING, is_active STRING)');
        const branches = this.generateBranchesData();
        alasql.tables.branches.data = branches;

        // 3. accounts
        alasql('CREATE TABLE accounts (account_id INT, customer_id INT, branch_id INT, account_number STRING, account_type STRING, balance DECIMAL, currency STRING, status STRING, opened_date STRING)');
        const accounts = this.generateAccountsData(customers, branches);
        alasql.tables.accounts.data = accounts;

        // 4. transactions
        alasql('CREATE TABLE transactions (transaction_id INT, account_id INT, transaction_type STRING, amount DECIMAL, transaction_date STRING, description STRING, status STRING)');
        const transactions = this.generateTransactionsData(accounts);
        alasql.tables.transactions.data = transactions;

        // 5. transfers
        alasql('CREATE TABLE transfers (transfer_id INT, sender_account_id INT, receiver_account_id INT, amount DECIMAL, transfer_date STRING, fee DECIMAL, transfer_status STRING)');
        const transfers = this.generateTransfersData(accounts);
        alasql.tables.transfers.data = transfers;

        // 6. cards
        alasql('CREATE TABLE cards (card_id INT, account_id INT, card_number_last4 STRING, card_type STRING, network STRING, expiry_date STRING, daily_limit DECIMAL, status STRING)');
        const cards = this.generateCardsData(accounts);
        alasql.tables.cards.data = cards;

        // 7. loans
        alasql('CREATE TABLE loans (loan_id INT, customer_id INT, branch_id INT, loan_type STRING, amount DECIMAL, interest_rate DECIMAL, term_months INT, start_date STRING, status STRING)');
        const loans = this.generateLoansData(customers, branches);
        alasql.tables.loans.data = loans;

        // 8. loan_payments
        alasql('CREATE TABLE loan_payments (payment_id INT, loan_id INT, payment_date STRING, amount_paid DECIMAL, principal_paid DECIMAL, interest_paid DECIMAL, status STRING)');
        const loanPayments = this.generateLoanPaymentsData(loans);
        alasql.tables.loan_payments.data = loanPayments;

        // 9. beneficiaries
        alasql('CREATE TABLE beneficiaries (beneficiary_id INT, customer_id INT, beneficiary_name STRING, account_number STRING, bank_name STRING, is_verified STRING)');
        const beneficiaries = this.generateBeneficiariesData(customers);
        alasql.tables.beneficiaries.data = beneficiaries;

        // 10. merchants
        alasql('CREATE TABLE merchants (merchant_id INT, merchant_name STRING, category STRING, city STRING, country STRING)');
        const merchants = this.generateMerchantsData();
        alasql.tables.merchants.data = merchants;

        // 11. merchant_payments
        alasql('CREATE TABLE merchant_payments (payment_id INT, account_id INT, merchant_id INT, card_id INT, amount DECIMAL, payment_date STRING, status STRING)');
        const merchantPayments = this.generateMerchantPaymentsData(accounts, merchants, cards);
        alasql.tables.merchant_payments.data = merchantPayments;

        // 12. departments
        alasql('CREATE TABLE departments (department_id INT, department_name STRING, department_code STRING, annual_budget DECIMAL)');
        const departments = this.generateDepartmentsData();
        alasql.tables.departments.data = departments;

        // 13. employees
        alasql('CREATE TABLE employees (employee_id INT, branch_id INT, first_name STRING, last_name STRING, role STRING, department STRING, salary DECIMAL, manager_id INT, hire_date STRING)');
        const employees = this.generateEmployeesData(branches);
        alasql.tables.employees.data = employees;

        // 14. audit_logs
        alasql('CREATE TABLE audit_logs (log_id INT, employee_id INT, action STRING, entity_name STRING, entity_id INT, log_timestamp STRING, ip_address STRING)');
        const auditLogs = this.generateAuditLogsData(employees);
        alasql.tables.audit_logs.data = auditLogs;

        // 15. exchange_rates
        alasql('CREATE TABLE exchange_rates (rate_id INT, from_currency STRING, to_currency STRING, rate DECIMAL, updated_at STRING)');
        const exchangeRates = this.generateExchangeRatesData();
        alasql.tables.exchange_rates.data = exchangeRates;

        // Legacy compatibility tables (product_list & sells_list)
        try {
            alasql('CREATE TABLE product_list (product_id INT, product_name STRING, category STRING, price DECIMAL, stock_quantity INT)');
            const products = this.generateProductListData();
            alasql.tables.product_list.data = products;

            alasql('CREATE TABLE sells_list (sale_id INT, customer_id INT, product_id INT, quantity INT, total_price DECIMAL, sale_date STRING, payment_status STRING)');
            const sells = this.generateSellsListData(products);
            alasql.tables.sells_list.data = sells;
        } catch (e) {}

        // Case-insensitive aliases for standard SQL querying
        if (alasql.tables) {
            const keys = Object.keys(alasql.tables);
            for (const key of keys) {
                alasql.tables[key.toUpperCase()] = alasql.tables[key];
                const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
                alasql.tables[capitalized] = alasql.tables[key];
            }
        }

        this.updateEngineMetadata();
        console.log(`[EDMITH SQL Engine] Banking database initialized with 15 tables. ${this.engineType}`);
    }

    generateCustomersData() {
        const rows = [
            { customer_id: 1, first_name: "Mrinal", last_name: "Prashar", email: "mrinal.prashar@edmith.com", phone: "+1-202-555-0143", kyc_status: "Verified", city: "New York", credit_score: 810, created_at: "2024-01-15" },
            { customer_id: 2, first_name: "Ripunjay", last_name: "Kumar", email: "ripunjay.kumar@edmith.com", phone: "+1-202-555-0182", kyc_status: "Verified", city: "San Francisco", credit_score: 785, created_at: "2024-01-20" },
            { customer_id: 3, first_name: "Amritesh", last_name: "Nath", email: "amritesh.nath@edmith.com", phone: "+1-202-555-0199", kyc_status: "Verified", city: "Chicago", credit_score: 760, created_at: "2024-02-05" },
            { customer_id: 4, first_name: "Abhishek", last_name: "Prasad", email: "abhishek.prasad@edmith.com", phone: "+1-202-555-0177", kyc_status: "Verified", city: "Boston", credit_score: 740, created_at: "2024-02-14" },
            { customer_id: 5, first_name: "Unnayan", last_name: "Kumar", email: "unnayan.kumar@edmith.com", phone: "+1-202-555-0164", kyc_status: "Pending", city: "Austin", credit_score: 690, created_at: "2024-03-01" },
            { customer_id: 6, first_name: "Utpal", last_name: "Kumar", email: "utpal.kumar@edmith.com", phone: "+1-202-555-0121", kyc_status: "Verified", city: "Seattle", credit_score: 820, created_at: "2024-03-10" },
            { customer_id: 7, first_name: "Sarah", last_name: "Jenkins", email: "sarah.j@globalfin.org", phone: "+1-415-555-2384", kyc_status: "Verified", city: "San Francisco", credit_score: 775, created_at: "2024-03-15" },
            { customer_id: 8, first_name: "Michael", last_name: "Chang", email: "michael.c@techcorp.io", phone: "+1-212-555-7832", kyc_status: "Verified", city: "New York", credit_score: 795, created_at: "2024-03-22" },
            { customer_id: 9, first_name: "Elena", last_name: "Rostova", email: "elena.r@eurotrades.com", phone: "+44-20-7946-0912", kyc_status: "Verified", city: "London", credit_score: 750, created_at: "2024-04-02" },
            { customer_id: 10, first_name: "Aarav", last_name: "Sharma", email: "aarav.sharma@ventures.in", phone: "+91-98200-12345", kyc_status: "Verified", city: "Mumbai", credit_score: 730, created_at: "2024-04-12" },
            { customer_id: 11, first_name: "Emily", last_name: "Clark", email: "emily.clark@healthplus.net", phone: "+1-312-555-9011", kyc_status: "Verified", city: "Chicago", credit_score: 680, created_at: "2024-04-18" },
            { customer_id: 12, first_name: "David", last_name: "Miller", email: "david.miller@apexbuild.com", phone: "+1-512-555-4422", kyc_status: "Pending", city: "Austin", credit_score: 640, created_at: "2024-05-01" },
            { customer_id: 13, first_name: "Priya", last_name: "Verma", email: "priya.verma@fintech.co", phone: "+91-98111-99882", kyc_status: "Verified", city: "Bangalore", credit_score: 765, created_at: "2024-05-15" },
            { customer_id: 14, first_name: "Jessica", last_name: "Taylor", email: "jessica.t@taylorlaw.com", phone: "+1-617-555-3341", kyc_status: "Verified", city: "Boston", credit_score: 835, created_at: "2024-05-20" },
            { customer_id: 15, first_name: "Rajesh", last_name: "Gupta", email: "rajesh.gupta@delhiexports.in", phone: "+91-98710-33441", kyc_status: "Verified", city: "Delhi", credit_score: 710, created_at: "2024-06-01" },
            { customer_id: 16, first_name: "Sophia", last_name: "Williams", email: "sophia.w@luxbrands.fr", phone: "+33-1-4268-5500", kyc_status: "Verified", city: "Paris", credit_score: 790, created_at: "2024-06-11" },
            { customer_id: 17, first_name: "James", last_name: "Wilson", email: "j.wilson@energypartners.com", phone: "+1-713-555-8833", kyc_status: "Verified", city: "Houston", credit_score: 725, created_at: "2024-06-19" },
            { customer_id: 18, first_name: "Ananya", last_name: "Mishra", email: "ananya.m@creativemedia.in", phone: "+91-98300-44556", kyc_status: "Pending", city: "Kolkata", credit_score: 670, created_at: "2024-07-04" },
            { customer_id: 19, first_name: "Liam", last_name: "Davies", email: "liam.davies@ukfin.co.uk", phone: "+44-161-496-0193", kyc_status: "Verified", city: "Manchester", credit_score: 745, created_at: "2024-07-16" },
            { customer_id: 20, first_name: "Vikram", last_name: "Reddy", email: "vikram.reddy@hyderabadtech.com", phone: "+91-98480-11223", kyc_status: "Verified", city: "Hyderabad", credit_score: 800, created_at: "2024-08-01" },
            { customer_id: 21, first_name: "Olivia", last_name: "Brown", email: "olivia.brown@ecodesign.org", phone: "+1-503-555-7721", kyc_status: "Verified", city: "Portland", credit_score: 715, created_at: "2024-08-14" },
            { customer_id: 22, first_name: "Sanjay", last_name: "Patel", email: "sanjay.patel@gujaratmfg.com", phone: "+91-98250-99001", kyc_status: "Verified", city: "Ahmedabad", credit_score: 780, created_at: "2024-08-25" },
            { customer_id: 23, first_name: "Daniel", last_name: "Anderson", email: "d.anderson@denvermining.com", phone: "+1-303-555-6619", kyc_status: "Rejected", city: "Denver", credit_score: 590, created_at: "2024-09-05" },
            { customer_id: 24, first_name: "Neha", last_name: "Singh", email: "neha.singh@delhiaviators.com", phone: "+91-98100-77112", kyc_status: "Verified", city: "Delhi", credit_score: 760, created_at: "2024-09-18" },
            { customer_id: 25, first_name: "Lucas", last_name: "Martin", email: "lucas.martin@quebectech.ca", phone: "+1-514-555-0988", kyc_status: "Verified", city: "Montreal", credit_score: 755, created_at: "2024-10-02" }
        ];

        // Seed up to 100 realistic customer rows
        const firstNames = ["Ethan", "Emma", "Noah", "Ava", "William", "Isabella", "Alexander", "Mia", "Oliver", "Charlotte", "Rohan", "Pooja", "Deepak", "Kavita", "Alok", "Nikhil", "Manish", "Swati", "Ritu", "Amit", "Sunil", "Preeti", "Kunal", "Tanvi", "Gaurav"];
        const lastNames = ["Smith", "Johnson", "Davis", "Choudhury", "Bose", "Joshi", "Iyer", "Nair", "Saxena", "Agarwal", "Bhatia", "White", "Harris", "Lewis", "Robinson", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill"];
        const cities = ["New York", "London", "San Francisco", "Mumbai", "Chicago", "Boston", "Tokyo", "Singapore", "Toronto", "Sydney", "Berlin", "Dubai"];
        const kycOptions = ["Verified", "Verified", "Verified", "Pending", "Verified"];

        for (let i = 26; i <= 100; i++) {
            const fn = firstNames[(i * 3) % firstNames.length];
            const ln = lastNames[(i * 7) % lastNames.length];
            const city = cities[i % cities.length];
            const kyc = kycOptions[i % kycOptions.length];
            const score = 580 + ((i * 17) % 270);
            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 5) % 28) + 1).padStart(2, '0');
            rows.push({
                customer_id: i,
                first_name: fn,
                last_name: ln,
                email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@finmail.com`,
                phone: `+1-${200 + (i % 800)}-555-${1000 + i}`,
                kyc_status: kyc,
                city: city,
                credit_score: score,
                created_at: `2024-${m}-${d}`
            });
        }
        return rows;
    }

    generateBranchesData() {
        return [
            { branch_id: 1, branch_name: "Manhattan Financial District", branch_code: "NYC-001", city: "New York", state: "NY", postal_code: "10005", is_active: "TRUE" },
            { branch_id: 2, branch_name: "Silicon Valley Tech Branch", branch_code: "SFO-002", city: "San Francisco", state: "CA", postal_code: "94104", is_active: "TRUE" },
            { branch_id: 3, branch_name: "Chicago Loop Commercial", branch_code: "CHI-003", city: "Chicago", state: "IL", postal_code: "60603", is_active: "TRUE" },
            { branch_id: 4, branch_name: "London Canary Wharf HQ", branch_code: "LDN-004", city: "London", state: "ENG", postal_code: "E14 5AB", is_active: "TRUE" },
            { branch_id: 5, branch_name: "Mumbai Nariman Point Hub", branch_code: "BOM-005", city: "Mumbai", state: "MH", postal_code: "400021", is_active: "TRUE" },
            { branch_id: 6, branch_name: "Boston Back Bay Premier", branch_code: "BOS-006", city: "Boston", state: "MA", postal_code: "02116", is_active: "TRUE" },
            { branch_id: 7, branch_name: "Austin Innovation Center", branch_code: "ATX-007", city: "Austin", state: "TX", postal_code: "78701", is_active: "TRUE" },
            { branch_id: 8, branch_name: "Toronto Bay Street Financial", branch_code: "TOR-008", city: "Toronto", state: "ON", postal_code: "M5H 2R2", is_active: "TRUE" },
            { branch_id: 9, branch_name: "Singapore Marina Bay Sands", branch_code: "SIN-009", city: "Singapore", state: "SG", postal_code: "018956", is_active: "TRUE" },
            { branch_id: 10, branch_name: "Tokyo Marunouchi Tower", branch_code: "TYO-010", city: "Tokyo", state: "TK", postal_code: "100-0005", is_active: "TRUE" }
        ];
    }

    generateAccountsData(customers, branches) {
        const rows = [];
        const accountTypes = ["Savings", "Checking", "Business", "Money Market"];
        const currencies = ["USD", "USD", "USD", "EUR", "GBP", "INR"];
        const statuses = ["Active", "Active", "Active", "Active", "Dormant", "Frozen"];

        let accId = 1;
        for (const cust of customers) {
            // Each customer gets 1-2 accounts
            const numAccs = (cust.customer_id % 3 === 0) ? 2 : 1;
            for (let a = 0; a < numAccs; a++) {
                const branch = branches[(cust.customer_id + a) % branches.length];
                const accType = accountTypes[(cust.customer_id + a) % accountTypes.length];
                const curr = currencies[(cust.customer_id) % currencies.length];
                const st = statuses[(cust.customer_id * 7) % statuses.length];
                const baseBal = 2500 + ((cust.customer_id * 1873 + a * 4500) % 95000);
                const bal = Math.round(baseBal * 100) / 100;
                const accNum = `AC-${100000 + accId}`;
                const m = String((accId % 12) + 1).padStart(2, '0');
                const d = String(((accId * 3) % 28) + 1).padStart(2, '0');

                rows.push({
                    account_id: accId,
                    customer_id: cust.customer_id,
                    branch_id: branch.branch_id,
                    account_number: accNum,
                    account_type: accType,
                    balance: bal,
                    currency: curr,
                    status: st,
                    opened_date: `2024-${m}-${d}`
                });
                accId++;
            }
        }
        return rows;
    }

    generateTransactionsData(accounts) {
        const rows = [];
        const types = ["Deposit", "Withdrawal", "Transfer", "Fee", "Deposit", "Withdrawal"];
        const descriptions = [
            "Monthly Salary Direct Deposit",
            "ATM Cash Withdrawal",
            "Wire Transfer Disbursal",
            "Monthly Account Maintenance Fee",
            "Client Contract Payment",
            "Dividend Reinvestment Credit",
            "Mortgage Autopay Deduction",
            "Utility Bill Online Payment",
            "Interest Payout",
            "Foreign Exchange Settlement"
        ];
        const statuses = ["Completed", "Completed", "Completed", "Completed", "Pending", "Failed"];

        let txId = 1;
        for (let i = 1; i <= 250; i++) {
            const acc = accounts[(i * 3) % accounts.length];
            const type = types[i % types.length];
            const desc = descriptions[i % descriptions.length];
            const st = statuses[i % statuses.length];
            let amount = 50 + ((i * 347) % 4500);
            if (type === 'Fee') amount = 15.00 + (i % 25);
            amount = Math.round(amount * 100) / 100;

            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 7) % 28) + 1).padStart(2, '0');

            rows.push({
                transaction_id: txId,
                account_id: acc.account_id,
                transaction_type: type,
                amount: amount,
                transaction_date: `2025-${m}-${d}`,
                description: desc,
                status: st
            });
            txId++;
        }
        return rows;
    }

    generateTransfersData(accounts) {
        const rows = [];
        for (let i = 1; i <= 75; i++) {
            const sender = accounts[(i * 2) % accounts.length];
            let receiverIdx = (i * 5 + 1) % accounts.length;
            if (receiverIdx === (i * 2) % accounts.length) receiverIdx = (receiverIdx + 1) % accounts.length;
            const receiver = accounts[receiverIdx];
            const amt = Math.round((100 + ((i * 883) % 8500)) * 100) / 100;
            const fee = (amt > 2000) ? 15.00 : 0.00;
            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 9) % 28) + 1).padStart(2, '0');

            rows.push({
                transfer_id: i,
                sender_account_id: sender.account_id,
                receiver_account_id: receiver.account_id,
                amount: amt,
                transfer_date: `2025-${m}-${d}`,
                fee: fee,
                transfer_status: (i % 15 === 0) ? "Failed" : "Success"
            });
        }
        return rows;
    }

    generateCardsData(accounts) {
        const rows = [];
        const cardTypes = ["Debit", "Credit"];
        const networks = ["Visa", "MasterCard", "Amex"];
        const cardStatuses = ["Active", "Active", "Active", "Blocked", "Expired"];

        for (let i = 1; i <= 80; i++) {
            const acc = accounts[i % accounts.length];
            const ct = cardTypes[i % cardTypes.length];
            const net = networks[i % networks.length];
            const st = cardStatuses[i % cardStatuses.length];
            const last4 = String(1000 + ((i * 877) % 9000));
            const limit = (ct === 'Credit') ? (5000 + (i % 10) * 2500) : 1500.00;

            rows.push({
                card_id: i,
                account_id: acc.account_id,
                card_number_last4: last4,
                card_type: ct,
                network: net,
                expiry_date: `2028-0${(i % 9) + 1}`,
                daily_limit: limit,
                status: st
            });
        }
        return rows;
    }

    generateLoansData(customers, branches) {
        const rows = [];
        const loanTypes = ["Home Mortgage", "Auto Loan", "Personal Loan", "Business Expansion", "Education Loan"];
        const rates = [3.75, 4.50, 6.25, 7.90, 5.15, 8.50];
        const terms = [36, 60, 120, 180, 240, 360];
        const statuses = ["Active", "Active", "Active", "Paid Off", "Defaulted"];

        for (let i = 1; i <= 40; i++) {
            const cust = customers[(i * 3) % customers.length];
            const branch = branches[i % branches.length];
            const lType = loanTypes[i % loanTypes.length];
            const rate = rates[i % rates.length];
            const term = terms[i % terms.length];
            const st = statuses[i % statuses.length];
            const principal = 15000 + ((i * 12341) % 450000);

            rows.push({
                loan_id: i,
                customer_id: cust.customer_id,
                branch_id: branch.branch_id,
                loan_type: lType,
                amount: Math.round(principal * 100) / 100,
                interest_rate: rate,
                term_months: term,
                start_date: `2023-0${(i % 9) + 1}-15`,
                status: st
            });
        }
        return rows;
    }

    generateLoanPaymentsData(loans) {
        const rows = [];
        let payId = 1;
        for (let i = 1; i <= 100; i++) {
            const loan = loans[i % loans.length];
            const total = Math.round((loan.amount / loan.term_months + 120) * 100) / 100;
            const interest = Math.round((total * (loan.interest_rate / 100 / 12) * 10) * 100) / 100;
            const principal = Math.round((total - interest) * 100) / 100;

            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 3) % 25) + 1).padStart(2, '0');

            rows.push({
                payment_id: payId,
                loan_id: loan.loan_id,
                payment_date: `2025-${m}-${d}`,
                amount_paid: total,
                principal_paid: principal,
                interest_paid: interest,
                status: (i % 20 === 0) ? "Late" : "Completed"
            });
            payId++;
        }
        return rows;
    }

    generateBeneficiariesData(customers) {
        const rows = [];
        const bankNames = ["JPMorgan Chase", "Bank of America", "Barclays Bank", "HDFC Bank", "HSBC Premier", "Wells Fargo", "Standard Chartered"];
        const payees = [
            "Apex Cloud Hosting Ltd", "Starlight Realty Trust", "Vanguard Investment Fund",
            "Metropolitan Utility Board", "Global Logistics Partners", "Nexus Consultancy LLC",
            "Prime Health Insurance", "Beacon Educational Trust", "Alpine Property Management"
        ];

        for (let i = 1; i <= 50; i++) {
            const cust = customers[(i * 4) % customers.length];
            const payee = payees[i % payees.length];
            const bank = bankNames[i % bankNames.length];
            const accNum = `EXT-${900000 + i * 17}`;

            rows.push({
                beneficiary_id: i,
                customer_id: cust.customer_id,
                beneficiary_name: payee,
                account_number: accNum,
                bank_name: bank,
                is_verified: (i % 6 === 0) ? "NO" : "YES"
            });
        }
        return rows;
    }

    generateMerchantsData() {
        return [
            { merchant_id: 1, merchant_name: "Amazon Marketplace", category: "Retail", city: "Seattle", country: "USA" },
            { merchant_id: 2, merchant_name: "Apple Store Regent St", category: "Electronics", city: "London", country: "UK" },
            { merchant_id: 3, merchant_name: "Starbucks Coffee #104", category: "Dining", city: "New York", country: "USA" },
            { merchant_id: 4, merchant_name: "Uber Technologies", category: "Travel", city: "San Francisco", country: "USA" },
            { merchant_id: 5, merchant_name: "Netflix Subscription", category: "Entertainment", city: "Los Gatos", country: "USA" },
            { merchant_id: 6, merchant_name: "Whole Foods Market", category: "Groceries", city: "Austin", country: "USA" },
            { merchant_id: 7, merchant_name: "Delta Air Lines", category: "Travel", city: "Atlanta", country: "USA" },
            { merchant_id: 8, merchant_name: "Walmart Supercenter", category: "Retail", city: "Bentonville", country: "USA" },
            { merchant_id: 9, merchant_name: "Reliance Digital Hub", category: "Electronics", city: "Mumbai", country: "India" },
            { merchant_id: 10, merchant_name: "Target Stores", category: "Retail", city: "Minneapolis", country: "USA" },
            { merchant_id: 11, merchant_name: "British Airways Booking", category: "Travel", city: "London", country: "UK" },
            { merchant_id: 12, merchant_name: "Shell Petrol Station", category: "Automotive", city: "Houston", country: "USA" },
            { merchant_id: 13, merchant_name: "Swiggy Food Delivery", category: "Dining", city: "Bangalore", country: "India" },
            { merchant_id: 14, merchant_name: "Best Buy Megastore", category: "Electronics", city: "Richfield", country: "USA" },
            { merchant_id: 15, merchant_name: "Zara Fashion", category: "Apparel", city: "Madrid", country: "Spain" },
            { merchant_id: 16, merchant_name: "IKEA Home Furnishings", category: "Home", city: "Delft", country: "Netherlands" },
            { merchant_id: 17, merchant_name: "Spotify Premium", category: "Entertainment", city: "Stockholm", country: "Sweden" },
            { merchant_id: 18, merchant_name: "Marriott International", category: "Hospitality", city: "Bethesda", country: "USA" },
            { merchant_id: 19, merchant_name: "CVS Pharmacy", category: "Healthcare", city: "Woonsocket", country: "USA" },
            { merchant_id: 20, merchant_name: "Costco Wholesale", category: "Retail", city: "Issaquah", country: "USA" }
        ];
    }

    generateMerchantPaymentsData(accounts, merchants, cards) {
        const rows = [];
        const statuses = ["Settled", "Settled", "Settled", "Settled", "Refunded", "Pending"];

        for (let i = 1; i <= 120; i++) {
            const acc = accounts[(i * 3) % accounts.length];
            const merch = merchants[i % merchants.length];
            const card = cards[i % cards.length];
            const st = statuses[i % statuses.length];
            const amt = Math.round((12.50 + ((i * 491) % 850)) * 100) / 100;
            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 7) % 28) + 1).padStart(2, '0');

            rows.push({
                payment_id: i,
                account_id: acc.account_id,
                merchant_id: merch.merchant_id,
                card_id: card.card_id,
                amount: amt,
                payment_date: `2025-${m}-${d}`,
                status: st
            });
        }
        return rows;
    }

    generateDepartmentsData() {
        return [
            { department_id: 1, department_name: "Executive Leadership", department_code: "EXEC", annual_budget: 12500000.00 },
            { department_id: 2, department_name: "Retail Banking Operations", department_code: "RETAIL", annual_budget: 45000000.00 },
            { department_id: 3, department_name: "Commercial & Corporate Lending", department_code: "LEND", annual_budget: 38000000.00 },
            { department_id: 4, department_name: "Wealth & Asset Management", department_code: "WEALTH", annual_budget: 28000000.00 },
            { department_id: 5, department_name: "Risk, Audit & Compliance", department_code: "RISK", annual_budget: 19500000.00 },
            { department_id: 6, department_name: "Information Security & Core IT", department_code: "TECH", annual_budget: 52000000.00 },
            { department_id: 7, department_name: "Treasury & Capital Markets", department_code: "TREAS", annual_budget: 31000000.00 },
            { department_id: 8, department_name: "Human Capital & Talent", department_code: "HR", annual_budget: 8500000.00 }
        ];
    }

    generateEmployeesData(branches) {
        return [
            { employee_id: 1, branch_id: 1, first_name: "Mrinal", last_name: "Prashar", role: "Chief Executive Officer", department: "Executive Leadership", salary: 350000.00, manager_id: null, hire_date: "2019-01-15" },
            { employee_id: 2, branch_id: 1, first_name: "Ripunjay", last_name: "Kumar", role: "Chief Technology Officer", department: "Information Security & Core IT", salary: 280000.00, manager_id: 1, hire_date: "2019-04-01" },
            { employee_id: 3, branch_id: 1, first_name: "Amritesh", last_name: "Nath", role: "Chief Risk Officer", department: "Risk, Audit & Compliance", salary: 260000.00, manager_id: 1, hire_date: "2019-06-15" },
            { employee_id: 4, branch_id: 1, first_name: "Sarah", last_name: "Jenkins", role: "Head of Retail Banking", department: "Retail Banking Operations", salary: 240000.00, manager_id: 1, hire_date: "2020-02-10" },
            { employee_id: 5, branch_id: 2, first_name: "Abhishek", last_name: "Prasad", role: "Branch Director - Silicon Valley", department: "Retail Banking Operations", salary: 175000.00, manager_id: 4, hire_date: "2020-05-18" },
            { employee_id: 6, branch_id: 3, first_name: "David", last_name: "Miller", role: "Branch Director - Chicago", department: "Retail Banking Operations", salary: 165000.00, manager_id: 4, hire_date: "2020-08-01" },
            { employee_id: 7, branch_id: 4, first_name: "Elena", last_name: "Rostova", role: "Managing Director - UK & Europe", department: "Treasury & Capital Markets", salary: 220000.00, manager_id: 1, hire_date: "2020-11-20" },
            { employee_id: 8, branch_id: 5, first_name: "Aarav", last_name: "Sharma", role: "Regional Director - South Asia", department: "Commercial & Corporate Lending", salary: 195000.00, manager_id: 1, hire_date: "2021-01-10" },
            { employee_id: 9, branch_id: 1, first_name: "Emily", last_name: "Clark", role: "VP of Wealth Management", department: "Wealth & Asset Management", salary: 190000.00, manager_id: 1, hire_date: "2021-03-15" },
            { employee_id: 10, branch_id: 2, first_name: "Michael", last_name: "Chang", role: "Lead Systems Architect", department: "Information Security & Core IT", salary: 185000.00, manager_id: 2, hire_date: "2021-06-01" },
            { employee_id: 11, branch_id: 1, first_name: "Priya", last_name: "Verma", role: "Senior Compliance Auditor", department: "Risk, Audit & Compliance", salary: 135000.00, manager_id: 3, hire_date: "2021-09-12" },
            { employee_id: 12, branch_id: 2, first_name: "Jessica", last_name: "Taylor", role: "Senior Commercial Loan Officer", department: "Commercial & Corporate Lending", salary: 145000.00, manager_id: 8, hire_date: "2022-01-15" },
            { employee_id: 13, branch_id: 3, first_name: "Rajesh", last_name: "Gupta", role: "Senior Portfolio Manager", department: "Wealth & Asset Management", salary: 155000.00, manager_id: 9, hire_date: "2022-04-20" },
            { employee_id: 14, branch_id: 4, first_name: "Liam", last_name: "Davies", role: "Treasury Operations Manager", department: "Treasury & Capital Markets", salary: 140000.00, manager_id: 7, hire_date: "2022-07-01" },
            { employee_id: 15, branch_id: 5, first_name: "Vikram", last_name: "Reddy", role: "Senior Loan Underwriter", department: "Commercial & Corporate Lending", salary: 125000.00, manager_id: 8, hire_date: "2022-10-15" },
            { employee_id: 16, branch_id: 1, first_name: "Olivia", last_name: "Brown", role: "Principal Database Administrator", department: "Information Security & Core IT", salary: 165000.00, manager_id: 2, hire_date: "2023-01-10" },
            { employee_id: 17, branch_id: 2, first_name: "Lucas", last_name: "Martin", role: "Senior Cybersecurity Engineer", department: "Information Security & Core IT", salary: 155000.00, manager_id: 10, hire_date: "2023-03-01" },
            { employee_id: 18, branch_id: 6, branch_id: 6, first_name: "Sanjay", last_name: "Patel", role: "Branch Operations Supervisor", department: "Retail Banking Operations", salary: 98000.00, manager_id: 4, hire_date: "2023-05-15" },
            { employee_id: 19, branch_id: 7, first_name: "Sophia", last_name: "Williams", role: "Private Wealth Advisor", department: "Wealth & Asset Management", salary: 120000.00, manager_id: 9, hire_date: "2023-08-20" },
            { employee_id: 20, branch_id: 1, first_name: "Daniel", last_name: "Anderson", role: "AML & Fraud Investigator", department: "Risk, Audit & Compliance", salary: 115000.00, manager_id: 11, hire_date: "2023-11-01" }
        ];
    }

    generateAuditLogsData(employees) {
        const rows = [];
        const actions = ["USER_LOGIN", "KYC_VERIFIED", "ACCOUNT_OPENED", "LOAN_APPROVED", "WIRE_TRANSFER_OVERRIDE", "LIMIT_INCREASE", "SUSPICIOUS_ACTIVITY_FLAG", "RATE_ADJUSTMENT"];
        const entities = ["customer", "account", "loan", "transfer", "card"];

        for (let i = 1; i <= 60; i++) {
            const emp = employees[i % employees.length];
            const act = actions[i % actions.length];
            const ent = entities[i % entities.length];
            const m = String((i % 12) + 1).padStart(2, '0');
            const d = String(((i * 4) % 28) + 1).padStart(2, '0');
            const h = String((i * 3) % 24).padStart(2, '0');
            const min = String((i * 7) % 60).padStart(2, '0');

            rows.push({
                log_id: i,
                employee_id: emp.employee_id,
                action: act,
                entity_name: ent,
                entity_id: 100 + (i % 80),
                log_timestamp: `2025-${m}-${d} ${h}:${min}:00`,
                ip_address: `192.168.10.${50 + (i % 150)}`
            });
        }
        return rows;
    }

    generateExchangeRatesData() {
        return [
            { rate_id: 1, from_currency: "USD", to_currency: "EUR", rate: 0.9250, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 2, from_currency: "USD", to_currency: "GBP", rate: 0.7840, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 3, from_currency: "USD", to_currency: "INR", rate: 86.4500, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 4, from_currency: "USD", to_currency: "JPY", rate: 154.2000, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 5, from_currency: "USD", to_currency: "CAD", rate: 1.3850, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 6, from_currency: "EUR", to_currency: "USD", rate: 1.0811, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 7, from_currency: "GBP", to_currency: "USD", rate: 1.2755, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 8, from_currency: "INR", to_currency: "USD", rate: 0.0116, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 9, from_currency: "USD", to_currency: "AUD", rate: 1.5420, updated_at: "2026-03-15 09:00:00" },
            { rate_id: 10, from_currency: "USD", to_currency: "SGD", rate: 1.3410, updated_at: "2026-03-15 09:00:00" }
        ];
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
            const cid = ((sid * 7) % 25) + 1;
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

    getSchemaExplorerData() {
        const result = [];
        if (typeof alasql === 'undefined' || !alasql.tables) {
            return result;
        }

        const seenLower = new Set();
        // 1. Core tables defined in schemaData
        for (const [tblName, meta] of Object.entries(this.schemaData)) {
            const lower = tblName.toLowerCase();
            seenLower.add(lower);
            const alaTable = alasql.tables[tblName] || alasql.tables[lower] || alasql.tables[tblName.toUpperCase()];
            if (!alaTable) continue; // Table was dropped by user

            let currentCount = (alaTable && Array.isArray(alaTable.data)) ? alaTable.data.length : 0;
            result.push({
                name: tblName,
                category: meta.category || 'Core Tables',
                description: meta.description || '',
                rowCount: currentCount,
                columns: meta.columns || []
            });
        }

        // 2. Discover user-created tables in alasql.tables (e.g. CREATE TABLE temp_...)
        for (const [tName, alaTable] of Object.entries(alasql.tables)) {
            const lower = tName.toLowerCase();
            if (seenLower.has(lower) || !alaTable) continue;
            // Keep internal compatibility tables hidden from the 15-table banking list
            if (lower === 'product_list' || lower === 'sells_list') continue;
            seenLower.add(lower);

            const currentCount = (alaTable && Array.isArray(alaTable.data)) ? alaTable.data.length : 0;
            let cols = [];
            if (Array.isArray(alaTable.columns) && alaTable.columns.length > 0) {
                cols = alaTable.columns.map(c => ({
                    name: c.columnid || c.name || String(c),
                    type: (c.dbtypeid || c.type || 'TEXT').toUpperCase(),
                    isPk: !!c.pk
                }));
            } else if (Array.isArray(alaTable.data) && alaTable.data.length > 0) {
                cols = Object.keys(alaTable.data[0]).map(k => ({
                    name: k,
                    type: typeof alaTable.data[0][k] === 'number' ? 'NUMBER' : 'TEXT',
                    isPk: false
                }));
            } else {
                cols = [{ name: 'id', type: 'INT', isPk: false }];
            }

            result.push({
                name: tName,
                category: 'User Created Tables',
                description: 'Custom user table created via DDL',
                rowCount: currentCount,
                columns: cols
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
        let lastStatement = '';
        let totalAffected = 0;

        try {
            for (const stmt of statements) {
                if (!stmt) continue;
                lastStatement = stmt;

                // Auto-create destination table for SELECT ... INTO queries if not present
                const trimmed = stmt.trim();
                if (/^SELECT\b/i.test(trimmed)) {
                    const intoMatch = trimmed.match(/\bINTO\s+([a-zA-Z0-9_]+)/i);
                    if (intoMatch && intoMatch[1]) {
                        const targetTable = intoMatch[1];
                        if (!alasql.tables[targetTable] && !alasql.tables[targetTable.toLowerCase()]) {
                            try {
                                alasql('CREATE TABLE ' + targetTable);
                            } catch (e) {}
                        }
                    }
                }

                lastResult = alasql(stmt);
            }

            const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
            const upper = lastStatement.toUpperCase().trim();

            const isSelect = upper.startsWith('SELECT') || upper.startsWith('WITH');
            const isDdl = upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP') || upper.startsWith('TRUNCATE');
            const isDml = upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE');
            const isSelectInto = isSelect && /\bINTO\s+([a-zA-Z0-9_]+)/i.test(upper);

            let message = null;
            let resultData = [];
            let columns = [];
            let values = [];

            if (isSelectInto) {
                const affected = typeof lastResult === 'number' ? lastResult : 1;
                message = `SELECT INTO query executed successfully (${affected} row${affected === 1 ? '' : 's'} copied).`;
                this.updateEngineMetadata();
            } else if (isDdl) {
                const keyword = upper.split(/\s+/)[0];
                const target = upper.split(/\s+/)[1] || 'OBJECT';
                message = `${keyword} ${target} executed successfully.`;
                this.updateEngineMetadata();
            } else if (isDml) {
                const keyword = upper.split(/\s+/)[0];
                const affected = typeof lastResult === 'number' ? lastResult : 1;
                message = `${keyword} query executed successfully (${affected} row${affected === 1 ? '' : 's'} affected).`;
                this.updateEngineMetadata();
            } else if (Array.isArray(lastResult)) {
                resultData = lastResult;
                if (resultData.length > 0) {
                    columns = Object.keys(resultData[0]);
                    values = resultData.map(row => columns.map(col => row[col]));
                }
            } else if (typeof lastResult === 'object' && lastResult !== null) {
                resultData = [lastResult];
                columns = Object.keys(lastResult);
                values = [columns.map(col => lastResult[col])];
            }

            this.queryHistory.unshift({
                sql: sqlText,
                timestamp: new Date().toISOString(),
                rowCount: resultData.length,
                success: true
            });
            if (this.queryHistory.length > 50) this.queryHistory.pop();
            this.saveQueryHistory();

            return {
                success: true,
                isDdl: isDdl,
                isDml: isDml,
                message: message,
                error: null,
                data: resultData,
                columns: columns,
                values: values,
                rowCount: resultData.length,
                executionTimeMs: executionTimeMs
            };
        } catch (err) {
            const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
            const errorMsg = err && err.message ? err.message : String(err);

            this.queryHistory.unshift({
                sql: sqlText,
                timestamp: new Date().toISOString(),
                rowCount: 0,
                success: false,
                error: errorMsg
            });
            if (this.queryHistory.length > 50) this.queryHistory.pop();
            this.saveQueryHistory();

            return {
                success: false,
                isDdl: false,
                isDml: false,
                message: null,
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

    static exportToJSON(data, filename = 'query_results.json') {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
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
        "category": "Customer Profiles",
        "description": "Verified banking customers with KYC status and credit ratings (100 records)",
        "columns": [
            { "name": "customer_id", "type": "INT", "isPk": true },
            { "name": "first_name", "type": "STRING", "isPk": false },
            { "name": "last_name", "type": "STRING", "isPk": false },
            { "name": "email", "type": "STRING", "isPk": false },
            { "name": "phone", "type": "STRING", "isPk": false },
            { "name": "kyc_status", "type": "STRING", "isPk": false },
            { "name": "city", "type": "STRING", "isPk": false },
            { "name": "credit_score", "type": "INT", "isPk": false },
            { "name": "created_at", "type": "STRING", "isPk": false }
        ]
    },
    "branches": {
        "category": "Bank Network",
        "description": "Global and domestic branch offices (10 branches)",
        "columns": [
            { "name": "branch_id", "type": "INT", "isPk": true },
            { "name": "branch_name", "type": "STRING", "isPk": false },
            { "name": "branch_code", "type": "STRING", "isPk": false },
            { "name": "city", "type": "STRING", "isPk": false },
            { "name": "state", "type": "STRING", "isPk": false },
            { "name": "postal_code", "type": "STRING", "isPk": false },
            { "name": "is_active", "type": "STRING", "isPk": false }
        ]
    },
    "accounts": {
        "category": "Deposit Accounts",
        "description": "Customer Savings, Checking, and Money Market accounts (133 accounts)",
        "columns": [
            { "name": "account_id", "type": "INT", "isPk": true },
            { "name": "customer_id", "type": "INT", "isPk": false },
            { "name": "branch_id", "type": "INT", "isPk": false },
            { "name": "account_number", "type": "STRING", "isPk": false },
            { "name": "account_type", "type": "STRING", "isPk": false },
            { "name": "balance", "type": "DECIMAL", "isPk": false },
            { "name": "currency", "type": "STRING", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false },
            { "name": "opened_date", "type": "STRING", "isPk": false }
        ]
    },
    "transactions": {
        "category": "Payments & Ledger",
        "description": "Historical deposits, withdrawals, fees, and payouts (250 records)",
        "columns": [
            { "name": "transaction_id", "type": "INT", "isPk": true },
            { "name": "account_id", "type": "INT", "isPk": false },
            { "name": "transaction_type", "type": "STRING", "isPk": false },
            { "name": "amount", "type": "DECIMAL", "isPk": false },
            { "name": "transaction_date", "type": "STRING", "isPk": false },
            { "name": "description", "type": "STRING", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false }
        ]
    },
    "transfers": {
        "category": "Payments & Ledger",
        "description": "Account-to-account funds transfers and fees (75 records)",
        "columns": [
            { "name": "transfer_id", "type": "INT", "isPk": true },
            { "name": "sender_account_id", "type": "INT", "isPk": false },
            { "name": "receiver_account_id", "type": "INT", "isPk": false },
            { "name": "amount", "type": "DECIMAL", "isPk": false },
            { "name": "transfer_date", "type": "STRING", "isPk": false },
            { "name": "fee", "type": "DECIMAL", "isPk": false },
            { "name": "transfer_status", "type": "STRING", "isPk": false }
        ]
    },
    "cards": {
        "category": "Cards & Access",
        "description": "Debit and Credit cards issued to accounts (80 cards)",
        "columns": [
            { "name": "card_id", "type": "INT", "isPk": true },
            { "name": "account_id", "type": "INT", "isPk": false },
            { "name": "card_number_last4", "type": "STRING", "isPk": false },
            { "name": "card_type", "type": "STRING", "isPk": false },
            { "name": "network", "type": "STRING", "isPk": false },
            { "name": "expiry_date", "type": "STRING", "isPk": false },
            { "name": "daily_limit", "type": "DECIMAL", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false }
        ]
    },
    "loans": {
        "category": "Lending & Credit",
        "description": "Mortgages, Auto, Business, and Education loans (40 loans)",
        "columns": [
            { "name": "loan_id", "type": "INT", "isPk": true },
            { "name": "customer_id", "type": "INT", "isPk": false },
            { "name": "branch_id", "type": "INT", "isPk": false },
            { "name": "loan_type", "type": "STRING", "isPk": false },
            { "name": "amount", "type": "DECIMAL", "isPk": false },
            { "name": "interest_rate", "type": "DECIMAL", "isPk": false },
            { "name": "term_months", "type": "INT", "isPk": false },
            { "name": "start_date", "type": "STRING", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false }
        ]
    },
    "loan_payments": {
        "category": "Lending & Credit",
        "description": "Monthly loan installment repayments (100 records)",
        "columns": [
            { "name": "payment_id", "type": "INT", "isPk": true },
            { "name": "loan_id", "type": "INT", "isPk": false },
            { "name": "payment_date", "type": "STRING", "isPk": false },
            { "name": "amount_paid", "type": "DECIMAL", "isPk": false },
            { "name": "principal_paid", "type": "DECIMAL", "isPk": false },
            { "name": "interest_paid", "type": "DECIMAL", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false }
        ]
    },
    "beneficiaries": {
        "category": "Payments & Ledger",
        "description": "Saved recipient payees across partner banks (50 payees)",
        "columns": [
            { "name": "beneficiary_id", "type": "INT", "isPk": true },
            { "name": "customer_id", "type": "INT", "isPk": false },
            { "name": "beneficiary_name", "type": "STRING", "isPk": false },
            { "name": "account_number", "type": "STRING", "isPk": false },
            { "name": "bank_name", "type": "STRING", "isPk": false },
            { "name": "is_verified", "type": "STRING", "isPk": false }
        ]
    },
    "merchants": {
        "category": "Commercial Partners",
        "description": "Registered commercial and retail vendors (20 merchants)",
        "columns": [
            { "name": "merchant_id", "type": "INT", "isPk": true },
            { "name": "merchant_name", "type": "STRING", "isPk": false },
            { "name": "category", "type": "STRING", "isPk": false },
            { "name": "city", "type": "STRING", "isPk": false },
            { "name": "country", "type": "STRING", "isPk": false }
        ]
    },
    "merchant_payments": {
        "category": "Commercial Partners",
        "description": "Point-of-Sale (POS) and online card charges (120 records)",
        "columns": [
            { "name": "payment_id", "type": "INT", "isPk": true },
            { "name": "account_id", "type": "INT", "isPk": false },
            { "name": "merchant_id", "type": "INT", "isPk": false },
            { "name": "card_id", "type": "INT", "isPk": false },
            { "name": "amount", "type": "DECIMAL", "isPk": false },
            { "name": "payment_date", "type": "STRING", "isPk": false },
            { "name": "status", "type": "STRING", "isPk": false }
        ]
    },
    "departments": {
        "category": "Internal Organization",
        "description": "Banking divisions and annual operating budgets (8 departments)",
        "columns": [
            { "name": "department_id", "type": "INT", "isPk": true },
            { "name": "department_name", "type": "STRING", "isPk": false },
            { "name": "department_code", "type": "STRING", "isPk": false },
            { "name": "annual_budget", "type": "DECIMAL", "isPk": false }
        ]
    },
    "employees": {
        "category": "Internal Organization",
        "description": "Staff roster and managerial hierarchy (20 employees)",
        "columns": [
            { "name": "employee_id", "type": "INT", "isPk": true },
            { "name": "branch_id", "type": "INT", "isPk": false },
            { "name": "first_name", "type": "STRING", "isPk": false },
            { "name": "last_name", "type": "STRING", "isPk": false },
            { "name": "role", "type": "STRING", "isPk": false },
            { "name": "department", "type": "STRING", "isPk": false },
            { "name": "salary", "type": "DECIMAL", "isPk": false },
            { "name": "manager_id", "type": "INT", "isPk": false },
            { "name": "hire_date", "type": "STRING", "isPk": false }
        ]
    },
    "audit_logs": {
        "category": "Security & Compliance",
        "description": "Regulatory audit trail and security compliance records (60 logs)",
        "columns": [
            { "name": "log_id", "type": "INT", "isPk": true },
            { "name": "employee_id", "type": "INT", "isPk": false },
            { "name": "action", "type": "STRING", "isPk": false },
            { "name": "entity_name", "type": "STRING", "isPk": false },
            { "name": "entity_id", "type": "INT", "isPk": false },
            { "name": "log_timestamp", "type": "STRING", "isPk": false },
            { "name": "ip_address", "type": "STRING", "isPk": false }
        ]
    },
    "exchange_rates": {
        "category": "Treasury & Forex",
        "description": "Live foreign exchange rates across major currencies (10 pairs)",
        "columns": [
            { "name": "rate_id", "type": "INT", "isPk": true },
            { "name": "from_currency", "type": "STRING", "isPk": false },
            { "to_currency": "STRING", "name": "to_currency", "type": "STRING", "isPk": false },
            { "name": "rate", "type": "DECIMAL", "isPk": false },
            { "name": "updated_at", "type": "STRING", "isPk": false }
        ]
    }
};

window.edmithSql = new EdmithSqlEngine();
