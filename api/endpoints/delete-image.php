<?php
// 引入统一响应类
require_once __DIR__ . '/../includes/ApiResponse.php';

/**
 * 图片删除API端点
 */

function handleDelete($requestMethod) {
    try {
        switch ($requestMethod) {
            case 'DELETE':
                deleteImage();
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Delete operation failed: ' . $e->getMessage(), 500);
    }
}

function deleteImage() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || (!isset($data['fileName']) && !isset($data['url']))) {
            ApiResponse::error('Image fileName or url is required', 400);
            return;
        }

        // 记录接收到的数据，便于调试
        error_log('Delete image request data: ' . json_encode($data));

        // 优先使用完整的url路径，回退到fileName
        if (isset($data['url']) && $data['url']) {
            // 从url中提取相对路径，例如: src/images/2025/01/29/task_123/filename.jpg
            $relativePath = $data['url'];
            $filePath = __DIR__ . '/../../' . $relativePath;
            error_log('Using URL path: ' . $filePath);
        } else {
            // 旧格式兼容：直接在images根目录查找
            $fileName = $data['fileName'];
            $filePath = __DIR__ . '/../../src/images/' . $fileName;
            error_log('Using fileName path: ' . $filePath);
        }

        // 检查文件是否存在并删除
        if (file_exists($filePath)) {
            if (unlink($filePath)) {
                error_log('File deleted successfully: ' . $filePath);

                // 检查是否可以删除空的任务文件夹
                $taskDir = dirname($filePath);
                if (is_dir($taskDir) && count(scandir($taskDir)) == 2) { // 只有 . 和 ..
                    rmdir($taskDir);
                    error_log('Empty task directory removed: ' . $taskDir);

                    // 检查是否可以删除空的日期文件夹
                    $dateDir = dirname($taskDir);
                    if (is_dir($dateDir) && count(scandir($dateDir)) == 2) {
                        rmdir($dateDir);
                        error_log('Empty date directory removed: ' . $dateDir);

                        // 检查年/月文件夹（但通常不删除，因为可能有其他日期的数据）
                    }
                }

                ApiResponse::success(['deleted' => true, 'path' => $filePath], 'Image file deleted successfully');
            } else {
                error_log('Failed to delete file: ' . $filePath);
                ApiResponse::error('Failed to delete image file', 500);
            }
        } else {
            // 文件不存在也认为是成功（可能已经被删除）
            error_log('File not found: ' . $filePath);
            ApiResponse::success(['deleted' => false, 'path' => $filePath], 'Image file not found (may already be deleted)');
        }

    } catch (Exception $e) {
        error_log('Delete image exception: ' . $e->getMessage());
        ApiResponse::error('Failed to delete image: ' . $e->getMessage(), 500);
    }
}

// 路由入口
handleDelete($_SERVER['REQUEST_METHOD']);
?>