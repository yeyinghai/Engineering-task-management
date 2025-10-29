<?php
/**
 * 数据库配置文件
 * 从 .env.local 或 .env 文件读取配置
 */

// 引入 .env 加载器
require_once __DIR__ . '/EnvLoader.php';

// 从 .env.local / .env 加载数据库配置
define('DB_HOST', EnvLoader::get('DB_HOST', 'localhost'));
define('DB_PORT', EnvLoader::get('DB_PORT', '3306'));
define('DB_NAME', EnvLoader::get('DB_NAME', 'todolist'));
define('DB_USERNAME', EnvLoader::get('DB_USERNAME', 'root'));
define('DB_PASSWORD', EnvLoader::get('DB_PASSWORD', ''));
define('DB_CHARSET', EnvLoader::get('DB_CHARSET', 'utf8mb4'));

// 时区设置
date_default_timezone_set('Asia/Shanghai');

// 错误报告设置（生产环境请关闭）
$appDebug = EnvLoader::get('APP_DEBUG', 'true') === 'true';
error_reporting($appDebug ? E_ALL : (E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED));
ini_set('display_errors', $appDebug ? '1' : '0');

// 应用配置
define('APP_DEBUG', $appDebug);
define('APP_VERSION', EnvLoader::get('APP_VERSION', '2.0.0'));
define('APP_NAME', EnvLoader::get('APP_NAME', '施工任务管理系统'));
define('APP_URL', EnvLoader::get('APP_URL', 'http://localhost'));

// 数据库表名
define('TABLE_TASKS', 'tasks');
define('TABLE_PERSONNEL', 'personnel');
define('TABLE_CONFIG', 'config');
?>
