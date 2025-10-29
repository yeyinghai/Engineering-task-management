<?php
/**
 * .env 文件加载器
 * 从 .env.local 或 .env 文件加载环境变量
 */

class EnvLoader {
    private static $loaded = false;
    private static $env = [];

    /**
     * 加载 .env 文件
     */
    public static function load() {
        if (self::$loaded) {
            return;
        }

        // 确定项目根目录
        $rootDir = dirname(dirname(dirname(__FILE__)));

        // 尝试加载 .env.local（优先级高）
        $envFile = $rootDir . '/.env.local';
        if (!file_exists($envFile)) {
            // 如果没有 .env.local，加载 .env
            $envFile = $rootDir . '/.env';
        }

        if (file_exists($envFile)) {
            self::parseFile($envFile);
        }

        self::$loaded = true;
    }

    /**
     * 解析 .env 文件内容
     */
    private static function parseFile($file) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // 忽略注释和空行
            if (empty($line) || strpos(trim($line), '#') === 0) {
                continue;
            }

            // 解析 KEY=VALUE 格式
            if (strpos($line, '=') === false) {
                continue;
            }

            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // 移除引号
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }

            self::$env[$key] = $value;
        }
    }

    /**
     * 获取环境变量值
     */
    public static function get($key, $default = null) {
        self::load();
        return isset(self::$env[$key]) ? self::$env[$key] : $default;
    }

    /**
     * 检查环境变量是否存在
     */
    public static function has($key) {
        self::load();
        return isset(self::$env[$key]);
    }

    /**
     * 获取所有环境变量
     */
    public static function all() {
        self::load();
        return self::$env;
    }
}
