/**
 * 数据管理器 - 负责将现有数据写入数据库
 */
import HybridDatabaseManager from './hybridDatabase.js';
import Task from './task.js';

class DataManager {
    constructor() {
        this.databaseManager = new HybridDatabaseManager();
    }

    async init() {
        await this.databaseManager.init();
    }

    /**
     * 将当前应用中的所有数据写入数据库
     * @param {Array} tasks - 任务数组 
     * @param {Array} personnel - 人员数组
     * @param {number} nextId - 下一个任务ID
     */
    async writeAllDataToDatabase(tasks, personnel, nextId) {
        try {
            console.log('开始将数据写入数据库...');
            console.log('任务数量:', tasks.length);
            console.log('人员数量:', personnel.length);
            console.log('下一个任务ID:', nextId);

            // 验证数据格式
            if (!Array.isArray(tasks)) {
                throw new Error('任务数据格式无效');
            }
            if (!Array.isArray(personnel)) {
                throw new Error('人员数据格式无效');
            }

            // 初始化数据库连接
            await this.init();

            // 保存任务数据
            if (tasks.length > 0) {
                console.log('正在保存任务数据...');
                await this.databaseManager.saveTasks(tasks);
                console.log('任务数据保存成功');
            }

            // 保存人员数据  
            if (personnel.length > 0) {
                console.log('正在保存人员数据...');
                await this.databaseManager.savePersonnel(personnel);
                console.log('人员数据保存成功');
            }

            // 保存配置信息
            if (nextId) {
                console.log('正在保存配置信息...');
                await this.databaseManager.saveConfig('nextId', nextId);
                console.log('配置信息保存成功');
            }

            // 保存写入时间戳
            await this.databaseManager.saveConfig('lastDataWrite', new Date().toISOString());

            console.log('所有数据写入数据库完成！');
            return {
                success: true,
                message: `成功写入 ${tasks.length} 个任务和 ${personnel.length} 个人员信息到数据库`,
                details: {
                    tasksCount: tasks.length,
                    personnelCount: personnel.length,
                    nextId: nextId
                }
            };

        } catch (error) {
            console.error('写入数据库失败:', error);
            throw new Error(`写入数据库失败: ${error.message}`);
        }
    }

    /**
     * 批量创建示例任务和人员数据并写入数据库
     */
    async createSampleDataAndWrite() {
        try {
            console.log('创建示例数据...');

            // 创建示例人员数据
            const samplePersonnel = [
                {
                    id: Date.now() + 1,
                    name: '张师傅',
                    role: '项目主管',
                    department: 'A组',
                    phone: '13800138001',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 2,
                    name: '李师傅',
                    role: '电工技师',
                    department: 'A组',
                    phone: '13800138002',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 3,
                    name: '王师傅',
                    role: '木工技师',
                    department: 'B组',
                    phone: '13800138003',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 4,
                    name: '陈师傅',
                    role: '水电工',
                    department: 'B组',
                    phone: '13800138004',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 5,
                    name: '刘师傅',
                    role: '瓦工师傅',
                    department: 'A组',
                    phone: '13800138005',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 6,
                    name: '赵师傅',
                    role: '油漆工',
                    department: 'C组',
                    phone: '13800138006',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 7,
                    name: '孙师傅',
                    role: '钢筋工',
                    department: 'A组',
                    phone: '13800138007',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: Date.now() + 8,
                    name: '周师傅',
                    role: '混凝土工',
                    department: 'B组',
                    phone: '13800138008',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            // 创建示例任务数据
            const sampleTasks = [
                new Task(1, '主体结构施工检查', '检查1-3层主体结构施工质量，确保符合设计要求', 'pending', 'high', '质量检查', ['张师傅', '李师傅']),
                new Task(2, '电路布线施工', '完成2层电路布线工作，包括强电和弱电', 'in-progress', 'high', '电气工程', ['李师傅']),
                new Task(3, '木工框架制作', '制作3层房间门窗框架', 'pending', 'medium', '木工工程', ['王师傅']),
                new Task(4, '水管安装', '安装1-2层给排水管道系统', 'pending', 'high', '水电工程', ['陈师傅']),
                new Task(5, '墙体砌筑', '完成1层墙体砌筑工作', 'completed', 'medium', '砌筑工程', ['刘师傅']),
                new Task(6, '外墙涂料施工', '进行外墙防水涂料施工', 'pending', 'medium', '装饰工程', ['赵师傅']),
                new Task(7, '钢筋绑扎', '完成地下室钢筋绑扎工作', 'in-progress', 'high', '结构工程', ['孙师傅', '张师傅']),
                new Task(8, '混凝土浇筑', '地下室混凝土浇筑作业', 'pending', 'high', '结构工程', ['周师傅', '孙师傅']),
                new Task(9, '安全检查', '每日安全检查，确保施工安全', 'pending', 'high', '安全管理', ['张师傅']),
                new Task(10, '材料验收', '本周建筑材料到货验收', 'pending', 'medium', '材料管理', ['张师傅', '李师傅']),
                new Task(11, '设备维护', '施工设备日常维护保养', 'pending', 'low', '设备管理', ['陈师傅']),
                new Task(12, '进度汇报', '周进度汇报准备', 'pending', 'medium', '项目管理', ['张师傅'])
            ];

            // 为部分任务添加备注
            sampleTasks[0].addNote('已完成初步检查，发现部分区域需要加强');
            sampleTasks[0].addNote('需要重点关注承重墙结构');
            sampleTasks[1].addNote('强电部分已完成60%');
            sampleTasks[6].addNote('钢筋规格符合设计要求');
            sampleTasks[4].addNote('质量验收合格，可以进行下一步工序');

            const nextId = 13;

            // 写入数据库
            const result = await this.writeAllDataToDatabase(sampleTasks, samplePersonnel, nextId);
            
            console.log('示例数据创建并写入完成');
            return result;

        } catch (error) {
            console.error('创建示例数据失败:', error);
            throw error;
        }
    }

    /**
     * 验证数据库中的数据
     */
    async verifyDatabaseData() {
        try {
            await this.init();
            
            const tasks = await this.databaseManager.loadTasks();
            const personnel = await this.databaseManager.loadPersonnel();
            const nextId = await this.databaseManager.loadConfig('nextId', 1);
            const lastWrite = await this.databaseManager.loadConfig('lastDataWrite');

            return {
                tasksCount: tasks.length,
                personnelCount: personnel.length,
                nextId: nextId,
                lastDataWrite: lastWrite,
                databaseType: this.databaseManager.getDatabaseType(),
                tasks: tasks.slice(0, 3), // 返回前3个任务作为示例
                personnel: personnel.slice(0, 3) // 返回前3个人员作为示例
            };

        } catch (error) {
            console.error('验证数据库数据失败:', error);
            throw error;
        }
    }

    /**
     * 清空数据库中的所有数据
     */
    async clearDatabaseData() {
        try {
            await this.init();
            await this.databaseManager.clearAllData();
            console.log('数据库数据已清空');
            return { success: true, message: '数据库数据已清空' };
        } catch (error) {
            console.error('清空数据库失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getDatabaseStats() {
        try {
            await this.init();
            const stats = await this.databaseManager.getStats();
            return {
                ...stats,
                databaseType: this.databaseManager.getDatabaseType()
            };
        } catch (error) {
            console.error('获取数据库统计失败:', error);
            throw error;
        }
    }
}

export default DataManager;