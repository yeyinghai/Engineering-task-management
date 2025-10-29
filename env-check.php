<?php
/**
 * .env 配置加载测试
 */

// 先加载配置，再输出 HTML
require_once __DIR__ . '/api/includes/EnvLoader.php';

$dbConnected = false;
$dbError = '';
$envVars = [];
$dbVersion = '';

try {
    $envVars = EnvLoader::all();
} catch (Exception $e) {
    $dbError = '加载环境变量失败: ' . $e->getMessage();
}

// 测试数据库连接
try {
    require_once __DIR__ . '/api/includes/config.php';
    require_once __DIR__ . '/api/includes/Database.php';

    $database = new Database();
    $db = $database->getConnection();
    $dbConnected = true;

    // 获取数据库版本
    $dbVersion = $db->query('SELECT VERSION()')->fetchColumn();
} catch (Exception $e) {
    $dbError = $e->getMessage();
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>.env 配置检查</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .box { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #28a745; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #dc3545; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #17a2b8; color: #0c5460; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🔧 .env 配置检查</h1>

    <div class="box info"><h3>1. 文件检查</h3>
    <?php
    $envLocal = __DIR__ . '/.env.local';
    $env = __DIR__ . '/.env';

    if (file_exists($envLocal)) {
        echo '<div class="success">✓ .env.local 文件存在</div>';
    } elseif (file_exists($env)) {
        echo '<div class="success">✓ .env 文件存在（使用 .env）</div>';
    } else {
        echo '<div class="error">✗ 未找到 .env.local 或 .env 文件</div>';
    }
    ?>
    </div>

    <div class="box info"><h3>2. 加载的环境变量</h3>
    <?php
    if (empty($envVars)) {
        echo '<div class="error">✗ 未加载任何环境变量</div>';
    } else {
        echo '<table>';
        echo '<tr><th>配置项</th><th>值</th></tr>';

        // 数据库配置
        $dbKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'DB_CHARSET'];
        foreach ($dbKeys as $key) {
            $value = EnvLoader::get($key, '（未设置）');
            // 隐藏密码
            if ($key === 'DB_PASSWORD' && $value !== '（未设置）') {
                $value = str_repeat('*', strlen($value));
            }
            echo '<tr><td>' . $key . '</td><td>' . htmlspecialchars($value) . '</td></tr>';
        }

        // 应用配置
        $appKeys = ['APP_ENV', 'APP_DEBUG', 'APP_NAME', 'APP_URL', 'APP_VERSION'];
        foreach ($appKeys as $key) {
            $value = EnvLoader::get($key, '（未设置）');
            echo '<tr><td>' . $key . '</td><td>' . htmlspecialchars($value) . '</td></tr>';
        }

        echo '</table>';
    }
    ?>
    </div>

    <div class="box info"><h3>3. 数据库连接测试</h3>
    <?php
    if ($dbConnected) {
        echo '<div class="success">✓ 数据库连接成功！</div>';
        echo '<div class="success">✓ MySQL 版本: ' . htmlspecialchars($dbVersion) . '</div>';
    } else {
        echo '<div class="error">✗ 数据库连接失败: ' . htmlspecialchars($dbError) . '</div>';
    }
    ?>
    </div>

    <div class="box success"><h3>4. 后续步骤</h3>
    <ol>
        <li>如果数据库连接成功，访问 <a href="/api/database/install.php">/api/database/install.php</a> 初始化数据库</li>
        <li>初始化完成后，访问 <a href="/login.html">登录页面</a></li>
        <li>使用默认账号登录：<strong>admin / admin123</strong></li>
    </ol>
    </div>

</body>
</html>
