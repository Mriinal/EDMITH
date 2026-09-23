# EDMITH - Interactive Learning Platform

EDMITH is a comprehensive, browser-based educational web application designed to help users learn, practice, and test their skills. By utilizing an in-memory client-side database, EDMITH provides a seamless, interactive coding experience without the need for a complex backend setup.

## 🚀 Features

* **Interactive SQL Course:** Comprehensive learning materials covering SQL basics to advanced topics (CRUD operations, Joins, Aggregate Functions, etc.).

* **In-Browser SQL Engine:** Practice SQL queries directly in your browser. Powered by [AlaSQL](https://github.com/agershun/alasql?utm_source=gemini), queries are executed instantly without server round-trips.

* **Coding Exams & Tests:** Built-in testing engine to evaluate users' SQL proficiency through practical coding challenges.

* **User Management:** Complete authentication flow including Sign Up, Login, Password Reset, and User Profiles.

* **Leaderboard System:** Gamified learning experience that ranks users based on their test scores and progress.

* **Fully Static:** Can be hosted on any static file server (like GitHub Pages) without requiring a backend database server.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript

* **Database Engine:** [AlaSQL](http://alasql.org/?utm_source=gemini) (Client-side in-memory SQL database)

* **Deployment:** GitHub Actions (`static.yml` workflow configured for GitHub Pages)

## 📂 Project Structure

```
EDMITH/
├── .github/workflows/    # CI/CD pipelines (GitHub Pages deployment)
├── css/                  # Stylesheets for various platform sections
├── editors/              # HTML structure for the interactive SQL editor
├── javascript/           # Core application logic
│   ├── alasql.min.js     # Client-side SQL engine
│   ├── *engine.js        # Logic for coding exams and query execution
│   └── *page.js          # Specific scripts for UI views (Profile, Leaderboard, etc.)
├── sql/                  # Course content (HTML pages for each SQL concept)
│   └── tests/            # Exam and coding test interfaces
├── users/                # Authentication and profile management pages
├── index.html            # Main landing page
├── course.html           # Course dashboard/index
├── Leaderboard.html      # Global rankings page
└── SQL_COMMANDS.sql      # Reference SQL commands/schema definitions

```

## 🚀 Deployment

This project includes a `.github/workflows/static.yml` file, making it ready to be deployed to **GitHub Pages**. Pushing the code to the `main` branch of a GitHub repository will automatically trigger the workflow and deploy the static site.

## 🐛 Reporting Bugs

Found a bug or issue with the SQL engine or course content? Please use the built-in `report-bug.html` page to let us know.
