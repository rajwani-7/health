// Emergency Health Assistant - Emergency-First Redesign

class EmergencyHealthAssistant {
    constructor() {
        this.currentLocation = null;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.map = null;
        this.markers = [];
        this.emergencySession = {
            symptom: null,
            isCaretaker: false,
            caretakerData: {},
            triageAnswers: [],
            severity: null
        };
        this.currentQuestionIndex = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.getCurrentLocation();
        this.loadHealthHistory();
    }

    setupEventListeners() {
        // Emergency Button
        document.getElementById('emergencyButton').addEventListener('click', () => {
            this.startEmergencyFlow();
        });

        // Voice Emergency Button
        document.getElementById('voiceEmergencyButton').addEventListener('click', () => {
            this.startVoiceEmergency();
        });

        // Caretaker Toggle
        document.getElementById('caretakerToggle').addEventListener('click', () => {
            this.toggleCaretakerMode();
        });

        // Caretaker Age Slider
        document.getElementById('caretakerAge').addEventListener('input', (e) => {
            document.getElementById('caretakerAgeDisplay').textContent = e.target.value;
        });

        // Consciousness Buttons
        document.querySelectorAll('.consciousness-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.consciousness-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.emergencySession.caretakerData.conscious = btn.dataset.conscious;
            });
        });

        // Caretaker Continue
        document.getElementById('caretakerContinue').addEventListener('click', () => {
            this.emergencySession.isCaretaker = true;
            this.emergencySession.caretakerData.age = document.getElementById('caretakerAge').value;
            this.startEmergencyFlow();
        });

        // Symptom Selection
        document.querySelectorAll('.symptom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const symptom = btn.dataset.symptom;
                if (symptom === 'other') {
                    this.startVoiceEmergency();
                } else {
                    this.selectSymptom(symptom);
                }
            });
        });

        // Voice Modal Controls
        document.getElementById('stopVoiceBtn').addEventListener('click', () => {
            this.stopVoiceRecording();
        });

        document.getElementById('cancelVoiceBtn').addEventListener('click', () => {
            this.cancelVoiceInput();
        });

        // Triage Answer Buttons
        document.querySelectorAll('.triage-answer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.answerTriageQuestion(btn.dataset.answer);
            });
        });

        // Emergency Result Actions
        document.getElementById('callEmergencyBtn').addEventListener('click', () => {
            this.callEmergency();
        });

        document.getElementById('findHospitalsBtn').addEventListener('click', () => {
            this.findNearbyHospitals();
        });

        // Detailed Form Toggle
        document.getElementById('toggleDetailedForm').addEventListener('click', () => {
            this.toggleDetailedForm();
        });

        // Detailed Health Form
        document.getElementById('healthForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitDetailedHealthCheck();
        });

        // Hospital finder from detailed check
        document.getElementById('findHospitals')?.addEventListener('click', () => {
            this.findNearbyHospitals();
        });

        document.getElementById('callEmergency')?.addEventListener('click', () => {
            this.callEmergency();
        });

        // History Toggle
        document.getElementById('toggleHistory').addEventListener('click', () => {
            const content = document.getElementById('historyContent');
            const icon = document.querySelector('#toggleHistory i');
            content.classList.toggle('hidden');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });

        document.getElementById('refreshHistory').addEventListener('click', () => {
            this.loadHealthHistory();
        });
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');
                
                document.getElementById('voiceTranscript').textContent = transcript;
                
                if (event.results[0].isFinal) {
                    this.processVoiceEmergency(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                document.getElementById('voiceStatus').textContent = 'Error: ' + event.error;
            };

            this.recognition.onend = () => {
                // Recognition ended
            };
        }
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
                    this.showNotification('Location access needed for hospital finder', 'warning');
                }
            );
        }
    }

    // ========== EMERGENCY FLOW ==========

    startEmergencyFlow() {
        // Hide all sections
        document.getElementById('emergencyPanicMode').classList.add('hidden');
        document.getElementById('caretakerMode').classList.add('hidden');
        
        // Show symptom selection
        document.getElementById('symptomSelection').classList.remove('hidden');
        document.getElementById('symptomSelection').scrollIntoView({ behavior: 'smooth' });
    }

    toggleCaretakerMode() {
        const mode = document.getElementById('caretakerMode');
        const panic = document.getElementById('emergencyPanicMode');
        
        if (mode.classList.contains('hidden')) {
            panic.classList.add('hidden');
            mode.classList.remove('hidden');
            mode.scrollIntoView({ behavior: 'smooth' });
        } else {
            mode.classList.add('hidden');
            panic.classList.remove('hidden');
            this.emergencySession.isCaretaker = false;
        }
    }

    selectSymptom(symptom) {
        this.emergencySession.symptom = symptom;
        
        // Hide symptom selection
        document.getElementById('symptomSelection').classList.add('hidden');
        
        // Start guided triage
        this.startGuidedTriage(symptom);
    }

    async startGuidedTriage(symptom) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/get_triage_questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symptom, ...this.emergencySession.caretakerData })
            });

            const result = await response.json();
            
            if (result.success) {
                this.triageQuestions = result.questions;
                this.currentQuestionIndex = 0;
                this.showTriageQuestion();
            } else {
                // Fallback: skip to result with basic classification
                this.classifyAndShowResult();
            }
        } catch (error) {
            console.error('Error:', error);
            this.classifyAndShowResult();
        } finally {
            this.showLoading(false);
        }
    }

    showTriageQuestion() {
        if (!this.triageQuestions || this.currentQuestionIndex >= this.triageQuestions.length) {
            this.classifyAndShowResult();
            return;
        }

        const question = this.triageQuestions[this.currentQuestionIndex];
        
        document.getElementById('questionText').textContent = question.text;
        document.getElementById('questionCounter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${this.triageQuestions.length}`;
        
        const progress = ((this.currentQuestionIndex + 1) / this.triageQuestions.length) * 100;
        document.getElementById('questionProgress').style.width = progress + '%';
        
        document.getElementById('triageQuestions').classList.remove('hidden');
        document.getElementById('triageQuestions').scrollIntoView({ behavior: 'smooth' });
    }

    answerTriageQuestion(answer) {
        this.emergencySession.triageAnswers.push({
            question: this.triageQuestions[this.currentQuestionIndex].text,
            answer: answer
        });

        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.triageQuestions.length) {
            this.showTriageQuestion();
        } else {
            this.classifyAndShowResult();
        }
    }

    async classifyAndShowResult() {
        document.getElementById('triageQuestions').classList.add('hidden');
        this.showLoading(true);

        try {
            const response = await fetch('/classify_emergency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.emergencySession)
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayEmergencyResult(result);
            } else {
                this.showNotification('Error classifying emergency', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Network error', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayEmergencyResult(result) {
        const severityBadge = document.getElementById('severityBadge');
        const instructionsList = document.getElementById('instructionsList');

        // Set severity badge
        severityBadge.className = 'inline-block px-12 py-6 rounded-2xl text-3xl font-black mb-4';
        
        if (result.severity === 'emergency') {
            severityBadge.className += ' bg-red-600 text-white';
            severityBadge.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>🔴 EMERGENCY';
            this.speak('This is an emergency. Follow the instructions carefully.');
        } else if (result.severity === 'warning') {
            severityBadge.className += ' bg-yellow-500 text-white';
            severityBadge.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>🟡 NEEDS ATTENTION';
            this.speak('This needs attention. Follow the instructions.');
        } else {
            severityBadge.className += ' bg-green-600 text-white';
            severityBadge.innerHTML = '<i class="fas fa-check-circle mr-2"></i>🟢 STABLE';
            this.speak('Situation appears stable.');
        }

        // Display instructions
        instructionsList.innerHTML = '';
        result.instructions.forEach((instruction, index) => {
            const item = document.createElement('div');
            item.className = 'bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg';
            item.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        ${index + 1}
                    </div>
                    <p class="text-lg font-semibold text-gray-900">${instruction}</p>
                </div>
            `;
            instructionsList.appendChild(item);
        });

        document.getElementById('emergencyResult').classList.remove('hidden');
        document.getElementById('emergencyResult').scrollIntoView({ behavior: 'smooth' });
    }

    // ========== VOICE INPUT ==========

    startVoiceEmergency() {
        if (!this.recognition) {
            this.showNotification('Voice input not supported on this browser', 'error');
            return;
        }

        document.getElementById('voiceModal').classList.remove('hidden');
        document.getElementById('voiceTranscript').textContent = '';
        document.getElementById('voiceStatus').textContent = 'Listening...';
        
        this.recognition.start();
    }

    stopVoiceRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    cancelVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }
        document.getElementById('voiceModal').classList.add('hidden');
    }

    processVoiceEmergency(transcript) {
        document.getElementById('voiceStatus').textContent = 'Processing...';
        
        // Simple NLP: Extract keywords
        const text = transcript.toLowerCase();
        let detectedSymptom = 'other';

        const keywords = {
            chest_pain: ['chest pain', 'heart pain', 'chest hurt', 'chest pressure'],
            breathing: ['breath', 'breathing', 'cant breathe', 'difficulty breathing', 'shortness of breath'],
            fever: ['fever', 'temperature', 'hot', 'burning up'],
            accident: ['accident', 'injury', 'hurt', 'fell', 'crash', 'bleeding'],
            unconscious: ['unconscious', 'passed out', 'not responding', 'unresponsive', 'fainted']
        };

        for (const [symptom, terms] of Object.entries(keywords)) {
            if (terms.some(term => text.includes(term))) {
                detectedSymptom = symptom;
                break;
            }
        }

        document.getElementById('voiceModal').classList.add('hidden');
        this.selectSymptom(detectedSymptom);
    }

    // ========== HOSPITALS & EMERGENCY ==========

    async findNearbyHospitals() {
        if (!this.currentLocation) {
            this.showNotification('Location not available. Please enable location services.', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/find_hospitals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: this.currentLocation.latitude,
                    longitude: this.currentLocation.longitude
                })
            });

            const result = await response.json();
            console.log('Hospital API Response:', result);

            if (result.success) {
                console.log('Hospitals found:', result.hospitals.length);
                this.initializeMap();
                this.displayHospitals(result.hospitals);
            } else {
                this.showNotification('Error finding hospitals: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error finding hospitals:', error);
            this.showNotification('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    initializeMap() {
        const hospitalsSection = document.getElementById('hospitalsSection');
        hospitalsSection.classList.remove('hidden');
        
        if (!this.map) {
            // Wait for the map container to be visible
            setTimeout(() => {
                this.map = L.map('map').setView([this.currentLocation.latitude, this.currentLocation.longitude], 14);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(this.map);

                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([this.currentLocation.latitude, this.currentLocation.longitude], { icon: userIcon })
                    .addTo(this.map)
                    .bindPopup('<b>Your Location</b>');
                
                // Force map to recalculate size after initialization
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            }, 100);
        } else {
            this.clearHospitalMarkers();
            this.map.setView([this.currentLocation.latitude, this.currentLocation.longitude], 14);
            // Force map to recalculate size
            this.map.invalidateSize();
        }
    }

    clearHospitalMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    displayHospitals(hospitals) {
        const hospitalsSection = document.getElementById('hospitalsSection');
        const hospitalsList = document.getElementById('hospitalsList');

        console.log('displayHospitals called with:', hospitals);
        console.log('Map object exists:', !!this.map);

        // Wait for map to be initialized
        const addHospitalsToMap = () => {
            if (!this.map) {
                setTimeout(addHospitalsToMap, 100);
                return;
            }

            this.clearHospitalMarkers();
            hospitalsList.innerHTML = '';

            if (hospitals.length === 0) {
                hospitalsList.innerHTML = '<p class="text-gray-600 text-center py-8">No hospitals found nearby. Try increasing location permissions or check your connection.</p>';
                hospitalsSection.classList.remove('hidden');
                hospitalsSection.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            hospitals.forEach((hospital, index) => {
                console.log(`Hospital ${index + 1}:`, hospital);
                
                // Use REAL coordinates from API response
                const lat = hospital.lat || (this.currentLocation.latitude + (Math.random() - 0.5) * 0.02);
                const lng = hospital.lon || (this.currentLocation.longitude + (Math.random() - 0.5) * 0.02);
                
                console.log(`Hospital ${index + 1} coordinates: lat=${lat}, lng=${lng}`);

                const hospitalIcon = L.divIcon({
                    className: 'hospital-marker',
                    html: `<div style="background: #EF4444; color: white; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(239, 68, 68, 0.5); display: flex; align-items: center; justify-content: center; font-weight: bold;">${index + 1}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                console.log(`Adding marker for hospital ${index + 1} at [${lat}, ${lng}]`);

                const marker = L.marker([lat, lng], { icon: hospitalIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div class="hospital-popup">
                            <h4 style="font-weight: bold; margin-bottom: 8px;">${hospital.name}</h4>
                            <p style="margin-bottom: 4px; font-size: 14px;">${hospital.address}</p>
                            <p style="margin-bottom: 8px; font-size: 14px;"><i class="fas fa-phone"></i> ${hospital.phone}</p>
                            ${hospital.amenity ? `<p style="font-size: 12px; color: #666;">Type: ${hospital.amenity}</p>` : ''}
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <a href="tel:${hospital.phone}" style="background: #3B82F6; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px;">
                                    <i class="fas fa-phone"></i> Call
                                </a>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="background: #10B981; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px;">
                                    <i class="fas fa-directions"></i> Directions
                                </a>
                            </div>
                        </div>
                    `);

                this.markers.push(marker);
                console.log(`Marker added. Total markers: ${this.markers.length}`);

                const hospitalCard = document.createElement('div');
                hospitalCard.className = 'hospital-card bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all cursor-pointer';
                hospitalCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex items-start space-x-3 flex-1">
                            <div class="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                                ${index + 1}
                            </div>
                            <div class="flex-1">
                                <h4 class="text-xl font-bold text-gray-900 mb-2">${hospital.name}</h4>
                                <p class="text-gray-600 mb-3 text-sm">${hospital.address}</p>
                                <div class="flex flex-wrap items-center gap-3 text-sm">
                                    <span class="text-gray-500"><i class="fas fa-phone mr-1"></i>${hospital.phone}</span>
                                    ${hospital.rating ? `<span class="text-gray-500"><i class="fas fa-star text-yellow-500 mr-1"></i>${hospital.rating}</span>` : ''}
                                    <span class="font-semibold text-blue-600"><i class="fas fa-map-marker-alt mr-1"></i>${hospital.distance}</span>
                                    ${hospital.is_open === true ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold inline-flex items-center"><i class="fas fa-circle text-green-500 mr-1 text-xs"></i>OPEN</span>' : hospital.is_open === false ? '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold inline-flex items-center"><i class="fas fa-circle text-red-500 mr-1 text-xs"></i>CLOSED</span>' : '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Hours Unknown</span>'}
                                    ${hospital.emergency && hospital.emergency !== 'unknown' ? `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">24/7 Emergency</span>` : ''}
                                </div>
                                ${hospital.opening_hours ? `<p class="text-xs text-gray-500 mt-2"><i class="fas fa-clock mr-1"></i>Hours: ${hospital.opening_hours}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col space-y-3 ml-4">
                            <a href="tel:${hospital.phone}" 
                               class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition duration-200 text-center font-bold">
                                <i class="fas fa-phone mr-1"></i>Call
                            </a>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank"
                               class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition duration-200 text-center font-bold">
                                <i class="fas fa-directions mr-1"></i>Go
                            </a>
                        </div>
                    </div>
                `;

                hospitalCard.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'A') {
                        marker.openPopup();
                        this.map.setView([lat, lng], 15);
                    }
                });

                hospitalsList.appendChild(hospitalCard);
            });

            if (this.markers.length > 0) {
                console.log('Fitting map bounds to markers...');
                // Add user location marker to the bounds calculation
                const userMarker = L.marker([this.currentLocation.latitude, this.currentLocation.longitude]);
                const group = new L.featureGroup([userMarker, ...this.markers]);
                this.map.fitBounds(group.getBounds().pad(0.15), {
                    maxZoom: 14  // Prevent zooming out too far
                });
                
                // Force map refresh after fitting bounds
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            }

            hospitalsSection.classList.remove('hidden');
            hospitalsSection.scrollIntoView({ behavior: 'smooth' });
            
            this.speak(`Found ${hospitals.length} ${hospitals.length === 1 ? 'hospital' : 'hospitals'} near you.`);
        };

        addHospitalsToMap();
    }

    callEmergency() {
        const emergencyNumber = '112'; // Or local emergency number
        if (confirm(`This will call ${emergencyNumber}. Continue?`)) {
            window.location.href = `tel:${emergencyNumber}`;
        }
    }

    // ========== DETAILED HEALTH CHECK ==========

    toggleDetailedForm() {
        const form = document.getElementById('detailedHealthForm');
        const btn = document.getElementById('toggleDetailedForm');
        
        if (form.classList.contains('hidden')) {
            form.classList.remove('hidden');
            btn.innerHTML = '<i class="fas fa-chevron-up mr-2"></i>Hide Detailed Form';
        } else {
            form.classList.add('hidden');
            btn.innerHTML = '<i class="fas fa-chevron-down mr-2"></i>Show Detailed Form';
        }
    }

    async submitDetailedHealthCheck() {
        const formData = new FormData(document.getElementById('healthForm'));
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value ? (isNaN(value) ? value : parseFloat(value)) : 0;
        }

        if (!data.age || !data.temperature || !data.heart_rate) {
            this.showNotification('Please fill in at least Age, Temperature, and Heart Rate', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/check_health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.displayDetailedResults(result);
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

    displayDetailedResults(result) {
        const resultsSection = document.getElementById('resultsSection');
        const scoreCircle = document.getElementById('scoreCircle');
        const scoreValue = document.getElementById('scoreValue');
        const statusText = document.getElementById('statusText');
        const statusDescription = document.getElementById('statusDescription');
        const adviceList = document.getElementById('adviceList');
        const emergencySection = document.getElementById('emergencySection');

        scoreValue.textContent = result.score;
        statusText.textContent = result.status;
        
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

        if (result.status === 'Emergency') {
            emergencySection.classList.remove('hidden');
        } else {
            emergencySection.classList.add('hidden');
        }

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        this.loadHealthHistory();
    }

    // ========== HISTORY ==========

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
            historyList.innerHTML = '<p class="text-gray-600 text-center py-4">No health check history available.</p>';
            return;
        }

        historyList.innerHTML = '';

        history.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item bg-gray-50 rounded-lg p-4 border-l-4';
            
            const statusClass = record.status.toLowerCase();
            const date = new Date(record.date).toLocaleString();
            
            if (statusClass === 'stable') {
                historyItem.style.borderColor = '#10b981';
            } else if (statusClass === 'monitor') {
                historyItem.style.borderColor = '#f59e0b';
            } else {
                historyItem.style.borderColor = '#ef4444';
            }
            
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

    // ========== UTILITIES ==========

    speak(text) {
        if (this.synthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            this.synthesis.speak(utterance);
        }
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
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-6 rounded-xl shadow-2xl transition-all duration-300 transform translate-x-full max-w-md`;
        
        const colors = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-blue-600 text-white',
            warning: 'bg-yellow-600 text-white'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} text-2xl"></i>
                <span class="font-semibold text-lg">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new EmergencyHealthAssistant();
    window.emergencyAssistant = app;
});
