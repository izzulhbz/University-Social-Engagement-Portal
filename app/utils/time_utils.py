# app/utils/time_utils.py
import time


def get_current_timestamp() -> int:
    """Get current Unix timestamp in milliseconds"""
    return int(time.time() * 1000)


def get_timestamp_range(range_type: str) -> tuple[int, int]:
    """
    Get timestamp range for analytics
    range_type: 'day', 'week', or 'month'
    Returns: (start_timestamp, end_timestamp) in milliseconds
    """
    now = get_current_timestamp()
    
    if range_type == "day":
        start = now - (24 * 60 * 60 * 1000)
    elif range_type == "week":
        start = now - (7 * 24 * 60 * 60 * 1000)
    elif range_type == "month":
        start = now - (30 * 24 * 60 * 60 * 1000)
    else:
        start = now - (7 * 24 * 60 * 60 * 1000)  # Default to week
    
    return (start, now)