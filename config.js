/**
 * 小皮面板(PhpStudy)专用配置文件
 */

// 小皮面板环境检测：同时识别常见局域网 IP 段 (192.168.*, 10.*, 172.16-31.*)
const host = window.location.hostname;
const isLocalIP = host === 'localhost' || host === '127.0.0.1' || /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
const isPhpStudy = (window.location.protocol === 'http:' || window.location.protocol === 'https:') && isLocalIP;

// 配置选项
const CONFIG = {
    // 应用信息
    APP_NAME: '智能化施工任务管理系统',
    VERSION: '1.0.0 - PhpStudy版',

    // 数据库配置 - 针对小皮面板优化
    USE_SERVER_API: true, // 小皮面板环境默认启用服务器API
    API_BASE_URL: window.location.origin + '/api', // 使用当前域名
    API_TIMEOUT: 10000, // 小皮面板环境增加超时时间

    // 小皮面板数据库默认配置
    DATABASE: {
        HOST: 'localhost',
        PORT: 3306,
        NAME: 'todolist_db',
        USERNAME: 'todolist',
        PASSWORD: '12345678' // 小皮面板默认密码
    },

    // 本地存储配置
    INDEXED_DB_NAME: 'TodoListDB',
    INDEXED_DB_VERSION: 1,

    // 备用存储键名
    STORAGE_KEYS: {
        TASKS: 'phpStudy-todolist-tasks',
        PERSONNEL: 'phpStudy-todolist-personnel',
        CONFIG: 'phpStudy-todolist-config'
    },

    // 功能开关
    FEATURES: {
        EXPORT_IMPORT: true,
        PRINT_SUPPORT: true,
        STATISTICS: true,
        NOTES: true,
        PERSONNEL_MANAGEMENT: true,
        SERVER_SYNC: true, // 小皮面板环境启用服务器同步
        AUTO_BACKUP: true  // 自动备份功能
    },

    // 小皮面板特定配置
    PHPSTUDY: {
        DEFAULT_SITE_ROOT: 'WWW', // 小皮面板默认网站目录
        MYSQL_PORT: 3306,
        APACHE_PORT: 80,
        NGINX_PORT: 80,
        AUTO_DETECT_SERVER: true
    },

    // 默认数据
    DEFAULT_CATEGORIES: ['一般', '工作', '个人', '学习', '健康', '购物', '财务', '旅行'],
    DEFAULT_PERSONNEL: [
        { name: '李师傅', role: '电工', department: 'A组', phone: '13800138002' },
        { name: '王师傅', role: '木工', department: 'B组', phone: '13800138003' },
        { name: '陈师傅', role: '水工', department: 'B组', phone: '13800138004' },
        { name: '刘师傅', role: '瓦工', department: 'A组', phone: '13800138005' },
        { name: '赵师傅', role: '油工', department: 'B组', phone: '13800138006' }
    ]
};

// 小皮面板环境检测和配置调整
if (isPhpStudy) {
    console.log('检测到小皮面板环境，启用服务器API模式');
    CONFIG.USE_SERVER_API = true;
} else {
    console.log('非小皮面板环境，使用本地存储模式');
    CONFIG.USE_SERVER_API = false;
}

// 导出配置（兼容多种模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.APP_CONFIG = CONFIG;

    // 小皮面板环境提示
    if (isPhpStudy) {
        console.log('%c小皮面板环境配置已加载', 'color: #4CAF50; font-weight: bold');
        console.log('API地址:', CONFIG.API_BASE_URL);
        console.log('数据库配置:', CONFIG.DATABASE);
    }
}