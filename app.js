// Global Variables
let currentUser = null;
let currentUserProfile = null;
let allTransfersData = [];
let completedTransfersData = [];
let issuesData = {};
let allScores = [];
let allUsers = [];
let allStarPoints = [];
let newProfilePicBase64 = null;

// DOM Elements
const views = {
    mainMenu: document.getElementById('main-menu-view'),
    checkProduct: document.getElementById('check-product-view'),
    profile: document.getElementById('profile-view'),
    kpi: document.getElementById('kpi-view'),
    todaysPlan: document.getElementById('todays-plan-view'),
    aiChat: document.getElementById('ai-chat-view'),
    transfers: document.getElementById('transfers-view'),
    calendar: document.getElementById('calendar-view'),
    statistics: document.getElementById('statistics-view')
};

// Utility Functions
function showNotification(message, isSuccess = true) {
    const toast = document.getElementById('notification-toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-semibold transform transition-transform duration-500 ${
        isSuccess ? 'bg-green-500' : 'bg-red-500'
    }`;
    
    toast.classList.remove('translate-x-full');
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

function formatDate(date) {
    if (!date) return 'ไม่มีข้อมูล';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH');
}

function formatDateAbbreviated(date) {
    if (!date) return 'ไม่มีข้อมูล';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

function getMillis(timestamp) {
    if (!timestamp) return 0;
    return timestamp.seconds ? timestamp.seconds * 1000 : timestamp;
}

function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) return;
    
    modal.querySelector('#confirmation-message').textContent = message;
    modal.classList.remove('hidden');
    
    const confirmBtn = modal.querySelector('#confirm-yes');
    const cancelBtn = modal.querySelector('#confirm-no');
    
    const handleConfirm = () => {
        onConfirm();
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

// View Management
function showMainView(viewElement) {
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active-view');
    });
    if (viewElement) viewElement.classList.add('active-view');
}

function updateUserDisplays(profile) {
    const userDisplays = document.querySelectorAll('.user-display');
    const roleDisplays = document.querySelectorAll('#user-role-display');
    
    userDisplays.forEach(display => {
        display.textContent = `${profile.firstName} ${profile.lastName}`;
        display.classList.remove('hidden');
    });
    
    roleDisplays.forEach(display => {
        display.textContent = profile.role || 'Officer';
        display.classList.remove('hidden');
    });
    
    // Update role-based visibility
    document.body.className = profile.role ? profile.role.toLowerCase() : 'officer';
}

// Authentication
async function initializeAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    currentUserProfile = { id: userDoc.id, ...userDoc.data() };
                    updateUserDisplays(currentUserProfile);
                    showMainView(views.mainMenu);
                    await loadAllData();
                    updateSummaryCards();
                } else {
                    showNotification('ไม่พบข้อมูลผู้ใช้', false);
                    await signOut(auth);
                }
            } catch (error) {
                console.error("Error loading user profile:", error);
                showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', false);
            }
        } else {
            currentUser = null;
            currentUserProfile = null;
            showMainView(document.getElementById('login-view'));
        }
    });
}

// Data Loading
async function loadAllData() {
    try {
        await Promise.all([
            loadTransfersData(),
            loadIssuesData(),
            loadScoresData(),
            loadUsersData(),
            loadStarPointsData()
        ]);
    } catch (error) {
        console.error("Error loading data:", error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', false);
    }
}

async function loadTransfersData() {
    const transfersSnapshot = await getDocs(collection(db, "transfers"));
    allTransfersData = transfersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    const completedSnapshot = await getDocs(collection(db, "completedTransfers"));
    completedTransfersData = completedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function loadIssuesData() {
    const issuesSnapshot = await getDocs(collection(db, "issues"));
    issuesData = {};
    issuesSnapshot.docs.forEach(doc => {
        const issue = { id: doc.id, ...doc.data() };
        if (!issuesData[issue.tforNumber]) {
            issuesData[issue.tforNumber] = [];
        }
        issuesData[issue.tforNumber].push(issue);
    });
}

async function loadScoresData() {
    const scoresSnapshot = await getDocs(collection(db, "scores"));
    allScores = scoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function loadUsersData() {
    const usersSnapshot = await getDocs(collection(db, "users"));
    allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function loadStarPointsData() {
    const starPointsSnapshot = await getDocs(collection(db, "starPoints"));
    allStarPoints = starPointsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Summary Cards
function updateSummaryCards() {
    const today = new Date().toISOString().split('T')[0];
    
    // Today's plan count
    const todaysPlanCount = allTransfersData.filter(t => 
        t.deliveryDate === today && t.status !== 'completed'
    ).length;
    document.getElementById('summary-todays-plan').textContent = todaysPlanCount;
    
    // Pending count
    const pendingCount = allTransfersData.filter(t => 
        t.status === 'pending' || t.status === 'in-progress'
    ).length;
    document.getElementById('summary-pending').textContent = pendingCount;
    
    // Completed today count
    const completedTodayCount = completedTransfersData.filter(t => 
        t.completedAt && t.completedAt.toDate().toISOString().split('T')[0] === today
    ).length;
    document.getElementById('summary-completed-today').textContent = completedTodayCount;
    
    // Issues count
    const issuesCount = Object.values(issuesData).flat().length;
    document.getElementById('summary-issues').textContent = issuesCount;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    document.getElementById('go-to-check-product')?.addEventListener('click', () => {
        showMainView(views.checkProduct);
        renderCheckProductView();
    });
    
    document.getElementById('go-to-ai-chat')?.addEventListener('click', () => {
        showMainView(views.aiChat);
        renderAiChatView();
    });
    
    document.getElementById('go-to-transfers')?.addEventListener('click', () => {
        showMainView(views.transfers);
        renderTransfersView();
    });
    
    document.getElementById('go-to-calendar')?.addEventListener('click', () => {
        showMainView(views.calendar);
        renderCalendarView();
    });
    
    document.getElementById('go-to-statistics')?.addEventListener('click', () => {
        showMainView(views.statistics);
        renderStatisticsView();
    });
    
    document.getElementById('go-to-kpi')?.addEventListener('click', () => {
        showMainView(views.kpi);
        renderKpiView();
    });
    
    // Back to main menu
    document.querySelectorAll('.back-to-main-menu').forEach(btn => {
        btn.addEventListener('click', () => showMainView(views.mainMenu));
    });
    
    // Profile
    document.getElementById('profile-button')?.addEventListener('click', () => {
        showMainView(views.profile);
        renderProfileView();
    });
    
    // Logout
    document.getElementById('logout-button-main')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showNotification('ออกจากระบบสำเร็จ');
        } catch (error) {
            console.error("Logout error:", error);
            showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', false);
        }
    });
    
    // Summary cards click events
    document.getElementById('summary-todays-plan-card')?.addEventListener('click', () => {
        showMainView(views.todaysPlan);
        renderTodaysPlanView();
    });
    
    document.getElementById('summary-pending-card')?.addEventListener('click', () => {
        showMainView(views.transfers);
        renderTransfersView();
    });
    
    document.getElementById('summary-completed-today-card')?.addEventListener('click', () => {
        showMainView(views.statistics);
        renderStatisticsView();
    });
    
    document.getElementById('summary-issues-card')?.addEventListener('click', () => {
        showMainView(views.transfers);
        renderTransfersView();
    });
}

// View Renderers
function renderCheckProductView() {
    const container = document.getElementById('check-product-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-center">เช็คสินค้า</h2>
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <p class="text-center text-gray-600">ฟีเจอร์นี้จะเปิดใช้งานในอนาคต</p>
            </div>
        </div>
    `;
}

function renderAiChatView() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center text-gray-600 mt-8">
            <h2 class="text-2xl font-bold mb-4">INBOUND Assistant</h2>
            <p>เริ่มต้นการสนทนากับ AI เพื่อสอบถามข้อมูลเกี่ยวกับระบบ</p>
        </div>
    `;
    
    // Setup chat form
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
}

function renderTransfersView() {
    const container = document.getElementById('transfers-menu-view');
    if (!container) return;
    
    container.innerHTML = `
        <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-8">เมนูสำหรับ TRANFERS</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                <div id="menu-1" class="animated-icon p-8 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <svg class="w-16 h-16 text-fuchsia-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2-10H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2z"></path>
                    </svg>
                    <h3 class="text-xl font-semibold">แบบฟอร์มลงข้อมูล</h3>
                </div>
                <div id="menu-2" class="animated-icon p-8 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <svg class="w-16 h-16 text-indigo-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                    </svg>
                    <h3 class="text-xl font-semibold">รายละเอียดข้อมูล TRANFERS</h3>
                </div>
            </div>
        </div>
    `;
}

function renderCalendarView() {
    // Calendar implementation would go here
    console.log('Calendar view rendered');
}

function renderStatisticsView() {
    // Statistics implementation would go here
    console.log('Statistics view rendered');
}

function renderKpiView() {
    // KPI implementation would go here
    console.log('KPI view rendered');
}

function renderTodaysPlanView() {
    // Today's plan implementation would go here
    console.log('Today\'s plan view rendered');
}

function renderProfileView() {
    if (!currentUserProfile) return;
    
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.querySelector('#profile-email').value = currentUserProfile.email;
        profileForm.querySelector('#profile-role').value = currentUserProfile.role || 'Officer';
        profileForm.querySelector('#profile-firstname').value = currentUserProfile.firstName;
        profileForm.querySelector('#profile-lastname').value = currentUserProfile.lastName;
        
        const profilePicPreview = document.getElementById('profile-pic-preview');
        if (profilePicPreview) {
            profilePicPreview.src = currentUserProfile.profilePictureUrl || 'https://placehold.co/128x128/e0e0e0/757575?text=รูป';
        }
        
        renderDefaultAvatars();
        renderRecentActivity();
        renderProfileScores();
        renderProfileStarPoints();
    }
}

// Profile Functions
function renderDefaultAvatars() {
    const container = document.getElementById('default-avatar-container');
    if (!container) return;
    
    container.innerHTML = '';
    const avatars = [
        'https://avatar.iran.liara.run/public/boy?username=Scott',
        'https://avatar.iran.liara.run/public/girl?username=Amy',
        'https://avatar.iran.liara.run/public/boy?username=James',
        'https://avatar.iran.liara.run/public/girl?username=Sara',
        'https://avatar.iran.liara.run/public/boy?username=Tom',
        'https://avatar.iran.liara.run/public/girl?username=Nia'
    ];
    
    avatars.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'w-16 h-16 rounded-full default-avatar';
        img.dataset.url = url;
        container.appendChild(img);
    });
}

function renderRecentActivity() {
    const container = document.getElementById('recent-activity-container');
    if (!container) return;
    
    const allUserTransfers = [...allTransfersData, ...completedTransfersData];
    const allUserIssues = Object.values(issuesData).flat();
    
    const userActivity = [
        ...allUserTransfers.filter(t => t.createdByUid === currentUser.uid).map(t => ({...t, type: 'สร้าง', timestamp: t.createdAt})),
        ...completedTransfersData.filter(t => t.lastCheckedByUid === currentUser.uid).map(t => ({...t, type: 'เช็คเสร็จ', timestamp: t.createdAt})),
        ...completedTransfersData.filter(t => t.lastReceivedByUid === currentUser.uid).map(t => ({...t, type: 'รับสินค้า', timestamp: t.createdAt})),
        ...allUserIssues.filter(i => i.reportedByUid === currentUser.uid).map(i => ({...i, type: 'รายงานปัญหา', timestamp: i.createdAt})),
        ...allUserIssues.filter(i => i.checkerUid === currentUser.uid).map(i => ({...i, type: 'พบปัญหา', timestamp: i.createdAt}))
    ].sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp)).slice(0, 5);
    
    if (userActivity.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">ไม่มีกิจกรรมล่าสุด</p>';
        return;
    }
    
    container.innerHTML = userActivity.map(item => {
        let actionText = '';
        let actionColor = '';
        
        switch(item.type) {
            case 'เช็คเสร็จ':
                actionText = 'คุณเช็ค TFOR นี้เสร็จแล้ว';
                actionColor = 'text-green-600';
                break;
            case 'รับสินค้า':
                actionText = 'คุณรับสินค้า TFOR นี้เสร็จแล้ว';
                actionColor = 'text-purple-600';
                break;
            case 'สร้าง':
                actionText = 'คุณสร้าง TFOR นี้';
                actionColor = 'text-blue-600';
                break;
            case 'รายงานปัญหา':
                actionText = 'คุณรายงานปัญหา';
                actionColor = 'text-red-600';
                break;
            case 'พบปัญหา':
                actionText = 'คุณพบปัญหาใน TFOR นี้';
                actionColor = 'text-yellow-600';
                break;
        }
        
        return `
            <div class="p-3 bg-gray-50 rounded-lg">
                <p class="font-semibold">TFOR: ...${item.tforNumber} (${item.branch})</p>
                <p class="text-sm ${actionColor}">${actionText} - ${formatDateAbbreviated(item.deliveryDate || item.reportDate)}</p>
            </div>
        `;
    }).join('');
}

function renderProfileScores() {
    const container = document.getElementById('profile-scores-container');
    if (!container) return;
    
    const userScores = allScores
        .filter(s => s.userId === currentUser.uid)
        .sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp));
    
    if (userScores.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีการประเมินจากหัวหน้า</p>';
        return;
    }
    
    container.innerHTML = userScores.map(score => {
        const scoreDate = score.timestamp ? new Date(getMillis(score.timestamp)).toLocaleDateString('th-TH') : 'ไม่มีข้อมูลวันที่';
        const starColor = score.score < 0 ? 'text-red-500' : 'text-amber-500';
        const stars = '★'.repeat(Math.abs(score.score));
        const awardedBy = allUsers.find(u => u.id === score.awardedByUid);
        const awardedByName = awardedBy ? `${awardedBy.firstName} ${awardedBy.lastName}` : 'N/A';
        
        return `
            <div class="p-3 bg-gray-50 rounded-lg">
                <p class="font-semibold">${score.reason} <span class="${starColor}">${stars}</span></p>
                <p class="text-xs text-gray-500">โดย: ${awardedByName} - ${scoreDate}</p>
                ${score.notes ? `<p class="text-sm text-gray-600 italic mt-1">"${score.notes}"</p>` : ''}
            </div>
        `;
    }).join('');
}

function renderProfileStarPoints() {
    if (!currentUserProfile) return;
    
    const smallStars = currentUserProfile.smallStars || 0;
    const bigStars = currentUserProfile.bigStars || 0;
    
    // Update star display
    const smallStarsElement = document.getElementById('user-small-stars');
    const bigStarsElement = document.getElementById('user-big-stars');
    if (smallStarsElement) smallStarsElement.textContent = smallStars;
    if (bigStarsElement) bigStarsElement.textContent = bigStars;
    
    // Update progress bar
    const progressBar = document.getElementById('star-progress-bar');
    if (progressBar) {
        const progressPercent = (smallStars % 10) * 10;
        progressBar.style.width = `${progressPercent}%`;
    }
    
    // Render achievement badges
    const achievementsContainer = document.getElementById('user-achievements');
    if (!achievementsContainer) return;
    
    achievementsContainer.innerHTML = '';
    
    // Add big star achievement badges
    for (let i = 0; i < bigStars; i++) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.innerHTML = `<span class="big-star">★</span> ดาวใหญ่`;
        achievementsContainer.appendChild(badge);
    }
    
    // Add next big star progress if user has some small stars but not enough for a big star
    if (smallStars > 0 && smallStars < 10) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge opacity-50';
        badge.innerHTML = `<span class="big-star" style="color: #d1d5db;">★</span> ดาวใหญ่ (${smallStars}/10)`;
        achievementsContainer.appendChild(badge);
    }
}

// Chat Functions
function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const response = generateAIResponse(message);
        addChatMessage(response, 'ai');
    }, 1000);
}

function addChatMessage(message, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-bubble ${type === 'user' ? 'user-bubble' : 'ai-bubble'}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function generateAIResponse(message) {
    const responses = [
        'ฉันเข้าใจคำถามของคุณแล้ว กรุณารอสักครู่',
        'นี่คือข้อมูลที่คุณต้องการ',
        'มีอะไรให้ช่วยเหลือเพิ่มเติมไหมครับ?',
        'ฉันจะช่วยคุณหาข้อมูลที่ต้องการ',
        'ขออภัย ฉันไม่เข้าใจคำถาม กรุณาลองใหม่อีกครั้ง'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// Password Toggle
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-password')) {
        const input = e.target.previousElementSibling;
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        e.target.textContent = type === 'password' ? '👁️' : '🙈';
    }
});

// Profile Form Submission
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'profile-form') {
        e.preventDefault();
        await handleProfileSubmit(e.target);
    } else if (e.target.id === 'change-password-form') {
        e.preventDefault();
        await handlePasswordChange(e.target);
    }
});

async function handleProfileSubmit(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full mx-auto"></div>`;
    
    try {
        const updateData = {
            firstName: form.querySelector('#profile-firstname').value,
            lastName: form.querySelector('#profile-lastname').value
        };
        
        if (newProfilePicBase64) {
            updateData.profilePictureUrl = newProfilePicBase64;
        }
        
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, updateData);
        
        // Update local profile object
        Object.assign(currentUserProfile, updateData);
        updateUserDisplays(currentUserProfile);
        showNotification('อัปเดตโปรไฟล์สำเร็จ!');
        showMainView(views.mainMenu);
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์', false);
        console.error("Profile update error:", error);
    } finally {
        button.disabled = false;
        button.textContent = 'บันทึกการเปลี่ยนแปลง';
    }
}

async function handlePasswordChange(form) {
    const currentPassword = form.querySelector('#current-password').value;
    const newPassword = form.querySelector('#new-password').value;
    const confirmPassword = form.querySelector('#confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('รหัสผ่านใหม่ไม่ตรงกัน', false);
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', false);
        return;
    }
    
    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        form.reset();
        showNotification('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
    } catch (error) {
        showNotification('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message, false);
        console.error("Password change error:", error);
    }
}

// Default Avatar Selection
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('default-avatar')) {
        const url = e.target.dataset.url;
        const profilePicPreview = document.getElementById('profile-pic-preview');
        if (profilePicPreview) {
            profilePicPreview.src = url;
        }
        newProfilePicBase64 = url;
        
        // Visually indicate selection
        document.querySelectorAll('.default-avatar').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
    }
});

// Profile Picture Upload
document.addEventListener('change', (e) => {
    if (e.target.id === 'profile-pic-upload') {
        handleProfilePicUpload(e.target.files[0]);
    }
});

async function handleProfilePicUpload(file) {
    if (file && file.type.startsWith('image/')) {
        try {
            // For now, just use the file directly
            // In a real app, you'd want to resize and compress the image
            const reader = new FileReader();
            reader.onload = (e) => {
                newProfilePicBase64 = e.target.result;
                const profilePicPreview = document.getElementById('profile-pic-preview');
                if (profilePicPreview) {
                    profilePicPreview.src = e.target.result;
                }
                document.querySelectorAll('.default-avatar').forEach(el => el.classList.remove('selected'));
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Profile image handling failed:", error);
            showNotification("เกิดข้อผิดพลาดในการจัดการรูปโปรไฟล์", false);
        }
    }
}