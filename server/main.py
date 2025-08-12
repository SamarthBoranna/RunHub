from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
import requests, os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
CORS(app, origins='http://localhost:5173', supports_credentials=True)

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
    # Exchange temperary code from callback url for access token
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

    # If session components are empty then user has not authorized strava
    session["access_token"] = data["access_token"]
    session["athlete"] = data["athlete"]

    return redirect(f"{FRONTEND_URL}")

@app.route("/api/athlete")
def get_athlete():
    if "athlete" in session:
        return jsonify(session["athlete"])
    return jsonify({"error": "Unauthorized"}), 401

@app.route("/api/recentActivities")
def get_recent_activities():
    if "athlete" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Gets the most recent 200 activities
    activities_url = "https://www.strava.com/api/v3/athlete/activities"
    header = {'Authorization': 'Bearer ' + session["access_token"]}
    param = {'per_page': 200, 'page': 1}
    activities = requests.get(activities_url, headers = header, params = param).json()
    runs = [activity for activity in activities if activity['type'] == 'Run']
    return jsonify(runs)

if __name__ == "__main__":
    app.run(host="localhost", debug=True, port=5050)
