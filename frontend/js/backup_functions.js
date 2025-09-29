// login.html functions
const body = document.getElementById('body');
const toggleBtn = document.getElementById('toggleTheme');
const toggleEye = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

/// Toggle password visibility
toggleEye.onclick = () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleEye.textContent = '🚫';
    } else {
        passwordInput.type = 'password';
        toggleEye.textContent = '👁️';
    }
};

/// Load username
window.onload = () => {
    const saved = localStorage.getItem("savedUsername");
    if (saved) {
        document.getElementById("username").value = saved;
        document.getElementById("rememberMe").checked = true;
    }
};

/// Theme preference
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark');
        toggleBtn.textContent = '🌙 Dark Mode';
    }
});

toggleBtn.onclick = () => {
    body.classList.toggle('dark');
    const isDark = body.classList.contains('dark');
    toggleBtn.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

/// Login logic
async function login() {
    const identifier = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const remember = document.getElementById("rememberMe").checked;
    const errorMsg = document.getElementById("error-msg");
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;

    const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
    });

    const result = await response.json();
    if (result.success) {
        localStorage.setItem("username", result.username || identifier);
        localStorage.setItem("usertag", result.usertag); 
        remember ? localStorage.setItem("savedUsername", identifier) : localStorage.removeItem("savedUsername");
        window.location.href = "mainapp.html";
    } else {
        errorMsg.textContent = result.error || "Login failed.";
        errorMsg.classList.remove("hidden");
    }
}

/// Enter key triggers login
document.addEventListener("keydown", e => {
    if (e.key === "Enter") login();
});

const zyloPP = `Last Updated: 4:10 PM 7/31/2025

This Privacy Policy explains how Zylo ("we", "us", or "our") collects, uses, and protects your information. By using Zylo, you agree to the collection and use of information in accordance with this policy.

1. Information We Collect

- **Account Information**: When you create an account, we may collect your name, email address, and login credentials.
- **Usage Data**: We may collect information about how you access and use Zylo, including pages visited, features used, and device information.
- **Cookies**: We may use cookies to enhance your experience, track usage, and remember your preferences.

2. How We Use Your Information

- To provide, maintain, and improve Zylo.
- To personalize your experience.
- To communicate with you, including support and notifications.
- To enforce our terms and policies and ensure security.

3. Sharing of Information

- We do not sell your personal information.
- We may share information with third-party services that help us operate Zylo (e.g., analytics, hosting).
- We may disclose your information to comply with legal obligations or protect our rights.

4. Data Retention

We retain your information as long as necessary to provide services and fulfill our legal obligations.

5. Your Rights and Choices

- You can update or delete your information by contacting support.
- You can opt out of certain communications.
- You can disable cookies in your browser settings.

6. Security

We use reasonable measures to protect your data, but no method of transmission is 100% secure.

7. Children's Privacy

Zylo is not intended for use by children under 13. We do not knowingly collect personal information from children.

8. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page.

9. Contact Us

If you have questions or concerns, contact us at zylosupp0rt@gmail.com.
`;

const zyloTOS = `Last Updated: 4:07 PM 7/31/2025

Welcome to Zylo! These Terms of Service ("Terms") govern your access to and use of our services, software, and website located at [https://github.com/D4niel-dev].

By accessing or using Zylo, you agree to be bound by these Terms. If you do not agree with any part of the Terms, you must not access or use our Service.

1. Acceptance of Terms

By accessing or using Zylo, you affirm that you are at least 13 years old and that you agree to these Terms.

2. Use of the Service

- You agree to use Zylo only for lawful purposes and in accordance with these Terms.
- You are responsible for maintaining the confidentiality of your account and password.

3. User Conduct

You agree not to:
- Violate any applicable laws or regulations.
- Interfere with or disrupt the Service.
- Use Zylo to transmit harmful or illegal content.

4. Intellectual Property

All content and materials on Zylo, including trademarks and software, are the property of Zylo or its licensors and are protected by copyright and intellectual property laws.

5. Termination

We may suspend or terminate your access to Zylo if you violate these Terms or for any reason at our discretion.

6. Disclaimers

Zylo is provided "as is" and "as available." We do not guarantee that the Service will be error-free or uninterrupted.

7. Limitation of Liability

To the fullest extent permitted by law, Zylo shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the Service.

8. Changes to the Terms

We reserve the right to modify these Terms at any time. Changes will be posted on this page, and your continued use of Zylo signifies acceptance.

9. Contact Us

If you have any questions about these Terms, contact us at zylosupp0rt@gmail.com.
`;


function openModal(type) {
    const title = type === 'pp' ? "Privacy Policy" : "Terms of Service";
    const content = type === 'pp' ? zyloPP : zyloTOS;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalContent").textContent = content;
    document.getElementById("modal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

const loginAvatar = document.getElementById("loginAvatar");
const usernameField = document.getElementById("username");

document.getElementById("username").addEventListener("blur", async () => {
    const identifier = document.getElementById("username").value.trim();
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    if (!identifier) return;

    try {
        const res = await fetch(`${baseUrl}/api/get-user?identifier=${encodeURIComponent(identifier)}`);
        const data = await res.json();

        const avatarImg = document.getElementById("loginAvatar");
        if (data.success && data.user.avatar) {
            avatarImg.src = data.user.avatar;
        } else {
            avatarImg.src = "/images/default_avatar.png";
        }
    } catch (err) {
        console.error("Failed to load avatar", err);
        document.getElementById("loginAvatar").src = "/images/default_avatar.png";
    }
});

// signup.html functions
function togglePassword(id, toggleElement) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        toggleElement.textContent = "🙈";
    } else {
        input.type = "password";
        toggleElement.textContent = "👁️";
    }
}

function previewImage(event, targetId) {
    const reader = new FileReader();
    reader.onload = () => document.getElementById(targetId).src = reader.result;
    reader.readAsDataURL(event.target.files[0]);
}

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
});

async function register() {
    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const password = document.getElementById("newPassword").value.trim();
    const confirm = document.getElementById("confirmPassword").value.trim();
    const usertag = document.getElementById("usertag").value.trim();
    const dob = document.getElementById("dob").value;
    const gender = document.getElementById("gender").value;
    const phone = document.getElementById("phone").value;
    const agree = document.getElementById("agreeTerms").checked;
    const error = document.getElementById("signup-error");

    if (password !== confirm) {
        error.textContent = "Passwords do not match.";
        error.classList.remove("hidden");
        return;
    }

    if (!agree) {
        error.textContent = "You must agree to the Privacy Policy and Terms of Service.";
        error.classList.remove("hidden");
        return;
    }

    if (!usertag) {
        usertag = `${username.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const avatar = await encodeImageToBase64("avatarUpload");
    const banner = await encodeImageToBase64("bannerUpload");

    const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username, email, password, usertag, dob, gender, phone, avatar, banner
        }),
    });

    const result = await response.json();
    if (result.success) {
        alert("Account created successfully!");
        localStorage.setItem("username", username);
        localStorage.setItem("usertag", usertag);
        window.location.href = "login.html";
    } else {
        error.textContent = result.error || "Signup failed.";
        error.classList.remove("hidden");
    }
}

async function encodeImageToBase64(inputId) {
    const fileInput = document.getElementById(inputId);
    if (fileInput.files.length === 0) return null;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(fileInput.files[0]);
    });
}

function showComingSoon(provider) {
    const text = `${provider} sign-up will be added in the next update!`;
    document.getElementById("comingSoonText").textContent = text;
    document.getElementById("comingSoonModal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeComingSoon() {
    document.getElementById("comingSoonModal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        register();
    }
});

function openModal(type) {
    const title = type === 'pp' ? "Privacy Policy" : "Terms of Service";
    const content = type === 'pp' ? zyloPP : zyloTOS;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalContent").textContent = content;
    document.getElementById("modal").classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

// forgot.html functions
async function reset() {
    const identifier = document.getElementById("emailOrUsername").value.trim();
    const msg = document.getElementById("reset-msg");
    const spinner = document.getElementById("spinner");
    const btn = document.getElementById("resetBtn");

    if (!identifier) {
        msg.textContent = "Please enter your email or username.";
        msg.className = "text-sm text-center text-red-600";
        msg.classList.remove("hidden");
        return;
    }

    spinner.classList.remove("hidden");
    btn.disabled = true;

    try {
        const res = await fetch("http://localhost:5000/api/forgot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier })
        });

        const result = await res.json();
        msg.textContent = result.success
            ? "✅ Reset instructions sent to your email."
            : `❌ ${result.error || "Something went wrong."}`;
        msg.className = "text-sm text-center " + (result.success ? "text-green-500" : "text-red-600");
        msg.classList.remove("hidden");
    } catch (err) {
        msg.textContent = "❌ Failed to connect to server.";
        msg.className = "text-sm text-center text-red-600";
        msg.classList.remove("hidden");
    } finally {
        spinner.classList.add("hidden");
        btn.disabled = false;
    }
}

// reset.html functions
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");
    if (user) document.getElementById("resetUser").value = user;
};

function togglePassword(id, el) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        el.textContent = "🙈";
    } else {
        input.type = "password";
        el.textContent = "👁️";
    }
}

async function submitReset() {
    const username = document.getElementById("resetUser").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmNewPassword").value;
    const result = document.getElementById("resetResult");
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;

    if (!username || !newPassword || !confirm) {
        result.textContent = "Please fill out all fields.";
        result.classList.remove("hidden", "text-green-600");
        result.classList.add("text-red-600");
        return;
    }

    if (newPassword !== confirm) {
        result.textContent = "Passwords do not match.";
        result.classList.remove("hidden", "text-green-600");
        result.classList.add("text-red-600");
        return;
    }

    const res = await fetch(`${baseUrl}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword })
    });

    const data = await res.json();
    result.textContent = data.success ? "Password updated successfully!" : (data.error || "Reset failed.");
    result.classList.remove("hidden", "text-red-600", "text-green-600");
    result.classList.add(data.success ? "text-green-600" : "text-red-600");
}

// mainapp.html functions
// Chat Functions
const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
const socket = io(baseUrl);
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const username = localStorage.getItem("savedUsername") || "N/A";
const email = localStorage.getItem("savedEmail") || "N/A";
const typingIndicator = document.getElementById("typingIndicator");

chatInput.addEventListener("input", () => {
    socket.emit("typing", { username });
});

chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        if (event.shiftKey) {
            event.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            this.value = value.substring(0, start) + "\n" + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        } else {
            event.preventDefault();
            sendMessage();
        }
    }
});
    
function appendMessage(data) {
    const isOwnMessage = data.username === username;
    const msgContainer = document.createElement("div");
    msgContainer.classList.add("shadow-md", "transition-all", "duration-300");
    msgContainer.classList.add("animate-fadeIn");
    msgContainer.classList.add("animate-[pop_0.3s_ease-out]");
    msgContainer.className = `p-3 rounded-xl mb-2 flex flex-col ${
        isOwnMessage ? 'bg-blue-600 text-white rounded-br-none self-end' : 'bg-gray-700 text-white rounded-bl-none self-start'
    }`;

    const header = document.createElement("div");
    header.classList.add("flex", "justify-between", "text-xs", "text-gray-300", "mb-1");
    header.innerHTML = `
        <span class="font-semibold mr-2">${data.username}</span>
        <span class="text-gray-400">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;

    const messageText = document.createElement("div");
    messageText.classList.add("text-sm", "break-words");
    messageText.textContent = data.message;

    msgContainer.appendChild(header);
    msgContainer.appendChild(messageText);

    const wrapper = document.createElement("div");
    wrapper.classList.add("flex", "w-full", isOwnMessage ? "justify-end" : "justify-start");
    wrapper.appendChild(msgContainer);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit("send_message", { username, message });
        chatInput.value = "";
        chatInput.style.height = "auto";
    }
}

socket.on("receive_message", appendMessage);
socket.on("typing", (data) => {
    typingIndicator.textContent = `${data.username} is typing...`;
    clearTimeout(typingIndicator.timer);
    typingIndicator.timer = setTimeout(() => {
        typingIndicator.textContent = "";
    }, 2500);
});

fetch("/api/messages")
    .then((res) => res.json())
    .then((msgs) => msgs.forEach(appendMessage));

// Profile Functions
window.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        document.getElementById("profileUsername").textContent = "N/A";
        document.getElementById("profileUsertag").textContent = "N/A";
        return;
    }

    try {
        const res = await fetch(`/api/get-user?identifier=${username}`);
        const data = await res.json();

        if (data.success) {
            const updated = data.user || {};

            document.getElementById("profileUsername").textContent = updated.username;
            document.getElementById("profileUsertag").textContent = updated.usertag;
            document.getElementById("aboutMe").value = updated.aboutMe || "";
            document.getElementById("avatarImage").src = updated.avatar || "/images/default-avatar.png";
            document.getElementById("bannerImage").src = updated.banner || "/images/default-banner.png";
        } else {
            console.error("User not found");
        }
    } catch (err) {
        console.error("Error fetching user data", err);
    }
});

function saveAboutMe() {
    const about = document.getElementById("aboutMe").value;
    localStorage.setItem("aboutMe", about);
}

function updateAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById("avatarImage").src = e.target.result;
            localStorage.setItem("avatarURL", e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function updateBanner(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById("bannerImage").src = e.target.result;
            localStorage.setItem("bannerURL", e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

async function loadStats() {
    const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
        const res = await fetch(`${baseUrl}/api/stats`);
        const data = await res.json();
        document.getElementById("stat-users").textContent = data.users;
        document.getElementById("stat-messages").textContent = data.messages;
        document.getElementById("stat-rooms").textContent = data.rooms;
    } catch (err) {
        console.error("Failed to load stats", err);
    }
}

let cropper = null;
let currentTarget = null;

function openCropper(event, targetType) {
    const file = event.target.files[0];
    if (!file) return;

    currentTarget = targetType;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('cropperImage');
        img.src = e.target.result;
        document.getElementById('cropperModal').classList.remove('hidden');

        if (cropper) cropper.destroy();

        cropper = new Cropper(img, {
            aspectRatio: targetType === 'avatar' ? 1 : 16 / 5,
            viewMode: 1,
            dragMode: 'move',
            responsive: true,
        });
    };
    reader.readAsDataURL(file);
}

function rotateImage(deg) {
    if (cropper) cropper.rotate(deg);
}

function closeCropper() {
    cropper?.destroy();
    cropper = null;
    document.getElementById('cropperModal').classList.add('hidden');
}

function applyCrop() {
    const canvas = cropper.getCroppedCanvas({
        width: currentTarget === 'avatar' ? 200 : 800,
        height: currentTarget === 'avatar' ? 200 : 250
    });

    const imageUrl = canvas.toDataURL('image/png');

    if (currentTarget === 'avatar') {
        document.getElementById('avatarImage').src = imageUrl;
        localStorage.setItem('avatar', imageUrl);
    } else if (currentTarget === 'banner') {
        document.getElementById('bannerImage').src = imageUrl;
        localStorage.setItem('banner', imageUrl);
    }

    closeCropper();
    document.getElementById("saveProfileBtn").classList.remove("hidden");
    checkProfileChanges();
}

async function loadUserData() {
    const username = localStorage.getItem("username");
    if (!username) return;

    try {
        const res = await fetch(`/api/get-user?identifier=${encodeURIComponent(username)}`);
        const data = await res.json();

        if (!data.success) {
            console.error("Failed to load user:", data.error);
            return;
        }

        const user = data.user || {};

        document.getElementById("profileUsername").textContent = user.username || "N/A";
        document.getElementById("profileUsertag").textContent = user.usertag || "N/A";
        document.getElementById("avatarImage").src = user.avatar || "images/default_avatar.png";
        document.getElementById("bannerImage").src = user.banner || "images/default_banner.png";
        document.getElementById("aboutMe").value = user.aboutMe || "";
        document.getElementById("statLevel").textContent = user.level || 0;
        document.getElementById("statGold").textContent = user.gold || 0;
        document.getElementById("statRank").textContent = user.rank || "Unranked";

    } catch (err) {
        console.error("Error fetching user data", err);
    }
}

function toRoman(num) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num;
}

function getSubTier(levelInRange, rangeSize, maxTier) {
    const tierSize = rangeSize / maxTier;
    let tier = Math.ceil(levelInRange / tierSize);
    if (tier < 1) tier = 1;
    if (tier > maxTier) tier = maxTier;
    return tier;
}

function getRank(level) {
    if (level <= 25) return `Stone ${toRoman(getSubTier(level, 25, 5))}`;
    if (level <= 55) return `Metal ${toRoman(getSubTier(level - 25, 30, 5))}`;
    if (level <= 80) return `Gold ${toRoman(getSubTier(level - 55, 25, 5))}`;
    if (level <= 110) return `Mithril ${toRoman(getSubTier(level - 80, 30, 7))}`;
    if (level <= 150) return `Black Mithril ${toRoman(getSubTier(level - 110, 40, 10))}`;
    
    // Master tier logic
    let masterLevel = level - 150;
    if (masterLevel <= 100) {
        return `Master ${toRoman(getSubTier(masterLevel, 100, 5))}`;
    } else if (masterLevel <= 200) {
        return `Grand Master ${toRoman(getSubTier(masterLevel - 100, 100, 5))}`;
    } else {
        return level >= 450 ? "Master Slayer" : `Grand Master ${toRoman(5)}`; // Level 450 special rank
    }
}

function getRankColor(rank) {
    rank = rank.toLowerCase();
    if (rank.startsWith("stone")) return "#808080";
    if (rank.startsWith("metal")) return "#a8a9ad";
    if (rank.startsWith("gold")) return "#FFD700";
    if (rank.startsWith("mithril") && !rank.startsWith("black")) return "#87CEFA";
    if (rank.startsWith("black mithril")) return "#4682B4";
    if (rank.startsWith("grand master")) return "#4B0082";
    if (rank.startsWith("master")) return "#800080";
    if (rank.startsWith("Master Slayer")) return "#FF4500";
    return "#ffffff";
}

document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();

        const levelEl = document.querySelector("#tab-profile .grid div:nth-child(1) p.font-bold");
        const goldEl = document.querySelector("#tab-profile .grid div:nth-child(2) p.font-bold");
        const rankEl = document.getElementById("statRank");

        let level = parseInt(levelEl.textContent) || 0;
        let gold = parseInt(goldEl.textContent.replace(/,/g, "")) || 0;

        level += 10;
        if (level > 450) level = 450; // cap at max level
        gold += 1000;

        levelEl.textContent = level;
        goldEl.textContent = gold.toLocaleString();

        const rank = getRank(level);
        rankEl.textContent = rank;
        rankEl.style.color = getRankColor(rank);
    }
});

const saveBtn = document.getElementById("saveProfileBtn");
let initialProfileData = {};

async function saveProfileChanges() {
    const username = localStorage.getItem("username");
    if (!username) return alert("No username found in local storage!");

    try {
        const resUser = await fetch(`/api/get-user?identifier=${encodeURIComponent(username)}`);
        const userData = await resUser.json();
        if (!userData.success) return alert("User not found!");

        const usertag = userData.user.usertag;

        const updatedProfile = {
            username: username,
            usertag: '@' + usertag,
            avatar: document.getElementById("avatarImage").src,
            banner: document.getElementById("bannerImage").src,
            about: document.getElementById("aboutMe").value.trim(),
            level: parseInt(document.getElementById("statLevel").textContent) || 0,
            gold: parseInt(document.getElementById("statGold").textContent.replace(/,/g, "")) || 0,
            rank: document.getElementById("statRank").textContent
        };

        const res = await fetch(`/api/update-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProfile)
        });

        if (!res.ok) throw new Error("Failed to save profile");
        const data = await res.json();

        if (data.success) {
            const updated = data.user || {};

            document.getElementById("profileUsername").textContent = updated.username || updatedProfile.username;
            document.getElementById("profileUsertag").textContent = updated.usertag || updatedProfile.usertag;
            document.getElementById("avatarImage").src = updated.avatar || updatedProfile.avatar;
            document.getElementById("bannerImage").src = updated.banner || updatedProfile.banner;
            document.getElementById("aboutMe").value = updated.aboutMe || updatedProfile.aboutMe;
            document.getElementById("statLevel").textContent = updated.level ?? updatedProfile.level;
            document.getElementById("statGold").textContent = (updated.gold ?? updatedProfile.gold).toLocaleString();
            document.getElementById("statRank").textContent = updated.rank || updatedProfile.rank;

            // Reset initial data
            captureInitialProfileData();
            document.getElementById("saveProfileBtn").classList.add("hidden");

            if (updated.avatar) {
                document.getElementById("avatarImage").src = updated.avatar + "?t=" + Date.now();
            } else {
                document.getElementById("avatarImage").src = updatedProfile.avatar;
            }
            if (updated.banner) {
                document.getElementById("bannerImage").src = updated.banner + "?t=" + Date.now();
            } else {
                document.getElementById("bannerImage").src = updatedProfile.banner;
            }

            alert("Profile updated!");

        } else {
            alert("Failed to save profile: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error saving profile!");
    }
}

function captureInitialProfileData() {
    initialProfileData = {
        aboutMe: document.getElementById("aboutMe").value.trim(),
        banner: document.getElementById("bannerImage").src,
        avatar: document.getElementById("avatarImage").src
    };
}
captureInitialProfileData();

function checkProfileChanges() {
    const currentData = {
        aboutMe: document.getElementById("aboutMe").value.trim(),
        banner: document.getElementById("bannerImage").src,
        avatar: document.getElementById("avatarImage").src
    };
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(initialProfileData);
    saveBtn.classList.toggle("hidden", !hasChanges);
}

// Watch for changes
document.getElementById("aboutMe").addEventListener("input", checkProfileChanges);
document.getElementById("bannerUpload").addEventListener("change", (e) => openCropper(e, "banner"));
document.getElementById("avatarUpload").addEventListener("change", (e) => openCropper(e, "avatar"));

// Files Functions
const files = [
    { name: "Zylo_v1.5.7", sizeMB: 94.1, filename: "Zylo_v1.5.7.zip" },
    { name: "Zylo_v1.6.1", sizeMB: 92.1, filename: "Zylo_v1.6.1.zip" },
    { name: "Zylo_v1.6.2", sizeMB: 88.1, filename: "Zylo_v1.6.2.zip" }
];

let estimatedTimes = {};

function estimateTimes() {
    const speedMbps = parseFloat(document.getElementById('speed').value);
    if (!speedMbps || speedMbps <= 0) {
        alert("Please enter a valid internet speed.");
        return;
    }

    files.forEach(file => {
        const estimatedSeconds = (file.sizeMB * 8) / speedMbps;
        estimatedTimes[file.filename] = estimatedSeconds;
        const timeDisplay = document.getElementById(`time-${file.filename}`);
        if (timeDisplay) {
            timeDisplay.innerText = `⏱️ Estimated time: ${estimatedSeconds.toFixed(1)} seconds`;
        }
    });
}

function startDownload(filename) {
    const progressBar = document.getElementById(`progress-${filename}`);
    const estimatedTime = estimatedTimes[filename] || 5; 
    let progress = 0;
    const interval = 100; 
    const increment = 100 / ((estimatedTime * 1000) / interval);

    progressBar.style.width = '0%';
    progressBar.classList.remove('bg-green-500');
    const timer = setInterval(() => {
        progress += increment;
        if (progress >= 100) {
            progress = 100;
            clearInterval(timer);
            progressBar.classList.add('bg-green-500');
        }
        progressBar.style.width = `${progress}%`;
    }, interval);

    const a = document.createElement('a');
    a.href = `/files/${filename}`;
    a.download = filename;
    a.click();
}

function renderDownloads() {
    const container = document.getElementById('downloads');
    container.innerHTML = '';

    files.forEach(file => {
    const html = `
        <div class="p-4 border rounded-lg shadow-sm 
                    bg-gray-50/90 dark:bg-gray-800/80 
                    border-gray-200 dark:border-gray-700 
                    text-gray-800 dark:text-gray-100">
            
            <h2 class="text-xl font-semibold">${file.name}</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">${file.sizeMB} MB</p>
            <p id="time-${file.filename}" class="text-sm text-blue-600 dark:text-blue-400 mt-1">
                ⏱️ Estimated time: not calculated
            </p>

            <div class="w-full bg-gray-300 dark:bg-gray-700 rounded h-3 mt-2 overflow-hidden">
                <div id="progress-${file.filename}" 
                    class="bg-blue-500 h-full w-0 transition-all duration-500 ease-in-out">
                </div>
            </div>

            <button onclick="startDownload('${file.filename}')"
                    class="mt-3 px-4 py-2 bg-green-600 text-white rounded 
                        hover:bg-green-700 
                        dark:bg-green-500 dark:hover:bg-green-400">
                Download
            </button>
        </div>
        `;
    container.insertAdjacentHTML('beforeend', html);
    });
}

renderDownloads();

// Settings Functions

/// General Settings
const settingsMap = [
    { id: "animationsToggle", key: "enableAnimations" },
    { id: "compactToggle", key: "compactMode" },
    { id: "tooltipToggle", key: "showTooltips" },
    { id: "languageSelect", key: "language" },
    { id: "startupPage", key: "startupPage" },
    { id: "autoSaveToggle", key: "autoSave" },
    { id: "confirmExitToggle", key: "confirmBeforeExit" }
];

window.addEventListener("DOMContentLoaded", () => {
    settingsMap.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    const savedValue = localStorage.getItem(key);
    if (el) {
        if (el.type === "checkbox") el.checked = savedValue === "true";
        else if (savedValue) el.value = savedValue;
    }
    });
    applyGeneralSettings();
});

settingsMap.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("change", function() {
            const value = this.type === "checkbox" ? this.checked : this.value;
            localStorage.setItem(key, value);
            applyGeneralSettings();
        });
    }
});

function applyGeneralSettings() {
    document.body.classList.toggle("no-animations", localStorage.getItem("enableAnimations") === "false");
    document.body.classList.toggle("compact", localStorage.getItem("compactMode") === "true");
    if (localStorage.getItem("showTooltips") === "false") {
        document.querySelectorAll("[title]").forEach(el => el.removeAttribute("title"));
    }
}

function resetAllSettings() {
    if (confirm("Are you sure you want to reset all settings?\nThis action can not be undo.")) {
        settingsMap.forEach(({ key }) => localStorage.removeItem(key));
        location.reload();
    }
}

if (localStorage.getItem("confirmBeforeExit") === "true") {
    window.addEventListener("beforeunload", function(e) {
        e.preventDefault();
        e.returnValue = '';
    });
}

// Event listeners for changes
document.getElementById("animationsToggle").addEventListener("change", function() {
    localStorage.setItem("enableAnimations", this.checked);
    applyGeneralSettings();
});

document.getElementById("compactToggle").addEventListener("change", function() {
    localStorage.setItem("compactMode", this.checked);
    applyGeneralSettings();
});

document.getElementById("tooltipToggle").addEventListener("change", function() {
    localStorage.setItem("showTooltips", this.checked);
    applyGeneralSettings();
});

document.getElementById("languageSelect").addEventListener("change", function() {
    localStorage.setItem("language", this.value);
    alert("Language set to: " + this.value);
});

/// Account Settings
function updateUsername() {
    const newUsername = document.getElementById("changeUsername").value.trim();
    if (!newUsername) return alert("Please enter a username.");
      alert(`Username changed to: ${newUsername}`);
}

function updateUsertag() {
    const newTag = document.getElementById("changeUsertag").value.trim();
    if (!newTag) return alert("Please enter a usertag.");
    if (!/^\d{4}$/.test(newTag)) return alert("Usertag must be exactly 4 digits.");
      alert(`Usertag changed to: #${newTag}`);
}

function updateEmail() {
    const newEmail = document.getElementById("changeEmail").value.trim();
    if (!newEmail) return alert("Please enter a new email.");
      alert(`Email updated to: ${newEmail}`);
}

function updatePassword() {
    const oldPass = document.getElementById("oldPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    if (!oldPass || !newPass || !confirmPass) return alert("Fill out all password fields.");
    if (newPass !== confirmPass) return alert("New passwords do not match.");
    
      alert("Password updated successfully.");
}

// Two-factor authentication toggle
document.getElementById("twoFactorToggle").addEventListener("change", function() {
    localStorage.setItem("twoFactorEnabled", this.checked);
    alert(`Two-Factor Authentication ${this.checked ? 'enabled' : 'disabled'}.`);
});

// Privacy toggles
document.getElementById("showEmail").addEventListener("change", function() {
    localStorage.setItem("showEmail", this.checked);
});

document.getElementById("shareActivity").addEventListener("change", function() {
    localStorage.setItem("shareActivity", this.checked);
});

function deleteAccount() {
    if (confirm("Are you sure you want to delete your account?\nThis cannot be undone.")) {
        alert("Account deleted.");
    }
}

/// About Settings
function checkForUpdates() {
    alert("🔄 Checking for updates...\nNo updates available.");
}

function openChangelog() {
    alert("📜 Changelog:\n- Improved settings UI\n- Fixed minor bugs");
}

function openPrivacyPolicy() {
    alert("🔒 Privacy Policy:\nYour data is stored securely and never shared.");
}

// Sidebar + Navbar Functions
let quickSettingsOpen = false;

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const sidebarTexts = document.querySelectorAll(".sidebar-text");
    const menuText = document.getElementById("menuText");

    const isExpanded = sidebar.classList.contains("w-60");

    if (isExpanded) {
        sidebar.classList.remove("w-60");
        sidebar.classList.add("w-20");
        menuText.classList.add("hidden");
        sidebarTexts.forEach(text => text.classList.add("hidden"));
    } else {
        sidebar.classList.remove("w-20");
        sidebar.classList.add("w-60");
        menuText.classList.remove("hidden");
        sidebarTexts.forEach(text => text.classList.remove("hidden"));
    }
}

function closeSidebarOnMobile() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Tab" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        toggleQuickSettings();
    }
});

function toggleQuickSettings() {
    const panel = document.getElementById("settingsPanel");
    quickSettingsOpen = !quickSettingsOpen;
    if (quickSettingsOpen) {
        panel.classList.remove("translate-x-full");
        panel.classList.add("translate-x-0");
    } else {
        panel.classList.add("translate-x-full");
        panel.classList.remove("translate-x-0");
    }
}

function saveSettings() {
    const isDark = document.getElementById("themeToggle").checked;
    const notifs = document.getElementById("notifToggle").checked;

    localStorage.setItem("theme", isDark ? "dark" : "light");
    localStorage.setItem("notifications", notifs);

    if (isDark) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }

    alert("✅ Settings saved!");
    toggleQuickSettings();
}

function openSettings() {
    document.getElementById('settingsPanel').classList.remove('translate-x-full');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.add('translate-x-full');
}

function saveSettings() {
    const darkMode = document.getElementById('themeToggle').checked;
    const notifications = document.getElementById('notifToggle').checked;

    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('notifications', notifications);

    closeSettings();
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    } else if (savedTheme === "light") {
        document.body.classList.remove("dark");
    }

    window.setTheme = function(mode) {
        if (mode === "dark") {
            document.body.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
        updateThemeButtons(mode);
    };

    function updateThemeButtons(activeMode) {
        document.querySelectorAll("[data-theme-btn]").forEach(btn => {
            if (btn.dataset.themeBtn === activeMode) {
                btn.classList.add("ring-2", "ring-blue-500");
            } else {
                btn.classList.remove("ring-2", "ring-blue-500");
            }
        });
    }

    if (savedTheme) updateThemeButtons(savedTheme);
});

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.add('hidden'));

    const selected = document.getElementById(`tab-${tabName}`);
    if (selected) {
        selected.classList.remove('hidden');
    }

    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    sidebarTabs.forEach(tab => {
        tab.classList.remove('bg-gray-700', 'text-white', 'font-semibold');
        tab.classList.add('hover:bg-gray-700');
    });

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('bg-gray-700', 'text-white', 'font-semibold');
        activeTab.classList.remove('hover:bg-gray-700');
    }
}

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.toggle("hidden");
});

// Default Functions
window.onload = () => {
    loadStats();
    loadUserData();
}

switchTab('home');
document.addEventListener("DOMContentLoaded", loadUserData);

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const tabs = document.querySelectorAll(".sidebar-tab");
    const menuText = document.getElementById("menuText");
    const sidebarTexts = document.querySelectorAll(".sidebar-text");

    if (sidebar.classList.contains("w-60")) {
        menuText.classList.remove("hidden");
        sidebarTexts.forEach(t => t.classList.remove("hidden"));
        tabs.forEach(tab => {
            tab.classList.remove("justify-center");
            tab.classList.add("justify-start", "pl-3");
        });
    }
});

document.querySelectorAll(".settings-tab").forEach(tab => {
    tab.addEventListener("click", function () {
        document.querySelectorAll(".settings-tab").forEach(t => {
            t.classList.remove("border-blue-600", "dark:border-blue-400", "text-blue-600", "dark:text-blue-400");
            t.classList.add("border-transparent");
        });

        // Hide all content
        document.querySelectorAll(".settings-content").forEach(c => c.classList.add("hidden"));

        // Show selected content
        const targetId = this.getAttribute("data-target");
        document.getElementById(targetId).classList.remove("hidden");

        // Highlight active tab
        this.classList.add("border-blue-600", "dark:border-blue-400", "text-blue-600", "dark:text-blue-400");
    });
});

document.querySelector(".settings-tab").click();