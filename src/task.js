class Task {
    constructor(id, title, description = '', status = 'pending', priority = 'medium', category = '一般', assignees = [], createdAt = new Date()) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status; // pending, in-progress, completed
        this.priority = priority; // low, medium, high
        this.category = category; // general, work, personal, study, health, etc.
        this.assignees = Array.isArray(assignees) ? assignees : []; // 分配的施工人员数组
        this.notes = []; // 备注数组，每个备注包含内容和时间戳
        this.images = []; // 图片数组，每个图片包含数据和元信息
        this.createdAt = createdAt;
        this.updatedAt = new Date();

        // 计时器相关属性
        this.timerRunning = false; // 计时器是否运行中
        this.totalTime = 0; // 总计时间（秒）
        this.timerStartedAt = null; // 计时器开始时的时间戳（用于持久化恢复）
        this.lastStartTime = null; // 最后一次开始的时间戳（会话内部使用）
    }

    updateStatus(newStatus) {
        this.status = newStatus;
        this.updatedAt = new Date();
    }

    updateTitle(newTitle) {
        this.title = newTitle;
        this.updatedAt = new Date();
    }

    updateDescription(newDescription) {
        this.description = newDescription;
        this.updatedAt = new Date();
    }

    updatePriority(newPriority) {
        this.priority = newPriority;
        this.updatedAt = new Date();
    }

    updateCategory(newCategory) {
        this.category = newCategory;
        this.updatedAt = new Date();
    }

    updateAssignees(newAssignees) {
        this.assignees = Array.isArray(newAssignees) ? newAssignees : [];
        this.updatedAt = new Date();
    }

    addAssignee(assignee) {
        if (assignee && !this.assignees.includes(assignee)) {
            this.assignees.push(assignee);
            this.updatedAt = new Date();
        }
    }

    removeAssignee(assignee) {
        const index = this.assignees.indexOf(assignee);
        if (index > -1) {
            this.assignees.splice(index, 1);
            this.updatedAt = new Date();
        }
    }

    addNote(noteContent) {
        if (!noteContent || !noteContent.trim()) {
            throw new Error('备注内容不能为空');
        }
        
        const note = {
            id: Date.now() + Math.random(), // 简单的唯一ID
            content: noteContent.trim(),
            timestamp: new Date()
        };
        
        this.notes.push(note);
        this.updatedAt = new Date();
        return note;
    }

    removeNote(noteId) {
        const index = this.notes.findIndex(note => note.id === noteId);
        if (index === -1) {
            throw new Error('备注不存在');
        }
        
        const removedNote = this.notes.splice(index, 1)[0];
        this.updatedAt = new Date();
        return removedNote;
    }

    updateNote(noteId, newContent) {
        if (!newContent || !newContent.trim()) {
            throw new Error('备注内容不能为空');
        }
        
        const note = this.notes.find(note => note.id === noteId);
        if (!note) {
            throw new Error('备注不存在');
        }
        
        note.content = newContent.trim();
        note.timestamp = new Date(); // 更新时间戳
        this.updatedAt = new Date();
        return note;
    }

    getNotes() {
        // 返回按时间倒序排列的备注
        return [...this.notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // 图片管理方法
    addImage(imageData) {
        console.log('Task.addImage called with:', imageData);

        if (!imageData) {
            throw new Error('图片数据不能为空');
        }

        // 验证图片数据格式 - 支持新格式（url + dataUrl）和旧格式（data）
        if (!imageData.url && !imageData.dataUrl && !imageData.data) {
            console.error('Image data validation failed. imageData:', imageData);
            throw new Error('图片数据不能为空');
        }

        if (!this.images) {
            this.images = [];
        }

        this.images.push(imageData);
        this.updatedAt = new Date();
        console.log('Image added successfully. Total images:', this.images.length);
        return imageData;
    }

    removeImage(imageId) {
        if (!this.images) {
            this.images = [];
            return null;
        }

        const index = this.images.findIndex(image => image.id === imageId);
        if (index === -1) {
            throw new Error('图片不存在');
        }

        const removedImage = this.images.splice(index, 1)[0];
        this.updatedAt = new Date();
        return removedImage;
    }

    getImages() {
        if (!this.images) {
            this.images = [];
        }
        return [...this.images];
    }

    updateImages(newImages) {
        this.images = Array.isArray(newImages) ? newImages : [];
        this.updatedAt = new Date();
    }

    // 计时器方法
    startTimer() {
        if (!this.timerRunning) {
            this.timerRunning = true;
            this.lastStartTime = Date.now();
            // 保存启动时间以便在页面刷新后恢复
            this.timerStartedAt = Date.now();
            this.updatedAt = new Date();
        }
    }

    pauseTimer() {
        if (this.timerRunning && this.lastStartTime) {
            const elapsedTime = Math.floor((Date.now() - this.lastStartTime) / 1000);
            this.totalTime += elapsedTime;
            this.timerRunning = false;
            this.lastStartTime = null;
            this.timerStartedAt = null; // 清除启动时间记录
            this.updatedAt = new Date();
        }
    }

    resumeTimer() {
        if (!this.timerRunning) {
            this.timerRunning = true;
            this.lastStartTime = Date.now();
            // 保存启动时间以便在页面刷新后恢复
            this.timerStartedAt = Date.now();
            this.updatedAt = new Date();
        }
    }

    stopTimer() {
        if (this.timerRunning && this.lastStartTime) {
            const elapsedTime = Math.floor((Date.now() - this.lastStartTime) / 1000);
            this.totalTime += elapsedTime;
            this.timerRunning = false;
            this.lastStartTime = null;
            this.timerStartedAt = null; // 清除启动时间记录
            this.updatedAt = new Date();
        }
    }

    getCurrentTime() {
        let currentTotal = this.totalTime;
        if (this.timerRunning) {
            // 如果计时器在运行，计算从上次启动以来的时间
            if (this.lastStartTime) {
                const elapsedTime = Math.floor((Date.now() - this.lastStartTime) / 1000);
                currentTotal += elapsedTime;
            } else if (this.timerStartedAt) {
                // 如果没有 lastStartTime 但有 timerStartedAt（页面刷新后恢复）
                // 这意味着计时器在刷新前就在运行，需要从存储的时间戳恢复
                const elapsedTime = Math.floor((Date.now() - this.timerStartedAt) / 1000);
                currentTotal += elapsedTime;
            }
        }
        return currentTotal;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

export default Task;