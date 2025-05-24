// Initialize Database with enhanced structure
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
    } else if (sectionName === 'qrlist') {
        document.querySelector('.qrlist-btn').classList.add('active');
        loadAllQRCodes();
    }
}

// Clear previous QR code display
function clearPreviousQR() {
    const qrResult = document.getElementById('qr-result');
    const canvas = document.getElementById('qr-canvas');
    const existingImg = canvas.parentNode.querySelector('img');
    
    // Hide the result section
    qrResult.style.display = 'none';
    
    // Clear canvas
    if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Remove any existing fallback image
    if (existingImg && existingImg !== canvas) {
        existingImg.remove();
    }
    
    // Reset canvas display
    canvas.style.display = 'block';
}

// QR Code Generation
async function generateQR() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!name || !phone) {
        showStatus('create-status', 'Please fill in both name and phone number', 'error');
        return;
    }

    // Clear any previous QR code first
    clearPreviousQR();

    try {
        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            generateQRFallback(name, phone);
            return;
        }

        // Generate QR code with phone number - BLACK COLOR
        const canvas = document.getElementById('qr-canvas');
        await QRCode.toCanvas(canvas, phone, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',  // Changed to black
                light: '#FFFFFF'
            }
        });

        // Draw name below QR code
        const ctx = canvas.getContext('2d');
        ctx.font = '20px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(name, canvas.width / 2, canvas.height - 10); // 10px from bottom

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

// Fallback QR Generation using QR Server API - BLACK COLOR
async function generateQRFallback(name, phone) {
    try {
        console.log('Using fallback QR generation method');
        
        // Create QR code using QR Server API with black color
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(phone)}&color=000000&bgcolor=FFFFFF`;
        
        // Create image element
        const qrContainer = document.getElementById('qr-result');
        const canvas = document.getElementById('qr-canvas');
        const img = document.createElement('img');
        img.src = qrUrl;
        img.style.border = '3px solid #000000';
        img.style.borderRadius = '10px';
        img.style.margin = '20px 0';
        img.id = 'qr-fallback-img';
        
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

// Save QR Image with proper filename
function saveQRImage() {
    const canvas = document.getElementById('qr-canvas');
    const name = document.getElementById('qr-name').textContent;
    
    if (!name) {
        showStatus('create-status', 'Error: No QR code to save', 'error');
        return;
    }
    
    try {
        // Clean filename (remove special characters)
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${cleanName}.png`;
        
        if (canvas.style.display !== 'none' && canvas.getContext) {
            // Always redraw the name on the canvas before saving
            const ctx = canvas.getContext('2d');
            // Redraw QR code (optional, but ensures name is on image)
            // ctx.clearRect(0, 0, canvas.width, canvas.height); // Don't clear, just draw name again
            ctx.font = '20px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(name, canvas.width / 2, canvas.height - 10); // 10px from bottom

            // Save canvas as image
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showStatus('create-status', `QR code saved as ${filename}`, 'success');
                
                // Clear the QR display after saving
                setTimeout(() => {
                    clearPreviousQR();
                }, 1000);
            }, 'image/png');
        } else {
            // Save image element (fallback method)
            const img = document.getElementById('qr-fallback-img');
            if (img) {
                // Convert image to canvas for download
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                tempCanvas.width = 300;
                tempCanvas.height = 340; // Extra space for name
                
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.onload = function() {
                    ctx.drawImage(tempImg, 0, 0, 300, 300);
                    // Draw name below QR
                    ctx.font = '20px Arial';
                    ctx.fillStyle = '#333';
                    ctx.textAlign = 'center';
                    ctx.fillText(name, 150, 330); // 30px below QR
                    tempCanvas.toBlob(function(blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = filename;
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        
                        showStatus('create-status', `QR code saved as ${filename}`, 'success');
                        
                        // Clear the QR display after saving
                        setTimeout(() => {
                            clearPreviousQR();
                        }, 1000);
                    }, 'image/png');
                };
                tempImg.src = img.src;
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

// Check if already scanned today
async function checkTodaysScan(phone) {
    const today = new Date().toISOString().split('T')[0];
    const todaysScan = await db.scans
        .where('phone').equals(phone)
        .and(scan => scan.scan_date === today)
        .first();
    
    return todaysScan !== undefined;
}

async function onScanSuccess(decodedText, decodedResult) {
    try {
        // Find the QR code in database
        const qrRecord = await db.qrcodes.where('phone').equals(decodedText).first();
        
        if (qrRecord) {
            // Check if already scanned today
            const alreadyScannedToday = await checkTodaysScan(decodedText);
            
            if (alreadyScannedToday) {
                // Show already scanned message
                const resultDiv = document.getElementById('scan-result');
                resultDiv.innerHTML = `
                    <h3>Already Scanned Today!</h3>
                    <p><strong>Name:</strong> ${qrRecord.name}</p>
                    <p><strong>Phone:</strong> ${qrRecord.phone}</p>
                    <p><strong>Status:</strong> This QR code has already been scanned today. Please try again tomorrow.</p>
                `;
                resultDiv.style.display = 'block';
                resultDiv.className = 'scanner-result already-scanned';
                
                showStatus('scan-status', 'QR Code already scanned today!', 'error');
                
                // Stop scanner after showing message
                setTimeout(() => {
                    stopScanner();
                }, 2000);
                
                return;
            }
            
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
            resultDiv.className = 'scanner-result success';
            
            showStatus('scan-status', 'QR Code scanned successfully!', 'success');
            
            // Stop scanner after successful scan
            setTimeout(() => {
                stopScanner();
            }, 2000);
            
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
        
        // Show total count
        const countDiv = document.getElementById('scan-count');
        if (countDiv) {
            countDiv.textContent = `Total scans: ${scans.length}`;
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

// Export data function for backup
async function exportData() {
    try {
        const qrcodes = await db.qrcodes.toArray();
        const scans = await db.scans.toArray();
        
        const data = {
            qrcodes: qrcodes,
            scans: scans,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `qr_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatus('create-status', 'Data exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showStatus('create-status', 'Error exporting data', 'error');
    }
}

// Import data from JSON file
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Clear existing data before importing
        await db.qrcodes.clear();
        await db.scans.clear();

        if (Array.isArray(data.qrcodes)) {
            for (const qr of data.qrcodes) {
                await db.qrcodes.add(qr);
            }
        }
        if (Array.isArray(data.scans)) {
            for (const scan of data.scans) {
                await db.scans.add(scan);
            }
        }
        showStatus('create-status', 'Data imported successfully! (Old data cleared)', 'success');
        loadReports();
    } catch (error) {
        showStatus('create-status', 'Error importing data', 'error');
    }
}

// Clear input fields when switching to create section
function clearCreateForm() {
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    clearPreviousQR();
}

// Add event listeners to form inputs to clear QR when typing
function setupFormListeners() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    
    nameInput.addEventListener('input', clearPreviousQR);
    phoneInput.addEventListener('input', clearPreviousQR);
}

// Utility Functions
function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

// Database sync function (for future cloud integration)
async function syncDatabase() {
    // This function can be extended to sync with a cloud database
    // For now, it just ensures the local database is open
    try {
        await db.open();
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Database sync failed:', error);
    }
}

function exportReportsToExcel() {
    const rows = [['Name', 'Phone', 'Scan Date', 'Scan Time']];
    const tbody = document.getElementById('report-tbody');
    for (const tr of tbody.querySelectorAll('tr')) {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
        if (cells.length) rows.push(cells);
    }
    if (rows.length === 1) {
        showStatus('create-status', 'No data to export', 'error');
        return;
    }
    const csvContent = rows.map(e => e.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan_reports_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus('create-status', 'Reports exported as Excel (CSV) file!', 'success');
}

// Load and display all QR codes in a table
async function loadAllQRCodes() {
    const tbody = document.getElementById('qrlist-tbody');
    tbody.innerHTML = '';
    try {
        const qrcodes = await db.qrcodes.toArray();
        if (qrcodes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No QR codes found</td></tr>';
            return;
        }
        for (const qr of qrcodes) {
            const row = document.createElement('tr');
            // Generate QR image as data URL
            let qrImgHtml = '';
            if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
                try {
                    const dataUrl = await QRCode.toDataURL(qr.phone, { width: 80, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
                    qrImgHtml = `<img src="${dataUrl}" alt="QR" style="width:80px;height:80px;">`;
                } catch (e) {
                    qrImgHtml = '<span>QR Error</span>';
                }
            } else {
                qrImgHtml = '<span>QR Lib Missing</span>';
            }
            row.innerHTML = `
                <td>${qr.name}</td>
                <td>${qr.phone}</td>
                <td>${qr.created_date || ''}</td>
                <td>${qrImgHtml}</td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Error loading QR codes</td></tr>';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize database
    db.open().then(() => {
        console.log('Database opened successfully');
        // Sync database periodically
        setInterval(syncDatabase, 30000); // Sync every 30 seconds
    }).catch(function(error) {
        console.error('Failed to open database:', error);
    });
    
    // Setup form listeners
    setupFormListeners();
    
    // Show create section by default
    showSection('create');
    
    // Add service worker for offline support (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });
    }
});
