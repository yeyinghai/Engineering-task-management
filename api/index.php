<?php
/**
 * 智能化施工任务管理系统 - PHP API 接口
 * 适用于小皮面板(PhpStudy)环境
 */

// 设置字符编码和响应头
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 引入配置和工具类
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/ApiResponse.php';

try {
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 路由处理
    $requestUri = $_SERVER['REQUEST_URI'];
    $requestMethod = $_SERVER['REQUEST_METHOD'];

    // 移除查询参数，获取路径
    $path = parse_url($requestUri, PHP_URL_PATH);

    // 规范化：移除 /api 前缀、/index.php、/endpoints 前缀，支持多种漂亮 URL 与直接文件访问形式
    $normalized = $path;
    $normalized = preg_replace('#^/api#', '', $normalized);
    $normalized = preg_replace('#^/index\.php#', '', $normalized);
    $normalized = preg_replace('#^/endpoints#', '', $normalized);

    // 取得最后一段，并去掉 .php 扩展名（如果有）
    $segment = basename($normalized);
    $segment = preg_replace('/\.php$/', '', $segment);

    // 路由分发（以最后一段为准，兼容 /api/tasks /api/index.php/tasks /api/endpoints/tasks.php 等）
    switch ($segment) {
        case 'tasks':
            require_once __DIR__ . '/endpoints/tasks.php';
            handleTasks($db, $requestMethod);
            break;

        case 'personnel':
            require_once __DIR__ . '/endpoints/personnel.php';
            handlePersonnel($db, $requestMethod);
            break;

        case 'categories':
            require_once __DIR__ . '/endpoints/categories.php';
            handleCategories($db, $requestMethod);
            break;

        case 'config':
            require_once __DIR__ . '/endpoints/config.php';
            handleConfig($db, $requestMethod);
            break;

        case 'sync':
            require_once __DIR__ . '/endpoints/sync.php';
            handleSync($db, $requestMethod);
            break;

        case 'stats':
            require_once __DIR__ . '/endpoints/stats.php';
            handleStats($db, $requestMethod);
            break;

        case 'working-hours':
            require_once __DIR__ . '/endpoints/working-hours.php';
            handleWorkingHours($db, $requestMethod);
            break;

        case 'auth':
            require_once __DIR__ . '/endpoints/auth.php';
            handleAuth($db, $requestMethod);
            break;

        default:
            ApiResponse::error('API endpoint not found', 404);
    }
    
} catch (Exception $e) {
    ApiResponse::error('Internal server error: ' . $e->getMessage(), 500);
}