const milestones = [
  { clicks: 150000, reward: 15 },
  { clicks: 200000, reward: 20 },
  { clicks: 99000000, reward: 99 }
];

const upgrades = [
  { id: 'autoclick1', name: 'Auto Clicker', description: 'Gain 1 auto click/sec', cost: 5000, type: 'autoclick', level: 1 },
  { id: 'autoclick2', name: '2x Auto Clicker', description: 'Gain 2 auto clicks/sec', cost: 10000, type: 'autoclick', level: 2 },
  { id: 'multiplier2', name: '2x Click Power', description: 'Double your click value', cost: 50000, type: 'multiplier', value: 2 },
  { id: 'multiplier4', name: '4x Click Power', description: 'Quadruple your click value', cost: 75000, type: 'multiplier', value: 4 },
  { id: 'autoclick10', name: '10x Auto Clicker', description: 'Gain 10 auto clicks/sec', cost: 99000, type: 'autoclick', level: 10 },
  { id: 'autoclick15', name: '15x Auto Clicker (Admin)', description: 'Gain 15 auto clicks/sec - Admin Only', cost: 1000, type: 'autoclick', level: 15, adminOnly: true },
  { id: 'autoclick100', name: '100x Auto Clicker (New Users)', description: 'Gain 100 auto clicks/sec - New Users Only', cost: 0, type: 'autoclick', level: 100, newUsersOnly: true }
];

let autoClickInterval = null;

let currentUser = null;

const authScreen = document.querySelector("#authScreen");
const gameScreen = document.querySelector("#gameScreen");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const showLogin = document.querySelector("#showLogin");
const showRegister = document.querySelector("#showRegister");

const playerName = document.querySelector("#playerName");
const managerBadge = document.querySelector("#managerBadge");
const managerPanel = document.querySelector("#managerPanel");
const managerList = document.querySelector("#managerList");
const clickCount = document.querySelector("#clickCount");
const rewardAmount = document.querySelector("#rewardAmount");
const nextGoal = document.querySelector("#nextGoal");
const coinMessage = document.querySelector("#coinMessage");
const claimStatus = document.querySelector("#claimStatus");
const coinButton = document.querySelector("#coinButton");
const upgradesList = document.querySelector("#upgradesList");
const adminPanel = document.querySelector("#adminPanel");
const adminMessage = document.querySelector("#adminMessage");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function getUnlockedReward(user) {
  return milestones.reduce((best, milestone) => {
    return user.clicks >= milestone.clicks ? milestone.reward : best;
  }, 0);
}

function getNextMilestone(user) {
  return milestones.find((milestone) => user.clicks < milestone.clicks);
}

function showMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `form-message ${type}`.trim();
}

function showClaim(message, type = "") {
  claimStatus.textContent = message;
  claimStatus.className = `claim-status ${type}`.trim();
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.classList.toggle("active", isLogin);
  registerForm.classList.toggle("active", !isLogin);
  showLogin.classList.toggle("active", isLogin);
  showRegister.classList.toggle("active", !isLogin);
  showMessage("");
}

function startAutoClick() {
  if (autoClickInterval) clearInterval(autoClickInterval);
  if (!currentUser) return;

  const autoClickLevel = currentUser.autoClickLevel || 0;
  const clickMultiplier = currentUser.clickMultiplier || 1;

  if (autoClickLevel === 0) return;

  autoClickInterval = setInterval(async () => {
    if (!currentUser) return;
    try {
      const data = await api("/api/autoclick", { method: "POST", body: JSON.stringify({ amount: autoClickLevel * clickMultiplier }) });
      currentUser = data.user;
      render();
    } catch (error) {
      console.error(error);
    }
  }, 1000);
}

function renderUpgrades() {
  if (!currentUser) return;

  upgradesList.innerHTML = upgrades.map((upgrade) => {
    // Hide admin-only and new-users-only upgrades appropriately
    if (upgrade.adminOnly && !currentUser.isManager) return '';
    if (upgrade.newUsersOnly && currentUser.isManager) return '';

    const isOwned = currentUser[upgrade.id];
    const canAfford = currentUser.clicks >= upgrade.cost;
    const isDisabled = isOwned || (!canAfford && upgrade.cost > 0);

    let statusText = '';
    if (isOwned) statusText = '✓ Owned';
    else if (upgrade.cost === 0) statusText = 'Free';
    else if (canAfford) statusText = 'Buy now';
    else statusText = `Need ${(upgrade.cost - currentUser.clicks).toLocaleString('en-US')} more clicks`;

    const adminLabel = upgrade.adminOnly ? ' <span style="color: var(--gold); font-weight: 700;">⭐</span>' : '';
    const newUsersLabel = upgrade.newUsersOnly ? ' <span style="color: var(--gold); font-weight: 700;">🆕</span>' : '';

    return `
      <div class="upgrade-item ${isOwned ? 'owned' : ''} ${canAfford && !isOwned ? 'available' : ''}">
        <div class="upgrade-info">
          <strong>${upgrade.name}${adminLabel}${newUsersLabel}</strong>
          <p>${upgrade.description}</p>
          <span class="upgrade-cost">${upgrade.cost === 0 ? 'Free for new users' : upgrade.cost.toLocaleString('en-US') + ' clicks'}</span>
        </div>
        <button 
          class="upgrade-button ${isOwned ? 'owned-btn' : ''}" 
          ${isDisabled ? 'disabled' : ''}
          onclick="buyUpgrade('${upgrade.id}')" 
          type="button">
          ${statusText}
        </button>
      </div>
    `;
  }).join('');
}

async function buyUpgrade(upgradeId) {
  if (!currentUser) return;

  const upgrade = upgrades.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  if (currentUser.clicks < upgrade.cost) {
    alert(`You need ${upgrade.cost.toLocaleString('en-US')} clicks for this upgrade.`);
    return;
  }

  try {
    const data = await api("/api/upgrade", {
      method: "POST",
      body: JSON.stringify({ upgradeId })
    });
    currentUser = data.user;
    startAutoClick();
    render();
    renderUpgrades();
  } catch (error) {
    alert(error.message);
  }
}

function render() {
  authScreen.classList.toggle("hidden", Boolean(currentUser));
  gameScreen.classList.toggle("hidden", !currentUser);

  if (!currentUser) return;

  const reward = getUnlockedReward(currentUser);
  const next = getNextMilestone(currentUser);

  playerName.textContent = currentUser.username;
  managerBadge.classList.toggle("hidden", !currentUser.isManager);
  managerPanel.classList.toggle("hidden", !currentUser.isManager);
  adminPanel.classList.toggle("hidden", !currentUser.isManager);
  clickCount.textContent = currentUser.clicks.toLocaleString("en-US");
  rewardAmount.textContent = `$${reward}`;
  nextGoal.textContent = next ? next.clicks.toLocaleString("en-US") : "Complete";

  if (next) {
    const remaining = next.clicks - currentUser.clicks;
    coinMessage.textContent = `${remaining.toLocaleString("en-US")} clicks until your next reward.`;
  } else {
    coinMessage.textContent = "You reached the top reward. Keep clicking to stay on the leaderboard.";
  }

  document.querySelectorAll("#milestoneList li").forEach((item) => {
    const goal = Number(item.dataset.goal);
    item.classList.toggle("reached", currentUser.clicks >= goal);
  });

  renderUpgrades();
  startAutoClick();

  if (currentUser.isManager) renderManager();
}

async function renderManager() {
  const data = await api("/api/manager");

  managerList.innerHTML = data.users.map((user) => `
    <div>
      <span>${escapeHtml(user.username)} - ${escapeHtml(user.email)} - ${user.isManager ? "Manager" : "Player"}</span>
      <strong>${user.clicks.toLocaleString("en-US")} clicks / $${user.reward}</strong>
    </div>
  `).join("");

  if (data.claims.length) {
    managerList.innerHTML += data.claims.map((claim) => `
      <div>
        <span>${escapeHtml(claim.username)} requested $${claim.reward} to ${escapeHtml(claim.walletType)}</span>
        <strong>${escapeHtml(claim.status)}</strong>
      </div>
    `).join("");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

async function loadSession() {
  try {
    const data = await api("/api/session");
    currentUser = data.user;
  } catch {
    currentUser = null;
  }

  render();
}

showLogin.addEventListener("click", () => setAuthMode("login"));
showRegister.addEventListener("click", () => setAuthMode("register"));

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  try {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        username: document.querySelector("#registerUsername").value.trim(),
        email: document.querySelector("#registerEmail").value.trim(),
        password: document.querySelector("#registerPassword").value
      })
    });

    currentUser = data.user;
    registerForm.reset();
    render();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.querySelector("#loginUsername").value.trim(),
        password: document.querySelector("#loginPassword").value
      })
    });

    currentUser = data.user;
    loginForm.reset();
    render();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  currentUser = null;
  render();
});

coinButton.addEventListener("click", async () => {
  if (!currentUser) return;
  coinButton.disabled = true;

  try {
    const data = await api("/api/click", { method: "POST", body: "{}" });
    currentUser = data.user;
    render();
  } catch (error) {
    coinMessage.textContent = error.message;
  } finally {
    setTimeout(() => {
      coinButton.disabled = false;
    }, 70);
  }
});

document.querySelector("#claimButton").addEventListener("click", async () => {
  if (!currentUser) return;

  const reward = getUnlockedReward(currentUser);
  const walletType = document.querySelector("input[name='walletType']:checked").value;
  const walletAddress = document.querySelector("#walletAddress").value.trim();

  showClaim("");

  if (reward === 0) {
    showClaim("Reach 150,000 clicks before requesting a transfer.", "error");
    return;
  }

  if (!walletAddress) {
    showClaim("Enter your wallet address before requesting a transfer.", "error");
    return;
  }

  try {
    const data = await api("/api/claims", {
      method: "POST",
      body: JSON.stringify({ walletType, walletAddress })
    });
    currentUser = data.user;
    showClaim(`Your $${data.claim.reward} ${walletType} transfer request was saved for manager review.`, "success");
    render();
  } catch (error) {
    showClaim(error.message, "error");
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  if (autoClickInterval) clearInterval(autoClickInterval);
  await api("/api/logout", { method: "POST", body: "{}" });
  currentUser = null;
  render();
});

function showAdminMessage(message, type = "") {
  adminMessage.textContent = message;
  adminMessage.className = `admin-message ${type}`.trim();
  setTimeout(() => {
    if (adminMessage.textContent === message) {
      adminMessage.textContent = "";
      adminMessage.className = "admin-message";
    }
  }, 3000);
}

async function adminBuyX(amount, cost) {
  if (!currentUser || !currentUser.isManager) {
    showAdminMessage("Only admins can purchase.", "error");
    return;
  }

  if (currentUser.clicks < cost) {
    showAdminMessage(`You need ${cost.toLocaleString('en-US')} points. You have ${currentUser.clicks.toLocaleString('en-US')}.`, "error");
    return;
  }

  try {
    const data = await api("/api/admin/buy-x", {
      method: "POST",
      body: JSON.stringify({ amount, cost })
    });
    currentUser = data.user;
    showAdminMessage(`Successfully purchased ${amount.toLocaleString('en-US')}x!`, "success");
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

async function adminGiveFreeX() {
  if (!currentUser || !currentUser.isManager) {
    showAdminMessage("Only admins can give free items.", "error");
    return;
  }

  try {
    const data = await api("/api/admin/give-free-x", {
      method: "POST",
      body: JSON.stringify({})
    });
    showAdminMessage(data.message || "Successfully gave 20x to all users!", "success");
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

async function adminBuyPoints(amount, cost) {
  if (!currentUser || !currentUser.isManager) {
    showAdminMessage("Only admins can purchase.", "error");
    return;
  }

  try {
    const data = await api("/api/admin/buy-points", {
      method: "POST",
      body: JSON.stringify({ amount, cost })
    });
    currentUser = data.user;
    showAdminMessage(`Successfully purchased ${amount.toLocaleString('en-US')} points for $${cost}!`, "success");
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

function showWithdrawalMessage(message, type = "") {
  const withdrawMessage = document.querySelector("#withdrawMessage");
  withdrawMessage.textContent = message;
  withdrawMessage.className = `withdrawal-message ${type}`.trim();
  setTimeout(() => {
    if (withdrawMessage.textContent === message) {
      withdrawMessage.textContent = "";
      withdrawMessage.className = "withdrawal-message";
    }
  }, 4000);
}

const LOCAL_CASH_TYPES = new Set(["Moncash", "NatCash"]);
const LOCAL_CASH_WITHDRAWAL_AMOUNTS = new Map([
  [15, 1965.37],
  [20, 2600],
  [99, 12870],
  [100, 13000],
  [1000, 130000]
]);

function isLocalCashWithdrawal(withdrawType) {
  return LOCAL_CASH_TYPES.has(withdrawType);
}

function getWithdrawalDisplayAmount(withdrawType, amount) {
  if (!isLocalCashWithdrawal(withdrawType)) {
    return `$${amount.toLocaleString('en-US')}`;
  }

  const gourdes = LOCAL_CASH_WITHDRAWAL_AMOUNTS.get(amount) || amount * 130;
  return `${gourdes.toLocaleString('en-US', { maximumFractionDigits: 2 })} gourdes`;
}

function updateCurrencyLabel() {
  const withdrawType = document.querySelector("input[name='withdrawType']:checked").value;
  const currencyLabel = document.querySelector("#currencyLabel");
  currencyLabel.textContent = isLocalCashWithdrawal(withdrawType) ? "G" : "$";
}

// Listen for wallet type changes
document.addEventListener("change", function(e) {
  if (e.target.name === "withdrawType") {
    updateCurrencyLabel();
  }
});

async function adminWithdraw() {
  if (!currentUser || !currentUser.isManager) {
    showWithdrawalMessage("Only admins can withdraw.", "error");
    return;
  }

  const withdrawType = document.querySelector("input[name='withdrawType']:checked").value;
  const walletAddress = document.querySelector("#adminWalletAddress").value.trim();
  const amount = Number(document.querySelector("#withdrawAmount").value);

  showWithdrawalMessage("");

  if (!withdrawType || !withdrawType.match(/^(Binance|Google Pay|Moncash|NatCash)$/)) {
    showWithdrawalMessage("Select a valid wallet type.", "error");
    return;
  }

  if (!walletAddress) {
    showWithdrawalMessage(`Enter your ${withdrawType} ${(withdrawType === "Moncash" || withdrawType === "NatCash") ? "phone number" : "wallet address"}.`, "error");
    return;
  }

  const minLength = (withdrawType === "Moncash" || withdrawType === "NatCash") ? 7 : 8;
  if (walletAddress.length < minLength) {
    showWithdrawalMessage(`Enter a valid ${withdrawType} ${(withdrawType === "Moncash" || withdrawType === "NatCash") ? "phone number" : "address"} (at least ${minLength} characters).`, "error");
    return;
  }

  if (amount <= 0) {
    showWithdrawalMessage("Enter a valid withdrawal amount.", "error");
    return;
  }

  try {
    const data = await api("/api/admin/withdraw", {
      method: "POST",
      body: JSON.stringify({ withdrawType, walletAddress, amount })
    });
    currentUser = data.user;
    const displayAmount = getWithdrawalDisplayAmount(withdrawType, amount);
    showWithdrawalMessage(`Withdrawal request submitted: ${displayAmount} to ${withdrawType}. Pending verification.`, "success");
    document.querySelector("#adminWalletAddress").value = "";
    document.querySelector("#withdrawAmount").value = "";
    render();
  } catch (error) {
    showWithdrawalMessage(error.message, "error");
  }
}

async function adminSharePoints() {
  if (!currentUser || !currentUser.isManager) {
    showAdminMessage("Only admins can share points.", "error");
    return;
  }

  const targetUsername = prompt("Enter username to share points with:");
  if (!targetUsername) return;

  const amount = parseInt(prompt("Enter amount of points to share:"), 10);
  if (!amount || amount <= 0) {
    showAdminMessage("Invalid amount.", "error");
    return;
  }

  try {
    const data = await api("/api/admin/share-points", {
      method: "POST",
      body: JSON.stringify({ targetUsername, amount })
    });
    currentUser = data.user;
    showAdminMessage(`Shared ${amount.toLocaleString('en-US')} points with ${targetUsername}!`, "success");
    render();
  } catch (error) {
    showAdminMessage(error.message, "error");
  }
}

setAuthMode("login");
loadSession();
