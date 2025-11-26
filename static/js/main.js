// Emergency Health Assistant - Main JavaScript

class HealthAssistant {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isDarkMode = false;
        this.currentLocation = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.loadHealthHistory();
        this.getCurrentLocation();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('healthForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitHealthCheck();
        });

        // Voice toggle
        document.getElementById('voiceToggle').addEventListener('click', () => {
            this.toggleVoiceSection();
        });

        // Voice recording controls
        document.getElementById('startRecording').addEventListener('click', () => {
            this.startVoiceRecording();
        });

        document.getElementById('stopRecording').addEventListener('click', () => {
            this.stopVoiceRecording();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Emergency actions
        document.getElementById('findHospitals').addEventListener('click', () => {
            this.findNearbyHospitals();
        });

        document.getElementById('callEmergency').addEventListener('click', () => {
            this.callEmergencyServices();
        });

        // Refresh history
        document.getElementById('refreshHistory').addEventListener('click', () => {
            this.loadHealthHistory();
        });
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateVoiceStatus('Listening... Speak your health details');
                document.getElementById('startRecording').disabled = true;
                document.getElementById('stopRecording').disabled = false;
                document.getElementById('startRecording').classList.add('voice-recording');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.processVoiceInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateVoiceStatus('Error: ' + event.error);
                this.stopVoiceRecording();
            };

            this.recognition.onend = () => {
                this.stopVoiceRecording();
            };
        } else {
            console.warn('Speech recognition not supported');
            document.getElementById('voiceToggle').style.display = 'none';
        }
    }

    toggleVoiceSection() {
        const voiceSection = document.getElementById('voiceSection');
        const isHidden = voiceSection.classList.contains('hidden');
        
        if (isHidden) {
            voiceSection.classList.remove('hidden');
            this.speak('Voice input activated. Click start recording to begin.');
        } else {
            voiceSection.classList.add('hidden');
        }
    }

    startVoiceRecording() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    stopVoiceRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
        
        this.isRecording = false;
        document.getElementById('startRecording').disabled = false;
        document.getElementById('stopRecording').disabled = true;
        document.getElementById('startRecording').classList.remove('voice-recording');
        this.updateVoiceStatus('Voice recording stopped');
    }

    processVoiceInput(transcript) {
        this.updateVoiceStatus(`Recognized: "${transcript}"`);
        
        // Simple voice input processing
        const words = transcript.toLowerCase().split(' ');
        
        // Extract numbers and map to fields
        const numbers = transcript.match(/\d+(?:\.\d+)?/g);
        if (numbers) {
            const numValues = numbers.map(n => parseFloat(n));
            
            // Try to map numbers to appropriate fields based on context
            if (words.includes('temperature') || words.includes('temp')) {
                document.getElementById('temperature').value = numValues[0] || '';
            }
            if (words.includes('heart') || words.includes('pulse')) {
                document.getElementById('heart_rate').value = numValues[0] || '';
            }
            if (words.includes('pressure') || words.includes('bp')) {
                if (numValues.length >= 2) {
                    document.getElementById('bp_sys').value = numValues[0] || '';
                    document.getElementById('bp_dia').value = numValues[1] || '';
                }
            }
            if (words.includes('oxygen') || words.includes('spo2')) {
                document.getElementById('spo2').value = numValues[0] || '';
            }
            if (words.includes('age')) {
                document.getElementById('age').value = numValues[0] || '';
            }
        }
        
        // Extract symptoms
        const symptomKeywords = ['headache', 'fever', 'dizziness', 'nausea', 'pain', 'cough', 'fatigue'];
        const foundSymptoms = symptomKeywords.filter(symptom => 
            words.some(word => word.includes(symptom))
        );
        
        if (foundSymptoms.length > 0) {
            document.getElementById('symptoms').value = foundSymptoms.join(', ');
        }
        
        this.speak('Voice input processed. Please review the form and submit.');
    }

    updateVoiceStatus(message) {
        document.getElementById('voiceStatus').textContent = message;
    }

    speak(text) {
        if (this.synthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            this.synthesis.speak(utterance);
        }
    }

    async submitHealthCheck() {
        const formData = new FormData(document.getElementById('healthForm'));
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value ? (isNaN(value) ? value : parseFloat(value)) : 0;
        }

        // Validate required fields
        if (!data.age || !data.temperature || !data.heart_rate) {
            this.showNotification('Please fill in at least Age, Temperature, and Heart Rate', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/check_health', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.displayResults(result);
                this.speak(`Health analysis complete. Your status is ${result.status}. Score: ${result.score}`);
            } else {
                this.showNotification('Error analyzing health data: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(result) {
        const resultsSection = document.getElementById('resultsSection');
        const scoreCircle = document.getElementById('scoreCircle');
        const scoreValue = document.getElementById('scoreValue');
        const statusText = document.getElementById('statusText');
        const statusDescription = document.getElementById('statusDescription');
        const adviceList = document.getElementById('adviceList');
        const emergencySection = document.getElementById('emergencySection');

        // Update score display
        scoreValue.textContent = result.score;
        statusText.textContent = result.status;
        
        // Set status-specific styling
        scoreCircle.className = 'inline-flex items-center justify-center w-32 h-32 rounded-full text-white text-4xl font-bold mb-4 score-circle';
        
        if (result.status === 'Stable') {
            scoreCircle.classList.add('status-stable');
            statusDescription.textContent = 'Your vital signs are within normal ranges.';
        } else if (result.status === 'Monitor') {
            scoreCircle.classList.add('status-monitor');
            statusDescription.textContent = 'Your condition requires monitoring.';
        } else {
            scoreCircle.classList.add('status-emergency');
            statusDescription.textContent = 'Immediate medical attention required!';
        }

        // Display advice
        adviceList.innerHTML = '';
        result.advice.forEach(advice => {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-2';
            li.innerHTML = `
                <i class="fas fa-check-circle text-green-500 mt-1"></i>
                <span>${advice}</span>
            `;
            adviceList.appendChild(li);
        });

        // Show emergency section if needed
        if (result.status === 'Emergency') {
            emergencySection.classList.remove('hidden');
        } else {
            emergencySection.classList.add('hidden');
        }

        // Show results
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Refresh history
        this.loadHealthHistory();
    }

    async findNearbyHospitals() {
        if (!this.currentLocation) {
            this.showNotification('Location not available. Please enable location services.', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/find_hospitals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: this.currentLocation.latitude,
                    longitude: this.currentLocation.longitude
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayHospitals(result.hospitals);
            } else {
                this.showNotification('Error finding hospitals: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayHospitals(hospitals) {
        const hospitalsSection = document.getElementById('hospitalsSection');
        const hospitalsList = document.getElementById('hospitalsList');

        hospitalsList.innerHTML = '';

        if (hospitals.length === 0) {
            hospitalsList.innerHTML = '<p class="text-gray-600 text-center">No hospitals found nearby.</p>';
        } else {
            hospitals.forEach(hospital => {
                const hospitalCard = document.createElement('div');
                hospitalCard.className = 'hospital-card bg-white border border-gray-200 rounded-lg p-4';
                hospitalCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-gray-900 mb-2">${hospital.name}</h4>
                            <p class="text-gray-600 mb-2">${hospital.address}</p>
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                <span><i class="fas fa-phone mr-1"></i>${hospital.phone}</span>
                                <span><i class="fas fa-star mr-1"></i>${hospital.rating || 'N/A'}</span>
                                <span><i class="fas fa-map-marker-alt mr-1"></i>${hospital.distance || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <button onclick="window.open('tel:${hospital.phone}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
                                <i class="fas fa-phone mr-1"></i>Call
                            </button>
                            <button onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(hospital.address)}')" 
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200">
                                <i class="fas fa-directions mr-1"></i>Directions
                            </button>
                        </div>
                    </div>
                `;
                hospitalsList.appendChild(hospitalCard);
            });
        }

        hospitalsSection.classList.remove('hidden');
        hospitalsSection.scrollIntoView({ behavior: 'smooth' });
    }

    callEmergencyServices() {
        // In a real application, this would integrate with emergency services
        this.showNotification('Emergency services would be called. In a real app, this would dial 911.', 'info');
        this.speak('Emergency services contacted. Help is on the way.');
    }

    async loadHealthHistory() {
        try {
            const response = await fetch('/health_history');
            const result = await response.json();

            if (result.success) {
                this.displayHealthHistory(result.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    displayHealthHistory(history) {
        const historyList = document.getElementById('historyList');

        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-gray-600 text-center">No health check history available.</p>';
            return;
        }

        historyList.innerHTML = '';

        history.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item bg-gray-50 rounded-lg p-4';
            
            const statusClass = record.status.toLowerCase();
            const date = new Date(record.date).toLocaleString();
            
            historyItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <span class="status-badge ${statusClass}">${record.status}</span>
                            <span class="text-sm text-gray-500">${date}</span>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><strong>Score:</strong> ${record.score}</div>
                            <div><strong>Temp:</strong> ${record.temperature}°C</div>
                            <div><strong>HR:</strong> ${record.heart_rate} BPM</div>
                            <div><strong>SpO2:</strong> ${record.spo2}%</div>
                        </div>
                        ${record.symptoms ? `<div class="mt-2 text-sm text-gray-600"><strong>Symptoms:</strong> ${record.symptoms}</div>` : ''}
                    </div>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                }
            );
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        
        // Save theme preference
        localStorage.setItem('darkMode', this.isDarkMode);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
            warning: 'bg-yellow-500 text-black'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new HealthAssistant();
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        app.toggleTheme();
    }
    
    // Make app globally available for debugging
    window.healthAssistant = app;
});
