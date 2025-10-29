/**
 * 工作时间管理类
 * 处理上下班时间的全局设置和个人设置
 */
class WorkingHoursManager {
    constructor() {
        this.globalStartTime = '08:00';
        this.globalEndTime = '17:00';
        this.personnelHours = {}; // { personId: { startTime, endTime, useGlobal } }
        this.dbManager = null;
    }

    /**
     * 初始化管理器
     * @param {Object} dbManager - 数据库管理器实例
     */
    async init(dbManager) {
        this.dbManager = dbManager;
        await this.loadAllHours();
    }

    /**
     * 加载全局时间设置
     */
    async loadGlobalHours() {
        try {
            const response = await fetch('api/index.php/working-hours?action=get-global', {
                method: 'GET'
            });
            const data = await response.json();
            if (data.success && data.data) {
                this.globalStartTime = data.data.start_time || '08:00';
                this.globalEndTime = data.data.end_time || '17:00';
            }
        } catch (error) {
            console.error('Failed to load global hours:', error);
            // 使用本地存储的备份
            const stored = localStorage.getItem('globalWorkingHours');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.globalStartTime = parsed.startTime || '08:00';
                this.globalEndTime = parsed.endTime || '17:00';
            }
        }
    }

    /**
     * 加载所有人员时间设置
     */
    async loadAllHours() {
        try {
            const response = await fetch('api/index.php/working-hours?action=get-all', {
                method: 'GET'
            });
            const data = await response.json();
            if (data.success && data.data) {
                this.personnelHours = {};
                data.data.forEach(item => {
                    this.personnelHours[item.personnel_id] = {
                        startTime: item.start_time,
                        endTime: item.end_time,
                        useGlobal: item.use_global === 1
                    };
                });
            }
        } catch (error) {
            console.error('Failed to load personnel hours:', error);
            // 使用本地存储的备份
            const stored = localStorage.getItem('personnelWorkingHours');
            if (stored) {
                this.personnelHours = JSON.parse(stored);
            }
        }
    }

    /**
     * 保存全局时间设置
     * @param {string} startTime - 上班时间，格式 HH:MM
     * @param {string} endTime - 下班时间，格式 HH:MM
     */
    async saveGlobalHours(startTime, endTime) {
        if (!this.validateTime(startTime) || !this.validateTime(endTime)) {
            throw new Error('无效的时间格式');
        }

        try {
            const response = await fetch('api/index.php/working-hours', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save-global',
                    start_time: startTime,
                    end_time: endTime
                })
            });
            const data = await response.json();
            if (data.success) {
                this.globalStartTime = startTime;
                this.globalEndTime = endTime;
                // 保存到本地存储作为备份
                localStorage.setItem('globalWorkingHours', JSON.stringify({
                    startTime,
                    endTime
                }));
                return true;
            } else {
                throw new Error(data.message || '保存全局时间失败');
            }
        } catch (error) {
            console.error('Failed to save global hours:', error);
            throw error;
        }
    }

    /**
     * 保存个人时间设置
     * @param {number} personId - 人员ID
     * @param {string} startTime - 上班时间
     * @param {string} endTime - 下班时间
     * @param {boolean} useGlobal - 是否使用全局时间
     */
    async savePersonnelHours(personId, startTime, endTime, useGlobal = false) {
        if (!useGlobal && (!this.validateTime(startTime) || !this.validateTime(endTime))) {
            throw new Error('无效的时间格式');
        }

        try {
            const response = await fetch('api/index.php/working-hours', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save-personnel',
                    personnel_id: personId,
                    start_time: useGlobal ? null : startTime,
                    end_time: useGlobal ? null : endTime,
                    use_global: useGlobal ? 1 : 0
                })
            });
            const data = await response.json();
            if (data.success) {
                this.personnelHours[personId] = {
                    startTime: startTime || this.globalStartTime,
                    endTime: endTime || this.globalEndTime,
                    useGlobal
                };
                // 保存到本地存储作为备份
                localStorage.setItem('personnelWorkingHours', JSON.stringify(this.personnelHours));
                return true;
            } else {
                throw new Error(data.message || '保存人员时间失败');
            }
        } catch (error) {
            console.error('Failed to save personnel hours:', error);
            throw error;
        }
    }

    /**
     * 获取全局时间设置
     * @returns {Object} { startTime, endTime }
     */
    getGlobalHours() {
        return {
            startTime: this.globalStartTime,
            endTime: this.globalEndTime
        };
    }

    /**
     * 获取个人时间设置
     * @param {number} personId - 人员ID
     * @returns {Object} { startTime, endTime, useGlobal }
     */
    getPersonnelHours(personId) {
        if (this.personnelHours[personId]) {
            return this.personnelHours[personId];
        }
        // 如果没有个人设置，返回全局设置
        return {
            startTime: this.globalStartTime,
            endTime: this.globalEndTime,
            useGlobal: true
        };
    }

    /**
     * 获取所有人员的时间设置
     * @returns {Object} 所有人员的时间设置
     */
    getAllPersonnelHours() {
        return { ...this.personnelHours };
    }

    /**
     * 删除个人时间设置
     * @param {number} personId - 人员ID
     */
    async deletePersonnelHours(personId) {
        try {
            const response = await fetch('api/index.php/working-hours', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete-personnel',
                    personnel_id: personId
                })
            });
            const data = await response.json();
            if (data.success) {
                delete this.personnelHours[personId];
                localStorage.setItem('personnelWorkingHours', JSON.stringify(this.personnelHours));
                return true;
            } else {
                throw new Error(data.message || '删除人员时间设置失败');
            }
        } catch (error) {
            console.error('Failed to delete personnel hours:', error);
            throw error;
        }
    }

    /**
     * 验证时间格式
     * @param {string} time - 时间字符串，格式 HH:MM
     * @returns {boolean} 是否有效
     */
    validateTime(time) {
        if (!time) return false;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    /**
     * 计算工作时长（小时）
     * @param {number} personId - 人员ID
     * @returns {number} 工作小时数
     */
    getWorkingHours(personId) {
        const hours = this.getPersonnelHours(personId);
        const [startH, startM] = hours.startTime.split(':').map(Number);
        const [endH, endM] = hours.endTime.split(':').map(Number);

        const startTotalMinutes = startH * 60 + startM;
        const endTotalMinutes = endH * 60 + endM;

        const diffMinutes = endTotalMinutes - startTotalMinutes;
        return diffMinutes > 0 ? diffMinutes / 60 : 0;
    }

    /**
     * 获取人员当前是否在工作时间内
     * @param {number} personId - 人员ID
     * @returns {boolean}
     */
    isWorkingHours(personId) {
        const hours = this.getPersonnelHours(personId);
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        return currentTime >= hours.startTime && currentTime <= hours.endTime;
    }

    /**
     * 检查多个人员是否都在工作时间内
     * @param {Array} personIds - 人员ID数组
     * @returns {boolean}
     */
    areAllWorking(personIds) {
        return personIds.every(id => this.isWorkingHours(id));
    }
}

export default WorkingHoursManager;
