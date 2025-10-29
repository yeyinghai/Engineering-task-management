<?php
/**
 * 简单的诊断脚本 - 显示所有错误
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/plain; charset=utf-8');

echo "=== PHP 环境诊断 ===\n\n";

// 1. 检查文件是否存在
echo "1. 文件检查:\n";
$files = [
    'EnvLoader.php' => __DIR__ . '/api/includes/EnvLoader.php',
    'config.php' => __DIR__ . '/api/includes/config.php',
    '.env.local' => __DIR__ . '/.env.local',
    '.env' => __DIR__ . '/.env',
];

foreach ($files as $name => $path) {
    $exists = file_exists($path) ? '✓ 存在' : '✗ 不存在';
    echo "  $name: $exists ($path)\n";
}

echo "\n2. 加载 EnvLoader:\n";
try {
    require_once __DIR__ . '/api/includes/EnvLoader.php';
    echo "  ✓ EnvLoader 加载成功\n";
} catch (Throwable $e) {
    echo "  ✗ EnvLoader 加载失败: " . $e->getMessage() . "\n";
    die();
}

echo "\n3. 加载环境变量:\n";
try {
    $envVars = EnvLoader::all();
    echo "  ✓ 环境变量加载成功，共 " . count($envVars) . " 个\n";

    echo "\n  数据库配置:\n";
    echo "    DB_HOST: " . EnvLoader::get('DB_HOST', '(未设置)') . "\n";
    echo "    DB_PORT: " . EnvLoader::get('DB_PORT', '(未设置)') . "\n";
    echo "    DB_NAME: " . EnvLoader::get('DB_NAME', '(未设置)') . "\n";
    echo "    DB_USERNAME: " . EnvLoader::get('DB_USERNAME', '(未设置)') . "\n";
    echo "    DB_PASSWORD: " . (EnvLoader::get('DB_PASSWORD', '') ? '(已设置)' : '(未设置)') . "\n";
} catch (Throwable $e) {
    echo "  ✗ 环境变量加载失败: " . $e->getMessage() . "\n";
    die();
}

echo "\n4. 加载配置文件:\n";
try {
    require_once __DIR__ . '/api/includes/config.php';
    echo "  ✓ config.php 加载成功\n";
    echo "    APP_DEBUG: " . (APP_DEBUG ? 'true' : 'false') . "\n";
    echo "    DB_HOST: " . DB_HOST . "\n";
    echo "    DB_PORT: " . DB_PORT . "\n";
    echo "    DB_NAME: " . DB_NAME . "\n";
} catch (Throwable $e) {
    echo "  ✗ config.php 加载失败: " . $e->getMessage() . "\n";
    echo "  堆栈跟踪:\n";
    echo $e->getTraceAsString() . "\n";
    die();
}

echo "\n5. 加载 Database 类:\n";
try {
    require_once __DIR__ . '/api/includes/Database.php';
    echo "  ✓ Database 类加载成功\n";
} catch (Throwable $e) {
    echo "  ✗ Database 类加载失败: " . $e->getMessage() . "\n";
    die();
}

echo "\n6. 测试数据库连接:\n";
try {
    $database = new Database();
    $db = $database->getConnection();
    echo "  ✓ 数据库连接成功\n";

    $version = $db->query('SELECT VERSION()')->fetchColumn();
    echo "  ✓ MySQL 版本: $version\n";
} catch (Throwable $e) {
    echo "  ✗ 数据库连接失败: " . $e->getMessage() . "\n";
    die();
}

echo "\n=== 所有检查都通过！===\n";
?>
