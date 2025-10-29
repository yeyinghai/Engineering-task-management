<?php
// 引入统一响应类，确保输出为纯 JSON
require_once __DIR__ . '/../includes/ApiResponse.php';

// 如果直接访问此文件（不是从 index.php 调用），进行初始化
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

    // 引入配置和数据库
    require_once __DIR__ . '/../includes/config.php';
    require_once __DIR__ . '/../includes/Database.php';

    try {
        $database = new Database();
        $db = $database->getConnection();

        // 在文件结尾调用处理函数
        if (function_exists('handlePersonnel')) {
            handlePersonnel($db, $_SERVER['REQUEST_METHOD']);
            exit;
        }
    } catch (Exception $e) {
        ApiResponse::error('Personnel operation failed: ' . $e->getMessage(), 500);
        exit;
    }
}

/**
 * Personnel management API endpoints
 */

function handlePersonnel($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'GET':
                getAllPersonnel($db);
                break;
            case 'POST':
                createPersonnel($db);
                break;
            case 'PUT':
                updatePersonnel($db);
                break;
            case 'DELETE':
                deletePersonnel($db);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Personnel operation failed: ' . $e->getMessage(), 500);
    }
}

function getAllPersonnel($db) {
    try {
        $stmt = $db->prepare("SELECT * FROM personnel ORDER BY name");
        $stmt->execute();
        $personnel = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ApiResponse::success($personnel);
    } catch (Exception $e) {
        ApiResponse::error('Failed to fetch personnel: ' . $e->getMessage(), 500);
    }
}

function createPersonnel($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['name']) || trim($data['name']) === '') {
            ApiResponse::error('Name is required', 400);
            return;
        }

        $name = trim($data['name']);
        $role = isset($data['role']) ? trim($data['role']) : '施工人员';
        $department = isset($data['department']) ? trim($data['department']) : '';
        $phone = isset($data['phone']) ? trim($data['phone']) : '';

        // Check if personnel already exists
        $checkStmt = $db->prepare("SELECT id FROM personnel WHERE name = ?");
        $checkStmt->execute([$name]);
        if ($checkStmt->fetch()) {
            ApiResponse::error('Personnel with this name already exists', 409);
            return;
        }

        $stmt = $db->prepare("INSERT INTO personnel (name, role, department, phone, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$name, $role, $department, $phone]);

        $personnelId = $db->lastInsertId();

        // Fetch the created personnel
        $fetchStmt = $db->prepare("SELECT * FROM personnel WHERE id = ?");
        $fetchStmt->execute([$personnelId]);
        $personnel = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        ApiResponse::success($personnel, 'Personnel created successfully', 201);
    } catch (Exception $e) {
        ApiResponse::error('Failed to create personnel: ' . $e->getMessage(), 500);
    }
}

function updatePersonnel($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Personnel ID is required', 400);
            return;
        }

        $id = $data['id'];

        // Convert float ID to integer for database lookup
        if (is_float($id) || is_string($id)) {
            $id = (int)$id;
        }

        // Validate that ID is a positive integer
        if (!is_int($id) || $id <= 0) {
            ApiResponse::error('Invalid personnel ID', 400);
            return;
        }

        // Check if personnel exists
        $checkStmt = $db->prepare("SELECT * FROM personnel WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Personnel not found', 404);
            return;
        }

        $updates = [];
        $params = [];

        if (isset($data['name']) && trim($data['name']) !== '') {
            $name = trim($data['name']);
            if ($name !== $existing['name']) {
                // Check if new name already exists
                $nameCheckStmt = $db->prepare("SELECT id FROM personnel WHERE name = ? AND id != ?");
                $nameCheckStmt->execute([$name, $id]);
                if ($nameCheckStmt->fetch()) {
                    ApiResponse::error('Personnel with this name already exists', 409);
                    return;
                }
            }
            $updates[] = "name = ?";
            $params[] = $name;
        }

        if (isset($data['role'])) {
            $updates[] = "role = ?";
            $params[] = trim($data['role']);
        }

        if (isset($data['department'])) {
            $updates[] = "department = ?";
            $params[] = trim($data['department']);
        }

        if (isset($data['phone'])) {
            $updates[] = "phone = ?";
            $params[] = trim($data['phone']);
        }

        if (empty($updates)) {
            ApiResponse::error('No valid fields to update', 400);
            return;
        }

        $updates[] = "updated_at = NOW()";
        $params[] = $id;

        $sql = "UPDATE personnel SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Fetch the updated personnel
        $fetchStmt = $db->prepare("SELECT * FROM personnel WHERE id = ?");
        $fetchStmt->execute([$id]);
        $personnel = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        ApiResponse::success($personnel, 'Personnel updated successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to update personnel: ' . $e->getMessage(), 500);
    }
}

function deletePersonnel($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Personnel ID is required', 400);
            return;
        }

        $id = $data['id'];

        // Convert float ID to integer for database lookup
        if (is_float($id) || is_string($id)) {
            $id = (int)$id;
        }

        // Validate that ID is a positive integer
        if (!is_int($id) || $id <= 0) {
            ApiResponse::error('Invalid personnel ID', 400);
            return;
        }

        // Check if personnel exists
        $checkStmt = $db->prepare("SELECT * FROM personnel WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Personnel not found', 404);
            return;
        }

        // 开始数据库事务
        $db->beginTransaction();

        try {
            // 第一步：从相关任务中移除这个人员
            // 获取所有包含assignees的任务
            $tasksStmt = $db->prepare("SELECT id, assignees FROM tasks WHERE assignees IS NOT NULL AND assignees != '[]'");
            $tasksStmt->execute();
            $tasks = $tasksStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($tasks as $task) {
                $assignees = json_decode($task['assignees'], true) ?: [];

                // 检查是否包含要删除的人员姓名
                if (in_array($existing['name'], $assignees)) {
                    // 从assignees中移除这个人员
                    $updatedAssignees = array_filter($assignees, function($assignee) use ($existing) {
                        return $assignee !== $existing['name'];
                    });

                    // 重新索引数组
                    $updatedAssignees = array_values($updatedAssignees);

                    // 更新任务
                    $updateTaskStmt = $db->prepare("UPDATE tasks SET assignees = ? WHERE id = ?");
                    $updateTaskStmt->execute([json_encode($updatedAssignees), $task['id']]);

                    error_log("Updated task {$task['id']}: removed {$existing['name']} from assignees");
                }
            }

            // 第二步：删除人员记录
            $stmt = $db->prepare("DELETE FROM personnel WHERE id = ?");
            $result = $stmt->execute([$id]);

            if (!$result || $stmt->rowCount() === 0) {
                throw new Exception('Failed to delete personnel from database');
            }

            // 提交事务
            $db->commit();

            ApiResponse::success($existing, 'Personnel deleted successfully and removed from all tasks');
        } catch (Exception $e) {
            // 回滚事务
            $db->rollback();
            throw $e;
        }

    } catch (Exception $e) {
        ApiResponse::error('Failed to delete personnel: ' . $e->getMessage(), 500);
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
        handlePersonnel($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Personnel operation failed: ' . $e->getMessage(), 500);
    }
}
?>
?>