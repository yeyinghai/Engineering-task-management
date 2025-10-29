<?php
// 引入统一响应类
require_once __DIR__ . '/../includes/ApiResponse.php';

/**
 * 图片上传API端点
 */

function handleUpload($requestMethod) {
    try {
        switch ($requestMethod) {
            case 'POST':
                uploadImage();
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Upload operation failed: ' . $e->getMessage(), 500);
    }
}

function uploadImage() {
    try {
        // 检查是否有文件上传
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            ApiResponse::error('No image file uploaded or upload error', 400);
            return;
        }

        // 获取任务ID参数
        $taskId = isset($_POST['taskId']) ? $_POST['taskId'] : null;
        if (!$taskId) {
            ApiResponse::error('Task ID is required', 400);
            return;
        }

        $file = $_FILES['image'];

        // 验证文件类型
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            ApiResponse::error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400);
            return;
        }

        // 验证文件大小 (5MB)
        $maxSize = 5 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            ApiResponse::error('File size too large. Maximum 5MB allowed', 400);
            return;
        }

        // 创建基础images目录
        $baseDir = __DIR__ . '/../../src/images/';
        if (!is_dir($baseDir)) {
            if (!mkdir($baseDir, 0755, true)) {
                ApiResponse::error('Failed to create base images directory', 500);
                return;
            }
        }

        // 创建按日期分类的文件夹结构：images/2025/01/29/
        $today = date('Y/m/d');
        $dateDir = $baseDir . $today . '/';
        if (!is_dir($dateDir)) {
            if (!mkdir($dateDir, 0755, true)) {
                ApiResponse::error('Failed to create date directory', 500);
                return;
            }
        }

        // 创建任务专用文件夹：images/2025/01/29/task_123/
        $taskDir = $dateDir . 'task_' . $taskId . '/';
        if (!is_dir($taskDir)) {
            if (!mkdir($taskDir, 0755, true)) {
                ApiResponse::error('Failed to create task directory', 500);
                return;
            }
        }

        // 生成唯一文件名
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $uniqueId = uniqid() . '_' . time();
        $fileName = $uniqueId . '.' . $fileExtension;
        $filePath = $taskDir . $fileName;

        // 移动上传的文件
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            ApiResponse::error('Failed to save uploaded file', 500);
            return;
        }

        // 生成相对URL路径
        $imageUrl = 'src/images/' . $today . '/task_' . $taskId . '/' . $fileName;

        // 读取文件并转换为base64（用于数据库存储备份）
        $imageData = base64_encode(file_get_contents($filePath));
        $dataUrl = 'data:' . $mimeType . ';base64,' . $imageData;

        // 返回图片信息
        $result = [
            'id' => $uniqueId,
            'name' => $file['name'],
            'fileName' => $fileName,
            'url' => $imageUrl,
            'dataUrl' => $dataUrl, // 保留base64作为备份
            'mimeType' => $mimeType,
            'size' => $file['size'],
            'uploadTime' => date('Y-m-d H:i:s'),
            'taskId' => $taskId,
            'dateFolder' => $today
        ];

        ApiResponse::success($result, 'Image uploaded successfully', 201);

    } catch (Exception $e) {
        ApiResponse::error('Failed to upload image: ' . $e->getMessage(), 500);
    }
}

// 路由入口
handleUpload($_SERVER['REQUEST_METHOD']);
?>