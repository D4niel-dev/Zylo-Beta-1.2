// ========================================
// ZYLO BACKUP FUNCTIONS - ALL HTML SCRIPTS
// ========================================
// This file contains all JavaScript functions from all HTML files
// Updated: $(date)

// ========================================
// COMMON UTILITIES
// ========================================

// Theme management
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    }
}

// Page transition
function goToPage(href) { 
    document.body.classList.add("fade-out"); 
    setTimeout(() => { 
        window.location.href = href; 
    }, 1000); 
}

// Fade-out transition on link clicks
function setupPageTransitions() {
    document.querySelectorAll("a").forEach(link => {
        if (link.hostname === window.location.hostname) {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                const href = this.getAttribute("href");
                document.body.classList.add("fade-out");
                setTimeout(() => {
                    goToPage(href);
                }, 1000);
            });
        }
    });
}

// ========================================
// LOGIN.HTML FUNCTIONS
// ========================================

// Login page initialization
function initLoginPage() {
    const body = document.getElementById('body');
    const toggleBtn = document.getElementById('toggleTheme');
    const toggleEye = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const capsWarn = document.getElementById('capsWarn');
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginBtnText = document.getElementById('loginBtnText');

    // Toggle password visibility
    if (toggleEye) {
        toggleEye.onclick = () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                document.getElementById('eyeIcon').setAttribute('data-feather', 'eye-off');
            } else {
                passwordInput.type = 'password';
                document.getElementById('eyeIcon').setAttribute('data-feather', 'eye');
            }
            feather.replace();
        };
    }

    // Caps Lock indicator
    function handleCaps(e){
        try {
            const on = e.getModifierState && e.getModifierState('CapsLock');
            if (capsWarn) capsWarn.classList.toggle('hidden', !on);
        } catch {}
    }
    if (passwordInput) {
        passwordInput.addEventListener('keydown', handleCaps);
        passwordInput.addEventListener('keyup', handleCaps);
    }

    // Load username
    window.onload = () => {
        const saved = localStorage.getItem("savedUsername");
        if (saved) {
            const usernameField = document.getElementById("username");
            if (usernameField) usernameField.value = saved;
            const rememberMe = document.getElementById("rememberMe");
            if (rememberMe) rememberMe.checked = true;
        }
    };

    // Theme preference
    window.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            if (body) body.classList.add('dark');
            const themeText = document.getElementById('themeText');
            const themeIcon = document.getElementById('themeIcon');
            if (themeText) themeText.textContent = 'Dark Mode';
            if (themeIcon) themeIcon.setAttribute('data-feather', 'moon');
        } else if (savedTheme === 'light') {
            if (body) body.classList.remove('dark');
            const themeText = document.getElementById('themeText');
            const themeIcon = document.getElementById('themeIcon');
            if (themeText) themeText.textContent = 'Light Mode';
            if (themeIcon) themeIcon.setAttribute('data-feather', 'sun');
        }
        feather.replace();
    });

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            if (body) body.classList.toggle('dark');
            const isDark = body.classList.contains('dark');
            const themeText = document.getElementById('themeText');
            const themeIcon = document.getElementById('themeIcon');
            if (themeText) themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
            if (themeIcon) themeIcon.setAttribute('data-feather', isDark ? 'moon' : 'sun');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            feather.replace();
        };
    }

    // Login logic
    window.login = async function() {
        const identifier = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const remember = document.getElementById("rememberMe").checked;
        const errorMsg = document.getElementById("error-msg");
        const baseUrl = window.location.origin;

        if (!navigator.onLine) {
            if (errorMsg) {
                errorMsg.textContent = "You're offline. Login requires a connection (local users only).";
                errorMsg.classList.remove("hidden");
            }
            return;
        }

        // Disable UI and show spinner
        if (loginBtn) loginBtn.disabled = true;
        if (loginSpinner) loginSpinner.classList.remove('hidden');
        if (loginBtnText) loginBtnText.textContent = 'Signing in…';

        try {
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
                try { new Audio('/files/audio/login.mp3').play().catch(()=>{}); } catch {}
                goToPage("loading.html");
            } else {
                if (errorMsg) {
                    errorMsg.textContent = result.error || "Login failed.";
                    errorMsg.classList.remove("hidden");
                }
                try { new Audio('/files/audio/error.mp3').play().catch(()=>{}); } catch {}
                // Re-enable UI
                if (loginBtn) loginBtn.disabled = false;
                if (loginSpinner) loginSpinner.classList.add('hidden');
                if (loginBtnText) loginBtnText.textContent = 'Sign In';
            }
        } catch (error) {
            if (errorMsg) {
                errorMsg.textContent = "Connection failed. Please try again.";
                errorMsg.classList.remove("hidden");
            }
            if (loginBtn) loginBtn.disabled = false;
            if (loginSpinner) loginSpinner.classList.add('hidden');
            if (loginBtnText) loginBtnText.textContent = 'Sign In';
        }
    };

    // Enter key triggers login
    document.addEventListener("keydown", e => {
        if (e.key === "Enter") login();
    });

    // Avatar loading on username blur
    const loginAvatar = document.getElementById("loginAvatar");
    const usernameField = document.getElementById("username");

    if (usernameField) {
        usernameField.addEventListener("blur", async () => {
            const identifier = document.getElementById("username").value.trim();
            const baseUrl = window.location.origin;
            if (!identifier) return;
            if (!navigator.onLine) return;

            try {
                const res = await fetch(`${baseUrl}/api/get-user?identifier=${encodeURIComponent(identifier)}`);
                const data = await res.json();

                const avatarImg = document.getElementById("loginAvatar");
                if (data.success && data.user.avatar) {
                    if (avatarImg) avatarImg.src = data.user.avatar;
                } else {
                    if (avatarImg) avatarImg.src = "/images/default_avatar.png";
                }
            } catch (err) {
                console.error("Failed to load avatar", err);
                const avatarImg = document.getElementById("loginAvatar");
                if (avatarImg) avatarImg.src = "/images/default_avatar.png";
            }
        });
    }

    setupPageTransitions();
}

// ========================================
// SIGNUP.HTML FUNCTIONS
// ========================================

function initSignupPage() {
    // Password toggle
    window.togglePassword = function(id, toggleElement) {
        const input = document.getElementById(id);
        const icon = toggleElement.querySelector('i[data-feather]');
        if (!input || !icon) return;
        const to = input.type === 'password' ? 'text' : 'password';
        input.type = to;
        icon.setAttribute('data-feather', to === 'text' ? 'eye-off' : 'eye');
        try { feather.replace(); } catch {}
    };

    // Image preview
    window.previewImage = function(event, targetId) {
        const reader = new FileReader();
        reader.onload = () => document.getElementById(targetId).src = reader.result;
        reader.readAsDataURL(event.target.files[0]);
    };

    // Theme initialization
    window.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
        }
    });

    // Registration function
    window.register = async function() {
        const username = document.getElementById("newUsername").value.trim();
        const email = document.getElementById("newEmail").value.trim();
        const password = document.getElementById("newPassword").value.trim();
        const confirm = document.getElementById("confirmPassword").value.trim();
        let usertag = document.getElementById("usertag").value.trim();
        const dob = document.getElementById("dob").value;
        const gender = document.getElementById("gender").value;
        const phone = document.getElementById("phone").value;
        const agree = document.getElementById("agreeTerms").checked;
        const error = document.getElementById("signup-error");
        const signupBtn = document.getElementById('signupBtn');
        const signupSpinner = document.getElementById('signupSpinner');
        const signupBtnText = document.getElementById('signupBtnText');

        if (password !== confirm) {
            if (error) {
                error.textContent = "Passwords do not match.";
                error.classList.remove("hidden");
            }
            return;
        }

        if (!agree) {
            if (error) {
                error.textContent = "You must agree to the Privacy Policy and Terms of Service.";
                error.classList.remove("hidden");
            }
            return;
        }

        if (!usertag) {
            usertag = `${username.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Disable UI while registering
        if (signupBtn) signupBtn.disabled = true;
        if (signupSpinner) signupSpinner.classList.remove('hidden');
        if (signupBtnText) signupBtnText.textContent = 'Creating account…';

        const avatar = await encodeImageToBase64("avatarUpload");
        const banner = await encodeImageToBase64("bannerUpload");

        try {
            const response = await fetch(`${window.location.origin}/api/signup`, {
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
                try { new Audio('/files/audio/login.mp3').play().catch(()=>{}); } catch {}
                goToPage("login.html");
            } else {
                if (error) {
                    error.textContent = result.error || "Signup failed.";
                    error.classList.remove("hidden");
                }
                try { new Audio('/files/audio/error.mp3').play().catch(()=>{}); } catch {}
                if (signupBtn) signupBtn.disabled = false;
                if (signupSpinner) signupSpinner.classList.add('hidden');
                if (signupBtnText) signupBtnText.textContent = 'Sign Up';
            }
        } catch (error) {
            if (error) {
                error.textContent = "Connection failed. Please try again.";
                error.classList.remove("hidden");
            }
            if (signupBtn) signupBtn.disabled = false;
            if (signupSpinner) signupSpinner.classList.add('hidden');
            if (signupBtnText) signupBtnText.textContent = 'Sign Up';
        }
    };

    // Image encoding
    window.encodeImageToBase64 = async function(inputId) {
        const fileInput = document.getElementById(inputId);
        if (fileInput.files.length === 0) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    };

    // Coming soon modal
    window.showComingSoon = function(provider) {
        const text = `${provider} sign-up will be added in the next update!`;
        const comingSoonText = document.getElementById("comingSoonText");
        const comingSoonModal = document.getElementById("comingSoonModal");
        if (comingSoonText) comingSoonText.textContent = text;
        if (comingSoonModal) comingSoonModal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    };

    window.closeComingSoon = function() {
        const comingSoonModal = document.getElementById("comingSoonModal");
        if (comingSoonModal) comingSoonModal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    };

    // Enter key registration
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            register();
        }
    });

    // Username availability + password strength
    const newUsername = document.getElementById('newUsername');
    const usernameAvail = document.getElementById('usernameAvail');
    const newPassword = document.getElementById('newPassword');
    const pwStrength = document.getElementById('pwStrength');

    let checkTimer;
    if (newUsername) {
        newUsername.addEventListener('input', () => {
            if (usernameAvail) usernameAvail.classList.add('hidden');
            clearTimeout(checkTimer);
            const value = (newUsername.value || '').trim();
            if (!value) return;
            checkTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/check-user?identifier=${encodeURIComponent(value)}`);
                    const data = await res.json();
                    if (data.exists) {
                        if (usernameAvail) {
                            usernameAvail.textContent = 'Username already taken';
                            usernameAvail.className = 'text-xs mt-1 text-red-600';
                        }
                    } else {
                        if (usernameAvail) {
                            usernameAvail.textContent = 'Username available';
                            usernameAvail.className = 'text-xs mt-1 text-green-600';
                        }
                    }
                    if (usernameAvail) usernameAvail.classList.remove('hidden');
                } catch {}
            }, 350);
        });
    }

    function calcStrength(pw){
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^\w\s]/.test(pw)) score++;
        return score;
    }
    
    if (newPassword && pwStrength) {
        newPassword.addEventListener('input', () => {
            const pw = newPassword.value || '';
            const s = calcStrength(pw);
            const labels = ['Very weak','Weak','Okay','Good','Strong'];
            pwStrength.textContent = pw ? `Strength: ${labels[Math.max(0, s-1)]}` : '';
            pwStrength.className = 'mt-1 text-xs ' + (s >= 4 ? 'text-green-600' : s >=2 ? 'text-yellow-600' : 'text-red-600');
        });
    }

    setupPageTransitions();
}

// ========================================
// FORGOT.HTML FUNCTIONS
// ========================================

function initForgotPage() {
    // Reset function
    window.reset = async function() {
        const identifier = document.getElementById("emailOrUsername").value.trim();
        const msg = document.getElementById("reset-msg");
        const spinner = document.getElementById("spinner");
        const btn = document.getElementById("resetBtn");

        if (!identifier) {
            if (msg) {
                msg.innerHTML = `<i data-feather="alert-circle" class="w-4 h-4"></i> Please enter your email or username.`;
                msg.className = "text-sm text-center text-red-600";
                msg.classList.remove("hidden");
            }
            feather.replace();
            return;
        }

        if (spinner) spinner.classList.remove("hidden");
        if (btn) btn.disabled = true;

        try {
            const res = await fetch(`${window.location.origin}/api/forgot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier })
            });

            const result = await res.json();
            if (msg) {
                msg.innerHTML = result.success
                    ? `<i data-feather="check-circle" class="w-4 h-4"></i> Reset instructions sent to your email.`
                    : `<i data-feather="x-circle" class="w-4 h-4"></i> ${result.error || "Something went wrong."}`;
                msg.className = "text-sm text-center " + (result.success ? "text-green-500" : "text-red-600");
                msg.classList.remove("hidden");
            }
            try { new Audio('/files/audio/ui.mp3').play().catch(()=>{}); } catch {}
        } catch (err) {
            if (msg) {
                msg.innerHTML = `<i data-feather="x-circle" class="w-4 h-4"></i> Failed to connect to server.`;
                msg.className = "text-sm text-center text-red-600";
                msg.classList.remove("hidden");
            }
            try { new Audio('/files/audio/error.mp3').play().catch(()=>{}); } catch {}
        } finally {
            if (spinner) spinner.classList.add("hidden");
            if (btn) btn.disabled = false;
        }
        feather.replace();
    };

    // Enter to submit
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter') reset(); });

    setupPageTransitions();
}

// ========================================
// RESET.HTML FUNCTIONS
// ========================================

function initResetPage() {
    // Load username from URL params
    window.onload = () => {
        const params = new URLSearchParams(window.location.search);
        const user = params.get("user");
        if (user) {
            const resetUser = document.getElementById("resetUser");
            if (resetUser) resetUser.value = user;
        }
    };

    // Password toggle
    window.togglePassword = function(id, el) {
        const input = document.getElementById(id);
        const icon = el.querySelector('i[data-feather]');
        if (input.type === "password") {
            input.type = "text";
            if (icon) icon.setAttribute("data-feather", "eye-off");
        } else {
            input.type = "password";
            if (icon) icon.setAttribute("data-feather", "eye");
        }
        feather.replace();
    };

    // Submit reset
    window.submitReset = async function() {
        const username = document.getElementById("resetUser").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirm = document.getElementById("confirmNewPassword").value;
        const result = document.getElementById("resetResult");
        const baseUrl = window.location.origin;
        const btn = document.getElementById('resetSubmitBtn');
        const spinner = document.getElementById('resetSpinner');
        const btnText = document.getElementById('resetSubmitText');

        if (!username || !newPassword || !confirm) {
            if (result) {
                result.innerHTML = `<i data-feather="alert-circle" class="w-4 h-4"></i> Please fill out all fields.`;
                result.classList.remove("hidden", "text-green-600");
                result.classList.add("text-red-600");
            }
            feather.replace();
            return;
        }

        if (newPassword !== confirm) {
            if (result) {
                result.innerHTML = `<i data-feather="x-circle" class="w-4 h-4"></i> Passwords do not match.`;
                result.classList.remove("hidden", "text-green-600");
                result.classList.add("text-red-600");
            }
            feather.replace();
            return;
        }

        if (btn) btn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (btnText) btnText.textContent = 'Submitting…';

        try {
            const res = await fetch(`${baseUrl}/api/reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, newPassword })
            });

            const data = await res.json();
            if (result) {
                result.innerHTML = data.success
                    ? `<i data-feather="check-circle" class="w-4 h-4"></i> Password updated successfully!`
                    : `<i data-feather="x-circle" class="w-4 h-4"></i> ${data.error || "Reset failed."}`;
                result.classList.remove("hidden", "text-red-600", "text-green-600");
                result.classList.add(data.success ? "text-green-600" : "text-red-600");
            }
            try { new Audio(`/files/audio/${data.success ? 'ui' : 'error'}.mp3`).play().catch(()=>{}); } catch {}
            if (btn) btn.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (btnText) btnText.textContent = 'Submit';
            feather.replace();
        } catch (error) {
            if (result) {
                result.innerHTML = `<i data-feather="x-circle" class="w-4 h-4"></i> Connection failed.`;
                result.classList.remove("hidden", "text-green-600");
                result.classList.add("text-red-600");
            }
            if (btn) btn.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (btnText) btnText.textContent = 'Submit';
            feather.replace();
        }
    };

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add("dark");
    } else if (savedTheme === 'light') {
        document.body.classList.remove("dark");
    }

    // Enter to submit
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitReset(); });

    setupPageTransitions();
}

// ========================================
// LOADING.HTML FUNCTIONS
// ========================================

function initLoadingPage() {
    const tasks = [
        { key: 'init', label: 'Initializing Zylo', run: async () => { await new Promise(r => setTimeout(r, 300)); } },
        { key: 'user', label: 'Fetching user data', run: async () => {
            const u = localStorage.getItem('username');
            if (!u) return;
            try { await fetch(`/api/get-user?identifier=${encodeURIComponent(u)}`); } catch {}
        } },
        { key: 'messages', label: 'Loading chats', run: async () => {
            try { await fetch('/api/messages', { method: 'GET' }); } catch {}
        } },
        { key: 'groups', label: 'Syncing groups', run: async () => {
            const u = localStorage.getItem('username');
            if (!u) return;
            try { await fetch(`/api/groups?username=${encodeURIComponent(u)}`); } catch {}
        } },
        { key: 'explore', label: 'Fetching explore feed', run: async () => {
            try { await fetch('/api/explore/posts'); } catch {}
        } },
        { key: 'cache', label: 'Priming offline cache', run: async () => { try { await caches.open('runtime-v1-zylo'); } catch {} } },
    ];

    let index = 0;
    const textEl = document.getElementById("taskText");
    const progressBar = document.getElementById("progressBar");
    const welcomeEl = document.getElementById("welcomeMsg");

    // Show welcome with stored username
    const username = localStorage.getItem("username");
    if (username && welcomeEl) {
        welcomeEl.textContent = `Welcome back, ${username}!`;
    }

    async function runNext() {
        if (index >= tasks.length) return;
        const task = tasks[index];
        if (textEl) textEl.textContent = task.label;
        try { await task.run(); } catch {}
        index++;
        if (progressBar) progressBar.style.width = `${(index/tasks.length) * 100}%`;
        if (index < tasks.length) {
            setTimeout(runNext, 250);
        } else {
            done();
        }
    }

    function done(){
        if (textEl) textEl.textContent = "Done!";
        const loadingDots = document.querySelector(".loading-dots");
        if (loadingDots) loadingDots.style.display = "none";
        if (progressBar) progressBar.style.width = "100%";
        setTimeout(() => {
            document.body.style.animation = "fadeOut 1s forwards";
            setTimeout(() => { goToPage("mainapp.html"); }, 900);
        }, 500);
    }

    window.addEventListener('load', () => {
        runNext();
    });

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add("dark");
    } else if (savedTheme === 'light') {
        document.body.classList.remove("dark");
    }

    setupPageTransitions();
}

// ========================================
// MAINAPP.HTML FUNCTIONS
// ========================================

function initMainApp() {
    // Chat Functions
    const baseUrl = window.location.origin;
    let socket = null;
    
    // Initialize socket if available
    if (typeof io !== 'undefined') {
        socket = io(baseUrl);
    }

    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    const username = localStorage.getItem("savedUsername") || "N/A";
    const email = localStorage.getItem("savedEmail") || "N/A";
    const typingIndicator = document.getElementById("typingIndicator");

    if (chatInput) {
        chatInput.addEventListener("input", () => {
            if (socket) socket.emit("typing", { username });
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
    }
        
    function appendMessage(data) {
        if (!chatMessages) return;
        
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
        if (!chatInput) return;
        const message = chatInput.value.trim();
        if (message) {
            if (socket) socket.emit("send_message", { username, message });
            chatInput.value = "";
            chatInput.style.height = "auto";
        }
    }

    if (socket) {
        socket.on("receive_message", appendMessage);
        socket.on("typing", (data) => {
            if (typingIndicator) {
                typingIndicator.textContent = `${data.username} is typing...`;
                clearTimeout(typingIndicator.timer);
                typingIndicator.timer = setTimeout(() => {
                    typingIndicator.textContent = "";
                }, 2500);
            }
        });
    }

    // Load messages
    fetch("/api/messages")
        .then((res) => res.json())
        .then((msgs) => msgs.forEach(appendMessage))
        .catch(() => {});

    // Profile Functions
    window.addEventListener("DOMContentLoaded", async () => {
        const username = localStorage.getItem("username");
        if (!username) {
            const profileUsername = document.getElementById("profileUsername");
            const profileUsertag = document.getElementById("profileUsertag");
            if (profileUsername) profileUsername.textContent = "N/A";
            if (profileUsertag) profileUsertag.textContent = "N/A";
            return;
        }

        try {
            const res = await fetch(`/api/get-user?identifier=${username}`);
            const data = await res.json();

            if (data.success) {
                const updated = data.user || {};

                const profileUsername = document.getElementById("profileUsername");
                const profileUsertag = document.getElementById("profileUsertag");
                const aboutMe = document.getElementById("aboutMe");
                const avatarImage = document.getElementById("avatarImage");
                const bannerImage = document.getElementById("bannerImage");

                if (profileUsername) profileUsername.textContent = updated.username;
                if (profileUsertag) profileUsertag.textContent = updated.usertag;
                if (aboutMe) aboutMe.value = updated.aboutMe || "";
                if (avatarImage) avatarImage.src = updated.avatar || "/images/default-avatar.png";
                if (bannerImage) bannerImage.src = updated.banner || "/images/default-banner.png";
            } else {
                console.error("User not found");
            }
        } catch (err) {
            console.error("Error fetching user data", err);
        }
    });

    // Profile save functions
    window.saveAboutMe = function() {
        const about = document.getElementById("aboutMe");
        if (about) localStorage.setItem("aboutMe", about.value);
    };

    window.updateAvatar = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                const avatarImage = document.getElementById("avatarImage");
                if (avatarImage) avatarImage.src = e.target.result;
                localStorage.setItem("avatarURL", e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    window.updateBanner = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                const bannerImage = document.getElementById("bannerImage");
                if (bannerImage) bannerImage.src = e.target.result;
                localStorage.setItem("bannerURL", e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Stats loading
    async function loadStats() {
        const baseUrl = window.location.origin;
        try {
            const res = await fetch(`${baseUrl}/api/stats`);
            const data = await res.json();
            const statUsers = document.getElementById("stat-users");
            const statMessages = document.getElementById("stat-messages");
            const statRooms = document.getElementById("stat-rooms");
            if (statUsers) statUsers.textContent = data.users;
            if (statMessages) statMessages.textContent = data.messages;
            if (statRooms) statRooms.textContent = data.rooms;
        } catch (err) {
            console.error("Failed to load stats", err);
        }
    }

    // Image cropping
    let cropper = null;
    let currentTarget = null;

    window.openCropper = function(event, targetType) {
        const file = event.target.files[0];
        if (!file) return;

        currentTarget = targetType;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('cropperImage');
            const cropperModal = document.getElementById('cropperModal');
            if (img) img.src = e.target.result;
            if (cropperModal) cropperModal.classList.remove('hidden');

            if (cropper) cropper.destroy();

            if (typeof Cropper !== 'undefined') {
                cropper = new Cropper(img, {
                    aspectRatio: targetType === 'avatar' ? 1 : 16 / 5,
                    viewMode: 1,
                    dragMode: 'move',
                    responsive: true,
                });
            }
        };
        reader.readAsDataURL(file);
    };

    window.rotateImage = function(deg) {
        if (cropper) cropper.rotate(deg);
    };

    window.closeCropper = function() {
        if (cropper) cropper.destroy();
        cropper = null;
        const cropperModal = document.getElementById('cropperModal');
        if (cropperModal) cropperModal.classList.add('hidden');
    };

    window.applyCrop = function() {
        if (!cropper) return;
        
        const canvas = cropper.getCroppedCanvas({
            width: currentTarget === 'avatar' ? 200 : 800,
            height: currentTarget === 'avatar' ? 200 : 250
        });

        const imageUrl = canvas.toDataURL('image/png');

        if (currentTarget === 'avatar') {
            const avatarImage = document.getElementById('avatarImage');
            if (avatarImage) avatarImage.src = imageUrl;
            localStorage.setItem('avatar', imageUrl);
            // Update settings avatar too
            const settingsAvatar = document.getElementById('settingsAvatar');
            if (settingsAvatar) settingsAvatar.src = imageUrl;
        } else if (currentTarget === 'banner') {
            const bannerImage = document.getElementById('bannerImage');
            if (bannerImage) bannerImage.src = imageUrl;
            localStorage.setItem('banner', imageUrl);
            // Update settings banner too
            const settingsBanner = document.getElementById('settingsBanner');
            if (settingsBanner) settingsBanner.src = imageUrl;
        }

        // Ask user if they want to use this image as background
        if (confirm(`Would you like to use this ${currentTarget} as your background image?`)) {
            localStorage.setItem('bgImageDataUrl', imageUrl);
            // Set theme mode to custom to show the background
            localStorage.setItem('themeMode', 'custom');
            if (typeof applyBackground === 'function') applyBackground();
            if (typeof applyThemeMode === 'function') applyThemeMode('custom');
            alert('Background updated! You can change this anytime in Settings > Appearance.');
        }

        closeCropper();
        const saveProfileBtn = document.getElementById("saveProfileBtn");
        if (saveProfileBtn) saveProfileBtn.classList.remove("hidden");
        checkProfileChanges();
    };

    // User data loading
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

            const profileUsername = document.getElementById("profileUsername");
            const profileUsertag = document.getElementById("profileUsertag");
            const avatarImage = document.getElementById("avatarImage");
            const bannerImage = document.getElementById("bannerImage");
            const aboutMe = document.getElementById("aboutMe");
            const statLevel = document.getElementById("statLevel");
            const statGold = document.getElementById("statGold");
            const statRank = document.getElementById("statRank");

            if (profileUsername) profileUsername.textContent = user.username || "N/A";
            if (profileUsertag) profileUsertag.textContent = user.usertag || "N/A";
            if (avatarImage) avatarImage.src = user.avatar || "images/default_avatar.png";
            if (bannerImage) bannerImage.src = user.banner || "images/default_banner.png";
            if (aboutMe) aboutMe.value = user.aboutMe || "";
            if (statLevel) statLevel.textContent = user.level || 0;
            if (statGold) statGold.textContent = user.gold || 0;
            if (statRank) statRank.textContent = user.rank || "Unranked";

        } catch (err) {
            console.error("Error fetching user data", err);
        }
    }

    // Rank system
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

    // Profile save functionality
    const saveBtn = document.getElementById("saveProfileBtn");
    let initialProfileData = {};

    window.saveProfileChanges = async function() {
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

                const profileUsername = document.getElementById("profileUsername");
                const profileUsertag = document.getElementById("profileUsertag");
                const avatarImage = document.getElementById("avatarImage");
                const bannerImage = document.getElementById("bannerImage");
                const aboutMe = document.getElementById("aboutMe");
                const statLevel = document.getElementById("statLevel");
                const statGold = document.getElementById("statGold");
                const statRank = document.getElementById("statRank");

                if (profileUsername) profileUsername.textContent = updated.username || updatedProfile.username;
                if (profileUsertag) profileUsertag.textContent = updated.usertag || updatedProfile.usertag;
                if (avatarImage) avatarImage.src = updated.avatar || updatedProfile.avatar;
                if (bannerImage) bannerImage.src = updated.banner || updatedProfile.banner;
                if (aboutMe) aboutMe.value = updated.aboutMe || updatedProfile.aboutMe;
                if (statLevel) statLevel.textContent = updated.level ?? updatedProfile.level;
                if (statGold) statGold.textContent = (updated.gold ?? updatedProfile.gold).toLocaleString();
                if (statRank) statRank.textContent = updated.rank || updatedProfile.rank;

                // Reset initial data
                captureInitialProfileData();
                if (saveBtn) saveBtn.classList.add("hidden");

                if (updated.avatar && avatarImage) {
                    avatarImage.src = updated.avatar + "?t=" + Date.now();
                } else if (avatarImage) {
                    avatarImage.src = updatedProfile.avatar;
                }
                if (updated.banner && bannerImage) {
                    bannerImage.src = updated.banner + "?t=" + Date.now();
                } else if (bannerImage) {
                    bannerImage.src = updatedProfile.banner;
                }

                alert("Profile updated!");

            } else {
                alert("Failed to save profile: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Error saving profile!");
        }
    };

    function captureInitialProfileData() {
        const aboutMe = document.getElementById("aboutMe");
        const bannerImage = document.getElementById("bannerImage");
        const avatarImage = document.getElementById("avatarImage");
        
        initialProfileData = {
            aboutMe: aboutMe ? aboutMe.value.trim() : "",
            banner: bannerImage ? bannerImage.src : "",
            avatar: avatarImage ? avatarImage.src : ""
        };
    }
    captureInitialProfileData();

    function checkProfileChanges() {
        const aboutMe = document.getElementById("aboutMe");
        const bannerImage = document.getElementById("bannerImage");
        const avatarImage = document.getElementById("avatarImage");
        
        const currentData = {
            aboutMe: aboutMe ? aboutMe.value.trim() : "",
            banner: bannerImage ? bannerImage.src : "",
            avatar: avatarImage ? avatarImage.src : ""
        };
        const hasChanges = JSON.stringify(currentData) !== JSON.stringify(initialProfileData);
        if (saveBtn) saveBtn.classList.toggle("hidden", !hasChanges);
    }

    // Watch for changes
    const aboutMe = document.getElementById("aboutMe");
    const bannerUpload = document.getElementById("bannerUpload");
    const avatarUpload = document.getElementById("avatarUpload");
    
    if (aboutMe) aboutMe.addEventListener("input", checkProfileChanges);
    if (bannerUpload) bannerUpload.addEventListener("change", (e) => openCropper(e, "banner"));
    if (avatarUpload) avatarUpload.addEventListener("change", (e) => openCropper(e, "avatar"));

    // Tab switching
    window.switchTab = function(tabName) {
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
    };

    // Settings save functionality
    let settingsChanged = false;
    let pendingSettingsChanges = {};
    let originalSettings = {};

    // Initialize original settings
    function initializeOriginalSettings() {
        const settingsMap = [
            { id: "animationsToggle", key: "enableAnimations" },
            { id: "compactToggle", key: "compactMode" },
            { id: "tooltipToggle", key: "showTooltips" },
            { id: "languageSelect", key: "language" },
            { id: "startupPage", key: "startupPage" },
            { id: "autoSaveToggle", key: "autoSave" },
            { id: "confirmExitToggle", key: "confirmBeforeExit" }
        ];

        const soundSettingsMap = [
            { id: "soundVolume", key: "soundVolume" },
            { id: "musicVolume", key: "musicVolume" },
            { id: "muteAll", key: "muteAll" },
            { id: "enableSound", key: "enableSound" },
            { id: "enableMusic", key: "enableMusic" },
            { id: "soundProfile", key: "soundProfile" },
            { id: "duckMusic", key: "duckMusic" },
            { id: "playSend", key: "playSend" },
            { id: "playReceive", key: "playReceive" },
            { id: "playUi", key: "playUi" }
        ];

        // General settings
        settingsMap.forEach(({ key }) => {
            const el = document.getElementById(key.replace('Toggle', '').replace('Select', ''));
            if (el) {
                originalSettings[key] = el.type === 'checkbox' ? el.checked : el.value;
            }
        });

        // Sound settings
        soundSettingsMap.forEach(({ key }) => {
            const el = document.getElementById(key);
            if (el) {
                originalSettings[key] = el.type === 'checkbox' ? el.checked : el.value;
            }
        });
    }

    // Check if settings have changed
    function checkSettingsChanges() {
        let hasChanges = false;
        pendingSettingsChanges = {};

        const settingsMap = [
            { id: "animationsToggle", key: "enableAnimations" },
            { id: "compactToggle", key: "compactMode" },
            { id: "tooltipToggle", key: "showTooltips" },
            { id: "languageSelect", key: "language" },
            { id: "startupPage", key: "startupPage" },
            { id: "autoSaveToggle", key: "autoSave" },
            { id: "confirmExitToggle", key: "confirmBeforeExit" }
        ];

        const soundSettingsMap = [
            { id: "soundVolume", key: "soundVolume" },
            { id: "musicVolume", key: "musicVolume" },
            { id: "muteAll", key: "muteAll" },
            { id: "enableSound", key: "enableSound" },
            { id: "enableMusic", key: "enableMusic" },
            { id: "soundProfile", key: "soundProfile" },
            { id: "duckMusic", key: "duckMusic" },
            { id: "playSend", key: "playSend" },
            { id: "playReceive", key: "playReceive" },
            { id: "playUi", key: "playUi" }
        ];

        // Check general settings
        settingsMap.forEach(({ key }) => {
            const el = document.getElementById(key.replace('Toggle', '').replace('Select', ''));
            if (el) {
                const currentValue = el.type === 'checkbox' ? el.checked : el.value;
                const originalValue = originalSettings[key];
                
                if (currentValue !== originalValue) {
                    hasChanges = true;
                    pendingSettingsChanges[key] = currentValue;
                }
            }
        });

        // Check sound settings
        soundSettingsMap.forEach(({ key }) => {
            const el = document.getElementById(key);
            if (el) {
                const currentValue = el.type === 'checkbox' ? el.checked : el.value;
                const originalValue = originalSettings[key];
                
                if (currentValue !== originalValue) {
                    hasChanges = true;
                    pendingSettingsChanges[key] = currentValue;
                }
            }
        });

        settingsChanged = hasChanges;
        updateSaveButtonVisibility();
    }

    // Update save button visibility
    function updateSaveButtonVisibility() {
        const generalSaveBtn = document.getElementById('saveSettingsBtn');
        const soundSaveBtn = document.getElementById('saveSoundSettingsBtn');
        const accountSaveBtn = document.getElementById('saveAccountSettingsBtn');
        
        if (generalSaveBtn) {
            generalSaveBtn.style.display = settingsChanged ? 'block' : 'none';
        }
        if (soundSaveBtn) {
            soundSaveBtn.style.display = settingsChanged ? 'block' : 'none';
        }
        if (accountSaveBtn) {
            accountSaveBtn.style.display = settingsChanged ? 'block' : 'none';
        }
    }

    // Show save confirmation modal
    function showSaveSettingsModal() {
        const modal = document.getElementById('saveSettingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }
    }

    // Hide save confirmation modal
    function hideSaveSettingsModal() {
        const modal = document.getElementById('saveSettingsModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }

    // Confirm save settings
    window.confirmSaveSettings = function() {
        saveAllSettings();
        hideSaveSettingsModal();
    };

    // Discard settings changes
    window.discardSettingsChanges = function() {
        const settingsMap = [
            { id: "animationsToggle", key: "enableAnimations" },
            { id: "compactToggle", key: "compactMode" },
            { id: "tooltipToggle", key: "showTooltips" },
            { id: "languageSelect", key: "language" },
            { id: "startupPage", key: "startupPage" },
            { id: "autoSaveToggle", key: "autoSave" },
            { id: "confirmExitToggle", key: "confirmBeforeExit" }
        ];

        const soundSettingsMap = [
            { id: "soundVolume", key: "soundVolume" },
            { id: "musicVolume", key: "musicVolume" },
            { id: "muteAll", key: "muteAll" },
            { id: "enableSound", key: "enableSound" },
            { id: "enableMusic", key: "enableMusic" },
            { id: "soundProfile", key: "soundProfile" },
            { id: "duckMusic", key: "duckMusic" },
            { id: "playSend", key: "playSend" },
            { id: "playReceive", key: "playReceive" },
            { id: "playUi", key: "playUi" }
        ];

        // Revert to original settings
        settingsMap.forEach(({ key }) => {
            const el = document.getElementById(key.replace('Toggle', '').replace('Select', ''));
            if (el) {
                const originalValue = originalSettings[key];
                if (el.type === 'checkbox') {
                    el.checked = originalValue;
                } else {
                    el.value = originalValue;
                }
            }
        });

        soundSettingsMap.forEach(({ key }) => {
            const el = document.getElementById(key);
            if (el) {
                const originalValue = originalSettings[key];
                if (el.type === 'checkbox') {
                    el.checked = originalValue;
                } else {
                    el.value = originalValue;
                }
            }
        });
        
        settingsChanged = false;
        pendingSettingsChanges = {};
        updateSaveButtonVisibility();
        hideSaveSettingsModal();
    };

    // Cancel save settings
    window.cancelSaveSettings = function() {
        hideSaveSettingsModal();
    };

    // Save all settings
    function saveAllSettings() {
        const settingsMap = [
            { id: "animationsToggle", key: "enableAnimations" },
            { id: "compactToggle", key: "compactMode" },
            { id: "tooltipToggle", key: "showTooltips" },
            { id: "languageSelect", key: "language" },
            { id: "startupPage", key: "startupPage" },
            { id: "autoSaveToggle", key: "autoSave" },
            { id: "confirmExitToggle", key: "confirmBeforeExit" }
        ];

        const soundSettingsMap = [
            { id: "soundVolume", key: "soundVolume" },
            { id: "musicVolume", key: "musicVolume" },
            { id: "muteAll", key: "muteAll" },
            { id: "enableSound", key: "enableSound" },
            { id: "enableMusic", key: "enableMusic" },
            { id: "soundProfile", key: "soundProfile" },
            { id: "duckMusic", key: "duckMusic" },
            { id: "playSend", key: "playSend" },
            { id: "playReceive", key: "playReceive" },
            { id: "playUi", key: "playUi" }
        ];

        // Save general settings
        settingsMap.forEach(({ key }) => {
            const el = document.getElementById(key.replace('Toggle', '').replace('Select', ''));
            if (el) {
                const value = el.type === 'checkbox' ? el.checked : el.value;
                localStorage.setItem(key, value);
                originalSettings[key] = value;
            }
        });

        // Save sound settings
        soundSettingsMap.forEach(({ key }) => {
            const el = document.getElementById(key);
            if (el) {
                const value = el.type === 'checkbox' ? el.checked : el.value;
                localStorage.setItem(key, value);
                originalSettings[key] = value;
            }
        });

        // Persist to backend
        const username = localStorage.getItem('username');
        if (username) {
            fetch('/api/update-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, settings: pendingSettingsChanges })
            }).catch(() => {});
        }
        
        settingsChanged = false;
        pendingSettingsChanges = {};
        updateSaveButtonVisibility();
        
        // Show success message
        showSettingsSaveSuccess();
    }

    // Show save success message
    function showSettingsSaveSuccess() {
        // Create temporary success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeIn';
        successMsg.innerHTML = '<i data-feather="check-circle" class="w-4 h-4 inline mr-2"></i>Settings saved successfully!';
        document.body.appendChild(successMsg);
        
        // Replace feather icons
        if (typeof feather !== 'undefined') feather.replace();
        
        // Remove after 3 seconds
        setTimeout(() => {
            successMsg.remove();
        }, 3000);
    }

    // Initialize
    window.onload = () => {
        loadStats();
        loadUserData();
    };

    if (typeof switchTab === 'function') {
        switchTab('home');
    }
    document.addEventListener("DOMContentLoaded", loadUserData);
}

// ========================================
// MODAL FUNCTIONS (SHARED)
// ========================================

const zyloPP = `Last Updated: 4:10 PM 7/31/2025

This Privacy Policy explains how Zylo ("we", "us", or "our") collects, uses, and protects your information. By using Zylo, you agree to the collection and use of information in accordance with this policy.

1. Information We Collect

- Account Information : When you create an account, we may collect your name, email address, and login credentials.
- Usage Data : We may collect information about how you access and use Zylo, including pages visited, features used, and device information.
- Cookies : We may use cookies to enhance your experience, track usage, and remember your preferences.

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

window.openModal = function(type) {
    const title = type === 'pp' ? "Privacy Policy" : "Terms of Service";
    const content = type === 'pp' ? zyloPP : zyloTOS;
    const modalTitle = document.getElementById("modalTitle");
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("modal");
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalContent) modalContent.textContent = content;
    if (modal) modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

window.closeModal = function() {
    const modal = document.getElementById("modal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
};

// ========================================
// AUTO-INITIALIZATION
// ========================================

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('login.html')) {
        initLoginPage();
    } else if (currentPage.includes('signup.html')) {
        initSignupPage();
    } else if (currentPage.includes('forgot.html')) {
        initForgotPage();
    } else if (currentPage.includes('reset.html')) {
        initResetPage();
    } else if (currentPage.includes('loading.html')) {
        initLoadingPage();
    } else if (currentPage.includes('mainapp.html')) {
        initMainApp();
    }
    
    // Apply theme on all pages
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
    
    // Setup page transitions on all pages
    setupPageTransitions();
});

// ========================================
// END OF BACKUP FUNCTIONS
// ========================================