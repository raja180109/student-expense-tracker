const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to the SQLite database
const db = new Database(path.join(__dirname, "expenses.db"));

// Create the expenses table if it does not exist
db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        expense_date TEXT NOT NULL
    )
`);

app.use(express.json());

// Serve the frontend files
app.use(express.static(path.join(__dirname, "../Frontend")));

// Get all expenses
app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare(
        "SELECT * FROM expenses ORDER BY id DESC"
    ).all();

    res.json(expenses);
});

// Add an expense
app.post("/api/expenses", (req, res) => {
    const { title, amount, category, expense_date } = req.body;

    if (
        typeof title !== "string" ||
        !title.trim() ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0 ||
        typeof category !== "string" ||
        !category.trim() ||
        typeof expense_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(expense_date)
    ) {
        return res.status(400).json({
            error: "Please provide valid expense details."
        });
    }

    const result = db.prepare(`
        INSERT INTO expenses (title, amount, category, expense_date)
        VALUES (?, ?, ?, ?)
    `).run(
        title.trim(),
        Number(amount),
        category.trim(),
        expense_date
    );

    const expense = db.prepare(
        "SELECT * FROM expenses WHERE id = ?"
    ).get(result.lastInsertRowid);

    res.status(201).json(expense);
});

// Delete an expense
app.delete("/api/expenses/:id", (req, res) => {
    const result = db.prepare(
        "DELETE FROM expenses WHERE id = ?"
    ).run(Number(req.params.id));

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Expense not found."
        });
    }

    res.json({
        message: "Expense deleted successfully."
    });
});

// Update an existing expense
app.put("/api/expenses/:id", (req, res) => {
    const id = Number(req.params.id);
    const { title, amount, category, expense_date } = req.body;

    if (
        !Number.isInteger(id) ||
        id <= 0 ||
        typeof title !== "string" ||
        !title.trim() ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0 ||
        typeof category !== "string" ||
        !category.trim() ||
        typeof expense_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(expense_date)
    ) {
        return res.status(400).json({
            error: "Please provide valid expense details."
        });
    }

    const result = db.prepare(`
        UPDATE expenses
        SET title = ?, amount = ?, category = ?, expense_date = ?
        WHERE id = ?
    `).run(
        title.trim(),
        Number(amount),
        category.trim(),
        expense_date,
        id
    );

    if (result.changes === 0) {
        return res.status(404).json({
            error: "Expense not found."
        });
    }

    const updatedExpense = db.prepare(
        "SELECT * FROM expenses WHERE id = ?"
    ).get(id);

    res.json(updatedExpense);
});
// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Student Expense Tracker running on port ${PORT}`);
});