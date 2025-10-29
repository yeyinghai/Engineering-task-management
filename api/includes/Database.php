<?php
/**
 * Database class - 提供 PDO 连接
 * 读取同目录下的 config.php 中的 DB_* 常量
 */

require_once __DIR__ . '/config.php';

class Database {
    /** @var PDO|null */
    private $pdo = null;

    public function __construct() {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);

        try {
            $this->pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            // 抛出异常让上层统一处理为 JSON 错误响应
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }

    /**
     * 返回 PDO 连接
     * @return PDO
     */
    public function getConnection() {
        return $this->pdo;
    }
}

// 兼容旧代码：提供全局函数 getDatabaseConnection()
if (!function_exists('getDatabaseConnection')) {
    function getDatabaseConnection() {
        static $connection = null;
        if ($connection === null) {
            $database = new Database();
            $connection = $database->getConnection();
        }
        return $connection;
    }
}
