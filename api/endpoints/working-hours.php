<?php
/**
 * 工作时间管理API接口
 * 处理上下班时间的全局和个人设置
 */

function handleWorkingHours($db, $method) {
    // 获取action，支持GET和JSON POST
    $action = $_GET['action'] ?? null;
    $postData = null;

    if ($method === 'POST') {
        // 读取POST JSON数据
        $postData = json_decode(file_get_contents('php://input'), true);
        $action = $action ?? $postData['action'] ?? null;
    }

    try {
        // 获取全局工作时间
        if ($method === 'GET' && $action === 'get-global') {
            try {
                $stmt = $db->prepare("SELECT start_time, end_time FROM global_working_hours LIMIT 1");
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result) {
                    ApiResponse::success($result);
                } else {
                    // 如果没有记录，返回默认值
                    ApiResponse::success([
                        'start_time' => '08:00',
                        'end_time' => '17:00'
                    ]);
                }
            } catch (PDOException $e) {
                // 如果表不存在，返回默认值
                if (strpos($e->getMessage(), 'Base table or view not found') !== false ||
                    strpos($e->getMessage(), "doesn't exist") !== false) {
                    ApiResponse::success([
                        'start_time' => '08:00',
                        'end_time' => '17:00'
                    ]);
                } else {
                    throw $e;
                }
            }
            return;
        }

        // 获取所有人员时间设置
        if ($method === 'GET' && $action === 'get-all') {
            try {
                $stmt = $db->prepare("
                    SELECT
                        wh.personnel_id,
                        wh.start_time,
                        wh.end_time,
                        wh.use_global,
                        p.name,
                        p.role,
                        p.department
                    FROM working_hours wh
                    LEFT JOIN personnel p ON wh.personnel_id = p.id
                    ORDER BY p.name
                ");
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                ApiResponse::success($results);
            } catch (PDOException $e) {
                // 如果表不存在，返回空数组
                if (strpos($e->getMessage(), 'Base table or view not found') !== false ||
                    strpos($e->getMessage(), "doesn't exist") !== false) {
                    ApiResponse::success([]);
                } else {
                    throw $e;
                }
            }
            return;
        }

        // 保存全局工作时间
        if ($method === 'POST' && $action === 'save-global') {
            if (!$postData || !isset($postData['start_time']) || !isset($postData['end_time'])) {
                ApiResponse::error('缺少必要参数', 400);
                return;
            }

            $startTime = trim($postData['start_time']);
            $endTime = trim($postData['end_time']);

            // 处理时间格式：支持 HH:MM 和 HH:MM:SS
            // 如果是 HH:MM:SS 格式，去掉秒数
            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $startTime)) {
                $startTime = substr($startTime, 0, 5);
            }
            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $endTime)) {
                $endTime = substr($endTime, 0, 5);
            }

            // 验证时间格式
            if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                ApiResponse::error('无效的时间格式，应为 HH:MM，收到的值: ' . $startTime . ' 和 ' . $endTime, 400);
                return;
            }

            try {
                // 检查是否存在记录
                $checkStmt = $db->prepare("SELECT COUNT(*) FROM global_working_hours");
                $checkStmt->execute();
                $count = $checkStmt->fetchColumn();

                if ($count > 0) {
                    // 更新现有记录
                    $stmt = $db->prepare("
                        UPDATE global_working_hours
                        SET start_time = ?, end_time = ?, updated_at = NOW()
                        WHERE id = 1
                    ");
                } else {
                    // 插入新记录
                    $stmt = $db->prepare("
                        INSERT INTO global_working_hours (start_time, end_time)
                        VALUES (?, ?)
                    ");
                }

                if ($stmt->execute([$startTime, $endTime])) {
                    ApiResponse::success(['message' => '全局工作时间已保存']);
                } else {
                    ApiResponse::error('保存失败');
                }
            } catch (PDOException $e) {
                // 如果表不存在，返回一个友好的错误消息
                if (strpos($e->getMessage(), 'Base table or view not found') !== false ||
                    strpos($e->getMessage(), "doesn't exist") !== false) {
                    ApiResponse::error('请先初始化数据库，访问 /api/database/install.php', 500);
                } else {
                    ApiResponse::error('数据库错误: ' . $e->getMessage(), 500);
                }
            }
            return;
        }

        // 保存个人工作时间
        if ($method === 'POST' && $action === 'save-personnel') {
            if (!$postData || !isset($postData['personnel_id'])) {
                ApiResponse::error('缺少必要参数', 400);
                return;
            }

            $personnelId = (int)$postData['personnel_id'];
            $startTime = isset($postData['start_time']) ? trim($postData['start_time']) : null;
            $endTime = isset($postData['end_time']) ? trim($postData['end_time']) : null;
            $useGlobal = (int)($postData['use_global'] ?? 1);

            // 处理时间格式：支持 HH:MM 和 HH:MM:SS
            if ($startTime && preg_match('/^\d{2}:\d{2}:\d{2}$/', $startTime)) {
                $startTime = substr($startTime, 0, 5);
            }
            if ($endTime && preg_match('/^\d{2}:\d{2}:\d{2}$/', $endTime)) {
                $endTime = substr($endTime, 0, 5);
            }

            // 验证时间格式（如果不使用全局时间）
            if (!$useGlobal) {
                if (!$startTime || !$endTime) {
                    ApiResponse::error('使用自定义时间时，上班时间和下班时间不能为空', 400);
                    return;
                }
                if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                    ApiResponse::error('无效的时间格式，应为 HH:MM', 400);
                    return;
                }
            }

            try {
                // 检查人员是否存在
                $checkStmt = $db->prepare("SELECT id FROM personnel WHERE id = ?");
                $checkStmt->execute([$personnelId]);
                if (!$checkStmt->fetch()) {
                    ApiResponse::error('人员不存在', 404);
                    return;
                }

                // 检查是否已存在记录
                $existStmt = $db->prepare("SELECT id FROM working_hours WHERE personnel_id = ?");
                $existStmt->execute([$personnelId]);
                $exists = $existStmt->fetch();

                if ($exists) {
                    // 更新现有记录
                    $stmt = $db->prepare("
                        UPDATE working_hours
                        SET start_time = ?, end_time = ?, use_global = ?, updated_at = NOW()
                        WHERE personnel_id = ?
                    ");
                    $success = $stmt->execute([$startTime, $endTime, $useGlobal, $personnelId]);
                } else {
                    // 插入新记录
                    $stmt = $db->prepare("
                        INSERT INTO working_hours (personnel_id, start_time, end_time, use_global)
                        VALUES (?, ?, ?, ?)
                    ");
                    $success = $stmt->execute([$personnelId, $startTime, $endTime, $useGlobal]);
                }

                if ($success) {
                    ApiResponse::success(['message' => '人员工作时间已保存']);
                } else {
                    ApiResponse::error('保存失败');
                }
            } catch (PDOException $e) {
                // 如果表不存在，返回一个友好的错误消息
                if (strpos($e->getMessage(), 'Base table or view not found') !== false ||
                    strpos($e->getMessage(), "doesn't exist") !== false) {
                    ApiResponse::error('请先初始化数据库，访问 /api/database/install.php', 500);
                } else {
                    ApiResponse::error('数据库错误: ' . $e->getMessage(), 500);
                }
            }
            return;
        }

        // 删除个人工作时间设置
        if ($method === 'POST' && $action === 'delete-personnel') {
            if (!$postData || !isset($postData['personnel_id'])) {
                ApiResponse::error('缺少必要参数', 400);
                return;
            }

            $personnelId = (int)$postData['personnel_id'];

            try {
                $stmt = $db->prepare("DELETE FROM working_hours WHERE personnel_id = ?");
                if ($stmt->execute([$personnelId])) {
                    ApiResponse::success(['message' => '人员工作时间设置已删除']);
                } else {
                    ApiResponse::error('删除失败');
                }
            } catch (PDOException $e) {
                // 如果表不存在，返回一个友好的错误消息
                if (strpos($e->getMessage(), 'Base table or view not found') !== false ||
                    strpos($e->getMessage(), "doesn't exist") !== false) {
                    ApiResponse::error('请先初始化数据库，访问 /api/database/install.php', 500);
                } else {
                    ApiResponse::error('数据库错误: ' . $e->getMessage(), 500);
                }
            }
            return;
        }

        // 获取特定人员的工作时间
        if ($method === 'GET' && $action === 'get-personnel' && isset($_GET['personnel_id'])) {
            $personnelId = (int)$_GET['personnel_id'];

            $stmt = $db->prepare("
                SELECT
                    start_time,
                    end_time,
                    use_global
                FROM working_hours
                WHERE personnel_id = ?
            ");
            $stmt->execute([$personnelId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result) {
                ApiResponse::success($result);
            } else {
                // 返回全局时间作为默认值
                $globalStmt = $db->prepare("SELECT start_time, end_time FROM global_working_hours LIMIT 1");
                $globalStmt->execute();
                $global = $globalStmt->fetch(PDO::FETCH_ASSOC);

                $default = [
                    'start_time' => $global ? $global['start_time'] : '08:00',
                    'end_time' => $global ? $global['end_time'] : '17:00',
                    'use_global' => 1
                ];
                ApiResponse::success($default);
            }
            return;
        }

        ApiResponse::error('未知的操作', 400);

    } catch (Exception $e) {
        error_log('Working hours API error: ' . $e->getMessage());
        ApiResponse::error('服务器错误: ' . $e->getMessage(), 500);
    }
}
?>
