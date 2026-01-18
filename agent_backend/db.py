"""
Database connection module for MongoDB.
Reuses the same MongoDB Atlas connection as the Next.js frontend.
"""

import os
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv

# Load environment variables from local .env file
load_dotenv()

_client: Optional[MongoClient] = None


def get_client() -> MongoClient:
    """Get or create MongoDB client (singleton pattern)."""
    global _client
    if _client is None:
        uri = os.getenv('MONGODB_URI')
        if not uri:
            raise ValueError("MONGODB_URI environment variable is required")
        _client = MongoClient(uri)
    return _client


def get_database() -> Database:
    """Get the mobilify database."""
    return get_client()['mobilify']


def get_all_reports() -> List[Dict[str, Any]]:
    """
    Fetch all reports from MongoDB.
    Returns list of report documents with string IDs.
    """
    db = get_database()
    reports = list(db['reports'].find({}).limit(100))
    
    # Convert ObjectId to string for JSON serialization
    for report in reports:
        report['_id'] = str(report['_id'])
    
    return reports


def get_reports_by_ids(ids: List[str]) -> List[Dict[str, Any]]:
    """Fetch specific reports by their IDs."""
    from bson import ObjectId
    db = get_database()
    
    object_ids = [ObjectId(id) for id in ids if ObjectId.is_valid(id)]
    reports = list(db['reports'].find({'_id': {'$in': object_ids}}))
    
    for report in reports:
        report['_id'] = str(report['_id'])
    
    return reports


def filter_reports(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Filter reports by category, severity, and/or status.
    """
    db = get_database()
    
    query = {}
    if category:
        query['content.category'] = category
    if severity:
        query['content.severity'] = severity
    if status:
        query['status'] = status
    
    reports = list(db['reports'].find(query).sort('createdAt', -1).limit(500))
    
    for report in reports:
        report['_id'] = str(report['_id'])
    
    return reports
