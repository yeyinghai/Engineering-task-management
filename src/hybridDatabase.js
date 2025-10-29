/**
 * 混合数据库管理器
 * 支持本地存储(IndexedDB/LocalStorage)和服务器API
 */

class HybridDatabaseManager {
    constructor() {
        // 使用全局配置
        const config = window.APP_CONFIG || {};

        this.dbName = config.INDEXED_DB_NAME || 'TodoListDB';
        this.version = config.INDEXED_DB_VERSION || 1;
        this.db = null;
        // 强制使用服务器模式，禁用浏览器本地数据库
        this.useServer = true;
        this.apiBase = config.API_BASE_URL || '/api';
        this.apiTimeout = config.API_TIMEOUT || 5000;

        this.init();
    }

    async init() {
        console.log('HybridDatabase initializing in server-only mode...');
        console.log('Config:', {
            useServer: this.useServer,
            apiBase: this.apiBase,
            apiTimeout: this.apiTimeout
        });

        // 强制使用服务器模式，不进行连接测试
        console.log('Using server mode (browser database disabled)');
        this.useServer = true;

        console.log('HybridDatabase initialized. Mode: server-only');
    }

    async testServerConnection() {
        const testUrl = `${this.apiBase}/endpoints/config.php`;
        console.log('Testing server connection to:', testUrl);

        try {
            // 创建一个超时Promise（使用配置的超时时间）
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), this.apiTimeout)
            );

            // 创建fetch Promise
            const fetchPromise = fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // 使用Promise.race来实现超时
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            console.log('Server response status:', response.status);

            // 对于非 2xx 响应（比如 404），把它视为服务器端点不存在，返回 false 而不是抛异常
            if (!response.ok) {
                console.log(`Server connection test returned status: ${response.status}`);
                return false;
            }

            // 成功时返回 true（不需要把 JSON 返回给调用者）
            const data = await response.json();
            console.log('Server connection test successful, response:', data);
            return true;
        } catch (error) {
            // 任何网络/超时错误都视为服务器不可用，记录并返回 false
            console.log('Server connection test failed:', error && error.message ? error.message : error);
            return false;
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB connected successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建tasks表
                if (!db.objectStoreNames.contains('tasks')) {
                    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    tasksStore.createIndex('status', 'status', { unique: false });
                    tasksStore.createIndex('category', 'category', { unique: false });
                    tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 创建personnel表
                if (!db.objectStoreNames.contains('personnel')) {
                    const personnelStore = db.createObjectStore('personnel', { keyPath: 'id' });
                    personnelStore.createIndex('name', 'name', { unique: true });
                    personnelStore.createIndex('role', 'role', { unique: false });
                    personnelStore.createIndex('department', 'department', { unique: false });
                }

                console.log('IndexedDB upgrade completed');
            };
        });
    }

    getDatabaseType() {
        return this.useServer ? 'server' : 'local';
    }

    // 任务管理方法
    async saveTasks(tasks) {
        console.log('HybridDatabase.saveTasks called with', tasks.length, 'tasks');
        console.log('Using storage mode: server-only');

        console.log('Saving tasks to server...');
        return await this.saveTasksToServer(tasks);
    }

    async loadTasks() {
        return this.loadTasksFromServer();
    }

    async saveTasksToServer(tasks) {
        // 为了简化，这里假设有批量同步接口
    const response = await fetch(`${this.apiBase}/endpoints/sync.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tasks }),
        });

        if (!response.ok) {
            throw new Error('Failed to save tasks to server');
        }

        return response.json();
    }

    async loadTasksFromServer() {
    const response = await fetch(`${this.apiBase}/endpoints/tasks.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load tasks from server');
        }

        const result = await response.json();
        console.log('Raw server response:', result);
        console.log('Tasks data from server:', result.data);

        // 检查每个任务的图片数据
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(task => {
                if (task.images && task.images.length > 0) {
                    console.log(`Task ${task.id} has ${task.images.length} images:`, task.images);
                }
            });
        }

        return result.data || [];
    }

    async saveTasksToIndexedDB(tasks) {
        if (!this.db) await this.initIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');

            // 清空现有数据
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => {
                // 添加新数据
                let completed = 0;
                const total = tasks.length;

                if (total === 0) {
                    resolve();
                    return;
                }

                tasks.forEach(task => {
                    const addRequest = store.add({
                        ...task,
                        createdAt: new Date(task.createdAt),
                        updatedAt: new Date(task.updatedAt)
                    });

                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    };

                    addRequest.onerror = () => {
                        reject(addRequest.error);
                    };
                });
            };

            clearRequest.onerror = () => {
                reject(clearRequest.error);
            };
        });
    }

    async loadTasksFromIndexedDB() {
        if (!this.db) await this.initIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();

            request.onsuccess = () => {
                const tasks = request.result.map(task => ({
                    ...task,
                    createdAt: new Date(task.createdAt),
                    updatedAt: new Date(task.updatedAt)
                }));
                resolve(tasks);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 人员管理方法
    async savePersonnel(personnel) {
        return await this.savePersonnelToServer(personnel);
    }

    async loadPersonnel() {
        return await this.loadPersonnelFromServer();
    }

    async savePersonnelToServer(personnel) {
    const response = await fetch(`${this.apiBase}/endpoints/sync.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ personnel }),
        });

        if (!response.ok) {
            throw new Error('Failed to save personnel to server');
        }

        return response.json();
    }

    async loadPersonnelFromServer() {
    const response = await fetch(`${this.apiBase}/endpoints/personnel.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load personnel from server');
        }

        const result = await response.json();
        return result.data || [];
    }

    async savePersonnelToIndexedDB(personnel) {
        if (!this.db) await this.initIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['personnel'], 'readwrite');
            const store = transaction.objectStore('personnel');

            // 清空现有数据
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => {
                // 添加新数据
                let completed = 0;
                const total = personnel.length;

                if (total === 0) {
                    resolve();
                    return;
                }

                personnel.forEach(person => {
                    const addRequest = store.add({
                        ...person,
                        createdAt: new Date(person.createdAt),
                        updatedAt: new Date(person.updatedAt)
                    });

                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    };

                    addRequest.onerror = () => {
                        reject(addRequest.error);
                    };
                });
            };

            clearRequest.onerror = () => {
                reject(clearRequest.error);
            };
        });
    }

    async loadPersonnelFromIndexedDB() {
        if (!this.db) await this.initIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['personnel'], 'readonly');
            const store = transaction.objectStore('personnel');
            const request = store.getAll();

            request.onsuccess = () => {
                const personnel = request.result.map(person => ({
                    ...person,
                    createdAt: new Date(person.createdAt),
                    updatedAt: new Date(person.updatedAt)
                }));
                resolve(personnel);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 类别管理方法
    async saveCategories(categories) {
        return await this.saveCategoriesToServer(categories);
    }

    async loadCategories() {
        return await this.loadCategoriesFromServer();
    }

    async saveCategoriesToServer(categories) {
        const response = await fetch(`${this.apiBase}/endpoints/sync.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ categories }),
        });

        if (!response.ok) {
            throw new Error('Failed to save categories to server');
        }

        return response.json();
    }

    async loadCategoriesFromServer() {
        const response = await fetch(`${this.apiBase}/endpoints/categories.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load categories from server');
        }

        const result = await response.json();
        return result.data || [];
    }

    // 配置项读写（仅服务器模式，不支持配置项）
    async loadConfig(key, defaultValue = null) {
        // 服务器模式不支持配置项，返回默认值
        return defaultValue;
    }

    async saveConfig(key, value) {
        // 服务器模式不支持配置项
        return false;
    }

    // 数据迁移方法（服务器模式下不需要迁移）
    async needsMigration() {
        // 服务器模式下不需要检查迁移
        return false;
    }

    async forceMigration() {
        // 服务器模式下不进行迁移
        console.log('Migration not needed in server-only mode');
        return true;
    }

    async migrateFromLocalStorage() {
        // 服务器模式下不进行迁移
        return true;
    }
}

export default HybridDatabaseManager;