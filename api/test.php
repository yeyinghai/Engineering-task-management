<?php
/**
 * API 连接测试页面（仅在调试模式下可见）
 */

// 引入配置文件以获取 APP_DEBUG 常量
require_once __DIR__ . '/includes/config.php';

// 保护：仅在 APP_DEBUG 为 true 时显示此页面
if (!defined('APP_DEBUG') || APP_DEBUG !== true) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 连接测试</title>
    <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }
        .success { background: #d4edda; border-color: #28a745; color: #155724; }
        .error { background: #f8d7da; border-color: #dc3545; color: #721c24; }
        .info { background: #d1ecf1; border-color: #17a2b8; color: #0c5460; }
        h1 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <h1>🔧 API 连接测试</h1>

    <?php
    try {
        // 引入数据库工具类
        require_once __DIR__ . '/includes/Database.php';

        echo '<div class="status success">✓ 配置文件加载成功</div>';

        // 测试数据库连接
        $database = new Database();
        $db = $database->getConnection();

        if ($db) {
            echo '<div class="status success">✓ 数据库连接成功</div>';

            // 检查表是否存在
            $tables = ['tasks', 'personnel', 'config'];
            foreach ($tables as $table) {
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?");
                $stmt->execute([DB_NAME, $table]);
                $result = $stmt->fetch();
                if ($result['count'] > 0) {
                    echo '<div class="status success">✓ 数据表 ' . $table . ' 存在</div>';
                } else {
                    echo '<div class="status error">✗ 数据表 ' . $table . ' 不存在</div>';
                }
            }

            echo '<div class="status info">
                <strong>API 测试链接：</strong><br>
                • <a href="index.php/config" target="_blank">配置信息 (GET /config)</a><br>
                • <a href="index.php/tasks" target="_blank">任务列表 (GET /tasks)</a><br>
                • <a href="index.php/personnel" target="_blank">人员列表 (GET /personnel)</a><br>
                • <a href="index.php/stats" target="_blank">统计信息 (GET /stats)</a>
            </div>';

            // 检查用户表
            echo '<div class="status info"><strong>用户表信息：</strong><br>';
            try {
                $stmt = $db->prepare("SELECT username, password FROM users");
                $stmt->execute();
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!empty($users)) {
                    foreach ($users as $user) {
                        echo '用户名: ' . htmlspecialchars($user['username']) . '<br>';
                        echo '密码哈希: ' . htmlspecialchars(substr($user['password'], 0, 20) . '...') . '<br>';
                    }
                } else {
                    echo '✗ 用户表为空<br>';
                }
            } catch (Exception $e) {
                echo '✗ 查询用户失败: ' . $e->getMessage() . '<br>';
            }
            echo '</div>';

        } else {
            echo '<div class="status error">✗ 数据库连接失败</div>';
        }

    } catch (Exception $e) {
        echo '<div class="status error">✗ 错误: ' . $e->getMessage() . '</div>';
    }
    ?>

    <div style="text-align: center; margin-top: 30px;">
        <p><a href="../index.html">← 返回主系统</a> | <a href="../admin.html">管理后台 →</a></p>
    </div>
</body>
</html>