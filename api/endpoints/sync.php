<?php
// 引入统一响应类，确保输出为纯 JSON
require_once __DIR__ . '/../includes/ApiResponse.php';

// 如果直接访问此文件，进行初始化
if (!function_exists('handleSync')) {
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
        handleSync($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Sync operation failed: ' . $e->getMessage(), 500);
    }
    exit;
}

/**
 * Data synchronization API endpoints
 */

function handleSync($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'POST':
                syncData($db);
                break;
            case 'GET':
                ApiResponse::success(['info' => '请用POST同步数据'], 'Sync API说明');
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Sync operation failed: ' . $e->getMessage(), 500);
    }
}

function syncData($db) {
    try {
        $raw = file_get_contents('php://input');
        // 简单请求日志，用于调试局域网请求是否到达服务器
        $logEntry = sprintf("[%s] %s %s\n", date('Y-m-d H:i:s'), $_SERVER['REMOTE_ADDR'] ?? 'unknown', $raw);
        file_put_contents(__DIR__ . '/../logs/sync_debug.log', $logEntry, FILE_APPEND | LOCK_EX);

        // 确保正确的UTF-8编码
        if (!mb_check_encoding($raw, 'UTF-8')) {
            $raw = mb_convert_encoding($raw, 'UTF-8', 'auto');
        }

        $data = json_decode($raw, true);

        if (!$data) {
            $jsonError = json_last_error_msg();
            $logEntry = sprintf("[%s] JSON decode error: %s, Raw data: %s\n", date('Y-m-d H:i:s'), $jsonError, $raw);
            file_put_contents(__DIR__ . '/../logs/sync_debug.log', $logEntry, FILE_APPEND | LOCK_EX);
            ApiResponse::error('No data to sync. JSON error: ' . $jsonError, 400);
            return;
        }

        $syncResults = [
            'tasks' => 0,
            'personnel' => 0,
            'errors' => []
        ];

        // Sync tasks
        if (isset($data['tasks']) && is_array($data['tasks'])) {
            foreach ($data['tasks'] as $task) {
                try {
                    syncTask($db, $task);
                    $syncResults['tasks']++;
                } catch (Exception $e) {
                    $syncResults['errors'][] = 'Task sync error: ' . $e->getMessage();
                }
            }
        }

        // Sync personnel
        if (isset($data['personnel']) && is_array($data['personnel'])) {
            foreach ($data['personnel'] as $person) {
                try {
                    syncPersonnel($db, $person);
                    $syncResults['personnel']++;
                } catch (Exception $e) {
                    $syncResults['errors'][] = 'Personnel sync error: ' . $e->getMessage();
                }
            }
        }

        ApiResponse::success($syncResults, 'Data synchronized successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to sync data: ' . $e->getMessage(), 500);
    }
}

function syncTask($db, $task) {
    if (!isset($task['id']) || !isset($task['title'])) {
        throw new Exception('Invalid task data');
    }

    // 准备任务数据 - 添加计时器字段
    $sql = "INSERT INTO " . TABLE_TASKS . " (id, title, description, status, category, assignees, notes, images, timer_running, total_time, timer_started_at, created_at, updated_at)
            VALUES (:id, :title, :description, :status, :category, :assignees, :notes, :images, :timer_running, :total_time, :timer_started_at, :created_at, :updated_at)
            ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            status = VALUES(status),
            category = VALUES(category),
            assignees = VALUES(assignees),
            notes = VALUES(notes),
            images = VALUES(images),
            timer_running = VALUES(timer_running),
            total_time = VALUES(total_time),
            timer_started_at = VALUES(timer_started_at),
            updated_at = VALUES(updated_at)";

    $stmt = $db->prepare($sql);

    // 处理时间戳
    $createdAt = isset($task['createdAt']) ? date('Y-m-d H:i:s', strtotime($task['createdAt'])) : date('Y-m-d H:i:s');
    $updatedAt = isset($task['updatedAt']) ? date('Y-m-d H:i:s', strtotime($task['updatedAt'])) : date('Y-m-d H:i:s');

    // 处理JSON字段
    $assignees = isset($task['assignees']) ? json_encode($task['assignees']) : '[]';
    $notes = isset($task['notes']) ? json_encode($task['notes']) : '[]';
    $images = isset($task['images']) ? json_encode($task['images']) : '[]';

    // 处理计时器字段
    $timerRunning = isset($task['timerRunning']) ? (int)$task['timerRunning'] : 0;
    $totalTime = isset($task['totalTime']) ? (int)$task['totalTime'] : 0;

    // 处理 timerStartedAt - 可能是时间戳、Date对象字符串或日期字符串
    $timerStartedAt = null;
    if (isset($task['timerStartedAt']) && $task['timerStartedAt']) {
        $timeValue = $task['timerStartedAt'];
        // 如果是数字（时间戳），转换为日期格式
        if (is_numeric($timeValue)) {
            $timerStartedAt = date('Y-m-d H:i:s', (int)$timeValue / 1000);
        } else {
            // 如果是字符串，尝试解析
            $timestamp = strtotime($timeValue);
            if ($timestamp !== false) {
                $timerStartedAt = date('Y-m-d H:i:s', $timestamp);
            }
        }
    }

    $stmt->execute([
        ':id' => $task['id'],
        ':title' => $task['title'],
        ':description' => $task['description'] ?? '',
        ':status' => $task['status'] ?? 'pending',
        ':category' => $task['category'] ?? '一般',
        ':assignees' => $assignees,
        ':notes' => $notes,
        ':images' => $images,
        ':timer_running' => $timerRunning,
        ':total_time' => $totalTime,
        ':timer_started_at' => $timerStartedAt,
        ':created_at' => $createdAt,
        ':updated_at' => $updatedAt
    ]);
}


function syncPersonnel($db, $person) {
    if (!isset($person['name'])) {
        throw new Exception('Invalid personnel data: missing name');
    }

    // 对于前端生成的浮点数ID，我们不能直接使用，让数据库自动生成ID
    // 检查是否已存在同名人员
    $checkSql = "SELECT id FROM " . TABLE_PERSONNEL . " WHERE name = :name";
    $checkStmt = $db->prepare($checkSql);
    $checkStmt->execute([':name' => $person['name']]);
    $existingPerson = $checkStmt->fetch();

    // 处理时间戳
    $createdAt = isset($person['createdAt']) ? date('Y-m-d H:i:s', strtotime($person['createdAt'])) : date('Y-m-d H:i:s');
    $updatedAt = isset($person['updatedAt']) ? date('Y-m-d H:i:s', strtotime($person['updatedAt'])) : date('Y-m-d H:i:s');

    if ($existingPerson) {
        // 更新现有人员
        $sql = "UPDATE " . TABLE_PERSONNEL . "
                SET role = :role, department = :department, phone = :phone, updated_at = :updated_at
                WHERE name = :name";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':name' => $person['name'],
            ':role' => $person['role'] ?? '',
            ':department' => $person['department'] ?? '',
            ':phone' => $person['phone'] ?? '',
            ':updated_at' => $updatedAt
        ]);
    } else {
        // 插入新人员（让数据库自动生成ID）
        $sql = "INSERT INTO " . TABLE_PERSONNEL . " (name, role, department, phone, created_at, updated_at)
                VALUES (:name, :role, :department, :phone, :created_at, :updated_at)";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':name' => $person['name'],
            ':role' => $person['role'] ?? '',
            ':department' => $person['department'] ?? '',
            ':phone' => $person['phone'] ?? '',
            ':created_at' => $createdAt,
            ':updated_at' => $updatedAt
        ]);
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
        handleSync($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Sync operation failed: ' . $e->getMessage(), 500);
    }
}
?>

