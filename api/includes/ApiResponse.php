<?php
/**
 * API响应处理类
 * 全局保护：关闭 display_errors（防止 HTML 错误页泄露），启动输出缓冲以捕获意外输出。
 */

if (!defined('APP_DEBUG')) {
    // 默认为关闭调试，以免将错误渲染为 HTML 给前端
    define('APP_DEBUG', false);
}

// 关闭直接输出错误，改为记录到日志（如果 APP_DEBUG 为 true，可在 log 中写出）
@ini_set('display_errors', '0');

// 开始输出缓冲，之后 ApiResponse 会清空缓冲区并返回干净的 JSON
if (ob_get_level() == 0) {
    ob_start();
}

class ApiResponse {
    
    /**
     * 返回成功响应
     */
    public static function success($data = null, $message = 'Success', $code = 200) {
        // 清理输出缓冲区，防止之前有 HTML 或警告输出
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        http_response_code($code);

        $response = [
            'success' => true,
            'message' => $message,
            'timestamp' => date('c')
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * 返回错误响应
     */
    public static function error($message = 'Error', $code = 400, $details = null) {
        // 清理输出缓冲区，防止之前有 HTML 或警告输出
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        http_response_code($code);

        $response = [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];

        if ($details !== null) {
            $response['details'] = $details;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * 返回数据响应（兼容旧格式）
     */
    public static function json($data, $code = 200) {
        // 清理输出缓冲区，防止之前有 HTML 或警告输出
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * 获取请求体数据
     */
    public static function getRequestData() {
        $input = file_get_contents('php://input');
        
        if (empty($input)) {
            return [];
        }
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            self::error('Invalid JSON format', 400);
        }
        
        return $data;
    }
    
    /**
     * 验证必需参数
     */
    public static function validateRequired($data, $required = []) {
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                self::error("Missing required field: {$field}", 400);
            }
        }
    }
    
    /**
     * 记录API日志
     */
    public static function log($message, $level = 'INFO') {
        if (APP_DEBUG) {
            $timestamp = date('Y-m-d H:i:s');
            $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
            error_log($logMessage, 3, __DIR__ . '/../../logs/api.log');
        }
    }
}
 