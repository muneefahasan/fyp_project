// Import all our API URLs
import {
    LOGIN_URL,
    GET_ME_URL,
    CREATE_USER_URL,
    LIST_USERS_URL,
    RECOGNIZE_PLATE_URL,
    GET_VEHICLE_BY_PLATE_URL,
    GET_VEHICLE_BY_LICENSE_URL,
    CREATE_VEHICLE_URL,
    RENEW_LICENSE_URL,
    SAVE_VEHICLE_URL,
    GET_SAVED_VEHICLES_URL
} from './api.js';

// === HELPER FUNCTIONS ===

function getToken() {
    return sessionStorage.getItem("access_token");
}

function protectPage() {
    if (!getToken()) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

function logout() {
    sessionStorage.removeItem("access_token");
    window.location.href = "index.html";
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) logout();
    return response;
}

async function fetchWithAuthFile(url, options = {}) {
    const token = getToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) logout();
    return response;
}

// === TOAST NOTIFICATION SYSTEM ===

function showToast(title, message, type = "info", duration = 4000) {
    let overlay = document.getElementById("notification-overlay");

    // Create overlay if missing
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "notification-overlay";
        document.body.appendChild(overlay);
    }

    // Determine Icon
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    // Set Class for Styling
    overlay.className = type;

    // Render HTML structure matching our new CSS
    overlay.innerHTML = `
        <div class="toast-content">
            <div class="toast-header">
                <span class="toast-icon">${icon}</span>
                <span class="toast-title">${title}</span>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    // Show Overlay
    setTimeout(() => overlay.classList.add("show"), 10);

    // Close Handler
    overlay.querySelector(".toast-close").onclick = () => {
        overlay.classList.remove("show");
    };

    // Auto Dismiss
    if (duration > 0) {
        setTimeout(() => {
            overlay.classList.remove("show");
        }, duration);
    }
}

// === CONFIRMATION MODAL SYSTEM ===

function showConfirmationModal(title, message, onConfirm) {
    let modal = document.getElementById("confirm-modal-container");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "confirm-modal-container";
        modal.innerHTML = `
            <div class="confirm-box">
                <h3 id="confirm-title">Are you sure?</h3>
                <p id="confirm-msg">This action cannot be undone.</p>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-no" id="confirm-cancel-btn">Cancel</button>
                    <button class="confirm-btn confirm-yes" id="confirm-ok-btn">Yes, Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update Content
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-msg").textContent = message;

    const cancelBtn = document.getElementById("confirm-cancel-btn");
    const okBtn = document.getElementById("confirm-ok-btn");

    // Show Modal
    modal.classList.add("show");

    // Clean up old listeners (simple cloning trick to remove listeners)
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);

    // Add new listeners
    newCancel.onclick = () => {
        modal.classList.remove("show");
    };

    newOk.onclick = async () => {
        modal.classList.remove("show");
        await onConfirm();
    };
}


// === LOGIN ===

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
        const response = await fetch(LOGIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Login failed");

        sessionStorage.setItem("access_token", data.access_token);
        window.location.href = "dashboard.html";
    } catch (error) {
        showToast("Login Failed", error.message, "error");
    }
}

// === DASHBOARD ===

export async function loadDashboard() {
    if (!protectPage()) return;

    try {
        const response = await fetchWithAuth(GET_ME_URL);
        const user = await response.json();
        const contentDiv = document.getElementById("dashboard-content");
        document.getElementById("user-email").textContent = user.email;

        // Helper to add Notification Button
        const headerControls = document.querySelector(".header-controls");
        if (!document.getElementById("notification-btn")) {
            const notifBtn = document.createElement("button");
            notifBtn.id = "notification-btn";
            notifBtn.className = "notification-btn";
            notifBtn.innerHTML = '🔔 <span id="notification-badge" class="notification-badge">0</span>';
            headerControls.insertBefore(notifBtn, document.getElementById("logout-btn"));
        }

        // Logout listener
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) logoutBtn.addEventListener("click", logout);

        if (user.role === "dmt") {
            renderDmtDashboard(user);
        } else if (user.role === "police") {
            renderPoliceDashboard(user, contentDiv);
        } else {
            renderPublicDashboard(user, contentDiv);
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// === DMT ADMIN LOGIC (SPA) ===

function renderDmtDashboard(user) {
    const contentDiv = document.getElementById("dashboard-content");
    contentDiv.className = 'dmt-dash';
    contentDiv.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #555;">Welcome, ${user.email}</h3>
        <div class="card welcome-card">
            <h2>DMT Administration</h2>
            <p>Manage system users, vehicle registrations, and oversee platform operations.</p>
            <div class="admin-actions">
                <button id="btn-users">Go to User Management</button>
                <button id="btn-vehicle">Go to Vehicle Management</button>
                <button id="btn-renew">Go to Renew Vehicle</button>
            </div>
        </div>
    `;

    document.getElementById("btn-users").onclick = () => renderUserManagement(user);
    document.getElementById("btn-vehicle").onclick = () => renderVehicleRegistration(user);
    document.getElementById("btn-renew").onclick = () => renderLicenseRenewal(user);
}

function renderUserManagement(user) {
    const contentDiv = document.getElementById("dashboard-content");
    contentDiv.innerHTML = `
        <div class="dmt-section-wrapper">
            <button id="back-btn" class="back-btn">← Back to Menu</button>
            <div class="card" style="margin-top: 5px;">
            <h2>User Management</h2>
            <form id="create-user-form">
                <div class="input-group">
                    <label for="new-email">Email Address</label>
                    <input type="email" id="new-email" placeholder="user@example.com" required>
                </div>
                <div class="input-group">
                    <label for="new-password">Password</label>
                    <input type="password" id="new-password" placeholder="Set a password" required>
                </div>
                <div class="input-group">
                    <label for="new-role">User Role</label>
                    <select id="new-role" required>
                        <option value="public">Public User</option>
                        <option value="police">Police Officer</option>
                        <option value="dmt">DMT Administrator</option>
                    </select>
                </div>
                <p id="create-error" class="error" style="text-align: center; color: red;"></p>
                <p id="create-success" class="success" style="text-align: center; color: green;"></p>
                <button type="submit" style="width: 100%;">Create User Account</button>
            </form>

            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 1em; color: #555;">System Users</h3>
                    <button id="load-users-btn" style="padding: 5px 10px; font-size: 0.8em;">Refresh</button>
                </div>
                <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
                    <table id="users-table" style="font-size: 0.9em; width: 100%;">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>
    </div>
    `;

    document.getElementById("back-btn").onclick = () => renderDmtDashboard(user);
    document.getElementById("create-user-form").addEventListener("submit", handleCreateUser);
    document.getElementById("load-users-btn").addEventListener("click", loadAllUsers);
    loadAllUsers(); // Auto-load users
}

function renderVehicleRegistration(user) {
    const contentDiv = document.getElementById("dashboard-content");
    contentDiv.innerHTML = `
        <div class="dmt-section-wrapper">
            <button id="back-btn" class="back-btn">← Back to Menu</button>
            <div class="card" style="margin-top: 5px;">
            <h2>Register New Vehicle</h2>
            <form id="create-vehicle-form">
                <div class="input-group">
                    <label>Vehicle Number (Plate)</label>
                    <input type="text" id="v-plate" placeholder="e.g., WP-CAB-1234" required>
                </div>
                <div class="input-group">
                    <label>Revenue License No</label>
                    <input type="text" id="v-license" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="input-group">
                        <label>Class</label>
                        <input type="text" id="v-class" placeholder="e.g., Car" required>
                    </div>
                    <div class="input-group">
                        <label>Fuel</label>
                        <input type="text" id="v-fuel" placeholder="e.g., Petrol" required>
                    </div>
                </div>
                <div class="input-group">
                    <label>Owner Name</label>
                    <input type="text" id="v-owner" required>
                </div>
                <div class="input-group">
                    <label>Owner Address</label>
                    <input type="text" id="v-address" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="input-group">
                        <label>NIC</label>
                        <input type="text" id="v-nic" required>
                    </div>
                    <div class="input-group">
                        <label>District</label>
                        <input type="text" id="v-district" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="input-group">
                        <label>Valid From</label>
                        <input type="date" id="v-valid-from" required>
                    </div>
                    <div class="input-group">
                        <label>Expiry</label>
                        <input type="date" id="v-expiry" required>
                    </div>
                </div>
                <p id="vehicle-error" class="error" style="color:red;"></p>
                <p id="vehicle-success" class="success" style="color:green;"></p>
                <button type="submit" style="width: 100%; background: #28a745;">Register Vehicle</button>
            </form>
        </div>
        </div>
    </div>
    `;

    document.getElementById("back-btn").onclick = () => renderDmtDashboard(user);
    document.getElementById("create-vehicle-form").addEventListener("submit", handleCreateVehicle);
}

function renderLicenseRenewal(user) {
    const contentDiv = document.getElementById("dashboard-content");
    contentDiv.innerHTML = `
        <div class="dmt-section-wrapper">
            <button id="back-btn" class="back-btn">← Back to Menu</button>
            <div class="card" style="margin-top: 5px;">
            <h2>Renew License</h2>
            <form id="renew-license-form">
                <div class="input-group">
                    <label>Vehicle Number (Plate)</label>
                    <input type="text" id="renew-plate" placeholder="Enter Plate Number" required>
                </div>
                <div class="input-group">
                    <label>New Expiry Date</label>
                    <input type="date" id="renew-expiry" required>
                </div>
                <p id="renew-error" class="error" style="color:red;"></p>
                <p id="renew-success" class="success" style="color:green;"></p>
                <button type="submit" style="width: 100%; background: #007bff;">Renew License</button>
            </form>
        </div>
        </div>
    </div>
    `;

    document.getElementById("back-btn").onclick = () => renderDmtDashboard(user);
    document.getElementById("renew-license-form").addEventListener("submit", handleRenewLicense);
}

// === DMT ACTION HANDLERS ===

async function handleCreateUser(e) {
    e.preventDefault();
    const email = document.getElementById("new-email").value;
    const password = document.getElementById("new-password").value;
    const role = document.getElementById("new-role").value;
    const errorMsg = document.getElementById("create-error");
    const successMsg = document.getElementById("create-success");

    errorMsg.textContent = "";
    successMsg.textContent = "";

    try {
        const response = await fetchWithAuth(CREATE_USER_URL, {
            method: "POST",
            body: JSON.stringify({ email, password, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Failed to create user");

        successMsg.textContent = `User ${data.email} created successfully!`;
        if (role === "police" || role === "dmt") {
            showToast("User Created", `Created ${role} user: ${email}`, "success", 3000);
        }
        e.target.reset();
        loadAllUsers();
    } catch (error) {
        errorMsg.textContent = error.message;
    }
}

async function handleCreateVehicle(e) {
    e.preventDefault();
    const errorMsg = document.getElementById("vehicle-error");
    const successMsg = document.getElementById("vehicle-success");
    errorMsg.textContent = "";
    successMsg.textContent = "";

    const vehicleData = {
        vehicle_number: document.getElementById("v-plate").value.trim(),
        licence_number: document.getElementById("v-license").value.trim(),
        vehicle_class: document.getElementById("v-class").value.trim(),
        fuel_type: document.getElementById("v-fuel").value.trim(),
        owner_name: document.getElementById("v-owner").value.trim(),
        owner_address: document.getElementById("v-address").value.trim(),
        owner_nic: document.getElementById("v-nic").value.trim(),
        district: document.getElementById("v-district").value.trim(),
        licence_valid_from: document.getElementById("v-valid-from").value,
        licence_expiry_date: document.getElementById("v-expiry").value
    };

    try {
        const response = await fetchWithAuth(CREATE_VEHICLE_URL, {
            method: "POST",
            body: JSON.stringify(vehicleData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Failed to register vehicle");

        successMsg.textContent = `Vehicle ${data.vehicle_number} registered successfully!`;
        showToast("Registration Success", `Vehicle ${data.vehicle_number} added to system.`, "success");
        e.target.reset();
    } catch (error) {
        errorMsg.textContent = error.message;
        showToast("Registration Failed", error.message, "error");
    }
}

async function handleRenewLicense(e) {
    e.preventDefault();
    const plate = document.getElementById("renew-plate").value.trim();
    const newExpiry = document.getElementById("renew-expiry").value;
    const errorMsg = document.getElementById("renew-error");
    const successMsg = document.getElementById("renew-success");

    errorMsg.textContent = "";
    successMsg.textContent = "";

    if (!plate || !newExpiry) {
        errorMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        const response = await fetchWithAuth(RENEW_LICENSE_URL(plate), {
            method: "PUT",
            body: JSON.stringify({ new_expiry_date: newExpiry })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Failed to renew license");

        successMsg.textContent = `License for ${data.vehicle_number} renewed until ${data.licence_expiry_date}!`;
        showToast("Renewed", `License for ${data.vehicle_number} extended.`, "success");
        e.target.reset();
    } catch (error) {
        errorMsg.textContent = error.message;
        showToast("Renew Failed", error.message, "error");
    }
}

async function loadAllUsers() {
    const tableBody = document.getElementById("users-table-body");
    tableBody.innerHTML = "<tr><td colspan='3'>Loading...</td></tr>";

    try {
        const response = await fetchWithAuth(LIST_USERS_URL);
        const users = await response.json();
        tableBody.innerHTML = "";

        if (users.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='3'>No users found.</td></tr>";
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${user.email}</td><td>${user.role}</td><td>${user.id}</td>`;
            tableBody.appendChild(row);
        });
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan='3'>Error: ${error.message}</td></tr>`;
    }
}

// === POLICE DASHBOARD LOGIC ===

function renderPoliceDashboard(user, contentDiv) {
    contentDiv.className = 'police-dash';
    contentDiv.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 60vh; padding-top: 20px;">
            
            <div style="text-align: center; width: 100%; margin-bottom: 20px;">
                <h2 style="margin: 0; color: var(--primary-color); font-size: 1.8em;">Traffic Control Unit</h2>
                <p style="margin: 5px 0 0; color: #666; font-size: 0.9em;">Officer: ${user.email}</p>
            </div>

            <!-- Tabs -->
            <div class="police-tabs">
                <button class="police-tab-btn active" onclick="switchPoliceTab('scan')">📷 Scan Photo</button>
                <button class="police-tab-btn" onclick="switchPoliceTab('manual')">⌨️ Manual Entry</button>
            </div>

            <div id="scan-results-container">
                <div id="scan-result" class="scan-result-box" style="display: none;"></div>
                <div id="scan-result-summary"></div>
            </div>

            <div class="scan-container">
                <!-- Tab 1: Scan Photo -->
                <div id="tab-scan" class="tab-content active">
                    <label for="plate-image-input" class="scan-btn-label">
                        <span class="scan-icon">📷</span>
                        <span>Upload Photo</span>
                        <span style="font-size: 0.8em; font-weight: 400; opacity: 0.7;">Click to capture or select</span>
                    </label>
                    <input type="file" id="plate-image-input" accept="image/*" capture="environment">
                </div>

                <!-- Tab 2: Manual Entry -->
                <div id="tab-manual" class="tab-content">
                    <div class="manual-input-box">
                        <input type="text" id="manual-plate-input" placeholder="Enter Plate Number (e.g. WP-CAB-1234)">
                        <button id="manual-search-btn" style="padding: 10px 20px; width: auto; min-width: 80px;">🔍</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Global helper for tabs (attached to window since onclick is used in HTML string)
    window.switchPoliceTab = (tabName) => {
        document.querySelectorAll('.police-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Reset Result View if switching tabs
        const mainScanContainer = document.querySelector(".scan-container");
        const resultBox = document.getElementById("scan-result");
        const summaryBox = document.getElementById("scan-result-summary");

        if (mainScanContainer.style.display === "none") {
            mainScanContainer.style.display = "flex"; // Restore input container
            resultBox.style.display = "none";
            summaryBox.innerHTML = "";
        }

        if (tabName === 'scan') {
            document.querySelector('.police-tabs button:nth-child(1)').classList.add('active');
            document.getElementById('tab-scan').classList.add('active');
        } else {
            document.querySelector('.police-tabs button:nth-child(2)').classList.add('active');
            document.getElementById('tab-manual').classList.add('active');
        }
    };

    const fileInput = document.getElementById("plate-image-input");
    if (fileInput) {
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                document.getElementById("scan-result").style.display = "block";
                handlePlateScan();
            }
        });
    }

    const manualBtn = document.getElementById("manual-search-btn");
    manualBtn.addEventListener("click", handleManualPlateEntry);

    // Allow Enter key
    document.getElementById("manual-plate-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleManualPlateEntry();
    });
}

async function handleManualPlateEntry() {
    const plateInput = document.getElementById("manual-plate-input");
    const resultBox = document.getElementById("scan-result");
    const summaryBox = document.getElementById("scan-result-summary");
    const plateNumber = plateInput.value.trim().toUpperCase();

    if (!plateNumber) {
        showToast("Input Error", "Please enter a vehicle number.", "warning");
        return;
    }

    // Reset UI
    resultBox.style.display = "block";
    resultBox.textContent = `Searching for ${plateNumber}...`;
    resultBox.className = "scan-result-box loading";
    summaryBox.innerHTML = "";

    try {
        const registryResponse = await fetchWithAuth(GET_VEHICLE_BY_PLATE_URL(plateNumber));
        const vehicleData = await registryResponse.json();

        if (!registryResponse.ok) throw new Error(vehicleData.detail || "Vehicle not found.");

        resultBox.textContent = plateNumber;
        resultBox.className = "scan-result-box";

        displayVehicleSummary(vehicleData);

    } catch (error) {
        console.error("Error in manual entry:", error);
        resultBox.textContent = `Error: ${error.message}`;
        resultBox.className = "scan-result-box error";
        showToast("Search Failed", error.message, "error");
    }
}

async function handlePlateScan() {
    const fileInput = document.getElementById("plate-image-input");
    const nextFileInput = document.getElementById("plate-image-input-next");
    const resultBox = document.getElementById("scan-result");
    const summaryBox = document.getElementById("scan-result-summary");
    const file = fileInput?.files[0] || nextFileInput?.files[0];

    if (!file) {
        resultBox.textContent = "Please select an image file first.";
        resultBox.className = "scan-result-box error";
        return;
    }

    resultBox.textContent = "Scanning... (Step 1/2)";
    resultBox.className = "scan-result-box loading";
    summaryBox.innerHTML = "";

    try {
        const anprFormData = new FormData();
        anprFormData.append("file", file);
        const anprResponse = await fetchWithAuthFile(RECOGNIZE_PLATE_URL, { method: "POST", body: anprFormData });
        const anprData = await anprResponse.json();

        if (!anprResponse.ok) throw new Error(anprData.detail || "Failed to scan plate.");
        if (!anprData.plates || anprData.plates.length === 0) throw new Error("No plate detected in the image.");

        const detectedPlate = anprData.plates[0];
        resultBox.textContent = detectedPlate;
        resultBox.className = "scan-result-box";
        resultBox.textContent += " ... (Fetching details, Step 2/2)";

        const registryResponse = await fetchWithAuth(GET_VEHICLE_BY_PLATE_URL(detectedPlate));
        const vehicleData = await registryResponse.json();

        if (!registryResponse.ok) throw new Error(vehicleData.detail || "Could not get vehicle details.");

        resultBox.textContent = detectedPlate;
        displayVehicleSummary(vehicleData);
    } catch (error) {
        console.error("Error in scan process:", error);
        resultBox.textContent = `Error: ${error.message}`;
        resultBox.className = "scan-result-box error";
        showToast("Scan Error", error.message, "error", 3000);
    }
}

function displayVehicleSummary(vehicle) {
    const summaryBox = document.getElementById("scan-result-summary");
    summaryBox.innerHTML = `
        <h3>Vehicle Status</h3>
        <span class="status-label status-${vehicle.status}">${vehicle.status}</span>
        <p><strong>Plate:</strong> ${vehicle.vehicle_number}</p>
        <p><strong>Owner:</strong> ${vehicle.owner_name}</p>
        <p><strong>Class:</strong> ${vehicle.vehicle_class}</p>
        <button id="view-more-btn" style="width: 100%; padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 1em; font-weight: 600; cursor: pointer; margin-top: 10px;">View More Details</button>
        <label for="plate-image-input-next" style="display: block; margin-top: 10px; padding: 10px 16px; background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color); border-radius: 8px; cursor: pointer; text-align: center; font-size: 0.95em; font-weight: 500;">📷 Scan Next Number Plate</label>
        <input type="file" id="plate-image-input-next" accept="image/*" capture="environment" style="display: none;">
    `;

    document.getElementById("view-more-btn").onclick = () => showVehicleDetails(vehicle);

    const nextFileInput = document.getElementById("plate-image-input-next");
    if (nextFileInput) {
        nextFileInput.addEventListener("change", () => {
            if (nextFileInput.files.length > 0) {
                document.getElementById("scan-result").style.display = "block";
                summaryBox.innerHTML = "";
                handlePlateScan();
            }
        });
    }

    // Hide the input container so user focuses on the result
    const mainScanContainer = document.querySelector(".scan-container");
    if (mainScanContainer) mainScanContainer.style.display = "none";
}

function showVehicleDetails(vehicle) {
    const modalContainer = document.getElementById("modal-container");
    const modalBody = document.getElementById("modal-body");

    modalBody.innerHTML = `
        <div class="detail-row"><span class="detail-label">Vehicle No</span><span class="detail-value">${vehicle.vehicle_number}</span></div>
        <div class="detail-row"><span class="detail-label">License No</span><span class="detail-value">${vehicle.licence_number}</span></div>
        <div class="detail-row"><span class="detail-label">Class</span><span class="detail-value">${vehicle.vehicle_class}</span></div>
        <div class="detail-row"><span class="detail-label">Fuel Type</span><span class="detail-value">${vehicle.fuel_type}</span></div>
        <div class="detail-row"><span class="detail-label">Owner</span><span class="detail-value">${vehicle.owner_name}</span></div>
        <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${vehicle.owner_address}</span></div>
        <div class="detail-row"><span class="detail-label">NIC</span><span class="detail-value">${vehicle.owner_nic}</span></div>
        <div class="detail-row"><span class="detail-label">District</span><span class="detail-value">${vehicle.district}</span></div>
        <div class="detail-row"><span class="detail-label">Valid From</span><span class="detail-value">${vehicle.licence_valid_from}</span></div>
        <div class="detail-row"><span class="detail-label">Valid Until</span><span class="detail-value">${vehicle.licence_expiry_date}</span></div>
    `;

    modalContainer.classList.remove("modal-hidden");

    // Close button event listener
    const closeBtn = document.getElementById("modal-close-btn");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modalContainer.classList.add("modal-hidden");
        };
    }

    // Click outside to close
    modalContainer.onclick = (e) => {
        if (e.target === modalContainer) {
            modalContainer.classList.add("modal-hidden");
        }
    };
}

// === PUBLIC DASHBOARD LOGIC ===

function renderPublicDashboard(user, contentDiv) {
    contentDiv.className = 'public-dash';
    contentDiv.innerHTML = `
        <div class="card welcome-card">
            <h2>My Vehicles</h2>
            <p>Welcome, <strong>${user.email}</strong></p>
            
            <div style="margin-top: 20px; text-align: left;">
                <label for="license-input" style="display: block; margin-bottom: 8px; font-weight: 500;">Add Vehicle by License Number</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="license-input" placeholder="Enter Revenue License No" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                    <button id="add-vehicle-btn" style="padding: 10px 20px; border-radius: 8px;">Add</button>
                </div>
                <p id="add-error" style="color: red; font-size: 0.9em; margin-top: 5px;"></p>
            </div>

            <div id="my-vehicles-list" style="margin-top: 30px; display: flex; flex-direction: column; gap: 15px;">
                <!-- Added vehicles will appear here -->
                <p style="color: #666; font-style: italic;">No vehicles added yet.</p>
            </div>
        </div>
    `;

    document.getElementById("add-vehicle-btn").onclick = handleAddVehicle;
    loadSavedVehicles(); // Load automatically
}

async function handleAddVehicle() {
    const licenseInput = document.getElementById("license-input");
    const errorMsg = document.getElementById("add-error");
    const vehiclesList = document.getElementById("my-vehicles-list");
    const licenseNo = licenseInput.value.trim();

    if (!licenseNo) {
        errorMsg.textContent = "Please enter a license number.";
        return;
    }

    errorMsg.textContent = "Searching...";

    try {
        const response = await fetchWithAuth(GET_VEHICLE_BY_LICENSE_URL(licenseNo));
        const vehicle = await response.json();

        if (!response.ok) throw new Error(vehicle.detail || "Vehicle not found.");

        // Clear error and input
        errorMsg.textContent = "";
        licenseInput.value = "";

        // --- AUTO SAVE TO DB FIRST ---
        const saveResponse = await fetchWithAuth(SAVE_VEHICLE_URL(vehicle.vehicle_number), { method: "POST" });

        if (saveResponse.status === 409) {
            showToast("Duplicate Vehicle", `Vehicle ${vehicle.vehicle_number} is already in your dashboard.`, "error", 4000);
            return;
        }

        if (!saveResponse.ok) {
            // Try to parse error detail from backend if available
            let detail = "Failed to save vehicle.";
            try {
                const errData = await saveResponse.json();
                if (errData.detail) detail = errData.detail;
            } catch (e) { }
            throw new Error(detail);
        }

        // Only add to DOM if save was successful
        addVehicleCardToDOM(vehicle);

        // Refresh notifications
        const currentVehicles = await (await fetchWithAuth(GET_SAVED_VEHICLES_URL)).json();
        checkNotifications(currentVehicles);

    } catch (error) {
        let msg = error.message;
        if (msg.includes("Failed to fetch")) {
            msg = "Network Error: Could not connect to server.";
        }
        showToast("Error", msg, "error", 4000);
    }
}

// === GLOBAL EVENT LISTENERS ===

const loginForm = document.getElementById("login-form");
if (loginForm) loginForm.addEventListener("submit", handleLogin);

// === NOTIFICATION & SAVED VEHICLES HELPERS ===

async function loadSavedVehicles() {
    const vehiclesList = document.getElementById("my-vehicles-list");
    vehiclesList.innerHTML = '<p style="color: #666; font-style: italic;">Loading saved vehicles...</p>';

    try {
        const response = await fetchWithAuth(GET_SAVED_VEHICLES_URL);
        const vehicles = await response.json();

        vehiclesList.innerHTML = "";

        if (vehicles.length === 0) {
            vehiclesList.innerHTML = '<p style="color: #666; font-style: italic;">No vehicles added yet.</p>';
            return;
        }

        vehicles.forEach(vehicle => {
            addVehicleCardToDOM(vehicle);
        });

        checkNotifications(vehicles);

    } catch (error) {
        console.error("Error loading saved vehicles:", error);
        vehiclesList.innerHTML = '<p style="color: red;">Failed to load vehicles.</p>';
    }
}

function addVehicleCardToDOM(vehicle) {
    const vehiclesList = document.getElementById("my-vehicles-list");

    // Calculate Days
    const today = new Date();
    const expiryDate = new Date(vehicle.licence_expiry_date);
    const timeDiff = expiryDate - today;
    const daysToRenew = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    let statusColor = "#28a745"; // Green
    let statusText = `${daysToRenew} days`;

    if (daysToRenew < 0) {
        statusColor = "#dc3545"; // Red
        statusText = `Expired ${Math.abs(daysToRenew)} days ago`;
    } else if (daysToRenew <= 30) {
        statusColor = "#ffc107"; // Yellow
        statusText = `${daysToRenew} days (Renew Soon)`;
    }

    const card = document.createElement("div");
    card.style.background = "#fff";
    card.style.border = "1px solid #eee";
    card.style.borderRadius = "12px";
    card.style.padding = "15px";
    card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
    card.style.textAlign = "left";
    card.style.position = "relative";

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
                <h3 style="margin: 0; color: var(--primary-color);">${vehicle.vehicle_number}</h3>
                <p style="margin: 0; font-size: 0.9em; color: #666;">${vehicle.vehicle_class}</p>
            </div>
            <span style="background: ${statusColor}; color: ${daysToRenew <= 30 && daysToRenew >= 0 ? '#000' : '#fff'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600;">
                ${statusText}
            </span>
        </div>
        <div style="font-size: 0.9em; color: #444;">
            <p style="margin: 5px 0;"><strong>License No:</strong> ${vehicle.licence_number}</p>
            <p style="margin: 5px 0;"><strong>Expiry:</strong> ${vehicle.licence_expiry_date}</p>
            <p style="margin: 5px 0;"><strong>Owner:</strong> ${vehicle.owner_name}</p>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
             <button class="view-details-btn" style="flex: 1; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; color: #333; border-radius: 6px; cursor: pointer;">Details</button>
             <button class="remove-btn" style="padding: 8px 12px; background: #fee; border: 1px solid #fcc; color: #d00; border-radius: 6px; cursor: pointer;">Remove</button>
        </div>
    `;

    card.querySelector(".view-details-btn").onclick = () => showVehicleDetails(vehicle);
    card.querySelector(".remove-btn").onclick = () => handleRemoveVehicle(vehicle, card);

    // Clear "No vehicles" msg if present
    if (vehiclesList.innerHTML.includes("No vehicles")) {
        vehiclesList.innerHTML = "";
    }

    vehiclesList.prepend(card);
}

async function handleRemoveVehicle(vehicle, cardElement) {
    // Replace window.confirm with Custom Modal
    showConfirmationModal(
        "Remove Vehicle?",
        `Are you sure you want to remove ${vehicle.vehicle_number} from your list?`,
        async () => {
            try {
                const response = await fetchWithAuth(SAVE_VEHICLE_URL(vehicle.vehicle_number), { method: "DELETE" });
                if (!response.ok) throw new Error("Failed to remove vehicle");

                cardElement.remove();
                showToast("Vehicle Removed", `Unlinked ${vehicle.vehicle_number} successfully.`, "success", 3000);

                // Refresh notifications
                const remaining = await (await fetchWithAuth(GET_SAVED_VEHICLES_URL)).json();
                checkNotifications(remaining);

                const vehiclesList = document.getElementById("my-vehicles-list");
                if (vehiclesList.children.length === 0) {
                    vehiclesList.innerHTML = '<p style="color: #666; font-style: italic;">No vehicles added yet.</p>';
                }

            } catch (error) {
                showToast("Error", error.message, "error");
            }
        }
    );
}

function checkNotifications(vehicles) {
    const today = new Date();
    let expiringVehicles = []; // Store all expiring vehicles
    let worstCaseVehicle = null;
    let worstCaseDays = 9999;

    vehicles.forEach(vehicle => {
        const expiryDate = new Date(vehicle.licence_expiry_date);
        const timeDiff = expiryDate - today;
        const daysToRenew = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysToRenew <= 10) {
            expiringVehicles.push({ ...vehicle, daysToRenew }); // Add to list
            if (daysToRenew < worstCaseDays) {
                worstCaseDays = daysToRenew;
                worstCaseVehicle = vehicle;
            }
        }
    });

    // Mock System Notifications
    const systemNotifications = [
        { title: "New DMT Guide 2024", text: "Read the updated vehicle registration guidelines.", type: "info" },
        { title: "System Maintenance", text: "Scheduled for Dec 25th, 10 PM - 12 AM.", type: "info" }
    ];

    const totalCount = expiringVehicles.length + systemNotifications.length;

    // Update Badge & Button
    const badge = document.getElementById("notification-badge");
    const btn = document.getElementById("notification-btn");

    if (badge) {
        if (totalCount > 0) {
            badge.textContent = totalCount;
            badge.style.display = "block";
        } else {
            badge.style.display = "none";
        }
    }

    if (btn) {
        // Toggle Dropdown on click
        btn.onclick = (e) => {
            e.stopPropagation();
            if (totalCount > 0) {
                toggleNotificationDropdown(expiringVehicles, systemNotifications);
            } else {
                showToast("No Notifications", "You are all caught up!", "info", 2000);
            }
        };
    }

    // Auto Show Toast for WORST case immediately on load
    if (worstCaseVehicle) {
        setTimeout(() => {
            let messageTitle = "Expiring Soon!";
            let messageBody = `Vehicle <strong>${worstCaseVehicle.vehicle_number}</strong> expires in <strong>${worstCaseDays} days</strong>.`;
            let type = "warning";

            if (worstCaseDays < 0) {
                messageTitle = "Expired!";
                messageBody = `Vehicle <strong>${worstCaseVehicle.vehicle_number}</strong> is expired!`;
                type = "error";
            } else if (worstCaseDays <= 1) {
                messageTitle = "Urgent!";
                messageBody = `Vehicle <strong>${worstCaseVehicle.vehicle_number}</strong> expires tomorrow!`;
                type = "error";
            }

            showToast(messageTitle, messageBody, type, 5000);
        }, 800);
    }
}

function toggleNotificationDropdown(expiringVehicles, systemNotifications) {
    let dropdown = document.getElementById("notification-dropdown");

    // If exists, just toggle visibility
    if (dropdown) {
        dropdown.classList.toggle("show");
        return;
    }

    // Create Dropdown if it doesn't exist
    dropdown = document.createElement("div");
    dropdown.id = "notification-dropdown";
    dropdown.className = "notification-dropdown";

    let listHtml = "";

    // Render System Notifications first
    systemNotifications.forEach(item => {
        listHtml += `
            <div class="notif-item info">
                <strong>${item.title}</strong>
                <span>${item.text}</span>
            </div>
        `;
    });

    // Render Expiring Vehicles
    expiringVehicles.forEach(item => {
        let text = item.daysToRenew < 0 ? `Expired ${Math.abs(item.daysToRenew)} days ago!` : `Expires in ${item.daysToRenew} days`;
        let colorClass = item.daysToRenew < 0 ? "expired" : "warning";
        listHtml += `
            <div class="notif-item ${colorClass}">
                <strong>${item.vehicle_number}</strong>
                <span>${text}</span>
            </div>
        `;
    });

    dropdown.innerHTML = `
        <div class="notif-header">
            <span>Notifications</span>
            <span style="font-size:0.8em; color:#888; cursor:pointer;" onclick="this.parentElement.parentElement.classList.remove('show')">Close</span>
        </div>
        <div class="notif-body">${listHtml}</div>
    `;

    // Append to Header Controls (ensure relative positioning in CSS)
    document.querySelector(".header-controls").appendChild(dropdown);

    // Show immediately
    setTimeout(() => dropdown.classList.add("show"), 10);

    // Global click listener to close
    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target.id !== "notification-btn") {
            dropdown.classList.remove("show");
        }
    });
}
