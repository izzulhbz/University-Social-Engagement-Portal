from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, List


class AdvancedAnalyticsDAL:
    """
    Analytics using SQL queries
    """
    
    @staticmethod
    def get_connection_network_stats(db: Session) -> Dict:
        """
        Analyze the social network structure
        Returns:
        - Most connected users
        - Total connections and pending requests
        """
        query = text("""
            WITH connection_counts AS (
                SELECT 
                    u.id,
                    u.name,
                    u.role,
                    COUNT(DISTINCT CASE 
                        WHEN c.requester_id = u.id THEN c.receiver_id
                        WHEN c.receiver_id = u.id THEN c.requester_id
                    END) as total_connections
                FROM user u
                LEFT JOIN connection c ON (
                    (c.requester_id = u.id OR c.receiver_id = u.id)
                    AND c.status = 'ACCEPTED'
                )
                GROUP BY u.id, u.name, u.role
            )
            SELECT 
                name as top_user,
                role as top_user_role,
                total_connections as top_connections
            FROM connection_counts
            WHERE total_connections > 0
            ORDER BY total_connections DESC
            LIMIT 10
        """)
        
        result = db.execute(query)
        rows = [dict(row._mapping) for row in result]
        
        # Get total stats
        total_connections_query = text("""
            SELECT COUNT(*) as count FROM connection WHERE status = 'ACCEPTED'
        """)
        pending_requests_query = text("""
            SELECT COUNT(*) as count FROM connection WHERE status = 'PENDING'
        """)
        
        total_connections = db.execute(total_connections_query).scalar()
        pending_requests = db.execute(pending_requests_query).scalar()
        
        return {
            'top_connected_users': rows,
            'network_stats': {
                'total_connections': total_connections,
                'pending_requests': pending_requests
            }
        }
    
    @staticmethod
    def get_role_based_insights(db: Session) -> Dict:
        """
        Get top students and faculty by connections
        """
        # Students with most connections
        students_query = text("""
            SELECT 
                u.id,
                u.name,
                u.email,
                s.course,
                COUNT(DISTINCT c.id) as connection_count
            FROM user u
            INNER JOIN student s ON s.user_id = u.id
            LEFT JOIN connection c ON (
                (c.requester_id = u.id OR c.receiver_id = u.id)
                AND c.status = 'ACCEPTED'
            )
            WHERE u.role = 'STUDENT'
            GROUP BY u.id, u.name, u.email, s.course
            ORDER BY connection_count DESC
            LIMIT 10
        """)
        
        # Faculty with most connections
        faculty_query = text("""
            SELECT 
                u.id,
                u.name,
                u.email,
                f.academic_position,
                COUNT(DISTINCT c.id) as connection_count
            FROM user u
            INNER JOIN faculty f ON f.user_id = u.id
            LEFT JOIN connection c ON (
                (c.requester_id = u.id OR c.receiver_id = u.id)
                AND c.status = 'ACCEPTED'
            )
            WHERE u.role = 'FACULTY'
            GROUP BY u.id, u.name, u.email, f.academic_position
            ORDER BY connection_count DESC
            LIMIT 10
        """)
        
        top_students = db.execute(students_query)
        top_faculty = db.execute(faculty_query)
        
        return {
            'top_connected_students': [dict(row._mapping) for row in top_students],
            'top_connected_faculty': [dict(row._mapping) for row in top_faculty]
        }
    
    @staticmethod
    def get_cross_role_connections(db: Session) -> List[Dict]:
        """
        Analyze connections between different roles
        """
        query = text("""
            SELECT 
                u1.role as role_1,
                u2.role as role_2,
                COUNT(*) as connection_count,
                COUNT(DISTINCT u1.id) as unique_users_role_1,
                COUNT(DISTINCT u2.id) as unique_users_role_2
            FROM connection c
            INNER JOIN user u1 ON u1.id = c.requester_id
            INNER JOIN user u2 ON u2.id = c.receiver_id
            WHERE c.status = 'ACCEPTED'
            GROUP BY u1.role, u2.role
            ORDER BY connection_count DESC
        """)
        
        result = db.execute(query)
        return [dict(row._mapping) for row in result]