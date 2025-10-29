<?php
// 引入统一响应类，确保输出为纯 JSON
require_once __DIR__ . '/../includes/ApiResponse.php';

// 如果直接访问此文件，进行初始化
if (!function_exists('handleTasks')) {
    // 设置响应头
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    // 处理预检请求
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    // 引入配置和数据库
    require_once __DIR__ . '/../includes/config.php';
    require_once __DIR__ . '/../includes/Database.php';

    try {
        $database = new Database();
        $db = $database->getConnection();
        handleTasks($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Task operation failed: ' . $e->getMessage(), 500);
    }
    exit;
}

/**
 * Tasks management API endpoints
 */

function handleTasks($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'GET':
                getAllTasks($db);
                break;
            case 'POST':
                createTask($db);
                break;
            case 'PUT':
                updateTask($db);
                break;
            case 'DELETE':
                deleteTask($db);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Task operation failed: ' . $e->getMessage(), 500);
    }
}

function getAllTasks($db) {
    try {
        $stmt = $db->prepare("SELECT * FROM tasks ORDER BY created_at DESC");
        $stmt->execute();
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse assignees JSON for each task
        foreach ($tasks as &$task) {
            if ($task['assignees']) {
                $task['assignees'] = json_decode($task['assignees'], true) ?: [];
            } else {
                $task['assignees'] = [];
            }

            if ($task['notes']) {
                $task['notes'] = json_decode($task['notes'], true) ?: [];
            } else {
                $task['notes'] = [];
            }

            if ($task['images']) {
                $task['images'] = json_decode($task['images'], true) ?: [];
            } else {
                $task['images'] = [];
            }

            // Convert database field names to JavaScript camelCase
            $task['createdAt'] = $task['created_at'];
            $task['updatedAt'] = $task['updated_at'];

            // 处理计时器字段
            $task['timerRunning'] = (bool)$task['timer_running'];
            $task['totalTime'] = (int)$task['total_time'];
            $task['timerStartedAt'] = $task['timer_started_at'];

            // Remove the underscore versions to avoid confusion
            unset($task['created_at']);
            unset($task['updated_at']);
            unset($task['timer_running']);
            unset($task['total_time']);
            unset($task['timer_started_at']);
        }

        ApiResponse::success($tasks);
    } catch (Exception $e) {
        ApiResponse::error('Failed to fetch tasks: ' . $e->getMessage(), 500);
    }
}

function createTask($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['title']) || trim($data['title']) === '') {
            ApiResponse::error('Title is required', 400);
            return;
        }

        $title = trim($data['title']);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $category = isset($data['category']) ? trim($data['category']) : '一般';
        $status = isset($data['status']) ? $data['status'] : 'pending';
        $assignees = isset($data['assignees']) && is_array($data['assignees']) ? json_encode($data['assignees']) : '[]';
        $notes = isset($data['notes']) && is_array($data['notes']) ? json_encode($data['notes']) : '[]';
        $images = isset($data['images']) && is_array($data['images']) ? json_encode($data['images']) : '[]';

        $stmt = $db->prepare("INSERT INTO tasks (title, description, category, status, assignees, notes, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$title, $description, $category, $status, $assignees, $notes, $images]);

        $taskId = $db->lastInsertId();

        // Fetch the created task
        $fetchStmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
        $fetchStmt->execute([$taskId]);
        $task = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        // Parse assignees and notes
        $task['assignees'] = json_decode($task['assignees'], true) ?: [];
        $task['notes'] = json_decode($task['notes'], true) ?: [];
        $task['images'] = json_decode($task['images'], true) ?: [];

        // Convert database field names to JavaScript camelCase
        $task['createdAt'] = $task['created_at'];
        $task['updatedAt'] = $task['updated_at'];

        // Remove the underscore versions to avoid confusion
        unset($task['created_at']);
        unset($task['updated_at']);

        ApiResponse::success($task, 'Task created successfully', 201);
    } catch (Exception $e) {
        ApiResponse::error('Failed to create task: ' . $e->getMessage(), 500);
    }
}

function updateTask($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Task ID is required', 400);
            return;
        }

        $id = $data['id'];

        // Check if task exists
        $checkStmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Task not found', 404);
            return;
        }

        $updates = [];
        $params = [];

        if (isset($data['title']) && trim($data['title']) !== '') {
            $updates[] = "title = ?";
            $params[] = trim($data['title']);
        }

        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = trim($data['description']);
        }

        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $params[] = trim($data['category']);
        }

        if (isset($data['status'])) {
            $updates[] = "status = ?";
            $params[] = $data['status'];
        }

        if (isset($data['assignees']) && is_array($data['assignees'])) {
            $updates[] = "assignees = ?";
            $params[] = json_encode($data['assignees']);
        }

        if (isset($data['notes']) && is_array($data['notes'])) {
            $updates[] = "notes = ?";
            $params[] = json_encode($data['notes']);
        }

        if (isset($data['images']) && is_array($data['images'])) {
            $updates[] = "images = ?";
            $params[] = json_encode($data['images']);
        }

        if (empty($updates)) {
            ApiResponse::error('No valid fields to update', 400);
            return;
        }

        $updates[] = "updated_at = NOW()";
        $params[] = $id;

        $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Fetch the updated task
        $fetchStmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
        $fetchStmt->execute([$id]);
        $task = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        // Parse assignees and notes
        $task['assignees'] = json_decode($task['assignees'], true) ?: [];
        $task['notes'] = json_decode($task['notes'], true) ?: [];
        $task['images'] = json_decode($task['images'], true) ?: [];

        // Convert database field names to JavaScript camelCase
        $task['createdAt'] = $task['created_at'];
        $task['updatedAt'] = $task['updated_at'];

        // Remove the underscore versions to avoid confusion
        unset($task['created_at']);
        unset($task['updated_at']);

        ApiResponse::success($task, 'Task updated successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to update task: ' . $e->getMessage(), 500);
    }
}

function deleteTask($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Task ID is required', 400);
            return;
        }

        $id = $data['id'];

        // Convert float ID to integer for database lookup
        if (is_float($id) || is_string($id)) {
            $id = (int)$id;
        }

        // Validate that ID is a positive integer
        if (!is_int($id) || $id <= 0) {
            ApiResponse::error('Invalid task ID', 400);
            return;
        }

        // Check if task exists
        $checkStmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Task not found', 404);
            return;
        }

        $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");
        $result = $stmt->execute([$id]);

        if (!$result || $stmt->rowCount() === 0) {
            ApiResponse::error('Failed to delete task from database', 500);
            return;
        }

        // Parse assignees and notes for response
        $existing['assignees'] = json_decode($existing['assignees'], true) ?: [];
        $existing['notes'] = json_decode($existing['notes'], true) ?: [];
        $existing['images'] = json_decode($existing['images'], true) ?: [];

        ApiResponse::success($existing, 'Task deleted successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to delete task: ' . $e->getMessage(), 500);
    }
}

// 直接访问此文件时的路由入口
if (!defined('_API_INDEX_PHP')) {
    // 设置响应头
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    // 处理预检请求
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    try {
        // 引入配置和数据库
        require_once __DIR__ . '/../includes/config.php';
        require_once __DIR__ . '/../includes/Database.php';

        $database = new Database();
        $db = $database->getConnection();
        handleTasks($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Task operation failed: ' . $e->getMessage(), 500);
    }
}
?>
