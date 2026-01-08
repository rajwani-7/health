from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import json
from datetime import datetime
import requests
from typing import Dict, List, Tuple

app = Flask(__name__)

# Configuration
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', 'YOUR_API_KEY_HERE')

# Emergency Triage Questions (Max 3 per symptom)
TRIAGE_QUESTIONS = {
    'chest_pain': [
        {'text': 'Is the pain spreading to your left arm, jaw, or back?'},
        {'text': 'Are you having trouble breathing?'},
        {'text': 'Are you sweating heavily or feeling nauseous?'}
    ],
    'breathing': [
        {'text': 'Are your lips or face turning blue?'},
        {'text': 'Are you unable to speak full sentences?'},
        {'text': 'Is the breathing difficulty getting worse rapidly?'}
    ],
    'fever': [
        {'text': 'Is your temperature above 103°F (39.4°C)?'},
        {'text': 'Are you experiencing severe headache or stiff neck?'},
        {'text': 'Are you confused or having difficulty staying awake?'}
    ],
    'accident': [
        {'text': 'Is there severe bleeding that won\'t stop?'},
        {'text': 'Is the person unconscious or not responding normally?'},
        {'text': 'Is there suspected head, neck, or back injury?'}
    ],
    'unconscious': [
        {'text': 'Is the person breathing normally?'},
        {'text': 'Can you feel a pulse?'},
        {'text': 'Did they hit their head before losing consciousness?'}
    ],
    'other': [
        {'text': 'Is the condition getting worse rapidly?'},
        {'text': 'Is there severe pain (8-10 on pain scale)?'},
        {'text': 'Are you having difficulty speaking or moving?'}
    ]
}

# Emergency Instructions
EMERGENCY_INSTRUCTIONS = {
    'chest_pain_emergency': [
        "Call 911 immediately - this may be a heart attack",
        "Have the person sit down and rest",
        "Loosen any tight clothing around the neck and chest",
        "If they have prescribed nitroglycerin, help them take it",
        "Give aspirin if available and not allergic (chew, don't swallow)",
        "Do NOT give them food or water",
        "Be prepared to perform CPR if they lose consciousness"
    ],
    'chest_pain_warning': [
        "Rest immediately and avoid any physical activity",
        "Sit in an upright position",
        "Loosen tight clothing",
        "Monitor symptoms - call 911 if they worsen",
        "Seek medical attention within the hour"
    ],
    'breathing_emergency': [
        "Call 911 immediately",
        "Help person sit upright - DO NOT lie them down",
        "Loosen tight clothing around neck and chest",
        "If they have an inhaler, help them use it",
        "Keep them calm - panic makes breathing worse",
        "Open windows for fresh air if possible",
        "If they stop breathing, start CPR"
    ],
    'fever_emergency': [
        "Call 911 immediately - high fever with these symptoms is serious",
        "Keep person cool - remove excess clothing",
        "Apply cool (not cold) wet cloths to forehead and neck",
        "Do NOT give them aspirin if under 18",
        "Keep them lying down in a cool, quiet place",
        "Monitor consciousness - note any changes"
    ],
    'accident_emergency': [
        "Call 911 immediately",
        "Do NOT move the person if head/neck/back injury suspected",
        "If bleeding heavily, apply firm pressure with clean cloth",
        "Keep person still and calm",
        "Cover them with a blanket to prevent shock",
        "Do NOT remove any objects stuck in wounds",
        "Monitor breathing and consciousness"
    ],
    'unconscious_emergency': [
        "Call 911 IMMEDIATELY",
        "Check if they're breathing - if not, start CPR",
        "If breathing, place in recovery position (on their side)",
        "Do NOT give them anything to eat or drink",
        "Do NOT move them if injury is suspected",
        "Stay with them until help arrives",
        "Note the time they lost consciousness"
    ],
    'stable': [
        "Monitor your symptoms carefully",
        "Rest and stay hydrated",
        "Take your temperature regularly",
        "Avoid strenuous activity",
        "Seek medical attention if symptoms worsen",
        "Keep emergency contact numbers handy"
    ]
}

# Database setup
def init_db():
    """Initialize the SQLite database with health records table"""
    conn = sqlite3.connect('database/health_records.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS health_records (
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
        )
    ''')
    
    conn.commit()
    conn.close()

def calculate_health_score(data: Dict) -> Tuple[int, str]:
    """
    Calculate health stability score based on input parameters
    Returns: (score, status)
    Score: 0-100 (higher is better)
    Status: 'Stable', 'Monitor', 'Emergency'
    """
    score = 100
    temperature = data.get('temperature', 0)
    heart_rate = data.get('heart_rate', 0)
    bp_sys = data.get('bp_sys', 0)
    bp_dia = data.get('bp_dia', 0)
    spo2 = data.get('spo2', 0)
    age = data.get('age', 30)
    symptoms = data.get('symptoms', '').lower()
    
    # Temperature scoring (normal: 36.1-37.2°C)
    if temperature < 35 or temperature > 40:
        score -= 30  # Critical
    elif temperature < 36 or temperature > 38.5:
        score -= 20  # Concerning
    elif temperature < 36.5 or temperature > 37.5:
        score -= 10   # Slightly off
    
    # Heart rate scoring (normal: 60-100 bpm)
    if heart_rate < 40 or heart_rate > 150:
        score -= 25  # Critical
    elif heart_rate < 50 or heart_rate > 120:
        score -= 10  # Concerning
    elif heart_rate < 55 or heart_rate > 105:
        score -= 5   # Slightly off
    
    # Blood pressure scoring (normal: 90-140/60-90)
    if bp_sys < 80 or bp_sys > 180 or bp_dia < 50 or bp_dia > 110:
        score -= 20  # Critical
    elif bp_sys < 90 or bp_sys > 160 or bp_dia < 60 or bp_dia > 100:
        score -= 10  # Concerning
    elif bp_sys < 95 or bp_sys > 150 or bp_dia < 65 or bp_dia > 95:
        score -= 5   # Slightly off
    
    # SpO2 scoring (normal: 95-100%)
    if spo2 < 90:
        score -= 30  # Critical
    elif spo2 < 95:
        score -= 15  # Concerning
    elif spo2 < 97:
        score -= 5   # Slightly off
    
    # Age factor
    if age > 65:
        score -= 5
    elif age < 18:
        score -= 3
    
    # Symptoms scoring
    critical_symptoms = ['chest pain', 'difficulty breathing', 'severe headache', 'loss of consciousness', 'severe bleeding']
    concerning_symptoms = ['dizziness', 'nausea', 'fever', 'fatigue', 'pain', 'headache']
    
    for symptom in critical_symptoms:
        if symptom in symptoms:
            score -= 20
            break
    
    for symptom in concerning_symptoms:
        if symptom in symptoms:
            score -= 10
            break
    
    # Determine status
    if score >= 85:
        status = 'Stable'
    elif score >= 60:
        status = 'Monitor'
    else:
        status = 'Emergency'
    
    return max(0, score), status

def get_health_advice(status: str, score: int) -> str:
    """Generate health advice based on status and score"""
    advice = {
        'Stable': [
            "Your vital signs appear normal. Continue monitoring your health.",
            "Maintain regular exercise and a balanced diet.",
            "Stay hydrated and get adequate rest.",
            "Consider regular health checkups."
        ],
        'Monitor': [
            "Your condition requires monitoring. Watch for any changes.",
            "Rest and avoid strenuous activities.",
            "Stay hydrated and monitor your symptoms.",
            "Consider consulting a healthcare provider if symptoms persist.",
            "Keep track of your vital signs regularly."
        ],
        'Emergency': [
            "IMMEDIATE MEDICAL ATTENTION REQUIRED",
            "Please seek emergency medical care immediately.",
            "Do not delay - contact emergency services or visit the nearest hospital.",
            "If possible, have someone accompany you.",
            "Keep your emergency contacts informed."
        ]
    }
    
    return advice.get(status, ["Please consult a healthcare professional."])

def find_nearby_hospitals(latitude: float, longitude: float, radius: int = 5000) -> List[Dict]:
    """
    Find nearby hospitals using OpenStreetMap Overpass API (FREE - no API key needed)
    Returns list of real hospital information
    """
    try:
        # Use Overpass API to find hospitals near the location
        # This is completely free and doesn't require any API key
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Search radius in meters
        radius_km = radius / 1000
        
        # Overpass QL query to find hospitals
        query = f"""
        [out:json];
        (
          node["amenity"="hospital"](around:{radius},{latitude},{longitude});
          way["amenity"="hospital"](around:{radius},{latitude},{longitude});
          node["amenity"="clinic"](around:{radius},{latitude},{longitude});
          way["amenity"="clinic"](around:{radius},{latitude},{longitude});
        );
        out body;
        >;
        out skel qt;
        """
        
        response = requests.post(overpass_url, data={'data': query}, timeout=10)
        data = response.json()
        
        hospitals = []
        seen_names = set()  # Avoid duplicates
        
        for element in data.get('elements', []):
            if element.get('type') in ['node', 'way']:
                tags = element.get('tags', {})
                name = tags.get('name', tags.get('operator', 'Unnamed Medical Facility'))
                
                # Skip duplicates
                if name in seen_names:
                    continue
                seen_names.add(name)
                
                # Get coordinates
                if element.get('type') == 'node':
                    lat = element.get('lat')
                    lon = element.get('lon')
                elif element.get('type') == 'way':
                    # For ways, we need to calculate center (use first node for simplicity)
                    lat = element.get('center', {}).get('lat') or element.get('lat')
                    lon = element.get('center', {}).get('lon') or element.get('lon')
                else:
                    continue
                
                if not lat or not lon:
                    continue
                
                # Calculate distance
                from math import radians, sin, cos, sqrt, atan2
                
                R = 6371  # Earth's radius in km
                lat1, lon1 = radians(latitude), radians(longitude)
                lat2, lon2 = radians(lat), radians(lon)
                
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                distance = R * c
                
                # Build address
                addr_parts = []
                if tags.get('addr:street'):
                    if tags.get('addr:housenumber'):
                        addr_parts.append(f"{tags.get('addr:housenumber')} {tags.get('addr:street')}")
                    else:
                        addr_parts.append(tags.get('addr:street'))
                if tags.get('addr:city'):
                    addr_parts.append(tags.get('addr:city'))
                if tags.get('addr:postcode'):
                    addr_parts.append(tags.get('addr:postcode'))
                
                address = ', '.join(addr_parts) if addr_parts else 'Address not available'
                
                hospital = {
                    'name': name,
                    'address': address,
                    'phone': tags.get('phone', tags.get('contact:phone', 'Call for info')),
                    'rating': None,  # OSM doesn't have ratings
                    'distance': f"{distance:.1f} km",
                    'lat': lat,
                    'lon': lon,
                    'amenity': tags.get('amenity', 'hospital'),
                    'emergency': tags.get('emergency', 'unknown')
                }
                
                hospitals.append(hospital)
                
                # Limit to 10 closest hospitals
                if len(hospitals) >= 10:
                    break
        
        # Sort by distance (extract number from distance string)
        hospitals.sort(key=lambda x: float(x['distance'].split()[0]))
        
        # If no hospitals found nearby, try a larger radius
        if not hospitals:
            print(f"No hospitals found within {radius}m, trying 10km radius...")
            return find_nearby_hospitals(latitude, longitude, radius=10000)
        
        return hospitals[:5]  # Return top 5 closest
    
    except Exception as e:
        print(f"Error fetching hospitals from OpenStreetMap: {e}")
        # Return empty list so frontend shows appropriate message
        return []

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/get_triage_questions', methods=['POST'])
def get_triage_questions():
    """Get triage questions for a specific symptom"""
    try:
        data = request.get_json()
        symptom = data.get('symptom', 'other')
        
        questions = TRIAGE_QUESTIONS.get(symptom, TRIAGE_QUESTIONS['other'])
        
        return jsonify({
            'success': True,
            'questions': questions
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classify_emergency', methods=['POST'])
def classify_emergency():
    """Classify emergency severity based on symptoms and triage answers"""
    try:
        data = request.get_json()
        symptom = data.get('symptom')
        answers = data.get('triageAnswers', [])
        is_caretaker = data.get('isCaretaker', False)
        caretaker_data = data.get('caretakerData', {})
        
        # Count YES answers (indicates more severe condition)
        yes_count = sum(1 for answer in answers if answer.get('answer') == 'yes')
        
        # Determine severity
        severity = 'stable'
        instructions_key = 'stable'
        
        # Critical symptoms always emergency if ANY yes answer
        critical_symptoms = ['chest_pain', 'breathing', 'unconscious', 'accident']
        
        if symptom in critical_symptoms:
            if yes_count >= 1:
                severity = 'emergency'
                instructions_key = f"{symptom}_emergency"
            else:
                severity = 'warning'
                instructions_key = f"{symptom}_warning" if f"{symptom}_warning" in EMERGENCY_INSTRUCTIONS else 'stable'
        elif symptom == 'fever':
            if yes_count >= 2:
                severity = 'emergency'
                instructions_key = 'fever_emergency'
            elif yes_count >= 1:
                severity = 'warning'
                instructions_key = 'stable'
        else:  # other
            if yes_count >= 2:
                severity = 'warning'
            else:
                severity = 'stable'
        
        # If person is unconscious (from caretaker mode), always emergency
        if is_caretaker and caretaker_data.get('conscious') == 'no':
            severity = 'emergency'
            instructions_key = 'unconscious_emergency'
        
        # Get appropriate instructions
        instructions = EMERGENCY_INSTRUCTIONS.get(instructions_key, EMERGENCY_INSTRUCTIONS['stable'])
        
        return jsonify({
            'success': True,
            'severity': severity,
            'instructions': instructions,
            'symptom': symptom
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/check_health', methods=['POST'])
def check_health():
    """Process health check request"""
    try:
        data = request.get_json()
        
        # Calculate health score
        score, status = calculate_health_score(data)
        
        # Generate advice
        advice = get_health_advice(status, score)
        
        # Save to database
        conn = sqlite3.connect('database/health_records.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO health_records 
            (age, temperature, heart_rate, bp_sys, bp_dia, spo2, symptoms, status, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('age', 0),
            data.get('temperature', 0),
            data.get('heart_rate', 0),
            data.get('bp_sys', 0),
            data.get('bp_dia', 0),
            data.get('spo2', 0),
            data.get('symptoms', ''),
            status,
            score
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'score': score,
            'status': status,
            'advice': advice,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/find_hospitals', methods=['POST'])
def find_hospitals():
    """Find nearby hospitals"""
    try:
        data = request.get_json()
        latitude = data.get('latitude', 0)
        longitude = data.get('longitude', 0)
        
        hospitals = find_nearby_hospitals(latitude, longitude)
        
        return jsonify({
            'success': True,
            'hospitals': hospitals
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health_history')
def health_history():
    """Get health check history"""
    try:
        conn = sqlite3.connect('database/health_records.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM health_records 
            ORDER BY date DESC 
            LIMIT 10
        ''')
        
        records = cursor.fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        history = []
        for record in records:
            history.append({
                'id': record[0],
                'age': record[1],
                'temperature': record[2],
                'heart_rate': record[3],
                'bp_sys': record[4],
                'bp_dia': record[5],
                'spo2': record[6],
                'symptoms': record[7],
                'status': record[8],
                'score': record[9],
                'date': record[10]
            })
        
        return jsonify({
            'success': True,
            'history': history
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Create database directory if it doesn't exist
    os.makedirs('database', exist_ok=True)
    init_db()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
