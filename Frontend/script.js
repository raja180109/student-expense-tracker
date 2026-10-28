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

// --------------------------------------------------
// SLIDE NAVIGATION
// --------------------------------------------------

const slides = Array.from(document.querySelectorAll(".slide"));
const navButtons = document.querySelectorAll(".nav-item");
const previousButton = document.getElementById("previousSlide");
const nextButton = document.getElementById("nextSlide");
const slideCounter = document.getElementById("slideCounter");
const progressBar = document.getElementById("progressBar");
const pageTitle = document.getElementById("pageTitle");

const slideTitles = [
    "Welcome to SpendSmart",
    "Dashboard Overview",
    "Add a New Expense",
    "Expense History",
    "Spending Reports"
];

let currentSlide = 1;

function showSlide(slideNumber) {
    if (slideNumber < 1 || slideNumber > slides.length) {
        return;
    }

    currentSlide = slideNumber;

    slides.forEach((slide, index) => {
        const isActive = index === slideNumber - 1;

        slide.hidden = !isActive;
        slide.classList.toggle("active", isActive);
    });

    navButtons.forEach(button => {
        const isActive = Number(button.dataset.slide) === slideNumber;

        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    pageTitle.textContent = slideTitles[slideNumber - 1];
    slideCounter.textContent = `Slide ${slideNumber} of ${slides.length}`;
    progressBar.style.width = `${(slideNumber / slides.length) * 100}%`;

    previousButton.disabled = slideNumber === 1;
    nextButton.disabled = slideNumber === slides.length;

    // Move to the top of the current screen.
    document.querySelector(".main-content").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Sidebar navigation
navButtons.forEach(button => {
    button.addEventListener("click", () => {
        showSlide(Number(button.dataset.slide));
    });
});

// Buttons inside slides, such as Get Started
document.querySelectorAll("[data-go-to]").forEach(button => {
    button.addEventListener("click", () => {
        showSlide(Number(button.dataset.goTo));
    });
});

// Back and Next buttons
previousButton.addEventListener("click", () => {
    showSlide(currentSlide - 1);
});

nextButton.addEventListener("click", () => {
    showSlide(currentSlide + 1);
});

// Allow keyboard arrow navigation when not typing in a field.
document.addEventListener("keydown", event => {
    const tag = event.target.tagName;

    if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target.isContentEditable ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag)
    ) {
        return;
    }

    if (event.key === "ArrowRight" && currentSlide < slides.length) {
        showSlide(currentSlide + 1);
    }

    if (event.key === "ArrowLeft" && currentSlide > 1) {
        showSlide(currentSlide - 1);
    }
});

// --------------------------------------------------
// EXPENSE TRACKER
// --------------------------------------------------

let expenses = [];

// Use local calendar dates instead of UTC dates.
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

// Display money in Indian rupees.
function formatMoney(amount) {
    return Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Get expenses from the backend.
async function loadExpenses() {
    try {
        const response = await fetch("/api/expenses");

        if (!response.ok) {
            throw new Error("Could not load expenses.");
        }

        expenses = await response.json();
        displayExpenses();
    } catch (error) {
        message.textContent =
            "Could not connect to the server. Please check that it is running.";
    }
}

// Show expenses, totals, and category summaries.
function displayExpenses() {
    expenseList.replaceChildren();

    const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
    );

    totalElement.textContent = formatMoney(total);

    // Monthly spending.
    const selectedMonth = monthFilter.value || getCurrentMonth();

    const monthlyExpenses = expenses.filter(expense =>
        expense.expense_date.startsWith(selectedMonth)
    );

    const monthlyTotal = monthlyExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
    );

    monthlyTotalElement.textContent = formatMoney(monthlyTotal);

    // Category summary.
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
        paragraph.textContent =
            "No expenses yet. Add an expense to see your summary.";

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

    // Search and filters.
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedDate = dateFilter.value;

    const filteredExpenses = expenses.filter(expense => {
        const matchesName = expense.title
            .toLowerCase()
            .includes(searchTerm);

        const matchesCategory =
            !selectedCategory || expense.category === selectedCategory;

        const matchesDate =
            !selectedDate || expense.expense_date === selectedDate;

        return matchesName && matchesCategory && matchesDate;
    });

    // Display matching expenses.
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
        editButton.addEventListener("click", () => editExpense(expense));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.addEventListener("click", () => deleteExpense(expense.id));

        actionsCell.append(editButton, deleteButton);
        row.appendChild(actionsCell);
        expenseList.appendChild(row);
    });

    if (emptyMessage) {
        emptyMessage.hidden = filteredExpenses.length > 0;
    }
}

// Add or update an expense.
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const expense = {
        title: document.getElementById("title").value.trim(),
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        expense_date: dateInput.value
    };

    if (
        !expense.title ||
        !Number.isFinite(expense.amount) ||
        expense.amount <= 0 ||
        !expense.category ||
        !expense.expense_date
    ) {
        message.textContent = "Please enter valid expense details.";
        return;
    }

    const expenseId = expenseIdInput.value;
    const url = expenseId
        ? `/api/expenses/${expenseId}`
        : "/api/expenses";

    try {
        const response = await fetch(url, {
            method: expenseId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expense)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save the expense.");
        }

        message.textContent = expenseId
            ? "Expense updated successfully!"
            : "Expense added successfully!";

        form.reset();
        dateInput.value = getToday();
        expenseIdInput.value = "";
        submitButton.textContent = "Add Expense";
        cancelEditButton.hidden = true;

        await loadExpenses();
        showSlide(4);
    } catch (error) {
        message.textContent = error.message;
    }
});

// Load an expense into the form for editing.
function editExpense(expense) {
    document.getElementById("title").value = expense.title;
    document.getElementById("amount").value = expense.amount;
    document.getElementById("category").value = expense.category;
    dateInput.value = expense.expense_date;
    expenseIdInput.value = expense.id;

    submitButton.textContent = "Update Expense";
    cancelEditButton.hidden = false;
    message.textContent = "Editing expense. Update the details and save.";

    showSlide(3);
}

// Delete an expense.
async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not delete the expense.");
        }

        message.textContent = "Expense deleted successfully!";
        await loadExpenses();
    } catch (error) {
        message.textContent = error.message;
    }
}

// Cancel editing.
cancelEditButton.addEventListener("click", () => {
    form.reset();
    dateInput.value = getToday();
    expenseIdInput.value = "";
    submitButton.textContent = "Add Expense";
    cancelEditButton.hidden = true;
    message.textContent = "";
});

// Search and filters.
searchInput.addEventListener("input", displayExpenses);
categoryFilter.addEventListener("change", displayExpenses);
dateFilter.addEventListener("change", displayExpenses);
monthFilter.addEventListener("change", displayExpenses);

clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    dateFilter.value = "";
    displayExpenses();
});

// Initialize the application.
showSlide(1);
loadExpenses();   
           