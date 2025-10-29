<?php
// 引入统一响应类，确保输出为纯 JSON
require_once __DIR__ . '/../includes/ApiResponse.php';

// 如果直接访问此文件，进行初始化
if (!function_exists('handleCategories')) {
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
        handleCategories($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Category operation failed: ' . $e->getMessage(), 500);
    }
    exit;
}

/**
 * Categories management API endpoints
 */

function handleCategories($db, $requestMethod) {
    try {
        switch ($requestMethod) {
            case 'GET':
                getAllCategories($db);
                break;
            case 'POST':
                createCategory($db);
                break;
            case 'PUT':
                updateCategory($db);
                break;
            case 'DELETE':
                deleteCategory($db);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    } catch (Exception $e) {
        ApiResponse::error('Category operation failed: ' . $e->getMessage(), 500);
    }
}

function getAllCategories($db) {
    try {
        $stmt = $db->prepare("SELECT * FROM categories ORDER BY path");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 构建树形结构
        $tree = buildCategoryTree($categories);

        ApiResponse::success($tree);
    } catch (Exception $e) {
        ApiResponse::error('Failed to fetch categories: ' . $e->getMessage(), 500);
    }
}

function buildCategoryTree($categories) {
    // 创建索引映射
    $categoryMap = [];
    foreach ($categories as $category) {
        $categoryMap[$category['id']] = [
            'id' => (int)$category['id'],
            'name' => $category['name'],
            'level' => (int)$category['level'],
            'parentId' => $category['parent_id'] ? (int)$category['parent_id'] : null,
            'path' => $category['path'],
            'createdAt' => $category['created_at'],
            'children' => []
        ];
    }

    // 构建树形结构
    $tree = [];
    foreach ($categoryMap as $id => $category) {
        if ($category['parentId'] === null) {
            // 根节点
            $tree[] = &$categoryMap[$id];
        } else {
            // 子节点
            if (isset($categoryMap[$category['parentId']])) {
                $categoryMap[$category['parentId']]['children'][] = &$categoryMap[$id];
            }
        }
    }

    return $tree;
}

function createCategory($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['name']) || trim($data['name']) === '') {
            ApiResponse::error('Category name is required', 400);
            return;
        }

        $name = trim($data['name']);
        $parentId = isset($data['parentId']) && $data['parentId'] !== '' ? (int)$data['parentId'] : null;

        // 验证父类别存在
        $level = 1;
        $path = $name;

        if ($parentId !== null) {
            $parentStmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
            $parentStmt->execute([$parentId]);
            $parent = $parentStmt->fetch(PDO::FETCH_ASSOC);

            if (!$parent) {
                ApiResponse::error('Parent category not found', 404);
                return;
            }

            if ($parent['level'] >= 4) {
                ApiResponse::error('Maximum level limit reached (4 levels)', 400);
                return;
            }

            $level = $parent['level'] + 1;
            $path = $parent['path'] . '/' . $name;
        }

        // 检查同级别下是否已存在相同名称
        $checkSql = $parentId ?
            "SELECT id FROM categories WHERE name = ? AND parent_id = ?" :
            "SELECT id FROM categories WHERE name = ? AND parent_id IS NULL";
        $checkParams = $parentId ? [$name, $parentId] : [$name];

        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute($checkParams);
        if ($checkStmt->fetch()) {
            ApiResponse::error('Category with this name already exists at the same level', 409);
            return;
        }

        $stmt = $db->prepare("INSERT INTO categories (name, level, parent_id, path, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$name, $level, $parentId, $path]);

        $categoryId = $db->lastInsertId();

        // 获取创建的类别
        $fetchStmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
        $fetchStmt->execute([$categoryId]);
        $category = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        // 转换数据类型
        $category['id'] = (int)$category['id'];
        $category['level'] = (int)$category['level'];
        $category['parent_id'] = $category['parent_id'] ? (int)$category['parent_id'] : null;

        ApiResponse::success($category, 'Category created successfully', 201);
    } catch (Exception $e) {
        ApiResponse::error('Failed to create category: ' . $e->getMessage(), 500);
    }
}

function updateCategory($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Category ID is required', 400);
            return;
        }

        $id = (int)$data['id'];
        $name = isset($data['name']) ? trim($data['name']) : null;

        if (!$name) {
            ApiResponse::error('Category name is required', 400);
            return;
        }

        // 检查类别是否存在
        $checkStmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Category not found', 404);
            return;
        }

        // 检查同级别下是否已存在相同名称（排除自己）
        $checkSql = $existing['parent_id'] ?
            "SELECT id FROM categories WHERE name = ? AND parent_id = ? AND id != ?" :
            "SELECT id FROM categories WHERE name = ? AND parent_id IS NULL AND id != ?";
        $checkParams = $existing['parent_id'] ? [$name, $existing['parent_id'], $id] : [$name, $id];

        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute($checkParams);
        if ($checkStmt->fetch()) {
            ApiResponse::error('Category with this name already exists at the same level', 409);
            return;
        }

        // 开始事务
        $db->beginTransaction();

        try {
            // 计算新路径
            $newPath = $name;
            if ($existing['parent_id']) {
                $parentStmt = $db->prepare("SELECT path FROM categories WHERE id = ?");
                $parentStmt->execute([$existing['parent_id']]);
                $parent = $parentStmt->fetch(PDO::FETCH_ASSOC);
                if ($parent) {
                    $newPath = $parent['path'] . '/' . $name;
                }
            }

            // 更新当前类别
            $stmt = $db->prepare("UPDATE categories SET name = ?, path = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$name, $newPath, $id]);

            // 递归更新所有子类别的路径
            updateChildrenPaths($db, $id, $existing['path'], $newPath);

            $db->commit();

            // 获取更新后的类别
            $fetchStmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
            $fetchStmt->execute([$id]);
            $category = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            // 转换数据类型
            $category['id'] = (int)$category['id'];
            $category['level'] = (int)$category['level'];
            $category['parent_id'] = $category['parent_id'] ? (int)$category['parent_id'] : null;

            ApiResponse::success($category, 'Category updated successfully');
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
    } catch (Exception $e) {
        ApiResponse::error('Failed to update category: ' . $e->getMessage(), 500);
    }
}

function updateChildrenPaths($db, $parentId, $oldParentPath, $newParentPath) {
    // 获取所有子类别
    $stmt = $db->prepare("SELECT id, path FROM categories WHERE parent_id = ?");
    $stmt->execute([$parentId]);
    $children = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($children as $child) {
        $newChildPath = str_replace($oldParentPath, $newParentPath, $child['path']);

        $updateStmt = $db->prepare("UPDATE categories SET path = ? WHERE id = ?");
        $updateStmt->execute([$newChildPath, $child['id']]);

        // 递归更新子类别的子类别
        updateChildrenPaths($db, $child['id'], $child['path'], $newChildPath);
    }
}

function deleteCategory($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['id'])) {
            ApiResponse::error('Category ID is required', 400);
            return;
        }

        $id = (int)$data['id'];

        // 检查类别是否存在
        $checkStmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Category not found', 404);
            return;
        }

        // 检查是否有子类别
        $childrenStmt = $db->prepare("SELECT COUNT(*) as count FROM categories WHERE parent_id = ?");
        $childrenStmt->execute([$id]);
        $childrenCount = $childrenStmt->fetch(PDO::FETCH_ASSOC)['count'];

        if ($childrenCount > 0) {
            ApiResponse::error('Cannot delete category with children. Please delete child categories first.', 400);
            return;
        }

        // 删除类别
        $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
        $result = $stmt->execute([$id]);

        if (!$result || $stmt->rowCount() === 0) {
            ApiResponse::error('Failed to delete category', 500);
            return;
        }

        ApiResponse::success($existing, 'Category deleted successfully');
    } catch (Exception $e) {
        ApiResponse::error('Failed to delete category: ' . $e->getMessage(), 500);
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
        handleCategories($db, $_SERVER['REQUEST_METHOD']);
    } catch (Exception $e) {
        ApiResponse::error('Category operation failed: ' . $e->getMessage(), 500);
    }
}
?>
