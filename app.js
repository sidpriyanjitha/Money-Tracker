import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// =========================
// 1. ADD YOUR SUPABASE INFO
// =========================
const supabaseUrl = "https://tabgupjtduxyyrjundhj.supabase.co";
const supabaseKey = "sb_publishable_8oP7ThVKyztLiZ_tviGpoQ_mdHn8Bvk";

const supabase = createClient(supabaseUrl, supabaseKey);

// =========================
// 2. GET HTML ELEMENTS
// =========================
const moneyForm = document.getElementById("moneyForm");
const titleInput = document.getElementById("titleInput");
const amountInput = document.getElementById("amountInput");
const typeInput = document.getElementById("typeInput");
const transactionList = document.getElementById("transactionList");
const message = document.getElementById("message");

const incomeTotal = document.getElementById("incomeTotal");
const expenseTotal = document.getElementById("expenseTotal");
const balanceTotal = document.getElementById("balanceTotal");

// =========================
// 3. SHOW MESSAGE
// =========================
function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "red" : "green";

  setTimeout(() => {
    message.textContent = "";
  }, 3000);
}

// =========================
// 4. GET TRANSACTIONS
// =========================
async function getTransactions() {
  transactionList.innerHTML =
    "<tr><td colspan='5' class='empty-text'>Loading transactions...</td></tr>";

  const { data, error } = await supabase
    .from("money_tracker")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("READ ERROR:", error);
    transactionList.innerHTML =
      "<tr><td colspan='5' class='empty-text'>Failed to load transactions.</td></tr>";
    showMessage(error.message, true);
    return;
  }

  renderTransactions(data);
  updateSummary(data);
}

// =========================
// 5. RENDER TRANSACTIONS
// =========================
function renderTransactions(items) {
  if (!items || items.length === 0) {
    transactionList.innerHTML =
      "<tr><td colspan='5' class='empty-text'>No transactions yet.</td></tr>";
    return;
  }

  transactionList.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.title}</td>
      <td>$${Number(item.amount).toFixed(2)}</td>
      <td class="${item.type}">${item.type}</td>
      <td>${new Date(item.created_at).toLocaleDateString("en-AU", {
  timeZone: "Australia/Melbourne",
})}</td>
      <td>
        <button class="delete-btn" data-id="${item.id}">Delete</button>
      </td>
    `;

    transactionList.appendChild(row);
  });

  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      deleteTransaction(button.dataset.id);
    });
  });
}

// =========================
// 6. UPDATE SUMMARY
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
// 7. ADD TRANSACTION
// =========================
moneyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = amountInput.value.trim();
  const type = typeInput.value;

  if (!title || !amount || !type) {
    showMessage("Please fill all fields.", true);
    return;
  }

  const { error } = await supabase.from("money_tracker").insert([
    {
      title: title,
      amount: Number(amount),
      type: type,
    },
  ]);

  if (error) {
    console.error("INSERT ERROR:", error);
    showMessage(error.message, true);
    return;
  }

  showMessage("Transaction added successfully.");
  moneyForm.reset();
  getTransactions();
});

// =========================
// 8. DELETE TRANSACTION
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
// 9. INITIAL LOAD
// =========================
getTransactions();