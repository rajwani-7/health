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
    Find nearby hospitals using Google Maps Places API
    Returns list of hospital information
    """
    if not GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY == 'YOUR_API_KEY_HERE':
        # Return mock data for development
        return [
            {
                'name': 'City General Hospital',
                'address': '123 Medical Center Dr, City, State',
                'phone': '+1-555-0123',
                'rating': 4.2,
                'distance': '0.8 km'
            },
            {
                'name': 'Emergency Care Center',
                'address': '456 Health Ave, City, State',
                'phone': '+1-555-0456',
                'rating': 4.0,
                'distance': '1.2 km'
            },
            {
                'name': 'Regional Medical Center',
                'address': '789 Hospital Blvd, City, State',
                'phone': '+1-555-0789',
                'rating': 4.5,
                'distance': '2.1 km'
            }
        ]
    
    try:
        url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f"{latitude},{longitude}",
            'radius': radius,
            'type': 'hospital',
            'key': GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        hospitals = []
        for place in data.get('results', [])[:5]:  # Limit to 5 results
            hospital = {
                'name': place.get('name', 'Unknown Hospital'),
                'address': place.get('vicinity', 'Address not available'),
                'rating': place.get('rating', 0),
                'place_id': place.get('place_id', ''),
                'distance': 'Distance not calculated'
            }
            
            # Get detailed information including phone number
            if hospital['place_id']:
                details_url = f"https://maps.googleapis.com/maps/api/place/details/json"
                details_params = {
                    'place_id': hospital['place_id'],
                    'fields': 'formatted_phone_number',
                    'key': GOOGLE_MAPS_API_KEY
                }
                
                details_response = requests.get(details_url, params=details_params)
                details_data = details_response.json()
                
                if details_data.get('result'):
                    hospital['phone'] = details_data['result'].get('formatted_phone_number', 'Phone not available')
                else:
                    hospital['phone'] = 'Phone not available'
            
            hospitals.append(hospital)
        
        return hospitals
    
    except Exception as e:
        print(f"Error fetching hospitals: {e}")
        return []

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

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
