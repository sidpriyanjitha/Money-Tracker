import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://tabgupjtduxyyrjundhj.supabase.co";
const supabaseKey = "sb_publishable_8oP7ThVKyztLiZ_tviGpoQ_mdHn8Bvk";
const supabase = createClient(supabaseUrl, supabaseKey);

// =========================
// 2. SETTINGS
// =========================
const editPin = "1234";
let selectedEditId = null;
let allTransactions = [];

// =========================
// 3. ELEMENTS
// =========================
const moneyForm = document.getElementById("moneyForm");
const titleInput = document.getElementById("titleInput");
const amountInput = document.getElementById("amountInput");
const typeInput = document.getElementById("typeInput");
const dateInput = document.getElementById("dateInput");
const transactionList = document.getElementById("transactionList");
const message = document.getElementById("message");

const incomeTotal = document.getElementById("incomeTotal");
const expenseTotal = document.getElementById("expenseTotal");
const balanceTotal = document.getElementById("balanceTotal");

const monthIncomeTotal = document.getElementById("monthIncomeTotal");
const monthExpenseTotal = document.getElementById("monthExpenseTotal");
const monthBalanceTotal = document.getElementById("monthBalanceTotal");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

const pinModal = document.getElementById("pinModal");
const pinForm = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const pinCancelBtn = document.getElementById("pinCancelBtn");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editId = document.getElementById("editId");
const editTitle = document.getElementById("editTitle");
const editAmount = document.getElementById("editAmount");
const editType = document.getElementById("editType");
const editDate = document.getElementById("editDate");
const editCancelBtn = document.getElementById("editCancelBtn");

const themeToggleBtn = document.getElementById("themeToggleBtn");

// =========================
// 4. DEFAULT DATE
// =========================
dateInput.value = new Date().toISOString().split("T")[0];

// =========================
// 5. MESSAGE
// =========================
function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "red" : "green";

  setTimeout(() => {
    message.textContent = "";
  }, 3000);
}

// =========================
// 6. THEME
// =========================
function loadTheme() {
  const savedTheme = localStorage.getItem("money-tracker-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    updateThemeButton(true);
  } else {
    document.body.classList.remove("dark");
    updateThemeButton(false);
  }
}

function updateThemeButton(isDark) {
  if (isDark) {
    themeToggleBtn.innerHTML =
      '<i class="fa-solid fa-sun"></i><span>Light Mode</span>';
  } else {
    themeToggleBtn.innerHTML =
      '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
  }
}

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("money-tracker-theme", isDark ? "dark" : "light");
  updateThemeButton(isDark);
});

// =========================
// 7. MODAL HELPERS
// =========================
function openPinModal(id) {
  selectedEditId = id;
  pinInput.value = "";
  pinModal.classList.remove("hidden");
  pinInput.focus();
}

function closePinModal() {
  pinModal.classList.add("hidden");
  pinInput.value = "";
  selectedEditId = null;
}

function openEditModal(record) {
  editId.value = record.id;
  editTitle.value = record.title;
  editAmount.value = record.amount;
  editType.value = record.type;
  editDate.value = record.transaction_date || "";

  editModal.classList.remove("hidden");
  editTitle.focus();
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editForm.reset();
}

// =========================
// 8. GET TRANSACTIONS
// =========================
async function getTransactions() {
  transactionList.innerHTML =
    "<tr><td colspan='5' class='empty-text'>Loading transactions...</td></tr>";

  const { data, error } = await supabase
    .from("money_tracker")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("READ ERROR:", error);
    transactionList.innerHTML =
      "<tr><td colspan='5' class='empty-text'>Failed to load transactions.</td></tr>";
    showMessage(error.message, true);
    return;
  }

  allTransactions = data || [];
  applyFilters();
}

// =========================
// 9. FILTER LOGIC
// =========================
function applyFilters() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedType = filterType.value;

  const filteredItems = allTransactions.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchText);
    const matchesType =
      selectedType === "all" ? true : item.type === selectedType;

    return matchesSearch && matchesType;
  });

  renderTransactions(filteredItems);
  updateSummary(filteredItems);
  updateMonthlySummary(filteredItems);
}

// =========================
// 10. RENDER
// =========================
function renderTransactions(items) {
  if (!items || items.length === 0) {
    transactionList.innerHTML =
      "<tr><td colspan='5' class='empty-text'>No matching transactions found.</td></tr>";
    return;
  }

  transactionList.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.title}</td>
      <td>$${Number(item.amount).toFixed(2)}</td>
      <td class="${item.type}">${capitalize(item.type)}</td>
      <td>${formatDate(item.transaction_date)}</td>
      <td>
        <div class="action-group">
          <button class="icon-btn edit-btn" data-id="${item.id}" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="icon-btn delete-btn" data-id="${item.id}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    transactionList.appendChild(row);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openPinModal(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteTransaction(button.dataset.id);
    });
  });
}

// =========================
// 11. HELPERS
// =========================
function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Melbourne",
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// =========================
// 12. TOTAL SUMMARY
// =========================
function updateSummary(items) {
  let income = 0;
  let expense = 0;

  items.forEach((item) => {
    const amount = Number(item.amount);

    if (item.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  const balance = income - expense;

  incomeTotal.textContent = `$${income.toFixed(2)}`;
  expenseTotal.textContent = `$${expense.toFixed(2)}`;
  balanceTotal.textContent = `$${balance.toFixed(2)}`;
}

// =========================
// 13. MONTHLY SUMMARY
// =========================
function updateMonthlySummary(items) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthIncome = 0;
  let monthExpense = 0;

  items.forEach((item) => {
    if (!item.transaction_date) return;

    const itemDate = new Date(item.transaction_date);
    const itemMonth = itemDate.getMonth();
    const itemYear = itemDate.getFullYear();

    if (itemMonth === currentMonth && itemYear === currentYear) {
      const amount = Number(item.amount);

      if (item.type === "income") {
        monthIncome += amount;
      } else {
        monthExpense += amount;
      }
    }
  });

  const monthBalance = monthIncome - monthExpense;

  monthIncomeTotal.textContent = `$${monthIncome.toFixed(2)}`;
  monthExpenseTotal.textContent = `$${monthExpense.toFixed(2)}`;
  monthBalanceTotal.textContent = `$${monthBalance.toFixed(2)}`;
}

// =========================
// 14. ADD TRANSACTION
// =========================
moneyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = amountInput.value.trim();
  const type = typeInput.value;
  const transaction_date = dateInput.value;

  if (!title || !amount || !type || !transaction_date) {
    showMessage("Please fill all fields.", true);
    return;
  }

  if (isNaN(Number(amount))) {
    showMessage("Amount must be a valid number.", true);
    return;
  }

  const { error } = await supabase.from("money_tracker").insert([
    {
      title,
      amount: Number(amount),
      type,
      transaction_date,
    },
  ]);

  if (error) {
    console.error("INSERT ERROR:", error);
    showMessage(error.message, true);
    return;
  }

  showMessage("Transaction added successfully.");
  moneyForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  getTransactions();
});

// =========================
// 15. PIN SUBMIT
// =========================
pinForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const enteredPin = pinInput.value.trim();

  if (enteredPin !== editPin) {
    showMessage("Incorrect PIN. Edit not allowed.", true);
    pinInput.value = "";
    pinInput.focus();
    return;
  }

  const { data, error } = await supabase
    .from("money_tracker")
    .select("*")
    .eq("id", selectedEditId)
    .single();

  if (error) {
    console.error("FETCH RECORD ERROR:", error);
    showMessage(error.message, true);
    closePinModal();
    return;
  }

  pinModal.classList.add("hidden");
  openEditModal(data);
});

// =========================
// 16. PIN CANCEL
// =========================
pinCancelBtn.addEventListener("click", () => {
  closePinModal();
});

// =========================
// 17. UPDATE RECORD
// =========================
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editId.value;
  const title = editTitle.value.trim();
  const amount = editAmount.value.trim();
  const type = editType.value;
  const transaction_date = editDate.value;

  if (!title || !amount || !type || !transaction_date) {
    showMessage("Please fill all edit fields.", true);
    return;
  }

  if (isNaN(Number(amount))) {
    showMessage("Amount must be a valid number.", true);
    return;
  }

  const { error } = await supabase
    .from("money_tracker")
    .update({
      title,
      amount: Number(amount),
      type,
      transaction_date,
    })
    .eq("id", id);

  if (error) {
    console.error("UPDATE ERROR:", error);
    showMessage(error.message, true);
    return;
  }

  showMessage("Transaction updated successfully.");
  closeEditModal();
  selectedEditId = null;
  getTransactions();
});

// =========================
// 18. EDIT CANCEL
// =========================
editCancelBtn.addEventListener("click", () => {
  closeEditModal();
  selectedEditId = null;
});

// =========================
// 19. DELETE
// =========================
async function deleteTransaction(id) {
  const confirmDelete = confirm(
    "Are you sure you want to delete this transaction?"
  );

  if (!confirmDelete) {
    return;
  }

  const { error } = await supabase
    .from("money_tracker")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE ERROR:", error);
    showMessage(error.message, true);
    return;
  }

  showMessage("Transaction deleted successfully.");
  getTransactions();
}

// =========================
// 20. SEARCH + FILTER
// =========================
searchInput.addEventListener("input", applyFilters);
filterType.addEventListener("change", applyFilters);

// =========================
// 21. CLOSE MODAL ON BACKDROP
// =========================
pinModal.addEventListener("click", (e) => {
  if (e.target === pinModal) {
    closePinModal();
  }
});

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) {
    closeEditModal();
    selectedEditId = null;
  }
});

// =========================
// 22. INIT
// =========================
loadTheme();
getTransactions();