const form = document.getElementById("expenseForm");
const expenseList = document.getElementById("expenseList");
const totalElement = document.getElementById("total");
const monthlyTotalElement = document.getElementById("monthlyTotal");
const categorySummary = document.getElementById("categorySummary");
const message = document.getElementById("message");
const dateInput = document.getElementById("date");
const monthFilter = document.getElementById("monthFilter");
const searchInput = document.getElementById("searchExpense");
const categoryFilter = document.getElementById("filterCategory");
const dateFilter = document.getElementById("filterDate");
const clearFiltersButton = document.getElementById("clearFilters");
const expenseIdInput = document.getElementById("expenseId");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");
const emptyMessage = document.getElementById("emptyMessage");

let expenses = [];

// Use local calendar dates instead of UTC dates
function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
    return getToday().slice(0, 7);
}

dateInput.value = getToday();
monthFilter.value = getCurrentMonth();

// Display money in Indian rupees
function formatMoney(amount) {
    return Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Get expenses from the backend
async function loadExpenses() {
    try {
        const response = await fetch("/api/expenses");

        if (!response.ok) {
            throw new Error("Could not load expenses.");
        }

        expenses = await response.json();
        displayExpenses();
    } catch (error) {
        message.textContent = "Could not connect to the server. Please check that it is running.";
    }
}

// Show expenses, totals, and category summaries
function displayExpenses() {
    expenseList.replaceChildren();

    const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
    );

    totalElement.textContent = formatMoney(total);

    // Monthly spending
    const selectedMonth = monthFilter.value || getCurrentMonth();

    const monthlyExpenses = expenses.filter(expense =>
        expense.expense_date.startsWith(selectedMonth)
    );

    const monthlyTotal = monthlyExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
    );

    monthlyTotalElement.textContent = formatMoney(monthlyTotal);

    // Category summary
    const categoryTotals = {};

    expenses.forEach(expense => {
        const category = expense.category;
        categoryTotals[category] =
            (categoryTotals[category] || 0) + Number(expense.amount);
    });

    categorySummary.replaceChildren();

    const categories = Object.entries(categoryTotals);

    if (categories.length === 0) {
        const paragraph = document.createElement("p");
        paragraph.textContent = "No expenses yet. Add an expense to see your summary.";
        categorySummary.appendChild(paragraph);
    } else {
        categories.sort((a, b) => b[1] - a[1]);

        categories.forEach(([category, amount]) => {
            const row = document.createElement("div");
            row.className = "category-row";

            const label = document.createElement("span");
            label.textContent = category;

            const value = document.createElement("strong");
            value.textContent = "₹" + formatMoney(amount);

            row.append(label, value);
            categorySummary.appendChild(row);
        });
    }

    // Search and filters
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedDate = dateFilter.value;

    const filteredExpenses = expenses.filter(expense => {
        const matchesName = expense.title.toLowerCase().includes(searchTerm);
        const matchesCategory =
            !selectedCategory || expense.category === selectedCategory;
        const matchesDate =
            !selectedDate || expense.expense_date === selectedDate;

        return matchesName && matchesCategory && matchesDate;
    });

    // Display matching expenses
    filteredExpenses.forEach(expense => {
        const row = document.createElement("tr");

        const values = [
            expense.title,
            "₹" + formatMoney(expense.amount),
            expense.category,
            expense.expense_date
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionsCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.addEventListener("click", () => startEditing(expense));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.addEventListener("click", () => deleteExpense(expense.id));

        actionsCell.append(editButton, deleteButton);
        row.appendChild(actionsCell);
        expenseList.appendChild(row);
    });

    emptyMessage.hidden = filteredExpenses.length > 0;
}

// Add or update an expense
form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const expense_date = dateInput.value;
    const editingId = expenseIdInput.value;

    if (!title || !Number.isFinite(amount) || amount <= 0 ||
        !category || !expense_date) {
        message.textContent = "Please enter valid expense details.";
        return;
    }

    const expenseData = { title, amount, category, expense_date };

    try {
        const url = editingId
            ? `/api/expenses/${editingId}`
            : "/api/expenses";

        const response = await fetch(url, {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expenseData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save the expense.");
        }

        resetForm();
        message.textContent = editingId
            ? "Expense updated successfully!"
            : "Expense added successfully!";

        await loadExpenses();
    } catch (error) {
        message.textContent = error.message || "Could not connect to the server.";
    }
});

// Fill the form when editing
function startEditing(expense) {
    expenseIdInput.value = expense.id;
    document.getElementById("title").value = expense.title;
    document.getElementById("amount").value = expense.amount;
    document.getElementById("category").value = expense.category;
    dateInput.value = expense.expense_date;

    submitButton.textContent = "Update Expense";
    cancelEditButton.hidden = false;

    form.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("title").focus();
}

// Clear editing mode
function resetForm() {
    form.reset();
    expenseIdInput.value = "";
    dateInput.value = getToday();
    submitButton.textContent = "Add Expense";
    cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener("click", () => {
    resetForm();
    message.textContent = "Editing cancelled.";
});

// Delete an expense
async function deleteExpense(id) {
    const confirmed = confirm("Are you sure you want to delete this expense?");

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not delete expense.");
        }

        message.textContent = "Expense deleted successfully!";
        await loadExpenses();
    } catch (error) {
        message.textContent = error.message || "Could not delete the expense.";
    }
}

// Update summaries when the month changes
monthFilter.addEventListener("change", displayExpenses);

// Update history when search/filter values change
searchInput.addEventListener("input", displayExpenses);
categoryFilter.addEventListener("change", displayExpenses);
dateFilter.addEventListener("change", displayExpenses);

// Clear all history filters
clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    dateFilter.value = "";
    displayExpenses();
});

// Load saved expenses
loadExpenses();