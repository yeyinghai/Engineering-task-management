import HybridDatabaseManager from './hybridDatabase.js';

class PersonnelManager {
    constructor(databaseManager = null) {
        this.personnel = [];
        this.databaseManager = databaseManager || new HybridDatabaseManager();
        this.defaultPersonnelAdded = false; // 添加标志，防止重复添加默认人员
    }

    async init() {
        await this.loadPersonnel();
    }

    // 添加施工人员
    async addPersonnel(name, role = '施工人员', department = '', phone = '') {
        if (!name || !name.trim()) {
            throw new Error('人员姓名不能为空');
        }

        const trimmedName = name.trim();

        try {
            // 直接调用服务器API添加人员
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/personnel.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: trimmedName,
                    role: role.trim(),
                    department: department.trim(),
                    phone: phone.trim()
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add personnel');
            }

            const result = await response.json();
            const newPerson = result.data;

            // 使用数据库返回的数据，确保ID一致
            const person = {
                id: parseInt(newPerson.id, 10), // 确保ID是整数
                name: newPerson.name,
                role: newPerson.role || '',
                department: newPerson.department || '',
                phone: newPerson.phone || '',
                createdAt: this.parseDate(newPerson.created_at),
                updatedAt: this.parseDate(newPerson.updated_at)
            };

            // 添加到本地数组
            this.personnel.push(person);

            console.log('Personnel added successfully:', person);
            console.log('Database returned ID:', newPerson.id, 'Local stored ID:', person.id);
            return person;
        } catch (error) {
            console.error('添加人员失败:', error);
            throw new Error('添加人员失败: ' + error.message);
        }
    }

    // 获取所有施工人员
    getAllPersonnel() {
        console.log('getAllPersonnel called, current personnel count:', this.personnel.length);
        if (this.personnel.length === 0) {
            console.log('No personnel found, checking if data loading is still in progress...');
        }
        return [...this.personnel].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }

    // 根据ID获取人员
    getPersonnelById(id) {
        // Convert id to integer if it's a string or float
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            console.warn('Invalid ID provided to getPersonnelById:', id);
            return null;
        }
        return this.personnel.find(p => p.id === numericId);
    }

    // 根据姓名搜索人员
    searchPersonnel(query) {
        const lowerQuery = query.toLowerCase();
        return this.personnel.filter(p => 
            p.name.toLowerCase().includes(lowerQuery) ||
            p.role.toLowerCase().includes(lowerQuery) ||
            p.department.toLowerCase().includes(lowerQuery)
        );
    }

    // 更新施工人员信息
    async updatePersonnel(id, updates) {
        const person = this.getPersonnelById(id);
        if (!person) {
            throw new Error('人员不存在');
        }

        try {
            // 直接调用服务器API更新人员
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/personnel.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: parseInt(id, 10), // 确保发送整数ID
                    ...updates
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update personnel');
            }

            const result = await response.json();
            const updatedPerson = result.data;

            // 使用数据库返回的数据，确保ID类型一致
            const newPersonData = {
                id: parseInt(updatedPerson.id, 10), // 确保ID是整数
                name: updatedPerson.name,
                role: updatedPerson.role || '',
                department: updatedPerson.department || '',
                phone: updatedPerson.phone || '',
                createdAt: this.parseDate(updatedPerson.created_at),
                updatedAt: this.parseDate(updatedPerson.updated_at)
            };

            // 更新本地数组中的人员
            const index = this.personnel.findIndex(p => p.id == parseInt(id, 10));
            if (index !== -1) {
                this.personnel[index] = newPersonData;
            }

            console.log('Personnel updated successfully:', newPersonData);
            console.log('Database returned ID:', updatedPerson.id, 'Local stored ID:', newPersonData.id);
            return newPersonData;
        } catch (error) {
            console.error('更新人员失败:', error);
            throw new Error('更新人员失败: ' + error.message);
        }
    }

    // 删除施工人员
    async deletePersonnel(id) {
        const person = this.getPersonnelById(id);
        if (!person) {
            throw new Error('人员不存在');
        }

        try {
            console.log('Deleting personnel with ID:', id, 'Type:', typeof id);

            // 直接调用服务器API删除人员
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/personnel.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: parseInt(id, 10) // 确保发送整数ID
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Delete API error:', errorData);
                throw new Error(errorData.message || 'Failed to delete personnel');
            }

            const result = await response.json();
            console.log('Delete API success:', result);

            // 从本地数组中删除
            const index = this.personnel.findIndex(p => p.id == parseInt(id, 10));
            if (index !== -1) {
                const deletedPerson = this.personnel.splice(index, 1)[0];
                console.log('Personnel deleted successfully from local array:', deletedPerson);
                return deletedPerson;
            }

            return person;
        } catch (error) {
            console.error('删除人员失败:', error);
            throw new Error('删除人员失败: ' + error.message);
        }
    }

    // 获取所有人员姓名列表
    getPersonnelNames() {
        return this.getAllPersonnel().map(p => p.name);
    }

    // 获取所有角色列表
    getRoles() {
        const roles = [...new Set(this.personnel.map(p => p.role).filter(role => role))];
        return roles.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    // 获取所有部门列表
    getDepartments() {
        const departments = [...new Set(this.personnel.map(p => p.department).filter(dept => dept))];
        return departments.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    // 保存到服务器
    async savePersonnel() {
        try {
            await this.databaseManager.savePersonnel(this.personnel);
            console.log('Personnel saved to server successfully');
        } catch (error) {
            console.error('保存人员数据到服务器失败:', error);
            throw error; // 直接抛出错误，不使用localStorage fallback
        }
    }

    // 从服务器加载
    async loadPersonnel() {
        try {
            const data = await this.databaseManager.loadPersonnel();
            if (data && data.length > 0) {
                this.personnel = data.map(p => ({
                    // 处理数据库字段名映射，确保ID类型一致
                    id: parseInt(p.id, 10), // 确保ID是整数
                    name: p.name,
                    role: p.role || '',
                    department: p.department || '',
                    phone: p.phone || '',
                    createdAt: this.parseDate(p.created_at),
                    updatedAt: this.parseDate(p.updated_at)
                }));
                console.log('Personnel loaded from server successfully, total:', this.personnel.length);
                console.log('Sample personnel data:', this.personnel[0]);
            } else {
                console.log('No personnel found on server');
                this.personnel = [];
            }
        } catch (error) {
            console.error('从服务器加载人员数据失败:', error);
            this.personnel = []; // 设为空数组，不使用fallback
        }

        // 如果没有人员数据且还没有添加过默认人员，添加一些默认人员
        if (this.personnel.length === 0 && !this.defaultPersonnelAdded) {
            console.log('Adding default personnel for first time...');
            await this.addDefaultPersonnel();
            this.defaultPersonnelAdded = true;
        }
    }

    // 解析日期的辅助方法
    parseDate(dateString) {
        console.log('parseDate called with:', dateString, 'Type:', typeof dateString);

        if (!dateString) {
            console.log('Empty date string, returning current date');
            return new Date();
        }

        try {
            const date = new Date(dateString);
            console.log('Parsed date:', date, 'Valid:', !isNaN(date.getTime()));

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                console.warn('Invalid date string received:', dateString);
                return new Date();
            }

            return date;
        } catch (error) {
            console.error('Error parsing date:', error, 'Date string:', dateString);
            return new Date();
        }
    }

    // 添加默认施工人员
    async addDefaultPersonnel() {
        const defaultPersonnel = [
            { name: '张师傅', role: '主管', department: 'A组' },
            { name: '李师傅', role: '电工', department: 'A组' },
            { name: '王师傅', role: '木工', department: 'B组' },
            { name: '陈师傅', role: '水工', department: 'B组' },
            { name: '刘师傅', role: '瓦工', department: 'A组' },
            { name: '赵师傅', role: '油工', department: 'B组' }
        ];

        for (const p of defaultPersonnel) {
            try {
                await this.addPersonnel(p.name, p.role, p.department);
            } catch (error) {
                // 忽略重复添加错误
            }
        }
    }
}

export default PersonnelManager;