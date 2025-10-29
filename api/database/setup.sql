-- 智能化施工任务管理系统数据库结构
-- 注意：数据库创建和选择已在 install.php 中处理
-- 直接创建表结构，不需要重复创建数据库

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT '一般',
    status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
    assignees JSON,
    notes JSON,
    images JSON,
    timer_running BOOLEAN DEFAULT 0,
    total_time INT DEFAULT 0,
    timer_started_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

-- 人员表
CREATE TABLE IF NOT EXISTS personnel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(100) DEFAULT '施工人员',
    department VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_role (role),
    INDEX idx_department (department)
);

-- 类别表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level TINYINT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 4),
    parent_id INT NULL,
    path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_level (level),
    INDEX idx_path (path(255)),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_name_parent (name, parent_id)
);

-- 配置表
CREATE TABLE IF NOT EXISTS config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 全局工作时间配置
CREATE TABLE IF NOT EXISTS global_working_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '17:00',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 工作时间表
CREATE TABLE IF NOT EXISTS working_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personnel_id INT NOT NULL,
    start_time TIME,
    end_time TIME,
    use_global BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_personnel (personnel_id),
    FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
    INDEX idx_personnel_id (personnel_id)
);

-- 用户表（登录用户）
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    real_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    status ENUM('active', 'inactive', 'locked') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- 插入默认人员数据
INSERT IGNORE INTO personnel (name, role, department) VALUES
('张师傅', '主管', 'A组'),
('李师傅', '电工', 'A组'),
('王师傅', '木工', 'B组'),
('陈师傅', '水工', 'B组'),
('刘师傅', '瓦工', 'A组'),
('赵师傅', '油工', 'B组');

-- 插入默认类别数据
INSERT IGNORE INTO categories (id, name, level, parent_id, path) VALUES
(1, '施工类', 1, NULL, '施工类'),
(2, '基础工程', 2, 1, '施工类/基础工程'),
(3, '地基处理', 3, 2, '施工类/基础工程/地基处理'),
(4, '桩基施工', 4, 3, '施工类/基础工程/地基处理/桩基施工'),
(5, '主体工程', 2, 1, '施工类/主体工程'),
(6, '质检类', 1, NULL, '质检类'),
(7, '材料检验', 2, 6, '质检类/材料检验');

-- 插入默认配置
INSERT IGNORE INTO config (config_key, config_value, description) VALUES
('app_name', '智能化施工任务管理系统', '应用名称'),
('app_version', '2.0.0', '应用版本'),
('max_tasks_per_day', '50', '每日最大任务数'),
('default_task_category', '一般', '默认任务类别');

-- 插入默认用户（admin / admin123）
-- 密码已使用 bcrypt 加密：password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 12])
-- bcrypt hash: $2y$12$H8SF8PB.TcfxU8XnVgBht.cSGRlerur1klxxT/bLiP.5nv1lx1772
INSERT IGNORE INTO users (username, password, email, real_name, role, status) VALUES
('admin', '$2y$12$H8SF8PB.TcfxU8XnVgBht.cSGRlerur1klxxT/bLiP.5nv1lx1772', 'admin@system.local', '系统管理员', 'admin', 'active');