import HybridDatabaseManager from './hybridDatabase.js';

// 任务类别管理器
class CategoryManager {
    constructor(databaseManager = null) {
        this.categories = [];
        this.nextId = 1;
        this.storageKey = 'task_categories';
        this.databaseManager = databaseManager || new HybridDatabaseManager();
        this.defaultCategoriesAdded = false; // 标志，防止重复添加默认类别
    }

    async init() {
        await this.loadCategories();
    }

    // 加载类别数据
    async loadCategories() {
        try {
            const data = await this.databaseManager.loadCategories();
            if (data && data.length > 0) {
                this.categories = data;

                // 计算下一个ID
                const maxId = Math.max(...this.categories.map(cat => this.getMaxIdFromTree(cat)));
                this.nextId = maxId + 1;

                console.log('Categories loaded from database successfully, total:', this.categories.length);
                console.log('Next ID will be:', this.nextId);
            } else {
                console.log('No categories found in database');
                this.categories = [];
                this.nextId = 1;
            }
        } catch (error) {
            console.error('从数据库加载类别数据失败:', error);
            // 尝试从本地存储加载
            await this.loadCategoriesFromLocalStorage();
        }

        // 如果没有类别数据且还没有添加过默认类别，添加默认类别
        if (this.categories.length === 0 && !this.defaultCategoriesAdded) {
            console.log('Adding default categories for first time...');
            await this.initializeDefaultCategories();
            this.defaultCategoriesAdded = true;
        }
    }

    // 从本地存储加载（备用方案）
    async loadCategoriesFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.categories = data.categories || [];
                this.nextId = data.nextId || 1;
                console.log('Categories loaded from localStorage as fallback');
            }
        } catch (error) {
            console.error('Error loading categories from localStorage:', error);
            this.categories = [];
            this.nextId = 1;
        }
    }

    // 获取树中的最大ID
    getMaxIdFromTree(node) {
        let maxId = node.id || 0;
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const childMaxId = this.getMaxIdFromTree(child);
                if (childMaxId > maxId) {
                    maxId = childMaxId;
                }
            }
        }
        return maxId;
    }

    // 保存类别数据
    async saveCategories() {
        try {
            await this.databaseManager.saveCategories(this.categories);

            // 同时保存到本地存储作为备份
            const data = {
                categories: this.categories,
                nextId: this.nextId
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));

            // 触发数据变化事件
            window.dispatchEvent(new CustomEvent('categoriesChanged', {
                detail: { action: 'save', categories: this.categories }
            }));

            console.log('Categories saved to database successfully');
        } catch (error) {
            console.error('保存类别数据到数据库失败:', error);
            // 如果数据库保存失败，至少保存到本地存储
            const data = {
                categories: this.categories,
                nextId: this.nextId
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            throw error;
        }
    }

    // 初始化默认类别
    async initializeDefaultCategories() {
        if (this.categories.length === 0) {
            const defaultCategories = [
                {
                    id: this.nextId++,
                    name: '施工类',
                    level: 1,
                    parentId: null,
                    path: '施工类',
                    children: [
                        {
                            id: this.nextId++,
                            name: '基础工程',
                            level: 2,
                            parentId: 1,
                            path: '施工类/基础工程',
                            children: [
                                {
                                    id: this.nextId++,
                                    name: '地基处理',
                                    level: 3,
                                    parentId: 2,
                                    path: '施工类/基础工程/地基处理',
                                    children: [
                                        {
                                            id: this.nextId++,
                                            name: '桩基施工',
                                            level: 4,
                                            parentId: 3,
                                            path: '施工类/基础工程/地基处理/桩基施工',
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            id: this.nextId++,
                            name: '主体工程',
                            level: 2,
                            parentId: 1,
                            path: '施工类/主体工程',
                            children: []
                        }
                    ]
                },
                {
                    id: this.nextId++,
                    name: '质检类',
                    level: 1,
                    parentId: null,
                    path: '质检类',
                    children: [
                        {
                            id: this.nextId++,
                            name: '材料检验',
                            level: 2,
                            parentId: 6,
                            path: '质检类/材料检验',
                            children: []
                        }
                    ]
                }
            ];

            this.categories = defaultCategories;
            await this.saveCategories();
        }
    }

    // 获取所有类别
    getAllCategories() {
        return this.categories;
    }

    // 根据ID查找类别
    findCategoryById(id) {
        const findRecursive = (categories) => {
            for (const category of categories) {
                if (category.id === id) {
                    return category;
                }
                if (category.children && category.children.length > 0) {
                    const found = findRecursive(category.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findRecursive(this.categories);
    }

    // 根据路径查找类别
    findCategoryByPath(path) {
        const findRecursive = (categories) => {
            for (const category of categories) {
                if (category.path === path) {
                    return category;
                }
                if (category.children && category.children.length > 0) {
                    const found = findRecursive(category.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findRecursive(this.categories);
    }

    // 添加类别
    async addCategory(name, parentId = null) {
        if (!name || name.trim() === '') {
            throw new Error('类别名称不能为空');
        }

        try {
            // 直接调用服务器API添加类别
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/categories.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    parentId: parentId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add category');
            }

            const result = await response.json();
            const newCategory = result.data;

            // 重新加载所有类别以保持数据一致性
            await this.loadCategories();

            console.log('Category added successfully:', newCategory);
            return newCategory;
        } catch (error) {
            console.error('添加类别失败:', error);
            throw new Error('添加类别失败: ' + error.message);
        }
    }

    // 更新类别
    async updateCategory(id, name) {
        if (!name || name.trim() === '') {
            throw new Error('类别名称不能为空');
        }

        try {
            // 直接调用服务器API更新类别
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/categories.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: parseInt(id, 10),
                    name: name.trim()
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update category');
            }

            const result = await response.json();
            const updatedCategory = result.data;

            // 重新加载所有类别以保持数据一致性
            await this.loadCategories();

            console.log('Category updated successfully:', updatedCategory);
            return updatedCategory;
        } catch (error) {
            console.error('更新类别失败:', error);
            throw new Error('更新类别失败: ' + error.message);
        }
    }

    // 更新子类别路径
    updateChildrenPaths(category, oldParentPath) {
        if (category.children && category.children.length > 0) {
            category.children.forEach(child => {
                const oldChildPath = child.path;
                child.path = child.path.replace(oldParentPath, category.path);
                this.updateChildrenPaths(child, oldChildPath);
            });
        }
    }

    // 删除类别
    async deleteCategory(id) {
        try {
            // 直接调用服务器API删除类别
            const response = await fetch(`${this.databaseManager.apiBase}/endpoints/categories.php`, {
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
                throw new Error(errorData.message || 'Failed to delete category');
            }

            const result = await response.json();
            const deletedCategory = result.data;

            // 重新加载所有类别以保持数据一致性
            await this.loadCategories();

            console.log('Category deleted successfully:', deletedCategory);
            return true;
        } catch (error) {
            console.error('删除类别失败:', error);
            throw new Error('删除类别失败: ' + error.message);
        }
    }

    // 移动类别
    moveCategory(categoryId, newParentId) {
        const category = this.findCategoryById(categoryId);
        if (!category) {
            throw new Error('类别不存在');
        }

        let newParent = null;
        if (newParentId) {
            newParent = this.findCategoryById(newParentId);
            if (!newParent) {
                throw new Error('目标父类别不存在');
            }

            // 检查层级限制
            if (newParent.level + this.getCategoryDepth(category) > 4) {
                throw new Error('移动后将超过最大层级限制（4级）');
            }

            // 检查是否移动到自己的子类别
            if (this.isDescendant(newParent, category)) {
                throw new Error('不能移动到自己的子类别');
            }
        }

        // 从原位置移除
        if (category.parentId) {
            const oldParent = this.findCategoryById(category.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(child => child.id !== categoryId);
            }
        } else {
            this.categories = this.categories.filter(cat => cat.id !== categoryId);
        }

        // 更新类别信息
        category.parentId = newParentId;
        category.level = newParent ? newParent.level + 1 : 1;
        category.path = newParent ? `${newParent.path}/${category.name}` : category.name;

        // 递归更新所有子类别的层级和路径
        this.updateCategoryTree(category);

        // 添加到新位置
        if (newParentId) {
            newParent.children.push(category);
        } else {
            this.categories.push(category);
        }

        this.saveCategories();
        return category;
    }

    // 获取类别深度
    getCategoryDepth(category) {
        if (!category.children || category.children.length === 0) {
            return 1;
        }
        return 1 + Math.max(...category.children.map(child => this.getCategoryDepth(child)));
    }

    // 检查是否为后代类别
    isDescendant(potentialDescendant, ancestor) {
        if (!ancestor.children) return false;

        for (const child of ancestor.children) {
            if (child.id === potentialDescendant.id) {
                return true;
            }
            if (this.isDescendant(potentialDescendant, child)) {
                return true;
            }
        }
        return false;
    }

    // 更新类别树的层级和路径
    updateCategoryTree(category) {
        if (category.children && category.children.length > 0) {
            category.children.forEach(child => {
                child.level = category.level + 1;
                child.path = `${category.path}/${child.name}`;
                this.updateCategoryTree(child);
            });
        }
    }

    // 获取扁平化的类别列表
    getFlatCategories() {
        const flatten = (categories, result = []) => {
            categories.forEach(category => {
                result.push({
                    id: category.id,
                    name: category.name,
                    level: category.level,
                    parentId: category.parentId,
                    path: category.path,
                    hasChildren: category.children && category.children.length > 0
                });

                if (category.children && category.children.length > 0) {
                    flatten(category.children, result);
                }
            });
            return result;
        };

        return flatten(this.categories);
    }

    // 获取指定层级的类别
    getCategoriesByLevel(level) {
        const result = [];
        const findByLevel = (categories) => {
            categories.forEach(category => {
                if (category.level === level) {
                    result.push(category);
                }
                if (category.children && category.children.length > 0) {
                    findByLevel(category.children);
                }
            });
        };

        findByLevel(this.categories);
        return result;
    }

    // 获取类别的完整路径数组
    getCategoryPathArray(categoryId) {
        const category = this.findCategoryById(categoryId);
        if (!category) return [];

        return category.path.split('/');
    }

    // 搜索类别
    searchCategories(keyword) {
        if (!keyword || keyword.trim() === '') {
            return [];
        }

        const keyword_lower = keyword.toLowerCase();
        const result = [];

        const searchRecursive = (categories) => {
            categories.forEach(category => {
                if (category.name.toLowerCase().includes(keyword_lower) ||
                    category.path.toLowerCase().includes(keyword_lower)) {
                    result.push(category);
                }

                if (category.children && category.children.length > 0) {
                    searchRecursive(category.children);
                }
            });
        };

        searchRecursive(this.categories);
        return result;
    }
}

export default CategoryManager;