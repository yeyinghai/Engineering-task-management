<?php
/**
 * Statistics API endpoints
 */

function handleStats($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'GET':
                getStats($db);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Stats operation failed: ' . $e->getMessage(), 500);
    }
}

function getStats($db) {
    try {
        $stats = [];

        // Task statistics
        $taskStmt = $db->prepare("SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM tasks");
        $taskStmt->execute();
        $taskStats = $taskStmt->fetch(PDO::FETCH_ASSOC);

        // Personnel statistics
        $personnelStmt = $db->prepare("SELECT
            COUNT(*) as total,
            COUNT(DISTINCT role) as roles,
            COUNT(DISTINCT department) as departments
            FROM personnel");
        $personnelStmt->execute();
        $personnelStats = $personnelStmt->fetch(PDO::FETCH_ASSOC);

        // Today's tasks
        $todayStmt = $db->prepare("SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM tasks
            WHERE DATE(created_at) = CURDATE()");
        $todayStmt->execute();
        $todayStats = $todayStmt->fetch(PDO::FETCH_ASSOC);

        // Category statistics
        $categoryStmt = $db->prepare("SELECT category, COUNT(*) as count FROM tasks GROUP BY category ORDER BY count DESC");
        $categoryStmt->execute();
        $categoryStats = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);

        $stats = [
            'tasks' => [
                'total' => (int)$taskStats['total'],
                'pending' => (int)$taskStats['pending'],
                'in_progress' => (int)$taskStats['in_progress'],
                'completed' => (int)$taskStats['completed']
            ],
            'personnel' => [
                'total' => (int)$personnelStats['total'],
                'roles' => (int)$personnelStats['roles'],
                'departments' => (int)$personnelStats['departments']
            ],
            'today' => [
                'total' => (int)$todayStats['total'],
                'pending' => (int)$todayStats['pending'],
                'in_progress' => (int)$todayStats['in_progress'],
                'completed' => (int)$todayStats['completed']
            ],
            'categories' => $categoryStats
        ];

        ApiResponse::success($stats);
    } catch (Exception $e) {
        ApiResponse::error('Failed to fetch statistics: ' . $e->getMessage(), 500);
    }
}
?>