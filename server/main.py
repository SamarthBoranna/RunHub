from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import requests, os, json
from datetime import datetime, timedelta
import time
from dotenv import load_dotenv
from models import db, User, Activity, UserBadge, Badge
import secrets
from openai import OpenAI

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
CORS(app, 
     origins=['http://localhost:5173', 'https://runhub.vercel.app'], 
     supports_credentials=True,
     allow_headers=["Content-Type", "X-API-Key", "Authorization"],
     methods=["GET", "POST", "OPTIONS"])

# Strava API credentials
CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Rate limiting for chat endpoint
chat_rate_limits = {}  # {user_id: [list of request timestamps]}
CHAT_RATE_LIMIT_REQUESTS = 10  # Number of requests allowed
CHAT_RATE_LIMIT_WINDOW = 60  # Time window in seconds (1 minute)

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

    access_token = data["access_token"]
    athlete = data["athlete"]
    
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

        # Just redirect with user_id (no API key needed)
        user_id = athlete["id"]
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}?user_id={user_id}")
    
    except Exception as e:
        print(f"Error during authentication: {str(e)}")
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}?error=auth_failed&message={str(e)}")

@app.route("/api/athlete/<int:user_id>")
def get_athlete(user_id):
    # Find user by ID only (no API key check)
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "firstname": user.firstname,
        "lastname": user.lastname,
        "username": user.username,
        "profile": user.profile
    })

@app.route("/api/activities/<int:user_id>")
def get_activities(user_id):
    # Find user by ID only
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get activities
    activities = Activity.query.filter_by(user_id=user_id).order_by(Activity.start_date.desc()).all()
    
    # Convert to JSON
    result = []
    for activity in activities:
        result.append(activity.activity_data)
    
    return jsonify(result)

@app.route("/api/chat", methods=["POST"])
def chat():
    """Chat endpoint that provides running advice based on user's activity history."""
    data = request.get_json()
    user_id = data.get("user_id")
    message = data.get("message")
    
    if not user_id or not message:
        return jsonify({"error": "user_id and message are required"}), 400
    
    # Check rate limit
    allowed, retry_after = check_rate_limit(user_id)
    if not allowed:
        return jsonify({
            "error": f"Rate limit exceeded. Please wait {retry_after} seconds before trying again.",
            "retry_after": retry_after
        }), 429  # 429 Too Many Requests
    
    # Find user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get activity statistics (last 3 months)
    stats = get_activity_statistics(user_id, months=3)
    
    # Format context for AI
    user_name = f"{user.firstname} {user.lastname}"
    activity_context = format_activity_context_for_ai(stats, user_name)
    
    # System prompt for running coach
    system_prompt = """You are a running coach assistant. Answer questions directly and concisely based on the user's activity history.
        IMPORTANT RULES:
        - Answer ONLY what is asked. Do not add extra advice, suggestions, or encouragement unless specifically requested.
        - Answer in the same language as the user's question. You must answer in a way that is easy to understand and conversational.
        - Always use min/mi (minutes per mile) as the primary pace unit. You may include min/km in parentheses if helpful, but min/mi should be the default.
        - Be direct and factual. If asked "What was my last run?", just provide the run details without additional commentary.
        - Only provide training advice, suggestions, or encouragement when explicitly asked for it.
        - Keep responses brief and to the point.
    """
    
    # Initialize OpenAI client
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        return jsonify({"error": "OpenAI API key not configured"}), 500
    
    try:
        client = OpenAI(api_key=openai_api_key)
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{activity_context}\n\nUser Question: {message}"}
            ],
            temperature=0.3,  # Lower temperature for more factual, concise responses
            max_tokens=300  # Reduced for more concise answers
        )
        
        ai_response = response.choices[0].message.content
        
        return jsonify({
            "response": ai_response,
            "user_id": user_id
        })
    
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return jsonify({"error": f"Failed to get AI response: {str(e)}"}), 500

@app.route("/api/refresh/<int:user_id>")
def refresh_activities(user_id):
    """Refresh activities for a user. Only pull the 50 most recent activities."""
    # Find user by ID only (no API key check)
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if token needs refreshing
    current_time = int(datetime.utcnow().timestamp())
    
    try:
        if user.token_expires_at and current_time >= user.token_expires_at:
            # Refresh the token
            try:
                refresh_response = requests.post(
                    "https://www.strava.com/oauth/token",
                    data={
                        "client_id": CLIENT_ID,
                        "client_secret": CLIENT_SECRET,
                        "refresh_token": user.refresh_token,
                        "grant_type": "refresh_token"
                    }
                )
                
                if refresh_response.status_code == 200:
                    refresh_data = refresh_response.json()
                    try:
                        # Try to update but don't fail if read-only
                        user.access_token = refresh_data["access_token"]
                        user.refresh_token = refresh_data["refresh_token"]
                        user.token_expires_at = refresh_data["expires_at"]
                        db.session.commit()
                    except Exception as e:
                        print(f"Database write error (using old token): {str(e)}")
                        db.session.rollback()
                else:
                    return jsonify({"error": "Failed to refresh token"}), 401
            except Exception as e:
                print(f"Token refresh error: {str(e)}")
                return jsonify({"error": "Failed to refresh token"}), 500
        
        # Track timing and changes
        start_time = time.time()
        activities_added = 0
        activities_updated = 0
        activities_deleted = 0
        
        # STEP 1: Fetch a page of recent activities from Strava
        activities_url = "https://www.strava.com/api/v3/athlete/activities"
        header = {'Authorization': 'Bearer ' + user.access_token}
        param = {'per_page': 50, 'page': 1}  # Get the 50 most recent activities
        
        strava_response = requests.get(activities_url, headers=header, params=param)
        if strava_response.status_code != 200:
            return jsonify({"error": f"Strava API error: {strava_response.status_code}"}), 500
            
        strava_activities = strava_response.json()
        
        # Filter for runs
        strava_runs = [activity for activity in strava_activities if activity['type'] == 'Run']
        
        # STEP 2: Collect Strava activity IDs into a set
        strava_activity_ids = {str(run['id']) for run in strava_runs}
        
        # STEP 3: Determine date range of Strava activities for comparison
        if strava_runs:
            # Convert ISO strings to datetime objects
            strava_dates = [datetime.strptime(run['start_date'], '%Y-%m-%dT%H:%M:%SZ') for run in strava_runs]
            newest_strava_date = max(strava_dates)
            oldest_strava_date = min(strava_dates)
            
            # STEP 4: Also get the most recent activity from the database
            newest_db_activity = Activity.query.filter_by(
                user_id=user.id, 
                type='Run'
            ).order_by(
                Activity.start_date.desc()
            ).first()
            
            # STEP 5: Query local DB for activities in an expanded date range
            # This includes both the Strava activities AND any newer ones in the DB
            # that might have been deleted from Strava
            if newest_db_activity and newest_db_activity.start_date > newest_strava_date:
                # Use the newest DB activity date as the upper bound
                query_end_date = newest_db_activity.start_date
            else:
                query_end_date = newest_strava_date
                
            db_activities = Activity.query.filter(
                Activity.user_id == user.id,
                Activity.type == 'Run',
                Activity.start_date >= oldest_strava_date,
                Activity.start_date <= query_end_date
            ).all()
            
            # Create a set of local activity IDs
            db_activity_ids = {str(activity.id) for activity in db_activities}
            
            # Create a map for efficient lookups
            db_activities_map = {str(activity.id): activity for activity in db_activities}
            
            # STEP 6: Process each Strava activity
            for strava_run in strava_runs:
                strava_id = str(strava_run['id'])
                start_date = datetime.strptime(strava_run['start_date'], '%Y-%m-%dT%H:%M:%SZ')
                
                if strava_id in db_activity_ids:
                    # Activity exists - check if it needs updating
                    db_activity = db_activities_map[strava_id]
                    
                    # Check for changes in key fields
                    if (db_activity.name != strava_run['name'] or
                        abs(db_activity.distance - strava_run['distance']) > 0.01 or
                        db_activity.moving_time != strava_run['moving_time'] or
                        db_activity.elapsed_time != strava_run['elapsed_time']):
                        
                        try:
                            # Update the activity
                            db_activity.name = strava_run['name']
                            db_activity.distance = strava_run['distance']
                            db_activity.moving_time = strava_run['moving_time']
                            db_activity.elapsed_time = strava_run['elapsed_time']
                            db_activity.total_elevation_gain = strava_run.get('total_elevation_gain', 0)
                            db_activity.polyline = strava_run.get('map', {}).get('summary_polyline')
                            db_activity.start_latlng = json.dumps(strava_run.get('start_latlng'))
                            db_activity.end_latlng = json.dumps(strava_run.get('end_latlng'))
                            db_activity.activity_data = strava_run
                            
                            activities_updated += 1
                        except Exception as e:
                            print(f"Database write error updating activity: {str(e)}")
                            db.session.rollback()
                else:
                    # New activity - add it
                    try:
                        new_activity = Activity(
                            id=strava_run['id'],
                            user_id=user.id,
                            name=strava_run['name'],
                            type=strava_run['type'],
                            distance=strava_run['distance'],
                            moving_time=strava_run['moving_time'],
                            elapsed_time=strava_run['elapsed_time'],
                            total_elevation_gain=strava_run.get('total_elevation_gain', 0),
                            start_date=start_date,
                            polyline=strava_run.get('map', {}).get('summary_polyline'),
                            start_latlng=json.dumps(strava_run.get('start_latlng')),
                            end_latlng=json.dumps(strava_run.get('end_latlng')),
                            activity_data=strava_run
                        )
                        db.session.add(new_activity)
                        activities_added += 1
                    except Exception as e:
                        print(f"Database write error adding activity: {str(e)}")
                        db.session.rollback()
            
            # STEP 7: Find and delete activities that are in our DB but not in Strava
            activities_to_delete = db_activity_ids - strava_activity_ids
            
            for activity_id in activities_to_delete:
                activity_to_delete = Activity.query.get(activity_id)
                if activity_to_delete:
                    # Only delete if within the Strava range or newer
                    # This avoids deleting old activities that just aren't in the current page
                    if activity_to_delete.start_date >= oldest_strava_date:
                        try:
                            db.session.delete(activity_to_delete)
                            activities_deleted += 1
                        except Exception as e:
                            print(f"Database write error deleting activity: {str(e)}")
                            db.session.rollback()
            
            # STEP 8: Commit all changes
            try:
                db.session.commit()
            except Exception as e:
                print(f"Database write error committing changes: {str(e)}")
                db.session.rollback()
            
            # STEP 9: Also fetch any newer activities not in the first page
            # This ensures we don't miss anything new beyond the first 50
            if newest_strava_date:
                # Use after_timestamp to get only newer activities
                after_timestamp = int(newest_strava_date.timestamp())
                newer_param = {'per_page': 50, 'page': 1, 'after': after_timestamp}
                
                try:
                    # Get activities newer than the ones we just processed
                    new_activities_added = fetch_and_store_activities(user.id, user.access_token, params=newer_param)
                    activities_added += new_activities_added
                except Exception as e:
                    print(f"Error fetching newer activities: {str(e)}")
        else:
            # No runs from Strava, special case handling:
            # Check if we should delete all activities (account reset) or do nothing
            # Get the total activity count from Strava (of all types)
            if not strava_activities:
                # User might have deleted all activities on Strava
                # Let's do a second API call to confirm there are no activities at all
                all_activities_param = {'per_page': 1, 'page': 1}
                all_activities_response = requests.get(activities_url, headers=header, params=all_activities_param)
                
                if all_activities_response.status_code == 200 and not all_activities_response.json():
                    # Confirmed: User has no activities at all in Strava
                    # Delete all runs from our database
                    activities_to_delete = Activity.query.filter_by(
                        user_id=user.id,
                        type='Run'
                    ).all()
                    
                    for activity in activities_to_delete:
                        try:
                            db.session.delete(activity)
                            activities_deleted += 1
                        except Exception as e:
                            print(f"Database write error deleting activity: {str(e)}")
                            db.session.rollback()
                    
                    try:
                        db.session.commit()
                    except Exception as e:
                        print(f"Database write error committing changes: {str(e)}")
                        db.session.rollback()
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # STEP 10: Get all activities after refresh
        activities = Activity.query.filter_by(
            user_id=user.id, 
            type='Run'
        ).order_by(
            Activity.start_date.desc()
        ).all()
        
        # Convert to JSON format
        result = []
        for activity in activities:
            result.append(activity.activity_data)
        
        # Return the results
        return jsonify({
            "activities": result,
            "changes": {
                "added": activities_added,
                "updated": activities_updated,
                "deleted": activities_deleted,
                "total_changes": activities_added + activities_updated + activities_deleted
            },
            "processingTime": round(processing_time, 2),
            "totalActivities": len(result)
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Error refreshing activities: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/badges/<int:user_id>")
def get_user_badges(user_id):
    """Get badges earned by a user"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    badges = []
    for badge in user.badges:
        badges.append({
            "id": badge.id,
            "name": badge.name,
            "description": badge.description,
            "icon": badge.icon,
            "earned_date": UserBadge.query.filter_by(
                user_id=user_id, badge_id=badge.id
            ).first().earned_date.isoformat()
        })
    
    return jsonify(badges)

@app.route("/api/badges/evaluate/<int:user_id>")
def evaluate_badges_endpoint(user_id):
    """Endpoint to manually trigger badge evaluation"""
    result = evaluate_user_badges(user_id)
    return jsonify(result)

def check_rate_limit(user_id):
    """Check if user has exceeded rate limit. Returns (allowed, retry_after_seconds)."""
    current_time = time.time()
    
    # Clean up old entries for this user
    if user_id in chat_rate_limits:
        # Remove timestamps older than the time window
        chat_rate_limits[user_id] = [
            ts for ts in chat_rate_limits[user_id]
            if current_time - ts < CHAT_RATE_LIMIT_WINDOW
        ]
    else:
        chat_rate_limits[user_id] = []
    
    # Check if limit exceeded
    if len(chat_rate_limits[user_id]) >= CHAT_RATE_LIMIT_REQUESTS:
        # Find the oldest request in the current window
        oldest_request = min(chat_rate_limits[user_id])
        retry_after = int(CHAT_RATE_LIMIT_WINDOW - (current_time - oldest_request)) + 1
        return False, retry_after
    
    # Add current request timestamp
    chat_rate_limits[user_id].append(current_time)
    return True, 0

def evaluate_user_badges(user_id):
    """Evaluate and award badges for a user based on their activities"""
    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}
    
    activities = Activity.query.filter_by(user_id=user_id, type='Run').all()
    
    # Get all badges definitions
    badges = Badge.query.all()
    badges_awarded = []
    
    for badge in badges:
        # Skip if user already has this badge
        if badge in user.badges:
            continue
            
        # Evaluate badge criteria
        if badge.criteria_type == 'run_count':
            if len(activities) >= badge.criteria_value:
                user.badges.append(badge)
                badges_awarded.append(badge.name)
                
        elif badge.criteria_type == 'total_distance':
            total_distance = sum(a.distance for a in activities)
            if total_distance >= badge.criteria_value:
                user.badges.append(badge)
                badges_awarded.append(badge.name)
                
        # Add more criteria types as needed
    
    db.session.commit()
    return {"badges_awarded": badges_awarded}

def format_pace_min_sec(decimal_minutes):
    """Convert decimal minutes to MM:SS format (e.g., 7.1 -> 7:06)."""
    if decimal_minutes is None:
        return None
    minutes = int(decimal_minutes)
    seconds = round((decimal_minutes - minutes) * 60)
    # Handle case where seconds round to 60
    if seconds >= 60:
        minutes += 1
        seconds = 0
    return f"{minutes}:{seconds:02d}"

def get_activity_statistics(user_id, months=3):
    """Fetch and process user's activities from the last N months, returning statistics."""
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    
    # Get activities from the last N months
    activities = Activity.query.filter(
        Activity.user_id == user_id,
        Activity.type == 'Run',
        Activity.start_date >= cutoff_date
    ).order_by(Activity.start_date.desc()).all()
    
    if not activities:
        return {
            "total_runs": 0,
            "total_distance_km": 0,
            "total_distance_miles": 0,
            "total_elevation_meters": 0,
            "average_pace_min_per_km": None,
            "average_pace_min_per_mile": None,
            "longest_run_km": 0,
            "longest_run_miles": 0,
            "weekly_mileage": [],
            "recent_activities": []
        }
    
    # Calculate statistics
    total_distance_meters = sum(activity.distance for activity in activities)
    total_distance_km = total_distance_meters / 1000
    total_distance_miles = total_distance_meters / 1609.34
    total_elevation_meters = sum(activity.total_elevation_gain or 0 for activity in activities)
    
    # Calculate average pace
    total_moving_time_seconds = sum(activity.moving_time for activity in activities)
    if total_moving_time_seconds > 0 and total_distance_km > 0:
        avg_pace_sec_per_km = total_moving_time_seconds / total_distance_km
        avg_pace_min_per_km = avg_pace_sec_per_km / 60
        avg_pace_min_per_mile = (avg_pace_sec_per_km * 1.60934) / 60
    else:
        avg_pace_min_per_km = None
        avg_pace_min_per_mile = None
    
    # Find longest run
    longest_run_meters = max(a.distance for a in activities)
    longest_run_km = longest_run_meters / 1000
    longest_run_miles = longest_run_meters / 1609.34
    
    # Calculate weekly mileage
    weekly_mileage = {}
    for activity in activities:
        week_start = activity.start_date - timedelta(days=activity.start_date.weekday())
        week_key = week_start.strftime('%Y-%W')
        if week_key not in weekly_mileage:
            weekly_mileage[week_key] = 0
        weekly_mileage[week_key] += activity.distance / 1609.34  # Convert to miles
    
    weekly_mileage_list = [
        {"week": week, "miles": round(miles, 2)} 
        for week, miles in sorted(weekly_mileage.items(), reverse=True)[:12]
    ]
    
    # Get recent activities summary (last 10)
    recent_activities = []
    for activity in activities[:10]:
        activity_data = activity.activity_data or {}
        distance_km = activity.distance / 1000
        distance_miles = activity.distance / 1609.34
        moving_time_minutes = activity.moving_time / 60
        
        # Calculate pace in both units
        pace_min_per_km = round(moving_time_minutes / distance_km, 2) if distance_km > 0 else None
        pace_min_per_mile = round(moving_time_minutes / distance_miles, 2) if distance_miles > 0 else None
        
        # Format date as "Month Day, Year" (e.g., "November 9, 2025")
        # Use %-d on Unix/Mac to remove leading zero, fallback to %d on Windows
        try:
            date_str = activity.start_date.strftime('%B %-d, %Y')
        except ValueError:
            # Windows doesn't support %-d, use manual formatting
            day = activity.start_date.day
            date_str = activity.start_date.strftime(f'%B {day}, %Y')
        
        recent_activities.append({
            "name": activity.name,
            "date": date_str,
            "date_raw": activity.start_date,  # Keep raw date for sorting if needed
            "distance_km": round(distance_km, 2),
            "distance_miles": round(distance_miles, 2),
            "moving_time_minutes": round(moving_time_minutes, 1),
            "pace_min_per_km": pace_min_per_km,
            "pace_min_per_mile": pace_min_per_mile,
            "pace_min_per_km_formatted": format_pace_min_sec(pace_min_per_km),
            "pace_min_per_mile_formatted": format_pace_min_sec(pace_min_per_mile),
            "elevation_meters": round(activity.total_elevation_gain or 0, 0)
        })
    
    return {
        "total_runs": len(activities),
        "total_distance_km": round(total_distance_km, 2),
        "total_distance_miles": round(total_distance_miles, 2),
        "total_elevation_meters": round(total_elevation_meters, 0),
        "average_pace_min_per_km": round(avg_pace_min_per_km, 2) if avg_pace_min_per_km else None,
        "average_pace_min_per_mile": round(avg_pace_min_per_mile, 2) if avg_pace_min_per_mile else None,
        "longest_run_km": round(longest_run_km, 2),
        "longest_run_miles": round(longest_run_miles, 2),
        "weekly_mileage": weekly_mileage_list,
        "recent_activities": recent_activities
    }

def format_activity_context_for_ai(stats, user_name):
    """Format activity statistics into a readable context string for the AI."""
    context = f"User: {user_name}\n\n"
    context += "Running Activity Summary (Last 3 months):\n"
    context += f"- Total Runs: {stats['total_runs']}\n"
    context += f"- Total Distance: {stats['total_distance_miles']} miles ({stats['total_distance_km']} km)\n"
    context += f"- Total Elevation Gain: {stats['total_elevation_meters']} meters\n"
    
    if stats['average_pace_min_per_mile']:
        avg_pace_mi_formatted = format_pace_min_sec(stats['average_pace_min_per_mile'])
        avg_pace_km_formatted = format_pace_min_sec(stats['average_pace_min_per_km'])
        context += f"- Average Pace: {avg_pace_mi_formatted} min/mi ({avg_pace_km_formatted} min/km)\n"
    
    context += f"- Longest Run: {stats['longest_run_miles']} miles ({stats['longest_run_km']} km)\n"
    
    if stats['weekly_mileage']:
        context += "\nWeekly Mileage (Recent weeks):\n"
        for week_data in stats['weekly_mileage'][:8]:
            context += f"- Week {week_data['week']}: {week_data['miles']} miles\n"
    
    if stats['recent_activities']:
        context += "\nRecent Runs (Last 10):\n"
        for run in stats['recent_activities'][:10]:
            if run['pace_min_per_mile_formatted']:
                pace_str = f" @ {run['pace_min_per_mile_formatted']} mins/mi ({run['pace_min_per_km_formatted']} mins/km)"
            else:
                pace_str = ""
            context += f"- {run['date']}: {run['name']} - {run['distance_miles']} miles ({run['distance_km']} km){pace_str}\n"
    
    return context

def fetch_and_store_activities(athlete_id, access_token, params=None):
    """Fetch activities from Strava API and store in database, handling all pages."""
    
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
    
    # Use provided params if given, otherwise build default params
    if params is None:
        # If we have activities, only fetch newer ones
        if newest_activity:
            # Get activities after the most recent one we have
            after_timestamp = int(newest_activity.start_date.timestamp()) + 1
            params = {'per_page': 200, 'page': 1, 'after': after_timestamp}
        else:
            # No activities yet, get everything
            params = {'per_page': 200, 'page': 1}
    
    activities_added = 0
    page = 1
    while True:
        # Update page number for each request
        params['page'] = page
        response = requests.get(activities_url, headers=header, params=params)
        if response.status_code != 200:
            break
        strava_activities = response.json()
        if not strava_activities:
            break
        
        # Filter for runs
        strava_runs = [activity for activity in strava_activities if activity['type'] == 'Run']
        
        for run in strava_runs:
            activity = Activity.query.get(run['id'])
            if not activity:
                start_date = datetime.strptime(run['start_date'], '%Y-%m-%dT%H:%M:%SZ')
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
        page += 1

    db.session.commit()
    evaluate_user_badges(athlete_id)
    return activities_added

@app.cli.command("init-db")
def init_db_command():
    """Initialize the database."""
    db.create_all()
    print("Initialized the database.")

@app.cli.command("seed-badges")
def seed_badges_command():
    """Seed the database with initial badges."""
    badges = [
        {
            "name": "First Run",
            "description": "Completed your first run",
            "icon": "one_run.png",
            "criteria_type": "run_count",
            "criteria_value": 1
        },
        {
            "name": "10 Runs",
            "description": "Completed 10 runs",
            "icon": "ten_runs.png",
            "criteria_type": "run_count",
            "criteria_value": 10
        },
        {
            "name": "100 km",
            "description": "Ran a total of 100 kilometers",
            "icon": "hundred_kms.png",
            "criteria_type": "total_distance",
            "criteria_value": 100000  # in meters
        },
        # Add more badges as needed
    ]
    
    for badge_data in badges:
        # Skip if badge with same name already exists
        existing = Badge.query.filter_by(name=badge_data["name"]).first()
        if existing:
            print(f"Badge '{badge_data['name']}' already exists")
            continue
            
        badge = Badge(**badge_data)
        db.session.add(badge)
        print(f"Added badge: {badge_data['name']}")
    
    db.session.commit()
    print("Badges seeded successfully!")

@app.cli.command("delete-all-activities")
def delete_all_activities():
    """Delete all activities from the database."""
    num_deleted = Activity.query.delete()
    db.session.commit()
    print(f"Deleted {num_deleted} activities.")

@app.cli.command("delete-all-badges")
def delete_all_badges():
    """Delete all badges from the database."""
    num_deleted = Badge.query.delete()
    db.session.commit()
    print(f"Deleted {num_deleted} badges.")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables on startup if they don't exist
    
    # Use PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", debug=False, port=port)
