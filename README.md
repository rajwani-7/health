# 🚨 Emergency Health Assistant

**Emergency-First. Human-Centered. Real-World Ready.**

An intelligent health assistant designed for **panic situations**, not calm users. Built for people who need immediate help, not forms to fill.

---

## 🎯 Design Philosophy

### **Emergency ≠ Data Entry**

Traditional health apps fail in emergencies because they ask people in crisis to fill long forms. Our app is built on these core principles:

1. **One-tap help is more important than accuracy**
   - Giant "I NEED HELP NOW" button as the primary interface
   - No login, no signup, no barriers

2. **Voice > Typing**
   - Speak symptoms naturally
   - Simple keyword extraction, no complex NLP needed
   - Works even with partial information

3. **Instructions > Scores**
   - Clear, numbered steps to follow
   - No medical jargon or confusing scores
   - Red/Yellow/Green severity indicators only

4. **Progressive questions, not long forms**
   - Maximum 3 yes/no questions
   - Large, touch-friendly buttons
   - Skip to action if answers indicate emergency

---

## ✨ Features

### 1️⃣ **Emergency Panic Mode** (PRIMARY)

The main interface is a large, pulsing red button:

```
🚨 I NEED HELP NOW
Tap here for immediate assistance
```

**Flow:**
1. User taps button
2. System auto-detects location
3. Shows symptom options (6 large buttons):
   - Chest Pain
   - Breathing Problem  
   - High Fever
   - Accident / Injury
   - Unconscious
   - Other (voice)

### 2️⃣ **Voice-First Interaction**

Alternative to button selection:

```
🎤 Speak Your Emergency
Tell us what's happening
```

- Extracts keywords from natural speech
- Recognizes: "My father fainted" → **Unconscious**
- Recognizes: "Can't breathe" → **Breathing Problem**
- Works offline (browser speech API)

### 3️⃣ **Guided Triage** (Max 3 Questions)

Progressive yes/no questions based on symptom:

**Example (Chest Pain):**
- Pain spreading to left arm? **YES / NO**
- Trouble breathing? **YES / NO**
- Sweating or nauseous? **YES / NO**

Large buttons, high contrast, mobile-friendly.

### 4️⃣ **Emergency Instructions Engine**

Shows clear, actionable steps:

```
DO THIS NOW:
✓ Call 112 immediately
✓ Have person sit down and rest  
✓ Loosen tight clothing
✓ Give aspirin if available
✓ Do NOT give food or water
```

Plus action buttons:
- 📞 **Call Emergency** - Direct dial to 112
- 🏥 **Find Hospitals** - Map with nearby locations

### 5️⃣ **Caretaker Mode**

For helping someone else:

```
👨‍⚕️ Helping Someone Else
```

Minimal inputs:
- Age (slider)
- Conscious? (Yes/No)
- Main problem (button selection)

### 6️⃣ **Hospital Finder with Map**

- Interactive map showing:
  - 🔵 Your location
  - 🔴 Numbered hospital markers
- Click hospital → See details
- One-tap: **Call** or **Get Directions**

### 7️⃣ **Optional Detailed Health Check**

Moved to secondary section (non-emergency):

```
⚠️ NON-EMERGENCY ONLY
Optional Detailed Health Check
```

- Collapsed by default
- For routine checkups when you have:
  - Time
  - Medical equipment (thermometer, BP monitor)
  - No immediate danger

---

## 🧱 Technical Architecture

### Frontend
- **Vanilla JavaScript** (no framework overhead - faster loading)
- **Tailwind CSS** (rapid UI development)
- **Leaflet.js** (free map with OpenStreetMap)
- **Web Speech API** (voice recognition)
- **Browser Geolocation API**

### Backend
- **Flask** (Python web framework)
- **SQLite** (simple database for history)
- **REST API** endpoints

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /` | Main page |
| `POST /get_triage_questions` | Get 3 yes/no questions for symptom |
| `POST /classify_emergency` | Determine severity & instructions |
| `POST /find_hospitals` | Get nearby hospitals with lat/lng |
| `POST /check_health` | Detailed vital analysis (optional) |
| `GET /health_history` | Previous checkups |

---

## 🚀 Quick Start

### Prerequisites
```bash
Python 3.8+
pip
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rajwani-7/health.git
   cd health_check_up
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize database**
   ```bash
   python app.py
   ```
   Database will be created automatically on first run.

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

---

## 📱 Usage Examples

### Scenario 1: Emergency (Chest Pain)

1. User taps: **🚨 I NEED HELP NOW**
2. Selects: **Chest Pain** 
3. System asks:
   - "Pain spreading to left arm?" → **YES**
   - (Stops immediately - recognizes heart attack)
4. Shows:
   ```
   🔴 EMERGENCY
   
   DO THIS NOW:
   1. Call 112 immediately
   2. Sit down and rest
   3. Loosen clothing
   4. Give aspirin if available
   
   [📞 Call Emergency] [🏥 Find Hospitals]
   ```

### Scenario 2: Caretaker Mode

1. Clicks: **👨‍⚕️ Helping Someone Else**
2. Sets age: **70**
3. Conscious? **NO**
4. (System automatically classifies as EMERGENCY)
5. Shows unconscious protocol:
   ```
   🔴 EMERGENCY
   
   DO THIS NOW:
   1. Call 112 IMMEDIATELY
   2. Check if breathing
   3. Place in recovery position
   4. Do NOT move if injury suspected
   ```

### Scenario 3: Voice Input

1. Taps: **🎤 Speak Your Emergency**
2. Says: "My mother is having trouble breathing"
3. System extracts: **Breathing Problem**
4. Proceeds to guided triage...

---

## 🎨 UI/UX Decisions

### Why These Choices?

| Design Choice | Reason |
|--------------|--------|
| Giant red button | Panic users need obvious action |
| Max 3 questions | Attention span in crisis is ~30 seconds |
| Yes/No only | No cognitive load to type or choose from many options |
| Voice alternative | Hands may be shaking, easier to speak |
| Icons + Text | Universal understanding, works across languages (future) |
| High contrast | Readable in low light or with adrenaline-blurred vision |
| Touch targets >48px | Easier to tap when hands shake |
| No scores in emergency | "Score: 45" means nothing. "🔴 EMERGENCY" is clear. |

---

## 🔧 Configuration

### Google Maps API (Optional)

For real hospital data (default uses mock data):

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Set environment variable:
   ```bash
   export GOOGLE_MAPS_API_KEY="your_key_here"
   ```

### Emergency Number

Default: 112 (India)

To change (e.g., 911 for US):
```javascript
// static/js/main.js, line ~485
callEmergency() {
    const emergencyNumber = '112'; // Change here
    ...
}
```

---

## 📊 Data Model

### Emergency Session
```javascript
{
  symptom: "chest_pain" | "breathing" | "fever" | "accident" | "unconscious" | "other",
  isCaretaker: boolean,
  caretakerData: {
    age: number,
    conscious: "yes" | "no"
  },
  triageAnswers: [
    { question: string, answer: "yes" | "no" }
  ],
  severity: "emergency" | "warning" | "stable"
}
```

### Health Record (Detailed Check)
```sql
CREATE TABLE health_records (
  id INTEGER PRIMARY KEY,
  age INTEGER,
  temperature REAL,
  heart_rate INTEGER,
  bp_sys INTEGER,
  bp_dia INTEGER,
  spo2 INTEGER,
  symptoms TEXT,
  status TEXT,
  score INTEGER,
  date TIMESTAMP
);
```

---

## 🛡️ Safety & Disclaimer

⚠️ **IMPORTANT**: This is an **assistive tool**, not a replacement for professional medical care.

- Always call emergency services (112/911) for life-threatening situations
- Instructions are general guidelines, not personalized medical advice
- The app cannot diagnose conditions
- Severity classification is based on symptom patterns, not medical diagnosis

**Medical Disclaimer**: This application provides general health information and emergency guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or seen in this application. If you think you may have a medical emergency, call your doctor, go to the emergency department, or call 112 immediately.

---

## 🤝 Contributing

We welcome contributions that improve emergency response!

**Priority areas:**
- Multi-language support
- Offline functionality
- More accurate NLP for voice
- Integration with real emergency services
- Accessibility improvements

**Please avoid:**
- Adding complexity to the emergency flow
- Requiring more user input
- Removing the "panic mode" focus

---

## 📄 License

[MIT License](LICENSE)

---

## 👨‍💻 Built By

**Rajwani-7** - [GitHub](https://github.com/rajwani-7)

Built with ❤️ for people in their worst moments.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/rajwani-7/health/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rajwani-7/health/discussions)

---

**Remember**: In a real emergency, always call 112 or your local emergency number first. This app is here to help guide you while help is on the way.

🚑 Stay safe. 🩺
