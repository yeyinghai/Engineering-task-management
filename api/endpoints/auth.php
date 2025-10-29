<?php
/**
 * 认证 API - 处理用户注册、登录、会话检查、登出
 */

function handleAuth($db, $method) {
    $action = $_GET['action'] ?? 'login';

    switch($action) {
        case 'login':
            handleLogin($db);
            break;
        case 'logout':
            handleLogout();
            break;
        case 'check':
            checkSession();
            break;
        case 'change-password':
            handleChangePassword($db);
            break;
        case 'change-username':
            handleChangeUsername($db);
            break;
        case 'change-account':
            handleChangeAccount($db);
            break;
        default:
            ApiResponse::error('Invalid action', 400);
    }
}

/**
 * 处理用户登录
 */
function handleLogin($db) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ApiResponse::error('Method not allowed', 405);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // 获取登录凭证
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $rememberMe = (bool)($input['rememberMe'] ?? false);

    if (empty($username) || empty($password)) {
        ApiResponse::error('用户名和密码不能为空', 400);
        return;
    }

    try {
        // 从数据库查询用户
        $stmt = $db->prepare("SELECT id, username, password, status FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // 验证用户存在且密码正确
        if (!$user) {
            ApiResponse::error('用户名或密码错误', 401);
            return;
        }

        if ($user['status'] === 'disabled') {
            ApiResponse::error('该账户已被禁用，请联系管理员', 403);
            return;
        }

        if (!password_verify($password, $user['password'])) {
            ApiResponse::error('用户名或密码错误', 401);
            return;
        }

        // 启动会话（如果未启动）
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // 创建会话
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['login_time'] = time();

        // 更新最后登录时间
        try {
            $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);
        } catch (Exception $e) {
            // 记录日志但不中断登录流程
            error_log('Failed to update last_login: ' . $e->getMessage());
        }

        ApiResponse::success([
            'user_id' => $user['id'],
            'username' => $user['username'],
            'rememberMe' => $rememberMe
        ], '登录成功，正在进入系统...');

    } catch (PDOException $e) {
        ApiResponse::error('登录失败: ' . $e->getMessage(), 500);
    }
}

/**
 * 处理用户登出
 */
function handleLogout() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // 销毁会话
    session_destroy();

    ApiResponse::success('已安全登出');
}

/**
 * 检查会话是否有效
 */
function checkSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
        // 验证会话超时（可选，这里设置为 24 小时）
        $sessionTimeout = 24 * 60 * 60; // 24 小时
        $currentTime = time();
        $loginTime = $_SESSION['login_time'] ?? 0;

        if ($currentTime - $loginTime > $sessionTimeout) {
            // 会话已过期
            session_destroy();
            ApiResponse::error('会话已过期，请重新登录', 401);
            return;
        }

        ApiResponse::success([
            'user_id' => $_SESSION['user_id'],
            'username' => $_SESSION['username']
        ], '会话有效');
    } else {
        ApiResponse::error('未登录', 401);
    }
}

/**
 * 处理修改密码
 */
function handleChangePassword($db) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ApiResponse::error('Method not allowed', 405);
        return;
    }

    // 启动会话（如果未启动）
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // 检查用户是否已登录
    if (!isset($_SESSION['user_id'])) {
        ApiResponse::error('未登录，无法修改密码', 401);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // 获取参数
    $currentPassword = $input['currentPassword'] ?? '';
    $newPassword = $input['newPassword'] ?? '';
    $confirmPassword = $input['confirmPassword'] ?? '';

    // 验证参数
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        ApiResponse::error('所有字段不能为空', 400);
        return;
    }

    // 验证新密码长度
    if (strlen($newPassword) < 6) {
        ApiResponse::error('新密码至少需要 6 个字符', 400);
        return;
    }

    // 验证两次输入的新密码是否一致
    if ($newPassword !== $confirmPassword) {
        ApiResponse::error('两次输入的新密码不一致', 400);
        return;
    }

    try {
        // 从数据库获取当前用户的密码
        $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            ApiResponse::error('用户不存在', 404);
            return;
        }

        // 验证当前密码是否正确
        if (!password_verify($currentPassword, $user['password'])) {
            ApiResponse::error('当前密码错误', 401);
            return;
        }

        // 检查新密码是否与旧密码相同
        if (password_verify($newPassword, $user['password'])) {
            ApiResponse::error('新密码不能与旧密码相同', 400);
            return;
        }

        // 哈希新密码
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        // 更新数据库中的密码
        $updateStmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
        $updateStmt->execute([$hashedPassword, $_SESSION['user_id']]);

        ApiResponse::success('密码修改成功');

    } catch (PDOException $e) {
        ApiResponse::error('密码修改失败: ' . $e->getMessage(), 500);
    }
}

/**
 * 处理修改用户名
 */
function handleChangeUsername($db) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ApiResponse::error('Method not allowed', 405);
        return;
    }

    // 启动会话（如果未启动）
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // 检查用户是否已登录
    if (!isset($_SESSION['user_id'])) {
        ApiResponse::error('未登录，无法修改用户名', 401);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // 获取参数
    $currentPassword = $input['currentPassword'] ?? '';
    $newUsername = trim($input['newUsername'] ?? '');

    // 验证参数
    if (empty($currentPassword) || empty($newUsername)) {
        ApiResponse::error('所有字段不能为空', 400);
        return;
    }

    // 验证用户名长度
    if (strlen($newUsername) < 3 || strlen($newUsername) > 20) {
        ApiResponse::error('用户名长度需要在 3-20 个字符之间', 400);
        return;
    }

    // 验证用户名只包含字母、数字、下划线
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $newUsername)) {
        ApiResponse::error('用户名只能包含字母、数字和下划线', 400);
        return;
    }

    try {
        // 从数据库获取当前用户信息
        $stmt = $db->prepare("SELECT username, password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            ApiResponse::error('用户不存在', 404);
            return;
        }

        // 验证当前密码是否正确
        if (!password_verify($currentPassword, $user['password'])) {
            ApiResponse::error('密码错误', 401);
            return;
        }

        // 检查新用户名是否已被使用
        $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $checkStmt->execute([$newUsername, $_SESSION['user_id']]);
        if ($checkStmt->fetch()) {
            ApiResponse::error('该用户名已被使用，请选择其他用户名', 400);
            return;
        }

        // 检查新用户名是否与旧用户名相同
        if ($newUsername === $user['username']) {
            ApiResponse::error('新用户名不能与旧用户名相同', 400);
            return;
        }

        // 更新数据库中的用户名
        $updateStmt = $db->prepare("UPDATE users SET username = ? WHERE id = ?");
        $updateStmt->execute([$newUsername, $_SESSION['user_id']]);

        // 更新会话中的用户名
        $_SESSION['username'] = $newUsername;

        ApiResponse::success([
            'username' => $newUsername
        ], '用户名修改成功');

    } catch (PDOException $e) {
        ApiResponse::error('用户名修改失败: ' . $e->getMessage(), 500);
    }
}

/**
 * 处理修改账号和密码
 */
function handleChangeAccount($db) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ApiResponse::error('Method not allowed', 405);
        return;
    }

    // 启动会话（如果未启动）
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // 检查用户是否已登录
    if (!isset($_SESSION['user_id'])) {
        ApiResponse::error('未登录，无法修改账号', 401);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // 获取参数
    $currentPassword = $input['currentPassword'] ?? '';
    $newUsername = trim($input['newUsername'] ?? '');
    $newPassword = $input['newPassword'] ?? '';
    $confirmPassword = $input['confirmPassword'] ?? '';

    // 验证参数
    if (empty($currentPassword)) {
        ApiResponse::error('当前密码不能为空', 400);
        return;
    }

    // 如果修改用户名
    if (!empty($newUsername)) {
        // 验证用户名长度
        if (strlen($newUsername) < 3 || strlen($newUsername) > 20) {
            ApiResponse::error('用户名长度需要在 3-20 个字符之间', 400);
            return;
        }

        // 验证用户名只包含字母、数字、下划线
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $newUsername)) {
            ApiResponse::error('用户名只能包含字母、数字和下划线', 400);
            return;
        }
    }

    // 如果修改密码
    if (!empty($newPassword)) {
        // 验证密码长度
        if (strlen($newPassword) < 6) {
            ApiResponse::error('新密码至少需要 6 个字符', 400);
            return;
        }

        // 验证确认密码
        if (empty($confirmPassword)) {
            ApiResponse::error('确认密码不能为空', 400);
            return;
        }

        // 验证两次输入的新密码是否一致
        if ($newPassword !== $confirmPassword) {
            ApiResponse::error('两次输入的新密码不一致', 400);
            return;
        }
    }

    // 至少需要修改一项
    if (empty($newUsername) && empty($newPassword)) {
        ApiResponse::error('请至少修改用户名或密码中的一项', 400);
        return;
    }

    try {
        // 从数据库获取当前用户信息
        $stmt = $db->prepare("SELECT username, password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            ApiResponse::error('用户不存在', 404);
            return;
        }

        // 验证当前密码是否正确
        if (!password_verify($currentPassword, $user['password'])) {
            ApiResponse::error('当前密码错误', 401);
            return;
        }

        // 如果修改用户名，检查唯一性
        if (!empty($newUsername)) {
            if ($newUsername === $user['username']) {
                ApiResponse::error('新用户名不能与旧用户名相同', 400);
                return;
            }

            $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $checkStmt->execute([$newUsername, $_SESSION['user_id']]);
            if ($checkStmt->fetch()) {
                ApiResponse::error('该用户名已被使用，请选择其他用户名', 400);
                return;
            }
        }

        // 如果修改密码，检查不与旧密码相同
        if (!empty($newPassword)) {
            if (password_verify($newPassword, $user['password'])) {
                ApiResponse::error('新密码不能与旧密码相同', 400);
                return;
            }
        }

        // 准备更新语句
        $updates = [];
        $params = [];

        if (!empty($newUsername)) {
            $updates[] = "username = ?";
            $params[] = $newUsername;
        }

        if (!empty($newPassword)) {
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            $updates[] = "password = ?";
            $params[] = $hashedPassword;
        }

        $params[] = $_SESSION['user_id'];

        // 执行更新
        $updateSql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute($params);

        // 如果修改了用户名，更新会话
        if (!empty($newUsername)) {
            $_SESSION['username'] = $newUsername;
        }

        // 构建返回信息
        $responseData = [];
        if (!empty($newUsername)) {
            $responseData['username'] = $newUsername;
        }
        if (!empty($newPassword)) {
            $responseData['passwordChanged'] = true;
        }

        ApiResponse::success($responseData, '账号信息修改成功');

    } catch (PDOException $e) {
        ApiResponse::error('账号信息修改失败: ' . $e->getMessage(), 500);
    }
}

// 注意：这个文件的函数会被 api/index.php 调用
?>
