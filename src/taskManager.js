import Task from './task.js';
import PersonnelManager from './personnelManager.js';
import HybridDatabaseManager from './hybridDatabase.js';

class TaskManager {
    constructor() {
        this.tasks = [];
        this.nextId = 1;
        this.databaseManager = new HybridDatabaseManager();
        this.personnelManager = new PersonnelManager(this.databaseManager);
        // 初始化由上层应用统一触发，避免构造时启动异步加载覆盖运行时新增的数据
    }

    async init() {
        // 初始化人员管理器和任务管理器
        await Promise.all([
            this.personnelManager.init(),
            this.loadTasks()
        ]);
    }

    createTask(title, description = '', category = '一般', assignees = []) {
        console.log('TaskManager.createTask called with:', { title, description, category, assignees });

        if (!title.trim()) {
            throw new Error('Task title cannot be empty');
        }

        // 确保类别不为空
        const finalCategory = category && category.trim() ? category.trim() : '一般';
        const finalAssignees = Array.isArray(assignees) ? assignees.filter(a => a && a.trim()) : [];

        console.log('Creating task with processed data:', { title, description, finalCategory, finalAssignees });

        // 确保任务ID不重复
        let taskId = this.nextId;
        while (this.tasks.some(t => t.id === taskId)) {
            taskId++;
        }
        this.nextId = taskId + 1;

        const task = new Task(taskId, title, description, 'pending', 'medium', finalCategory, finalAssignees);
        console.log('Created task object:', task);

        this.tasks.push(task);

        // 触发全局事件，通知 UI 立即刷新（避免某些异步保存或加载覆盖新增任务）
        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'create', task } }));
            }
        } catch (e) {
            console.warn('tasksChanged event dispatch failed:', e);
        }

        // 异步保存（不阻塞 UI）
        this.saveTasks().then(() => {
            console.log('Task successfully saved to database');
        }).catch(error => {
            console.error('保存任务失败:', error);
            // 如果保存失败，从内存中移除任务
            const index = this.tasks.findIndex(t => t.id === task.id);
            if (index > -1) {
                this.tasks.splice(index, 1);
                console.log('Removed failed task from memory');
                // 触发UI更新以移除显示的任务
                try {
                    if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'rollback', task } }));
                    }
                } catch (e) {
                    console.warn('tasksChanged event dispatch failed on rollback:', e);
                }
            }
            alert('任务保存失败，请重试。错误: ' + error.message);
        });

        console.log('Task saved (async), total tasks now:', this.tasks.length, 'nextId now:', this.nextId);
        return task;
    }

    getTasks() {
        return [...this.tasks];
    }

    getTaskById(id) {
        return this.tasks.find(task => task.id === id);
    }

    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    getTasksByCategory(category) {
        return this.tasks.filter(task => task.category === category);
    }

    getTasksByAssignee(assigneeName) {
        return this.tasks.filter(task => 
            task.assignees && task.assignees.includes(assigneeName)
        );
    }

    getAssignees() {
        const assignees = new Set();
        this.tasks.forEach(task => {
            if (task.assignees && Array.isArray(task.assignees)) {
                task.assignees.forEach(assignee => {
                    if (assignee && assignee.trim()) {
                        assignees.add(assignee.trim());
                    }
                });
            }
        });
        return [...assignees].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    getCategories() {
        const categories = [...new Set(this.tasks.map(task => task.category || '一般'))];
        return categories.sort((a, b) => {
            // 将"一般"排在最前面
            if (a === '一般') return -1;
            if (b === '一般') return 1;
            return a.localeCompare(b, 'zh-CN');
        });
    }

    // 人员管理方法
    getPersonnelManager() {
        return this.personnelManager;
    }

    getAllPersonnel() {
        return this.personnelManager.getAllPersonnel();
    }

    addPersonnel(name, role, department, phone) {
        return this.personnelManager.addPersonnel(name, role, department, phone);
    }

    updateTask(id, updates) {
        const task = this.getTaskById(id);
        if (!task) {
            throw new Error('Task not found');
        }

        if (updates.title !== undefined) {
            task.updateTitle(updates.title);
        }
        if (updates.description !== undefined) {
            task.updateDescription(updates.description);
        }
        if (updates.status !== undefined) {
            task.updateStatus(updates.status);
        }
        if (updates.category !== undefined) {
            task.updateCategory(updates.category);
        }
        if (updates.assignees !== undefined) {
            task.updateAssignees(updates.assignees);
        }
        if (updates.images !== undefined) {
            task.updateImages(updates.images);
        }

        // Dispatch event to notify UI and other listeners
        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'update', task } }));
            }
        } catch (e) {
            console.warn('tasksChanged event dispatch failed on update:', e);
        }

        this.saveTasks();
        return task;
    }

    async deleteTask(id) {
        console.log('deleteTask called with ID:', id);

        const index = this.tasks.findIndex(task => task.id === id);
        if (index === -1) {
            throw new Error('Task not found');
        }

        const taskToDelete = this.tasks[index];
        console.log('Found task to delete:', taskToDelete);

        try {
            // First delete from server
            console.log('Deleting task from server...');
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/tasks.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: parseInt(id, 10)
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete task from server');
            }

            const result = await response.json();
            console.log('Task deleted from server successfully:', result);

            // Then remove from local array
            const deletedTask = this.tasks.splice(index, 1)[0];
            console.log('Task removed from local array:', deletedTask);

            try {
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'delete', task: deletedTask } }));
                }
            } catch (e) {
                console.warn('tasksChanged event dispatch failed on delete:', e);
            }

            return deletedTask;
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw new Error('删除任务失败: ' + error.message);
        }
    }

    searchTasks(query) {
        const lowerQuery = query.toLowerCase();
        return this.tasks.filter(task =>
            task.title.toLowerCase().includes(lowerQuery) ||
            task.description.toLowerCase().includes(lowerQuery)
        );
    }

    async saveTasks() {
        console.log('saveTasks: attempting to persist tasks to server. count=', this.tasks.length);

        try {
            const mode = this.databaseManager && this.databaseManager.getDatabaseType ? this.databaseManager.getDatabaseType() : 'server';
            console.log('saveTasks: persistence mode =', mode);

            await this.databaseManager.saveTasks(this.tasks);

            console.log('saveTasks: successfully persisted tasks to', mode);

            // Dispatch persisted event so callers know tasks are saved
            try {
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'persisted' } }));
                }
            } catch (e) {
                console.warn('tasksChanged dispatch failed after persist:', e);
            }

            return true;
        } catch (error) {
            console.error('saveTasks: persistence failed:', error);
            throw error; // 直接抛出错误，不使用localStorage fallback
        }
    }

    async loadTasks() {
        try {
            const [tasksData, nextIdData] = await Promise.all([
                this.databaseManager.loadTasks(),
                this.databaseManager.loadConfig('nextId', 1)
            ]);

            console.log('loadTasks: loaded tasksData from server, count=', tasksData ? tasksData.length : 0);

            if (tasksData && tasksData.length > 0) {
                this.tasks = tasksData.map(taskData => {
                    console.log('Processing task data:', taskData);

                    const assignees = taskData.assignees || (taskData.assignee ? [taskData.assignee] : []);
                    console.log('Task assignees:', assignees);

                    const task = new Task(
                        taskData.id,
                        taskData.title,
                        taskData.description,
                        taskData.status,
                        taskData.priority,
                        taskData.category || '一般',
                        assignees,
                        taskData.createdAt ? new Date(taskData.createdAt) : new Date()
                    );
                    task.updatedAt = taskData.updatedAt ? new Date(taskData.updatedAt) : new Date();

                    console.log('Created task object:', task);

                    // 加载备注数据
                    if (taskData.notes && Array.isArray(taskData.notes)) {
                        task.notes = taskData.notes.map(noteData => ({
                            id: noteData.id,
                            content: noteData.content,
                            timestamp: noteData.timestamp ? new Date(noteData.timestamp) : new Date()
                        }));
                    }

                    // 加载图片数据
                    if (taskData.images && Array.isArray(taskData.images)) {
                        task.images = taskData.images;
                        console.log('Loaded images for task:', taskData.id, 'count:', taskData.images.length);
                    } else {
                        console.log('No images found for task:', taskData.id, 'images data:', taskData.images);
                    }

                    // 恢复计时器数据
                    if (taskData.timerRunning !== undefined) {
                        task.timerRunning = taskData.timerRunning;
                        console.log(`Task ${taskData.id} timerRunning:`, taskData.timerRunning);
                    }
                    if (taskData.totalTime !== undefined) {
                        task.totalTime = taskData.totalTime;
                        console.log(`Task ${taskData.id} totalTime:`, taskData.totalTime);
                    }
                    if (taskData.timerStartedAt !== undefined) {
                        task.timerStartedAt = taskData.timerStartedAt ? new Date(taskData.timerStartedAt) : null;
                        console.log(`Task ${taskData.id} timerStartedAt:`, taskData.timerStartedAt);
                    }

                    return task;
                });

                // 服务器模式下根据现有任务计算nextId
                if (this.tasks.length > 0) {
                    const taskIds = this.tasks.map(t => t.id);
                    console.log('All task IDs:', taskIds);
                    const maxId = Math.max(...taskIds);
                    this.nextId = maxId + 1;
                    console.log('Calculated nextId based on existing tasks. MaxId:', maxId, 'NextId:', this.nextId);
                } else {
                    this.nextId = 1;
                    console.log('No existing tasks, set nextId to 1');
                }
            } else {
                // 没有任务时使用默认值
                this.nextId = 1;
            }

            console.log('Loaded tasks successfully from server, total:', this.tasks.length, 'nextId:', this.nextId);

            try {
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'loaded', count: this.tasks.length } }));
                }
            } catch (e) {
                console.warn('tasksChanged dispatch failed after load:', e);
            }
        } catch (error) {
            console.error('Error loading tasks from server:', error);
            // 不使用fallback，直接设置空数组
            this.tasks = [];
            this.nextId = 1;

            try {
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'load_failed', count: 0 } }));
                }
            } catch (e) {
                console.warn('tasksChanged dispatch failed after load error:', e);
            }
        }
    }

    getStats() {
        return {
            total: this.tasks.length,
            pending: this.getTasksByStatus('pending').length,
            inProgress: this.getTasksByStatus('in-progress').length,
            completed: this.getTasksByStatus('completed').length
        };
    }

    // 备注管理方法
    addNoteToTask(taskId, noteContent) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error('任务不存在');
        }

        const note = task.addNote(noteContent);

        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'addNote', task, note } }));
            }
        } catch (e) {
            console.warn('tasksChanged event dispatch failed on addNote:', e);
        }

        this.saveTasks();
        return note;
    }

    removeNoteFromTask(taskId, noteId) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error('任务不存在');
        }

        const removedNote = task.removeNote(noteId);

        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'removeNote', task, noteId } }));
            }
        } catch (e) {
            console.warn('tasksChanged event dispatch failed on removeNote:', e);
        }

        this.saveTasks();
        return removedNote;
    }

    updateTaskNote(taskId, noteId, newContent) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error('任务不存在');
        }

        const updatedNote = task.updateNote(noteId, newContent);

        try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('tasksChanged', { detail: { action: 'updateNote', task, note: updatedNote } }));
            }
        } catch (e) {
            console.warn('tasksChanged event dispatch failed on updateNote:', e);
        }

        this.saveTasks();
        return updatedNote;
    }

    getTaskNotes(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error('任务不存在');
        }

        return task.getNotes();
    }

    // 数据导出功能
    async exportData() {
        const data = {
            tasks: this.tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                category: task.category,
                assignees: task.assignees,
                notes: task.notes,
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString()
            })),
            personnel: this.personnelManager.getAllPersonnel().map(person => ({
                id: person.id,
                name: person.name,
                role: person.role,
                department: person.department,
                phone: person.phone,
                createdAt: person.createdAt.toISOString(),
                updatedAt: person.updatedAt.toISOString()
            })),
            metadata: {
                nextTaskId: this.nextId,
                exportDate: new Date().toISOString(),
                version: "1.0"
            }
        };
        return data;
    }

    // 下载数据为JSON文件
    downloadDataAsFile() {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await this.exportData();
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const filename = `todolist-backup-${new Date().toISOString().split('T')[0]}.json`;
                
                // 尝试使用现代的文件保存API
                if (window.showSaveFilePicker) {
                    try {
                        const fileHandle = await window.showSaveFilePicker({
                            suggestedName: filename,
                            types: [{
                                description: 'JSON files',
                                accept: { 'application/json': ['.json'] }
                            }]
                        });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        resolve();
                        return;
                    } catch (err) {
                        console.log('File System Access API failed, falling back to traditional download');
                    }
                }
                
                // 传统的下载方法
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                
                // 确保在服务器环境下也能工作
                document.body.appendChild(a);
                
                // 触发下载
                a.click();
                
                // 延迟清理，确保下载完成
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                resolve();
            } catch (error) {
                console.error('文件下载失败:', error);
                reject(error);
            }
        });
    }

    // 备用导出方法：显示JSON数据供用户复制
    showExportData() {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await this.exportData();
                const jsonString = JSON.stringify(data, null, 2);
                
                // 创建一个模态框显示数据
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                `;
                
                const content = document.createElement('div');
                content.style.cssText = `
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 80%;
                    max-width: 600px;
                    max-height: 80%;
                    overflow: auto;
                `;
                
                content.innerHTML = `
                    <h3>导出数据</h3>
                    <p>请复制下面的数据并保存到文件中：</p>
                    <textarea style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;" readonly>${jsonString}</textarea>
                    <div style="margin-top: 10px; text-align: right;">
                        <button id="copyData" style="margin-right: 10px; padding: 8px 16px;">复制数据</button>
                        <button id="closeExport" style="padding: 8px 16px;">关闭</button>
                    </div>
                `;
                
                modal.appendChild(content);
                document.body.appendChild(modal);
                
                // 绑定事件
                const textarea = content.querySelector('textarea');
                const copyBtn = content.querySelector('#copyData');
                const closeBtn = content.querySelector('#closeExport');
                
                copyBtn.addEventListener('click', () => {
                    textarea.select();
                    document.execCommand('copy');
                    copyBtn.textContent = '已复制！';
                    setTimeout(() => {
                        copyBtn.textContent = '复制数据';
                    }, 2000);
                });
                
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                    }
                });
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // 数据导入功能
    async importData(data) {
        try {
            // 验证数据格式
            if (!data || typeof data !== 'object') {
                throw new Error('无效的数据格式');
            }

            if (!Array.isArray(data.tasks) || !Array.isArray(data.personnel)) {
                throw new Error('数据格式不正确，缺少必要的tasks或personnel数组');
            }

            // 确认导入操作
            const taskCount = data.tasks.length;
            const personnelCount = data.personnel.length;
            
            if (!confirm(`确定要导入数据吗？\n任务数量：${taskCount}\n人员数量：${personnelCount}\n\n导入后将覆盖现有数据！`)) {
                return false;
            }

            // 导入任务数据
            const importedTasks = data.tasks.map(taskData => {
                const task = new Task(
                    taskData.id,
                    taskData.title,
                    taskData.description,
                    taskData.status,
                    taskData.priority || 'medium',
                    taskData.category || '一般',
                    taskData.assignees || [],
                    taskData.createdAt ? new Date(taskData.createdAt) : new Date()
                );

                task.updatedAt = taskData.updatedAt ? new Date(taskData.updatedAt) : new Date();
                
                // 导入备注
                if (taskData.notes && Array.isArray(taskData.notes)) {
                    task.notes = taskData.notes.map(noteData => ({
                        id: noteData.id,
                        content: noteData.content,
                        timestamp: noteData.timestamp ? new Date(noteData.timestamp) : new Date()
                    }));
                }
                
                return task;
            });

            // 更新任务数据
            this.tasks = importedTasks;
            
            // 更新nextId
            if (data.metadata && data.metadata.nextTaskId) {
                this.nextId = data.metadata.nextTaskId;
            } else {
                this.nextId = Math.max(...this.tasks.map(t => t.id), 0) + 1;
            }

            // 导入人员数据
            if (data.personnel && data.personnel.length > 0) {
                // 清空现有人员数据
                this.personnelManager.personnel = [];
                
                // 导入人员
                for (const personData of data.personnel) {
                    const person = {
                        id: personData.id,
                        name: personData.name,
                        role: personData.role,
                        department: personData.department || '',
                        phone: personData.phone || '',
                        createdAt: new Date(personData.createdAt),
                        updatedAt: new Date(personData.updatedAt)
                    };
                    this.personnelManager.personnel.push(person);
                }
                
                await this.personnelManager.savePersonnel();
            }

            // 保存导入的数据
            await this.saveTasks();

            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            throw new Error('导入数据失败: ' + error.message);
        }
    }

    // 从文件导入数据
    importDataFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('请选择一个文件'));
                return;
            }

            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                reject(new Error('请选择JSON格式的文件'));
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    const success = await this.importData(jsonData);
                    resolve(success);
                } catch (error) {
                    reject(new Error('文件格式错误或数据无效: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 备用导入方法：通过文本框粘贴JSON数据
    showImportDataModal() {
        return new Promise((resolve, reject) => {
            // 创建一个模态框用于粘贴数据
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 80%;
                max-width: 600px;
                max-height: 80%;
                overflow: auto;
            `;
            
            content.innerHTML = `
                <h3>导入数据</h3>
                <p>请粘贴之前导出的JSON数据：</p>
                <textarea id="importTextarea" style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;" placeholder="在这里粘贴JSON数据..."></textarea>
                <div style="margin-top: 10px; text-align: right;">
                    <button id="importBtn" style="margin-right: 10px; padding: 8px 16px;">导入数据</button>
                    <button id="cancelImport" style="padding: 8px 16px;">取消</button>
                </div>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            // 绑定事件
            const textarea = content.querySelector('#importTextarea');
            const importBtn = content.querySelector('#importBtn');
            const cancelBtn = content.querySelector('#cancelImport');
            
            importBtn.addEventListener('click', async () => {
                const jsonText = textarea.value.trim();
                if (!jsonText) {
                    alert('请输入JSON数据');
                    return;
                }
                
                try {
                    const data = JSON.parse(jsonText);
                    document.body.removeChild(modal);
                    const success = await this.importData(data);
                    resolve(success);
                } catch (error) {
                    alert('JSON格式错误或导入失败: ' + error.message);
                }
            });
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
        });
    }

    // 数据恢复功能（服务器模式）
    async recoverData() {
        console.log('开始数据恢复检查...');

        try {
            // 检查服务器中的数据
            const serverData = await this.databaseManager.loadTasks();
            console.log('服务器中的任务数据:', serverData.length, '个任务');

            return serverData.length > 0;
        } catch (error) {
            console.error('数据恢复检查失败:', error);
            return false;
        }
    }

    // 添加示例数据
    async addSampleData() {
        const sampleTasks = [
            {
                title: '检查施工进度',
                description: '检查主体结构施工进度，确保按计划完成',
                category: '工作',
                assignees: ['张师傅', '李师傅']
            },
            {
                title: '材料采购',
                description: '采购下周需要的水泥和钢筋',
                category: '采购',
                assignees: ['王师傅']
            },
            {
                title: '安全检查',
                description: '进行日常安全检查，确保施工安全',
                category: '安全',
                assignees: ['陈师傅']
            }
        ];

        for (const taskData of sampleTasks) {
            try {
                this.createTask(
                    taskData.title,
                    taskData.description,
                    taskData.category,
                    taskData.assignees
                );
            } catch (error) {
                console.error('添加示例任务失败:', error);
            }
        }

        console.log('示例数据已添加');
    }
}

export default TaskManager;