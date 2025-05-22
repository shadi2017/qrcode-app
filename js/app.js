// Initialize Database
const db = new Dexie('QRCodeDB');
db.version(1).stores({
    qrcodes: '++id, name, phone, created_date',
    scans: '++id, name, phone, scan_date, scan_time'
});

let html5QrcodeScanner = null;

// Navigation Functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Add active class to clicked button
    if (sectionName === 'create') {
        document.querySelector('.create-btn').classList.add('active');
    } else if (sectionName === 'scan') {
        document.querySelector('.scan-btn').classList.add('active');
    } else if (sectionName === 'report') {
        document.querySelector('.report-btn').classList.add('active');
        loadReports();
    }
}

// QR Code Generation
async function generateQR() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!name || !phone) {
        showStatus('create-status', 'Please fill in both name and phone number', 'error');
        return;
    }

    try {
        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            generateQRFallback(name, phone);
            return;
        }

        // Generate QR code with phone number
        const canvas = document.getElementById('qr-canvas');
        await QRCode.toCanvas(canvas, phone, {
            width: 300,
            margin: 2,
            color: {
                dark: '#4CAF50',
                light: '#FFFFFF'
            }
        });

        // Display result
        document.getElementById('qr-name').textContent = name;
        document.getElementById('qr-result').style.display = 'block';

        // Save to database
        await db.qrcodes.add({
            name: name,
            phone: phone,
            created_date: new Date().toISOString().split('T')[0]
        });

        showStatus('create-status', 'QR Code generated and saved successfully!', 'success');
        
        // Clear form
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';

    } catch (error) {
        console.error('Error generating QR code:', error);
        // Try fallback method
        generateQRFallback(name, phone);
    }
}

// Fallback QR Generation using Google Charts API
async function generateQRFallback(name, phone) {
    try {
        console.log('Using fallback QR generation method');
        
        // Create QR code using Google Charts API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(phone)}&color=4CAF50&bgcolor=FFFFFF`;
        
        // Create image element
        const qrContainer = document.getElementById('qr-result');
        const canvas = document.getElementById('qr-canvas');
        const img = document.createElement('img');
        img.src = qrUrl;
        img.style.border = '3px solid #4CAF50';
        img.style.borderRadius = '10px';
        img.style.margin = '20px 0';
        
        // Replace canvas with image
        canvas.style.display = 'none';
        canvas.parentNode.insertBefore(img, canvas);
        
        // Display result
        document.getElementById('qr-name').textContent = name;
        qrContainer.style.display = 'block';

        // Save to database
        await db.qrcodes.add({
            name: name,
            phone: phone,
            created_date: new Date().toISOString().split('T')[0]
        });

        showStatus('create-status', 'QR Code generated and saved successfully! (Using fallback method)', 'success');
        
        // Clear form
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';

    } catch (error) {
        console.error('Fallback QR generation failed:', error);
        showStatus('create-status', 'Error: Unable to generate QR code. Please check your internet connection.', 'error');
    }
}

// Save QR Image
function saveQRImage() {
    const canvas = document.getElementById('qr-canvas');
    const name = document.getElementById('qr-name').textContent;
    
    try {
        if (canvas.style.display !== 'none' && canvas.getContext) {
            // Save canvas as image
            const link = document.createElement('a');
            link.download = `qr-code-${name}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } else {
            // Save image element (fallback method)
            const img = canvas.parentNode.querySelector('img');
            if (img) {
                const link = document.createElement('a');
                link.download = `qr-code-${name}.png`;
                link.href = img.src;
                link.target = '_blank';
                link.click();
            } else {
                showStatus('create-status', 'Error: No QR code to save', 'error');
            }
        }
    } catch (error) {
        console.error('Error saving QR image:', error);
        showStatus('create-status', 'Error saving QR code image', 'error');
    }
}

// QR Code Scanner
function startScanner() {
    if (html5QrcodeScanner) {
        stopScanner();
    }

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrcodeScanner = new Html5QrcodeScanner("scanner-container", config, false);
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
        document.getElementById('scanner-container').innerHTML = '';
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    try {
        // Find the QR code in database
        const qrRecord = await db.qrcodes.where('phone').equals(decodedText).first();
        
        if (qrRecord) {
            // Save scan record
            const now = new Date();
            await db.scans.add({
                name: qrRecord.name,
                phone: qrRecord.phone,
                scan_date: now.toISOString().split('T')[0],
                scan_time: now.toTimeString().split(' ')[0]
            });

            // Show success message
            const resultDiv = document.getElementById('scan-result');
            resultDiv.innerHTML = `
                <h3>Scan Successful!</h3>
                <p><strong>Name:</strong> ${qrRecord.name}</p>
                <p><strong>Phone:</strong> ${qrRecord.phone}</p>
                <p><strong>Scanned at:</strong> ${now.toLocaleString()}</p>
            `;
            resultDiv.style.display = 'block';
            
            showStatus('scan-status', 'QR Code scanned successfully!', 'success');
        } else {
            showStatus('scan-status', 'QR Code not found in database', 'error');
        }
    } catch (error) {
        console.error('Error processing scan:', error);
        showStatus('scan-status', 'Error processing scan', 'error');
    }
}

function onScanFailure(error) {
    // Handle scan failure (usually when no QR code is detected)
    // We don't need to show error for this as it's normal
}

// Reports Functions
async function loadReports() {
    try {
        const filterDate = document.getElementById('filter-date').value;
        const filterName = document.getElementById('filter-name').value.toLowerCase();
        
        let scans = await db.scans.orderBy('scan_date').reverse().toArray();
        
        // Apply filters
        if (filterDate) {
            scans = scans.filter(scan => scan.scan_date === filterDate);
        }
        
        if (filterName) {
            scans = scans.filter(scan => 
                scan.name.toLowerCase().includes(filterName)
            );
        }
        
        // Display results
        const tbody = document.getElementById('report-tbody');
        tbody.innerHTML = '';
        
        if (scans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No scan records found</td></tr>';
        } else {
            scans.forEach(scan => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${scan.name}</td>
                    <td>${scan.phone}</td>
                    <td>${scan.scan_date}</td>
                    <td>${scan.scan_time}</td>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function clearFilters() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-name').value = '';
    loadReports();
}

// Utility Functions
function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    
    // Hide after 5 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize database
    db.open().catch(function(error) {
        console.error('Failed to open database:', error);
    });
    
    // Show create section by default
    showSection('create');
});
