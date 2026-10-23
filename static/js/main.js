/**
 * College Campus Violence Detection & Alert System
 * Main Application Frontend Logic & Real-time Web Notifications
 */

let lastAlertCount = -1;
let audioAlertContext = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("College Surveillance System Client Initialized.");
    startAlertPoller();
});

// Sound Siren Synthesizer using Web Audio API
function playAlertSiren() {
    try {
        if (!audioAlertContext) {
            audioAlertContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const osc = audioAlertContext.createOscillator();
        const gain = audioAlertContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioAlertContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioAlertContext.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.3, audioAlertContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioAlertContext.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(audioAlertContext.destination);

        osc.start();
        osc.stop(audioAlertContext.currentTime + 0.4);
    } catch (e) {
        console.warn("Audio siren auto-play blocked by browser audio policy.");
    }
}

// Poll backend API every 3.5 seconds for instant violence alerts
function startAlertPoller() {
    setInterval(() => {
        fetch('/api/incidents')
            .then(res => {
                if (!res.ok) return null;
                const ct = res.headers.get('content-type');
                if (ct && ct.includes('application/json')) {
                    return res.json();
                }
                return null;
            })
            .then(data => {
                if (!data) return;
                if (data.success && data.incidents) {
                    const activeCount = data.incidents.length;
                    
                    // Update badge indicator
                    const alertBadge = document.getElementById('activeAlertsCount');
                    if (alertBadge) {
                        alertBadge.innerText = activeCount;
                    }

                    // On initial poll load, synchronize count without interrupting user
                    if (lastAlertCount === -1) {
                        lastAlertCount = activeCount;
                        return;
                    }

                    // Only popup modal if a NEW alert was triggered dynamically
                    if (activeCount > lastAlertCount) {
                        const latest = data.incidents[0];
                        const dismissed = JSON.parse(sessionStorage.getItem('dismissedAlerts') || '[]');
                        if (!dismissed.includes(latest.incident_code)) {
                            showInstantAlertModal(latest);
                            playAlertSiren();
                        }
                    }
                    lastAlertCount = activeCount;
                }
            })
            .catch(err => console.error("Alert poller error:", err));
    }, 3500);
}

function showInstantAlertModal(incident) {
    if (document.getElementById('instantAlertModal')) return;

    const modal = document.createElement('div');
    modal.id = 'instantAlertModal';
    modal.className = 'alert-modal-backdrop';
    modal.innerHTML = `
        <div class="alert-modal-box">
            <div style="font-size: 3rem; color: var(--color-danger); margin-bottom: 0.5rem;">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h2 style="color: #fff; margin-bottom: 0.5rem;">HIGH-CONFIDENCE VIOLENCE ALERT</h2>
            <p style="color: var(--color-danger); font-weight: 700; margin-bottom: 1rem;">
                CNN-LSTM AI DETECTED ANOMALY (${incident.confidence_score}%)
            </p>
            
            <div style="background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 8px; text-align: left; font-size: 0.85rem; color: #ddd; margin-bottom: 1.5rem;">
                <p><strong>Incident Code:</strong> ${incident.incident_code}</p>
                <p><strong>Department:</strong> ${incident.department}</p>
                <p><strong>Class Section:</strong> ${incident.class_section}</p>
                <p><strong>Location:</strong> ${incident.location} (Camera ${incident.camera_id})</p>
                <p><strong>Time:</strong> ${incident.timestamp}</p>
            </div>

            <div style="margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden; border: 1px solid var(--color-danger);">
                <img src="${incident.evidence_image}" alt="Evidence Frame" style="width: 100%; display: block;">
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="/incident_history" class="btn btn-danger">
                    <i class="bi bi-shield-check"></i> Review & Acknowledge
                </a>
                <button onclick="dismissAlertModal('${incident.incident_code}')" class="btn btn-secondary">Dismiss</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function dismissAlertModal(incidentCode) {
    if (incidentCode) {
        const dismissed = JSON.parse(sessionStorage.getItem('dismissedAlerts') || '[]');
        if (!dismissed.includes(incidentCode)) {
            dismissed.push(incidentCode);
            sessionStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
        }
    }
    const modal = document.getElementById('instantAlertModal');
    if (modal) modal.remove();
}

// Trigger simulated live violence alert demo
function triggerDemoAlert(cameraId = 'CAM-AIDS01') {
    fetch('/api/trigger_demo_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: cameraId, confidence: 97.4 })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log("Demo alert triggered:", data.incident);
            showInstantAlertModal(data.incident);
            playAlertSiren();
        }
    });
}
