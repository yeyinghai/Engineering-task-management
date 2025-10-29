<?php
/**
 * Configuration API endpoints
 */

// 确保直接访问时能够输出为纯 JSON
require_once __DIR__ . '/../includes/ApiResponse.php';

function handleConfig($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'GET':
                getConfig($db);
                break;
            case 'POST':
                updateConfig($db);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Config operation failed: ' . $e->getMessage(), 500);
    }
}

function getConfig($db) {
    try {
        $config = [
            'app_name' => '智能化施工任务管理系统',
            'version' => '1.0.0',
            'database_type' => 'mysql',
            'features' => [
                'task_management' => true,
                'personnel_management' => true,
                'notes' => true,
                'statistics' => true,
                'export' => true
            ]
        ];

        ApiResponse::success($config);
    } catch (Exception $e) {
        ApiResponse::error('Failed to fetch config: ' . $e->getMessage(), 500);
    }
}


function updateConfig($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            ApiResponse::error('Invalid configuration data', 400);
            return;
        }

        // For now, just return success as config is static
        ApiResponse::success($data, 'Configuration updated successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to update config: ' . $e->getMessage(), 500);
    }
}

// 文件末尾路由入口，确保直接访问该文件时也能被正确执行并返回 JSON
if (!isset($db)) {
    require_once __DIR__ . '/../includes/Database.php';
    $db = getDatabaseConnection();
}

handleConfig($db, $_SERVER['REQUEST_METHOD']);

?>