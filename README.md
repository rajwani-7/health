# Emergency Health Assistant

A comprehensive full-stack web application that provides instant health analysis and emergency hospital finder functionality.

## 🩺 Features

### Core Functionality
- **Health Stability Score**: Calculates health status based on vital signs (temperature, heart rate, blood pressure, SpO2, symptoms)
- **Voice Input/Output**: Web Speech API integration for hands-free operation
- **Emergency Hospital Finder**: Google Maps Places API integration to find nearby hospitals
- **Health History**: SQLite database to store and display previous health checks
- **Responsive Design**: Mobile-first UI with dark/light mode support

### Health Status Levels
- 🟢 **Stable** (Score: 80-100): Normal vital signs, continue monitoring
- 🟠 **Monitor** (Score: 50-79): Requires monitoring, watch for changes
- 🔴 **Emergency** (Score: 0-49): Immediate medical attention required

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Modern web browser with Web Speech API support
- Google Maps API key (optional, uses mock data without it)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd emergency_health_assistant
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask requests
   ```

3. **Set up Google Maps API (Optional)**
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Places API
   - Set environment variable:
     ```bash
     export GOOGLE_MAPS_API_KEY="your_api_key_here"
     ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
emergency_health_assistant/
├── app.py                 # Flask backend application
├── static/
│   ├── css/
│   │   └── style.css      # Custom CSS styles
│   └── js/
│       └── main.js        # Frontend JavaScript
├── templates/
│   └── index.html         # Main HTML template
├── database/
│   └── health_records.db  # SQLite database (auto-created)
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key for hospital finder
- `FLASK_ENV`: Set to 'development' for debug mode

### Database
The application automatically creates a SQLite database with the following schema:

```sql
CREATE TABLE health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    age INTEGER,
    temperature REAL,
    heart_rate INTEGER,
    bp_sys INTEGER,
    bp_dia INTEGER,
    spo2 INTEGER,
    symptoms TEXT,
    status TEXT,
    score INTEGER,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Usage Guide

### Basic Health Check
1. Enter your age, temperature, heart rate, blood pressure, SpO2, and symptoms
2. Click "Check Health Status" or use voice input
3. Review your health stability score and status
4. Follow the provided health advice

### Voice Input
1. Click "Voice Input" button
2. Click "Start Recording"
3. Speak your health details naturally
4. The system will automatically fill in the form fields

### Emergency Features
- If your status is "Emergency", the emergency section will appear
- Click "Find Nearby Hospitals" to locate hospitals with contact information
- Click "Call Emergency Services" for immediate help

### Health History
- View your previous health checks in the history section
- Click "Refresh" to update the history

## 🧠 Health Scoring Algorithm

The health stability score is calculated based on:

### Vital Signs Scoring
- **Temperature**: Normal range 36.1-37.2°C
- **Heart Rate**: Normal range 60-100 BPM
- **Blood Pressure**: Normal range 90-140/60-90 mmHg
- **SpO2**: Normal range 95-100%

### Additional Factors
- **Age**: Elderly (>65) and young (<18) get slight adjustments
- **Symptoms**: Critical symptoms (chest pain, breathing difficulty) reduce score significantly
- **Symptom Severity**: Different symptoms have different impact weights

### Score Interpretation
- **80-100**: Stable - Continue normal activities
- **50-79**: Monitor - Watch for changes, consider medical consultation
- **0-49**: Emergency - Seek immediate medical attention

## 🔌 API Endpoints

### POST /check_health
Submit health data for analysis
```json
{
    "age": 30,
    "temperature": 36.5,
    "heart_rate": 72,
    "bp_sys": 120,
    "bp_dia": 80,
    "spo2": 98,
    "symptoms": "headache, fatigue"
}
```

### POST /find_hospitals
Find nearby hospitals
```json
{
    "latitude": 40.7128,
    "longitude": -74.0060
}
```

### GET /health_history
Retrieve health check history

## 🌐 Browser Compatibility

### Required Features
- **Web Speech API**: For voice input/output
- **Geolocation API**: For hospital finder
- **Fetch API**: For HTTP requests
- **CSS Grid/Flexbox**: For responsive layout

### Supported Browsers
- Chrome 25+
- Firefox 44+
- Safari 14.1+
- Edge 79+

## 🔒 Privacy & Security

- All health data is stored locally in SQLite database
- No data is transmitted to external services except Google Maps API
- Voice data is processed locally using Web Speech API
- Location data is only used for hospital finder functionality

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
1. **Using Gunicorn**:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:8000 app:app
   ```

2. **Using Docker**:
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY . .
   RUN pip install flask requests
   EXPOSE 5000
   CMD ["python", "app.py"]
   ```

3. **Cloud Platforms**:
   - **Heroku**: Add `Procfile` with `web: gunicorn app:app`
   - **Railway**: Automatic Python detection
   - **Render**: Connect GitHub repository

## 🛠️ Customization

### Adding New Symptoms
Edit the `critical_symptoms` and `concerning_symptoms` arrays in `app.py`:

```python
critical_symptoms = ['chest pain', 'difficulty breathing', 'severe headache', 'loss of consciousness', 'severe bleeding', 'your_new_symptom']
```

### Modifying Health Ranges
Adjust the scoring thresholds in the `calculate_health_score` function:

```python
# Example: Change temperature normal range
if temperature < 36.0 or temperature > 37.5:  # Modified range
    score -= 15
```

### Styling Customization
Modify `static/css/style.css` to change colors, fonts, and layout.

## 🐛 Troubleshooting

### Common Issues

1. **Voice Input Not Working**
   - Ensure browser supports Web Speech API
   - Check microphone permissions
   - Use HTTPS in production

2. **Hospital Finder Not Working**
   - Verify Google Maps API key is set
   - Check API quotas and billing
   - Enable Places API in Google Cloud Console

3. **Database Errors**
   - Ensure write permissions in project directory
   - Check if SQLite is installed

4. **Location Not Available**
   - Enable location services in browser
   - Check HTTPS requirement for geolocation

### Debug Mode
Set `FLASK_ENV=development` for detailed error messages and auto-reload.

## 📈 Future Enhancements

- [ ] AI/ML-based health prediction
- [ ] Integration with wearable devices
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Real-time hospital availability
- [ ] Telemedicine integration
- [ ] Health trend analysis
- [ ] Emergency contact integration

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review browser compatibility requirements

---

**⚠️ Medical Disclaimer**: This application is for informational purposes only and should not replace professional medical advice. Always consult with healthcare professionals for medical concerns.
