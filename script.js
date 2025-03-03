// JSONBin.io configuration
const JSONBIN_API_KEY = '$2a$10$8RqiAuU8tFpA3vC/Tt1qjujMCH9q1UHeSiUJ0o5mBXMzo/bnSn9R2'; // Replace with your JSONBin API key
const USERS_BIN_ID = '67c3f128e41b4d34e49f43d7'; // Replace with your users bin ID
const LISTINGS_BIN_ID = '67c3f104acd3cb34a8f3750e'; // Replace with your listings bin ID
const CONTACT_SUBMISSIONS_BIN_ID = '67c3f0caad19ca34f814fd8b'; // Replace with your Contact Submissions bin ID
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// NGO location (updated live)
let ngoLocation = { lat: 12.8250, lng: 80.0430 };
let currentRole = null;
let currentUser = null;
let users = { ngo: [], company: [] };
let listings = [];
let loggedInNGOs = [];

// Impact Metrics
let impactMetrics = {
    mealsDonated: 0,
    foodWastePrevented: 0,
    ngosSupported: new Set()
};

// Utility function to parse "Pickup by" date and time into a timestamp
function parsePickupTime(deadlineDate, deadlineTime) {
    const [time, period] = deadlineTime.split(' ');
    let [hour, minute] = time.includes(':') ? time.split(':') : [time, '00'];
    hour = parseInt(hour);
    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    const dateParts = deadlineDate.split('-');
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    date.setHours(hour, parseInt(minute), 0, 0);
    return date.getTime();
}

// Check if a listing has expired based on pickup time
function isListingExpired(pickupTime) {
    const currentTime = new Date().getTime();
    return currentTime > pickupTime;
}

// Fetch data from JSONBin
async function fetchFromJSONBin(binId) {
    try {
        const response = await axios.get(`${JSONBIN_BASE_URL}/${binId}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        return response.data.record;
    } catch (error) {
        console.error('Error fetching from JSONBin:', error);
        return null;
    }
}

// Update data in JSONBin
async function updateJSONBin(binId, data) {
    try {
        await axios.put(`${JSONBIN_BASE_URL}/${binId}`, data, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error updating JSONBin:', error);
        throw error;
    }
}

// Submit Contact Us form data
async function submitContactForm() {
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    if (name && email && message) {
        try {
            const fetchedSubmissions = await fetchFromJSONBin(CONTACT_SUBMISSIONS_BIN_ID);
            if (!fetchedSubmissions) throw new Error('Error fetching contact submissions.');
            const submissions = fetchedSubmissions;
            submissions.push({ name, email, message, timestamp: new Date().toISOString() });
            await updateJSONBin(CONTACT_SUBMISSIONS_BIN_ID, submissions);
            alert('Message sent successfully!');
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-email').value = '';
            document.getElementById('contact-message').value = '';
        } catch (error) {
            console.error('Contact Form Submission Error:', error);
            alert('Error sending message: ' + error.message);
        }
    } else {
        alert('Please fill all fields.');
    }
}

// Show/hide pages
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if (pageId === `${currentRole}-dashboard`) getNGOLocation();
}

// Toggle between login and signup modes
function toggleAuthMode(mode, role) {
    const loginForm = document.getElementById(`${role}-login-form`);
    const signupForm = document.getElementById(`${role}-signup-form`);
    const loginTab = document.querySelector(`#${role}-login .auth-tabs .login-tab`);
    const signupTab = document.querySelector(`#${role}-login .auth-tabs .signup-tab`);

    if (mode === 'login') {
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
    }
}

// Show login/signup page for chosen role
function showLogin(role) {
    currentRole = role;
    showPage(`${role}-login`);
}

// Show Food Waste Prevention Tips Modal
function showFoodWasteTipsModal() {
    const modal = document.getElementById('food-waste-tips-modal');
    modal.style.display = 'block';
    document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    document.querySelector('.modal-close-btn').onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// Simulated login
async function login(role) {
    const username = document.getElementById(`${role}-username-login`).value;
    const password = document.getElementById(`${role}-password-login`).value;
    if (username && password) {
        const fetchedUsers = await fetchFromJSONBin(USERS_BIN_ID);
        if (!fetchedUsers) {
            alert('Error fetching users. Please try again.');
            return;
        }
        users = fetchedUsers;
        const userList = users[role];
        const user = userList.find(u => u.username === username);
        if (user) {
            currentUser = username;
            if (role === 'ngo') {
                loggedInNGOs.push({ username, lat: ngoLocation.lat, lng: ngoLocation.lng });
            }
            alert(`${role.charAt(0).toUpperCase() + role.slice(1)} login successful!`);
            document.getElementById('auth-link').textContent = 'Dashboard';
            document.getElementById('auth-link').onclick = () => showPage(`${role}-dashboard`);
            showPage(`${role}-dashboard`);
            if (role === 'ngo') displayListings();
            if (role === 'company') {
                displayCompanyListings();
                showFoodWasteTipsModal(); // Show tips modal on login
            }
        } else {
            alert('User not found. Please sign up!');
        }
    } else {
        alert('Please enter username and password.');
    }
}

// Simulated signup with contact details
async function signup(role) {
    const username = document.getElementById(`${role}-username-signup`).value;
    const email = document.getElementById(`${role}-email-signup`).value;
    const contact = document.getElementById(`${role}-contact-signup`).value;
    const password = document.getElementById(`${role}-password-signup`).value;
    if (username && email && contact && password) {
        try {
            const fetchedUsers = await fetchFromJSONBin(USERS_BIN_ID);
            if (!fetchedUsers) throw new Error('Error fetching users.');
            users = fetchedUsers;
            const userList = users[role];
            if (userList.find(u => u.username === username)) {
                alert('Username already exists!');
                return;
            }
            userList.push({ username, contact, tips: [] }); // Initialize tips array for companies
            await updateJSONBin(USERS_BIN_ID, users);
            alert(`${role.charAt(0).toUpperCase() + role.slice(1)} signup successful! Please login.`);
            toggleAuthMode('login', role);
        } catch (error) {
            console.error('Signup Error:', error);
            alert('Signup failed: ' + error.message);
        }
    } else {
        alert('Please fill all fields.');
    }
}

// Logout
function logout() {
    if (currentRole === 'ngo') {
        loggedInNGOs = loggedInNGOs.filter(ngo => ngo.username !== currentUser);
    }
    currentRole = null;
    currentUser = null;
    document.getElementById('auth-link').textContent = 'Login';
    document.getElementById('auth-link').onclick = () => showPage('login-choice');
    showPage('home');
}

// Get company's current location
function getCompanyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            },
            (error) => {
                alert('Location access denied. Enter manually or use default.');
            }
        );
    } else {
        alert('Geolocation not supported.');
    }
}

// Add a new listing to JSONBin and notify nearby NGOs
async function addListing() {
    const food = document.getElementById('food').value;
    const locationInput = document.getElementById('location').value;
    const deadlineDate = document.getElementById('deadline-date').value;
    const deadlineTime = document.getElementById('deadline-time').value;
    if (food && locationInput && deadlineDate && deadlineTime) {
        try {
            const [latStr, lngStr] = locationInput.split(',').map(s => s.trim());
            const lat = parseFloat(latStr) || 12.8231 + Math.random() * 0.002;
            const lng = parseFloat(lngStr) || 80.0442 + Math.random() * 0.002;
            const postingDate = new Date().toLocaleDateString();
            const pickupTime = parsePickupTime(deadlineDate, deadlineTime);
            const listingId = Date.now() + '_' + currentUser;
            const newListing = {
                id: listingId,
                food,
                location: locationInput,
                deadlineDate,
                deadlineTime,
                pickupTime,
                claimed: false,
                removed: false,
                lat,
                lng,
                company: currentUser,
                date: postingDate,
                ngoContact: "",
                claimedBy: null
            };
            const fetchedListings = await fetchFromJSONBin(LISTINGS_BIN_ID);
            if (!fetchedListings) throw new Error('Error fetching listings.');
            listings = fetchedListings;
            listings.push(newListing);
            await updateJSONBin(LISTINGS_BIN_ID, listings);
            alert('Food added successfully!');
            document.getElementById('food').value = '';
            document.getElementById('location').value = '';
            document.getElementById('deadline-date').value = '';
            document.getElementById('deadline-time').value = '';
            notifyNearestNGO(newListing);
            fetchImpactMetrics();
            fetchCompanyTips(); // Update tips after adding a listing
        } catch (error) {
            console.error('Add Listing Error:', error);
            alert('Error adding listing: ' + error.message);
        }
    } else {
        alert('Please fill all fields!');
    }
}

// Fetch and update impact metrics
async function fetchImpactMetrics() {
    try {
        const fetchedListings = await fetchFromJSONBin(LISTINGS_BIN_ID);
        if (!fetchedListings) throw new Error('Error fetching listings.');
        listings = fetchedListings;
        impactMetrics.mealsDonated = 0;
        impactMetrics.foodWastePrevented = 0;
        impactMetrics.ngosSupported = new Set();

        listings.forEach(listing => {
            if (listing.claimed && !listing.removed) {
                const quantityMatch = listing.food.match(/\d+/);
                const quantity = quantityMatch ? parseInt(quantityMatch[0]) : 1;
                impactMetrics.mealsDonated += quantity;
                impactMetrics.foodWastePrevented += quantity * 0.5;
                if (listing.claimedBy) {
                    impactMetrics.ngosSupported.add(listing.claimedBy);
                }
            }
        });

        animateCounter('meals-donated', impactMetrics.mealsDonated);
        animateCounter('food-waste-prevented', impactMetrics.foodWastePrevented);
        animateCounter('ngos-supported', impactMetrics.ngosSupported.size);
    } catch (error) {
        console.error('Error fetching impact metrics:', error);
    }
}

// Animate counter effect
function animateCounter(elementId, targetValue) {
    let currentValue = 0;
    const increment = Math.ceil(targetValue / 50);
    const counterElement = document.getElementById(elementId);
    if (counterElement) {
        const interval = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(interval);
            }
            counterElement.textContent = currentValue;
        }, 20);
    }
}

// Fetch and update company tips
async function fetchCompanyTips() {
    const companyListings = listings.filter(l => l.company === currentUser && !l.removed);
    const foodItems = {};
    companyListings.forEach(listing => {
        const foodType = listing.food.split(' ')[1] || listing.food; // e.g., "20 pizzas" -> "pizzas"
        foodItems[foodType] = (foodItems[foodType] || 0) + 1;
    });

    const frequentItems = Object.entries(foodItems).filter(([_, count]) => count > 2);
    const tips = frequentItems.map(([foodType, count]) => {
        return `You've listed ${foodType} ${count} times this month—consider reducing your order by 20% or donating by 5 PM to avoid waste.`;
    });

    const company = users.company.find(u => u.username === currentUser);
    if (company) {
        company.tips = tips.length ? tips : ['No specific tips yet—try donating earlier to reduce waste!'];
        await updateJSONBin(USERS_BIN_ID, users);
    }

    displayCompanyTips(tips);
}

// Display tips on company dashboard
function displayCompanyTips(tips) {
    const tipsDiv = document.getElementById('company-tips');
    if (tipsDiv) {
        tipsDiv.innerHTML = '<h3>Smart Inventory Tips</h3>';
        tips.forEach(tip => {
            const p = document.createElement('p');
            p.textContent = tip;
            tipsDiv.appendChild(p);
        });
    }
}

// Remove a listing
async function removeListing(listingId) {
    try {
        const fetchedListings = await fetchFromJSONBin(LISTINGS_BIN_ID);
        if (!fetchedListings) throw new Error('Error fetching listings.');
        listings = fetchedListings;
        const listingIndex = listings.findIndex(l => l.id === listingId);
        if (listingIndex !== -1) {
            listings[listingIndex].removed = true;
            await updateJSONBin(LISTINGS_BIN_ID, listings);
            alert('Listing removed successfully!');
            fetchImpactMetrics();
            fetchCompanyTips(); // Update tips after removing a listing
        } else {
            alert('Listing not found.');
        }
    } catch (error) {
        console.error('Remove Listing Error:', error);
        alert('Error removing listing: ' + error.message);
    }
}

// Display NGO listings with distance (show expiry status)
function displayListings() {
    const listingsDiv = document.getElementById('listings');
    listingsDiv.innerHTML = '';
    listings.forEach(listing => {
        if (!listing.removed) {
            const distance = calculateDistance(listing.lat, listing.lng, ngoLocation.lat, ngoLocation.lng);
            const ngo = listing.claimedBy ? users.ngo.find(u => u.username === listing.claimedBy) : null;
            const ngoContact = ngo ? ngo.contact : "N/A";
            const isExpired = isListingExpired(listing.pickupTime);
            const div = document.createElement('div');
            div.className = 'listing' + (listing.claimed ? ' claimed' : isExpired ? ' expired' : '');
            div.innerHTML = `
                <strong>${listing.food}</strong> at ${listing.lat}, ${listing.lng} <br>
                Pickup by: ${listing.deadlineDate}, ${listing.deadlineTime} <br>
                Date: ${listing.date} <br>
                Posted by: ${listing.company} <br>
                NGO Contact: ${listing.claimed ? ngoContact : 'N/A'} <br>
                Distance: ${distance.toFixed(2)} km <br>
                ${
                    listing.claimed ? `Claimed by ${listing.claimedBy}` :
                    isExpired ? 'You can\'t claim because of health concerns' :
                    `<button onclick="claimListing('${listing.id}')">Claim</button>`
                }
            `;
            listingsDiv.appendChild(div);
        }
    });
    updateMap();
}

// Display Company listings (only their own, non-removed, include expiry status)
function displayCompanyListings() {
    const listingsDiv = document.getElementById('company-listings');
    listingsDiv.innerHTML = '<h3>Your Listings</h3>';
    listings.forEach(listing => {
        if (listing.company === currentUser && !listing.removed) {
            const ngo = listing.claimedBy ? users.ngo.find(u => u.username === listing.claimedBy) : null;
            const ngoContact = ngo ? ngo.contact : "N/A";
            const isExpired = isListingExpired(listing.pickupTime);
            const div = document.createElement('div');
            div.className = 'listing' + (listing.claimed ? ' claimed' : isExpired ? ' expired' : '');
            div.innerHTML = `
                <strong>${listing.food}</strong> at ${listing.location} <br>
                Pickup by: ${listing.deadlineDate}, ${listing.deadlineTime} <br>
                Date: ${listing.date} <br>
                Posted by: ${listing.company} <br>
                NGO Contact: ${listing.claimed ? ngoContact : 'N/A'} <br>
                Status: ${listing.claimed ? `Claimed by ${listing.claimedBy}` : isExpired ? 'Expired' : 'Available'} <br>
                ${!listing.claimed && !isExpired ? `<button onclick="removeListing('${listing.id}')">Remove</button>` : ''}
            `;
            listingsDiv.appendChild(div);
        }
    });
    fetchCompanyTips(); // Fetch and display tips after rendering listings
}

// Claim a listing and store the NGO's contact
async function claimListing(listingId) {
    try {
        const fetchedListings = await fetchFromJSONBin(LISTINGS_BIN_ID);
        if (!fetchedListings) throw new Error('Error fetching listings.');
        listings = fetchedListings;
        const listingIndex = listings.findIndex(l => l.id === listingId);
        if (listingIndex !== -1) {
            const listing = listings[listingIndex];
            if (isListingExpired(listing.pickupTime)) {
                alert('This listing has expired and cannot be claimed due to health concerns.');
                return;
            }
            listings[listingIndex].claimed = true;
            listings[listingIndex].claimedBy = currentUser;
            const ngo = users.ngo.find(u => u.username === currentUser);
            listings[listingIndex].ngoContact = ngo ? ngo.contact : "N/A";
            await updateJSONBin(LISTINGS_BIN_ID, listings);
            alert('Food claimed by NGO!');
            fetchImpactMetrics();
        } else {
            alert('Listing not found.');
        }
    } catch (error) {
        console.error('Claim Listing Error:', error);
        alert('Error claiming listing: ' + error.message);
    }
}

// Calculate distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Notify nearest NGOs within 10 km
function notifyNearestNGO(newListing) {
    const notificationRadius = 10;
    loggedInNGOs.forEach(ngo => {
        const dist = calculateDistance(newListing.lat, newListing.lng, ngo.lat, ngo.lng);
        if (dist <= notificationRadius && ngo.username === currentUser) {
            const notif = document.getElementById('notification');
            notif.innerHTML = `New food nearby: ${newListing.food} at ${dist.toFixed(2)} km`;
            notif.style.display = 'block';
            setTimeout(() => notif.style.display = 'none', 5000);
        }
    });
}

// Get NGO's real-time location
function getNGOLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                ngoLocation.lat = position.coords.latitude;
                ngoLocation.lng = position.coords.longitude;
                const ngoIndex = loggedInNGOs.findIndex(ngo => ngo.username === currentUser);
                if (ngoIndex !== -1) {
                    loggedInNGOs[ngoIndex].lat = ngoLocation.lat;
                    loggedInNGOs[ngoIndex].lng = ngoLocation.lng;
                }
                initMap();
                displayListings();
            },
            (error) => {
                alert('NGO location denied. Using SRM default.');
                initMap();
                displayListings();
            }
        );
    } else {
        alert('Geolocation not supported.');
        initMap();
        displayListings();
    }
}

// Initialize and update Leaflet map with OSM
let map;
function initMap() {
    if (map) map.remove();
    map = L.map('map').setView([ngoLocation.lat, ngoLocation.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.marker([ngoLocation.lat, ngoLocation.lng], {
        icon: L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41] })
    }).addTo(map).bindPopup('Your Location');
    updateMap();
}

function updateMap() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.getPopup()?.getContent() !== 'Your Location') {
            map.removeLayer(layer);
        }
    });

    listings.forEach(listing => {
        if (!listing.claimed && !listing.removed && !isListingExpired(listing.pickupTime)) {
            L.marker([listing.lat, listing.lng], {
                icon: L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconSize: [25, 41] })
            }).addTo(map).bindPopup(`${listing.food}`);
        }
    });
}

// Poll JSONBin for updates every 5 seconds
async function pollData() {
    try {
        const fetchedUsers = await fetchFromJSONBin(USERS_BIN_ID);
        if (fetchedUsers) users = fetchedUsers;

        const fetchedListings = await fetchFromJSONBin(LISTINGS_BIN_ID);
        if (fetchedListings) {
            listings = fetchedListings;
            if (currentRole === 'ngo') displayListings();
            if (currentRole === 'company') displayCompanyListings();
        }
    } catch (error) {
        console.error('Polling Error:', error);
    }
}

// Initial load and start polling
pollData();
setInterval(pollData, 5000);

// Hamburger menu toggle for responsive design
document.querySelector('.hamburger').addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('active');
});

// Call fetchImpactMetrics on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchImpactMetrics();
});

// Initial setup
showPage('home');