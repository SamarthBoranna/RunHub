from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import requests, os, json
from datetime import datetime
from dotenv import load_dotenv
from models import db, User, Activity

# Load environment variables
load_dotenv(dotenv_path=".env.local")

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)
CORS(app, origins='http://localhost:5173', supports_credentials=True)

# Strava API credentials
CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

@app.route("/authorize")
def authorize():
    url = (
        f"https://www.strava.com/oauth/authorize?client_id={CLIENT_ID}"
        f"&response_type=code&redirect_uri={REDIRECT_URI}"
        f"&approval_prompt=force&scope=read,activity:read"
    )
    return redirect(url)

@app.route("/callback")
def callback():
    # Exchange temporary code from callback url for access token
    temp_code = request.args.get("code")
    token_res = requests.post(
        "https://www.strava.com/oauth/token",
        data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": temp_code,
            "grant_type": "authorization_code",
        },
    )
    data = token_res.json()

    # User did not authorize strava
    if "access_token" not in data:
        return redirect(f"{FRONTEND_URL}")

    # Store in session for the current request
    access_token = data["access_token"]
    athlete = data["athlete"]
    session["access_token"] = access_token
    session["athlete"] = athlete
    
    try:
        # Store user info in the database
        user = User.query.get(athlete["id"])
        if not user:
            user = User(
                id=athlete["id"],
                username=athlete.get("username"),
                firstname=athlete["firstname"],
                lastname=athlete["lastname"],
                profile=athlete.get("profile"),
                access_token=access_token,
                refresh_token=data.get("refresh_token"),
                token_expires_at=data.get("expires_at")
            )
            db.session.add(user)
        else:
            # Update existing user's token
            user.access_token = access_token
            user.refresh_token = data.get("refresh_token")
            user.token_expires_at = data.get("expires_at")
            user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # After user is created/updated, fetch their activities
        fetch_and_store_activities(athlete["id"], access_token)
        
        return redirect(f"{FRONTEND_URL}")
    
    except Exception as e:
        db.session.rollback()
        # Log the error
        print(f"Error during authentication: {str(e)}")
        return redirect(f"{FRONTEND_URL}?error=database_error")

@app.route("/api/athlete")
def get_athlete():
    if "athlete" in session:
        return jsonify(session["athlete"])
    return jsonify({"error": "Unauthorized"}), 401

@app.route("/api/recentActivities")
def get_recent_activities():
    if "athlete" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    athlete_id = session["athlete"]["id"]
    
    try:
        # Get all runs from the database, ordered by date (newest first)
        activities = Activity.query.filter_by(
            user_id=athlete_id, 
            type='Run'
        ).order_by(
            Activity.start_date.desc()
        ).all()
        
        # Convert to JSON format
        result = []
        for activity in activities:
            result.append(activity.activity_data)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def fetch_and_store_activities(athlete_id, access_token):
    """Fetch activities from Strava API and store in database"""
    
    # Check if user has any activities in the database
    newest_activity = Activity.query.filter_by(
        user_id=athlete_id, 
        type='Run'
    ).order_by(
        Activity.start_date.desc()
    ).first()
    
    # Prepare Strava API request
    activities_url = "https://www.strava.com/api/v3/athlete/activities"
    header = {'Authorization': 'Bearer ' + access_token}
    
    # If we have activities, only fetch newer ones
    if newest_activity:
        # TODO: Change this to get ALL activities after the timestamp
        # Get activities after the most recent one we have
        after_timestamp = int(newest_activity.start_date.timestamp()) + 1
        param = {'per_page': 200, 'page': 1, 'after': after_timestamp}
    else:
        # TODO: Change this to actually get everything
        # No activities yet, get everything 
        param = {'per_page': 200, 'page': 1}
    
    # Fetch from Strava API
    strava_activities = requests.get(activities_url, headers=header, params=param).json()
        
    # Store in database
    activities_added = 0
    for run in strava_activities:
        # Check if activity already exists
        activity = Activity.query.get(run['id'])
        if not activity:
            # Convert ISO string to datetime
            start_date = datetime.strptime(run['start_date'], '%Y-%m-%dT%H:%M:%SZ')
            
            # Create new activity
            new_activity = Activity(
                id=run['id'],
                user_id=athlete_id,
                name=run['name'],
                type=run['type'],
                distance=run['distance'],
                moving_time=run['moving_time'],
                elapsed_time=run['elapsed_time'],
                total_elevation_gain=run.get('total_elevation_gain', 0),
                start_date=start_date,
                polyline=run.get('map', {}).get('summary_polyline'),
                start_latlng=json.dumps(run.get('start_latlng')),
                end_latlng=json.dumps(run.get('end_latlng')),
                activity_data=run
            )
            db.session.add(new_activity)
            activities_added += 1
    
    # Commit all changes at once
    db.session.commit()
    print(f"Added {activities_added} new activities for user {athlete_id}")
    return activities_added

@app.route("/api/refreshActivities")
def refresh_activities():
    if "athlete" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    athlete_id = session["athlete"]["id"]
    access_token = session["access_token"]
    
    try:
        # Fetch and store new activities
        activities_added = fetch_and_store_activities(athlete_id, access_token)
        
        # Get all activities (including the new ones)
        activities = Activity.query.filter_by(
            user_id=athlete_id, 
            type='Run'
        ).order_by(
            Activity.start_date.desc()
        ).all()
        
        # Convert to JSON format
        result = []
        for activity in activities:
            result.append(activity.activity_data)
        
        return jsonify({
            "activities": result,
            "newActivities": activities_added
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.cli.command("init-db")
def init_db_command():
    """Initialize the database."""
    db.create_all()
    print("Initialized the database.")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables on startup if they don't exist
    app.run(host="localhost", debug=True, port=5050)
