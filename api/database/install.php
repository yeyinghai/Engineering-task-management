<?php
/**
 * 小皮面板自动安装脚本
 * 自动创建数据库和表结构
 */

// 引入配置文件以获取 APP_DEBUG 常量
require_once __DIR__ . '/../includes/config.php';

// 保护：仅在调试模式下允许访问安装页面
if (!defined('APP_DEBUG') || APP_DEBUG !== true) {
    // 返回 404 防止 API 客户端误解析为 HTML
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
    <title>自动安装 - 智能化施工任务管理系统</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }
        .success { background: #d4edda; border-color: #28a745; color: #155724; }
        .error { background: #f8d7da; border-color: #dc3545; color: #721c24; }
        .warning { background: #fff3cd; border-color: #ffc107; color: #856404; }
        .info { background: #d1ecf1; border-color: #17a2b8; color: #0c5460; }
        .btn {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            display: inline-block;
            cursor: pointer;
        }
        .btn:hover { background: #0056b3; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .step { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ 面板自动安装</h1>
            <h2>智能化施工任务管理系统</h2>
        </div>

<?php
// 数据库配置 - 从 .env.local / .env 文件读取
$config = [
    'host' => DB_HOST,
    'port' => DB_PORT,
    'username' => DB_USERNAME,
    'password' => DB_PASSWORD,
    'database' => DB_NAME,
    'charset' => DB_CHARSET
];

$steps = [];
$allSuccess = true;

// 第一步：检测PHP环境
echo '<div class="step"><h3>第一步：检测PHP环境</h3>';
$phpVersion = phpversion();
if (version_compare($phpVersion, '7.3.0', '>=')) {
    echo '<div class="status success">✓ PHP版本: ' . $phpVersion . ' (满足要求 >= 7.3)</div>';
} else {
    echo '<div class="status error">✗ PHP版本: ' . $phpVersion . ' (需要 >= 7.3)</div>';
    $allSuccess = false;
}

// 检测必要扩展
$extensions = ['mysqli', 'pdo', 'pdo_mysql', 'json'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo '<div class="status success">✓ PHP扩展: ' . $ext . '</div>';
    } else {
        echo '<div class="status error">✗ PHP扩展: ' . $ext . ' (未安装)</div>';
        $allSuccess = false;
    }
}
echo '</div>';

// 第二步：测试数据库连接
echo '<div class="step"><h3>第二步：测试数据库连接</h3>';
try {
    $dsn = "mysql:host={$config['host']};port={$config['port']};charset={$config['charset']}";
    $pdo = new PDO($dsn, $config['username'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo '<div class="status success">✓ 数据库连接成功</div>';

    // 检查数据库版本
    $version = $pdo->query('SELECT VERSION()')->fetchColumn();
    echo '<div class="status info">MySQL版本: ' . $version . '</div>';

} catch (PDOException $e) {
    echo '<div class="status error">✗ 数据库连接失败: ' . $e->getMessage() . '</div>';
    echo '<div class="status warning">请检查：<br>1. MySQL服务是否启动<br>2. 用户名密码是否正确<br>3. 防火墙设置</div>';
    $allSuccess = false;
}
echo '</div>';

// 第三步：创建数据库
if ($allSuccess) {
    echo '<div class="step"><h3>第三步：创建数据库和表结构</h3>';
    try {
        // 创建数据库
        $sql = "CREATE DATABASE IF NOT EXISTS `{$config['database']}` CHARACTER SET {$config['charset']} COLLATE {$config['charset']}_unicode_ci";
        $pdo->exec($sql);
        echo '<div class="status success">✓ 数据库创建成功: ' . $config['database'] . '</div>';

        // 选择数据库
        $pdo->exec("USE `{$config['database']}`");

        // 创建表结构
        $sql = file_get_contents(__DIR__ . '/setup.sql');
        if ($sql) {
            // 移除注释和空行
            $lines = explode("\n", $sql);
            $cleanSql = '';
            foreach ($lines as $line) {
                $line = trim($line);
                // 跳过空行和注释
                if (!empty($line) && strpos($line, '--') !== 0) {
                    $cleanSql .= $line . ' ';
                }
            }

            // 分割 SQL 语句
            $queries = array_filter(array_map('trim', explode(';', $cleanSql)));
            $tableCreated = false;
            foreach ($queries as $query) {
                if (!empty($query)) {
                    try {
                        $pdo->exec($query);
                        if (stripos($query, 'CREATE TABLE') === 0) {
                            $tableCreated = true;
                        }
                    } catch (PDOException $e) {
                        // 某些查询失败（如重复插入）可以继续
                        if (stripos($e->getMessage(), 'duplicate') === false) {
                            throw $e;
                        }
                    }
                }
            }

            if ($tableCreated) {
                echo '<div class="status success">✓ 表结构创建成功</div>';
            }

            // 检查表是否创建
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($tables)) {
                echo '<div class="status info">已创建表: ' . implode(', ', $tables) . '</div>';
            } else {
                echo '<div class="status warning">⚠ 未检测到任何表，请检查 setup.sql 文件</div>';
            }

        } else {
            echo '<div class="status warning">setup.sql文件未找到，请手动导入数据库结构</div>';
        }

    } catch (PDOException $e) {
        echo '<div class="status error">✗ 数据库创建失败: ' . $e->getMessage() . '</div>';
        $allSuccess = false;
    }
    echo '</div>';
}

// 第四步：检测文件权限
echo '<div class="step"><h3>第四步：检测文件权限</h3>';
$paths = [
    __DIR__ . '/../../api',
    __DIR__ . '/../../src',
    __DIR__ . '/../../styles'
];

foreach ($paths as $path) {
    if (is_readable($path)) {
        echo '<div class="status success">✓ 目录可读: ' . basename($path) . '</div>';
    } else {
        echo '<div class="status error">✗ 目录不可读: ' . basename($path) . '</div>';
        $allSuccess = false;
    }
}
echo '</div>';

// 第五步：安装结果
echo '<div class="step"><h3>安装结果</h3>';
if ($allSuccess) {
    echo '<div class="status success">
        🎉 <strong>安装成功！</strong><br>
        系统已准备就绪，现在您可以：<br>
        1. <a href="../../index.html" class="btn">进入主系统</a><br>
        2. <a href="../../admin.html" class="btn">进入管理后台</a><br>
        3. <a href="../test.php" target="_blank">测试API接口</a>
    </div>';
} else {
    echo '<div class="status error">
        ❌ <strong>安装失败</strong><br>
        请根据上述错误信息检查环境配置，然后重新运行安装程序。
    </div>';
}
echo '</div>';

// 配置信息
echo '<div class="step"><h3>系统配置信息</h3>';
echo '<pre>';
echo "数据库主机: {$config['host']}\n";
echo "数据库端口: {$config['port']}\n";
echo "数据库名称: {$config['database']}\n";
echo "数据库用户: {$config['username']}\n";
echo "字符编码: {$config['charset']}\n";
echo "PHP版本: {$phpVersion}\n";
echo "安装时间: " . date('Y-m-d H:i:s') . "\n";
echo '</pre>';

if ($allSuccess) {
    echo '<div class="status info">
        <strong>下一步：</strong><br>
        1. 删除此安装文件以提高安全性<br>
        2. 开始使用系统管理任务和人员<br>
        3. 建议定期备份数据库
    </div>';
}
echo '</div>';
?>

        <div style="text-align: center; margin-top: 30px;">
            <p><strong>智能化施工任务管理系统</strong> - 自动安装版</p>
            <p>版本: 1.0.0 | 安装时间: <?php echo date('Y-m-d H:i:s'); ?></p>
        </div>
    </div>
</body>
</html>