from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import secrets

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)  # Strava athlete ID
    username = db.Column(db.String(100), nullable=True)
    firstname = db.Column(db.String(100), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)
    profile = db.Column(db.String(255), nullable=True)  # Profile image URL
    
    # Auth details
    access_token = db.Column(db.String(100), nullable=False)
    refresh_token = db.Column(db.String(100), nullable=True)
    token_expires_at = db.Column(db.Integer, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define relationships
    activities = db.relationship('Activity', backref='user', lazy=True, cascade='all, delete-orphan')
    badges = db.relationship('Badge', secondary='user_badge', back_populates='users')

class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = db.Column(db.BigInteger, primary_key=True)  # Strava activity ID
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'Run', 'Ride', etc.
    distance = db.Column(db.Float, nullable=False)  # in meters
    moving_time = db.Column(db.Integer, nullable=False)  # in seconds
    elapsed_time = db.Column(db.Integer, nullable=False)  # in seconds
    total_elevation_gain = db.Column(db.Float, nullable=True)
    start_date = db.Column(db.DateTime, nullable=False)
    
    # Map data
    polyline = db.Column(db.Text, nullable=True)
    start_latlng = db.Column(db.String(50), nullable=True)
    end_latlng = db.Column(db.String(50), nullable=True)
    
    # Store activity data as text (SQLite compatibility)
    activity_data_text = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Add composite indexes for faster table lookups
    __table_args__ = (
        db.Index('idx_user_type', user_id, type),
        db.Index('idx_user_date', user_id, start_date),
    )
    
    @property
    def activity_data(self):
        return json.loads(self.activity_data_text) if self.activity_data_text else None
    
    @activity_data.setter
    def activity_data(self, value):
        self.activity_data_text = json.dumps(value) if value else None

class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.String(256), nullable=False)
    icon = db.Column(db.String(128), nullable=False)
    criteria_type = db.Column(db.String(64), nullable=False)  # distance, count, streak, etc.
    criteria_value = db.Column(db.Float, nullable=False)  # threshold value

    # Relationship to users through UserBadge
    users = db.relationship('User', secondary='user_badge', back_populates='badges')

    def __repr__(self):
        return f'<Badge {self.name}>'

class UserBadge(db.Model):
    __tablename__ = 'user_badge'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)  # Change 'user.id' to 'users.id'
    badge_id = db.Column(db.Integer, db.ForeignKey('badge.id'), primary_key=True)
    earned_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Add unique constraint to prevent duplicate badges
    __table_args__ = (db.UniqueConstraint('user_id', 'badge_id'),)