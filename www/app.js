import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://tabgupjtduxyyrjundhj.supabase.co";
const supabaseKey = "sb_publishable_8oP7ThVKyztLiZ_tviGpoQ_mdHn8Bvk";
const supabase = createClient(supabaseUrl, supabaseKey);

const validTypes = new Set(["income", "expense"]);
const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

let currentUser = null;
let allTransactions = [];

const authCard = document.getElementById("authCard");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const appShell = document.getElementById("appShell");

const moneyForm = document.getElementById("moneyForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
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
const filterMonth = document.getElementById("filterMonth");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editId = document.getElementById("editId");
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editAmount = document.getElementById("editAmount");
const editType = document.getElementById("editType");
const editDate = document.getElementById("editDate");
const editCancelBtn = document.getElementById("editCancelBtn");

const themeToggleBtn = document.getElementById("themeToggleBtn");
const addSubmitBtn = moneyForm.querySelector("button[type='submit']");
const editSubmitBtn = editForm.querySelector("button[type='submit']");
const DELETE_OWNER_EMAIL = "sidpk93@gmail.com";

dateInput.value = getTodayInputDate();

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = `message ${isError ? "error" : "success"}`;

  setTimeout(() => {
    message.textContent = "";
    message.className = "message";
  }, 4000);
}

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
      '<i class="fa-solid fa-sun"></i><span class="sr-only">Toggle theme</span>';
  } else {
    themeToggleBtn.innerHTML =
      '<i class="fa-solid fa-moon"></i><span class="sr-only">Toggle theme</span>';
  }
}

function updateAuthView() {
  const isSignedIn = Boolean(currentUser);

  authCard.classList.toggle("hidden", isSignedIn);
  appShell.classList.toggle("hidden", !isSignedIn);
  logoutBtn.classList.toggle("hidden", !isSignedIn);
  userEmail.classList.toggle("hidden", !isSignedIn);
  userEmail.textContent = currentUser?.email || "";

  if (!isSignedIn) {
    allTransactions = [];
    renderTransactions([]);
    updateSummary([]);
    updateMonthlySummary([]);
  }
}

async function loadSession() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    currentUser = null;
    updateAuthView();
    return;
  }

  currentUser = data.user;
  updateAuthView();

  if (currentUser) {
    await getTransactions();
  }
}

async function signIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Enter your email and password.", true);
    return;
  }

  setAuthLoading(true, "Logging in...");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    currentUser = data.user;
    authForm.reset();
    updateAuthView();
    await getTransactions();
    showMessage("Logged in.");
  } finally {
    setAuthLoading(false);
  }
}

async function signUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Enter an email and password to sign up.", true);
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.", true);
    return;
  }

  setAuthLoading(true, "Signing up...");

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    if (!data.session) {
      showMessage("Check your email to confirm your account, then log in.");
      return;
    }

    currentUser = data.user;
    authForm.reset();
    updateAuthView();
    await getTransactions();
    showMessage("Account created.");
  } finally {
    setAuthLoading(false);
  }
}

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showMessage(error.message, true);
    return;
  }

  currentUser = null;
  updateAuthView();
  showMessage("Logged out.");
}

function openEditModal(record) {
  editId.value = record.id;
  editTitle.value = record.title;
  editDescription.value = record.description || "";
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

async function getTransactions() {
  if (!currentUser) return;

  transactionList.innerHTML =
    "<tr><td colspan='5' class='empty-text'>Loading transactions...</td></tr>";

  const { data, error } = await supabase
    .from("money_tracker")
    .select("*")
    .eq("user_id", currentUser.id)
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

function applyFilters() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedType = filterType.value;
  const selectedMonth = filterMonth.value;

  const filteredItems = allTransactions.filter((item) => {
    const title = String(item.title || "").toLowerCase();
    const matchesSearch = title.includes(searchText);
    const matchesType =
      selectedType === "all" ? true : item.type === selectedType;
    const matchesMonth =
      !selectedMonth || item.transaction_date?.startsWith(selectedMonth);

    return matchesSearch && matchesType && matchesMonth;
  });

  renderTransactions(filteredItems);
  updateSummary(filteredItems);
  updateMonthlySummary(filteredItems);
}

function renderTransactions(items) {
  if (!items || items.length === 0) {
    transactionList.innerHTML =
      "<tr><td colspan='5' class='empty-text'>No matching transactions found.</td></tr>";
    return;
  }

  transactionList.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    const titleButton = document.createElement("button");
    const titleText = document.createElement("span");
    const descriptionText = document.createElement("div");
    const amountCell = document.createElement("td");
    const typeCell = document.createElement("td");
    const dateCell = document.createElement("td");
    const actionsCell = document.createElement("td");
    const actionGroup = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    titleButton.className = "title-toggle";
    titleButton.type = "button";
    titleButton.setAttribute(
      "aria-label",
      `Show description for ${item.title || "transaction"}`
    );

    titleText.className = "title-main";
    titleText.textContent = item.title || "-";

    descriptionText.className = "title-description";
    descriptionText.textContent = item.description || "No description added.";

    titleButton.append(titleText, descriptionText);
    titleCell.appendChild(titleButton);
    amountCell.textContent = formatCurrency(item.amount);
    typeCell.textContent = capitalize(item.type || "");
    typeCell.className = item.type || "";
    dateCell.textContent = formatDate(item.transaction_date);

    actionGroup.className = "action-group";

    editButton.className = "icon-btn edit-btn";
    editButton.dataset.id = item.id;
    editButton.type = "button";
    editButton.title = "Edit";
    editButton.setAttribute("aria-label", `Edit ${item.title || "transaction"}`);
    editButton.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';

    deleteButton.className = "icon-btn delete-btn";
    deleteButton.dataset.id = item.id;
    deleteButton.type = "button";
    deleteButton.title = canDeleteTransactions() ? "Delete" : "Delete restricted";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.title || "transaction"}`
    );
    deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';

    actionGroup.append(editButton, deleteButton);
    actionsCell.appendChild(actionGroup);
    row.append(titleCell, amountCell, typeCell, dateCell, actionsCell);

    transactionList.appendChild(row);
  });
}

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

function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount) || 0);
}

function getTodayInputDate() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Melbourne",
    year: "numeric",
  }).formatToParts(new Date());

  const day = parts.find((part) => part.type === "day").value;
  const month = parts.find((part) => part.type === "month").value;
  const year = parts.find((part) => part.type === "year").value;

  return `${year}-${month}-${day}`;
}

function getTransactionInput(titleValue, amountValue, typeValue, dateValue) {
  return {
    amount: Number(amountValue),
    description: "",
    title: titleValue.trim(),
    transaction_date: dateValue,
    type: typeValue,
    user_id: currentUser?.id || null,
  };
}

function buildTransactionInput(
  titleValue,
  descriptionValue,
  amountValue,
  typeValue,
  dateValue
) {
  const record = getTransactionInput(
    titleValue,
    amountValue,
    typeValue,
    dateValue
  );

  record.description = String(descriptionValue || "").trim();
  return record;
}

function validateTransaction(record) {
  if (!currentUser) {
    return "Log in before saving transactions.";
  }

  if (!record.title || !record.type || !record.transaction_date) {
    return "Please fill all fields.";
  }

  if (record.title.length > 80) {
    return "Title must be 80 characters or less.";
  }

  if (record.description.length > 500) {
    return "Description must be 500 characters or less.";
  }

  if (!Number.isFinite(record.amount) || record.amount <= 0) {
    return "Amount must be greater than 0.";
  }

  if (!validTypes.has(record.type)) {
    return "Please select a valid type.";
  }

  return "";
}

function setAuthLoading(isLoading, text = "Working...") {
  Array.from(authForm.elements).forEach((element) => {
    element.disabled = isLoading;
  });

  loginBtn.textContent = isLoading ? text : "Log in";
  signupBtn.textContent = isLoading ? "Please wait..." : "Sign up";
}

function setFormLoading(form, button, isLoading, loadingText, defaultText) {
  Array.from(form.elements).forEach((element) => {
    element.disabled = isLoading;
  });

  button.textContent = isLoading ? loadingText : defaultText;
}

function capitalize(text) {
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function canDeleteTransactions() {
  return currentUser?.email?.toLowerCase() === DELETE_OWNER_EMAIL;
}

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

  incomeTotal.textContent = formatCurrency(income);
  expenseTotal.textContent = formatCurrency(expense);
  balanceTotal.textContent = formatCurrency(balance);
}

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

  monthIncomeTotal.textContent = formatCurrency(monthIncome);
  monthExpenseTotal.textContent = formatCurrency(monthExpense);
  monthBalanceTotal.textContent = formatCurrency(monthBalance);
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signIn();
});

signupBtn.addEventListener("click", signUp);
logoutBtn.addEventListener("click", signOut);

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("money-tracker-theme", isDark ? "dark" : "light");
  updateThemeButton(isDark);
});

moneyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const record = buildTransactionInput(
    titleInput.value,
    descriptionInput.value,
    amountInput.value,
    typeInput.value,
    dateInput.value
  );
  const validationError = validateTransaction(record);

  if (validationError) {
    showMessage(validationError, true);
    return;
  }

  setFormLoading(moneyForm, addSubmitBtn, true, "Adding...", "Add");

  try {
    const { error } = await supabase.from("money_tracker").insert([record]);

    if (error) {
      console.error("INSERT ERROR:", error);
      showMessage(error.message, true);
      return;
    }

    showMessage("Transaction added successfully.");
    moneyForm.reset();
    dateInput.value = getTodayInputDate();
    await getTransactions();
  } finally {
    setFormLoading(moneyForm, addSubmitBtn, false, "Adding...", "Add");
  }
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editId.value;
  const record = buildTransactionInput(
    editTitle.value,
    editDescription.value,
    editAmount.value,
    editType.value,
    editDate.value
  );
  const validationError = validateTransaction(record);

  if (validationError) {
    showMessage(validationError, true);
    return;
  }

  setFormLoading(editForm, editSubmitBtn, true, "Updating...", "Update Record");

  try {
    const { error } = await supabase
      .from("money_tracker")
      .update(record)
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      showMessage(error.message, true);
      return;
    }

    showMessage("Transaction updated successfully.");
    closeEditModal();
    await getTransactions();
  } finally {
    setFormLoading(editForm, editSubmitBtn, false, "Updating...", "Update Record");
  }
});

editCancelBtn.addEventListener("click", closeEditModal);

async function deleteTransaction(id, button) {
  if (!canDeleteTransactions()) {
    showMessage(
      "Only sidpk93@gmail.com can delete records. Please contact sidpk93@gmail.com.",
      true
    );
    return;
  }

  const confirmDelete = confirm(
    "Are you sure you want to delete this transaction?"
  );

  if (!confirmDelete) {
    return;
  }

  button.disabled = true;

  const { error } = await supabase
    .from("money_tracker")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("DELETE ERROR:", error);
    showMessage(error.message, true);
    button.disabled = false;
    return;
  }

  showMessage("Transaction deleted successfully.");
  await getTransactions();
}

searchInput.addEventListener("input", applyFilters);
filterType.addEventListener("change", applyFilters);
filterMonth.addEventListener("change", applyFilters);
clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterType.value = "all";
  filterMonth.value = "";
  applyFilters();
});

transactionList.addEventListener("click", (e) => {
  const titleToggle = e.target.closest(".title-toggle");
  const editButton = e.target.closest(".edit-btn");
  const deleteButton = e.target.closest(".delete-btn");

  if (titleToggle) {
    const description = titleToggle.querySelector(".title-description");
    const isVisible = description.classList.toggle("visible");

    titleToggle.setAttribute(
      "aria-label",
      `${isVisible ? "Hide" : "Show"} description for ${
        titleToggle.querySelector(".title-main")?.textContent || "transaction"
      }`
    );
    return;
  }

  if (editButton) {
    const record = allTransactions.find(
      (transaction) => String(transaction.id) === editButton.dataset.id
    );

    if (record) {
      openEditModal(record);
    }
  }

  if (deleteButton) {
    deleteTransaction(deleteButton.dataset.id, deleteButton);
  }
});

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  updateAuthView();

  if (currentUser) {
    getTransactions();
  }
});

loadTheme();
loadSession();
