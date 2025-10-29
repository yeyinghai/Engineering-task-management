import TaskManager from './taskManager.js';
import StandardWordExporter from './wordExport.js';
import CategoryManager from './categoryManager.js';

class AdminApp {
    constructor() {
        this.taskManager = null;
        this.personnelManager = null;
        this.categoryManager = null; // 先设为null，在init时创建
        this.wordExporter = new StandardWordExporter();
        this.currentEditingId = null;
        this.currentEditingCategoryId = null;
        // 从localStorage读取上次打开的菜单，如果没有则默认为'personnel'
        this.currentSection = localStorage.getItem('adminCurrentSection') || 'personnel';
        this.personnelFilter = {
            search: '',
            role: 'all',
            department: 'all'
        };
        this.categoryExpandedState = new Set(); // 跟踪展开状态
        this.categoryTreeEventsBound = false; // 跟踪事件是否已绑定

        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    async init() {
        try {
            console.log('Initializing AdminApp...');
            this.taskManager = new TaskManager();
            await this.taskManager.init();
            this.personnelManager = this.taskManager.getPersonnelManager();

            // 使用TaskManager的databaseManager来创建CategoryManager，确保共享同一个数据库连接
            this.categoryManager = new CategoryManager(this.taskManager.databaseManager);
            await this.categoryManager.init();

            // 确保人员数据已加载完成
            console.log('Checking personnel data...');
            const personnel = this.personnelManager.getAllPersonnel();
            console.log('Personnel count after init:', personnel.length);

            // 添加数据变化监听器
            this.setupDataListeners();

            console.log('AdminApp initialized successfully');
            this.render();
        } catch (error) {
            console.error('Error initializing AdminApp:', error);
        }
    }

    // 初始渲染方法
    render() {
        // 显示之前打开的页面，如果没有则默认显示人员管理页面
        this.switchSection(this.currentSection);
    }

    initializeElements() {
        // 导航元素
        this.personnelTab = document.getElementById('personnel-tab');
        this.categoryTab = document.getElementById('category-tab');
        this.tasksTab = document.getElementById('tasks-tab');
        this.statsTab = document.getElementById('stats-tab');
        this.databaseTab = document.getElementById('database-tab');
        this.backToMainBtn = document.getElementById('back-to-main');

        // 页面区域
        this.personnelSection = document.getElementById('personnel-section');
        this.categorySection = document.getElementById('category-section');
        this.tasksSection = document.getElementById('tasks-section');
        this.statsSection = document.getElementById('stats-section');
        this.databaseSection = document.getElementById('database-section');

        // 人员管理元素
        this.addPersonnelBtn = document.getElementById('add-personnel-btn');
        this.workingHoursBtn = document.getElementById('working-hours-btn');
        this.personnelSearch = document.getElementById('personnel-search');
        this.roleFilter = document.getElementById('role-filter');
        this.departmentFilter = document.getElementById('department-filter');
        this.personnelList = document.getElementById('personnel-list');

        // 上下班时间设置模态框元素
        this.workingHoursModal = document.getElementById('working-hours-modal');
        this.closeWorkingHoursModal = document.getElementById('close-working-hours-modal');
        this.closeWorkingHoursBtn = document.getElementById('close-working-hours-btn');
        this.globalStartTime = document.getElementById('global-start-time');
        this.globalEndTime = document.getElementById('global-end-time');
        this.saveGlobalHoursBtn = document.getElementById('save-global-hours-btn');
        this.hoursPersonnelSearch = document.getElementById('hours-personnel-search');
        this.personnelHoursContent = document.getElementById('personnel-hours-content');

        // 编辑个人时间模态框元素
        this.editPersonHoursModal = document.getElementById('edit-person-hours-modal');
        this.closeEditPersonHours = document.getElementById('close-edit-person-hours');
        this.editPersonHoursForm = document.getElementById('edit-person-hours-form');
        this.editPersonName = document.getElementById('edit-person-name');
        this.editStartTime = document.getElementById('edit-start-time');
        this.editEndTime = document.getElementById('edit-end-time');
        this.useGlobalHoursCheckbox = document.getElementById('use-global-hours-checkbox');
        this.cancelEditPersonHours = document.getElementById('cancel-edit-person-hours');

        // 存储当前编辑的人员ID
        this.currentEditingPersonId = null;

        // 模态框元素
        this.personnelModal = document.getElementById('personnel-modal');
        this.personnelModalTitle = document.getElementById('personnel-modal-title');
        this.personnelForm = document.getElementById('personnel-form');
        this.closePersonnelModal = document.getElementById('close-personnel-modal');
        this.cancelPersonnel = document.getElementById('cancel-personnel');

        // 表单字段
        this.personnelName = document.getElementById('personnel-name');
        this.personnelRole = document.getElementById('personnel-role');
        this.personnelDepartment = document.getElementById('personnel-department');
        this.personnelPhone = document.getElementById('personnel-phone');

        // 统计元素
        this.statsStartDate = document.getElementById('stats-start-date');
        this.statsEndDate = document.getElementById('stats-end-date');
        this.generateStatsBtn = document.getElementById('generate-stats');
        this.exportWordBtn = document.getElementById('export-word-btn');
        this.totalTasksStat = document.getElementById('total-tasks-stat');
        this.completedTasksStat = document.getElementById('completed-tasks-stat');
        this.inprogressTasksStat = document.getElementById('inprogress-tasks-stat');
        this.pendingTasksStat = document.getElementById('pending-tasks-stat');
        this.personnelWorkload = document.getElementById('personnel-workload');
        this.categoryDistribution = document.getElementById('category-distribution');

        // 任务管理元素
        this.categoryFilterTasks = document.getElementById('category-filter-tasks');
        this.statusFilterTasks = document.getElementById('status-filter-tasks');
        this.refreshTasksBtn = document.getElementById('refresh-tasks-btn');
        this.tasksList = document.getElementById('tasks-list');

        // 任务统计元素
        this.totalTasksCount = document.getElementById('total-tasks-count');
        this.completedTasksCount = document.getElementById('completed-tasks-count');
        this.inprogressTasksCount = document.getElementById('inprogress-tasks-count');
        this.pendingTasksCount = document.getElementById('pending-tasks-count');
        this.avgCompletionDays = document.getElementById('avg-completion-days');

        // 类别管理元素
        this.addCategoryBtn = document.getElementById('add-category-btn');
        this.expandAllBtn = document.getElementById('expand-all-btn');
        this.collapseAllBtn = document.getElementById('collapse-all-btn');
        this.categorySearch = document.getElementById('category-search');
        this.clearSearchBtn = document.getElementById('clear-search-btn');
        this.categoryTree = document.getElementById('category-tree');
        this.categoryCount = document.getElementById('category-count');
        this.levelInfo = document.getElementById('level-info');
        this.leafCount = document.getElementById('leaf-count');
        this.rootCount = document.getElementById('root-count');
        this.categoryBreadcrumb = document.getElementById('category-breadcrumb');

        // 类别模态框元素
        this.categoryModal = document.getElementById('category-modal');
        this.categoryModalTitle = document.getElementById('category-modal-title');
        this.categoryForm = document.getElementById('category-form');
        this.closeCategoryModal = document.getElementById('close-category-modal');
        this.cancelCategory = document.getElementById('cancel-category');
        this.categoryName = document.getElementById('category-name');
        this.categoryParent = document.getElementById('category-parent');
        this.categoryPathPreview = document.getElementById('category-path-preview');

        // 移动类别模态框元素
        this.moveCategoryModal = document.getElementById('move-category-modal');
        this.closeMoveModal = document.getElementById('close-move-modal');
        this.moveCategoryForm = document.getElementById('move-category-form');
        this.cancelMove = document.getElementById('cancel-move');
        this.currentCategoryInfo = document.getElementById('current-category-info');
        this.moveTargetParent = document.getElementById('move-target-parent');
        this.newPathPreview = document.getElementById('new-path-preview');

        // 删除确认弹窗元素
        this.deleteConfirmModal = document.getElementById('delete-confirm-modal');
        this.deleteConfirmCategory = document.getElementById('delete-confirm-category');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        this.currentDeletingCategoryId = null;

        // 成功提示弹窗元素
        this.successModal = document.getElementById('success-modal');
        this.successMessage = document.getElementById('success-message');
        this.successOkBtn = document.getElementById('success-ok-btn');

        // 警告提示弹窗元素
        this.warningModal = document.getElementById('warning-modal');
        this.warningMessage = document.getElementById('warning-message');
        this.warningOkBtn = document.getElementById('warning-ok-btn');
    }

    bindEvents() {
        // 导航事件
        if (this.personnelTab) this.personnelTab.addEventListener('click', () => this.switchSection('personnel'));
        if (this.categoryTab) this.categoryTab.addEventListener('click', () => this.switchSection('category'));
        if (this.tasksTab) this.tasksTab.addEventListener('click', () => this.switchSection('tasks'));
        if (this.statsTab) this.statsTab.addEventListener('click', () => this.switchSection('stats'));
        if (this.databaseTab) this.databaseTab.addEventListener('click', () => this.switchSection('database'));
        if (this.backToMainBtn) this.backToMainBtn.addEventListener('click', () => this.backToMain());

        // 调试信息
        console.log('Navigation elements found:', {
            personnelTab: !!this.personnelTab,
            categoryTab: !!this.categoryTab,
            tasksTab: !!this.tasksTab,
            statsTab: !!this.statsTab,
            databaseTab: !!this.databaseTab
        });
        
        // 人员管理事件
        this.addPersonnelBtn.addEventListener('click', () => this.showAddPersonnelModal());
        this.workingHoursBtn.addEventListener('click', () => this.showWorkingHoursModal());
        this.personnelSearch.addEventListener('input', (e) => this.handleSearchChange(e));
        this.roleFilter.addEventListener('change', (e) => this.handleRoleFilterChange(e));
        this.departmentFilter.addEventListener('change', (e) => this.handleDepartmentFilterChange(e));
        
        // 模态框事件
        this.personnelForm.addEventListener('submit', (e) => this.handlePersonnelSubmit(e));
        this.closePersonnelModal.addEventListener('click', () => this.hidePersonnelModal());
        this.cancelPersonnel.addEventListener('click', () => this.hidePersonnelModal());

        // 上下班时间设置模态框事件
        if (this.closeWorkingHoursModal) this.closeWorkingHoursModal.addEventListener('click', () => this.hideWorkingHoursModal());
        if (this.closeWorkingHoursBtn) this.closeWorkingHoursBtn.addEventListener('click', () => this.hideWorkingHoursModal());
        if (this.saveGlobalHoursBtn) this.saveGlobalHoursBtn.addEventListener('click', () => this.handleSaveGlobalHours());
        if (this.hoursPersonnelSearch) this.hoursPersonnelSearch.addEventListener('input', (e) => this.handleHoursPersonnelSearch(e));

        // 编辑个人时间模态框事件
        if (this.closeEditPersonHours) this.closeEditPersonHours.addEventListener('click', () => this.hideEditPersonHoursModal());
        if (this.cancelEditPersonHours) this.cancelEditPersonHours.addEventListener('click', () => this.hideEditPersonHoursModal());
        if (this.editPersonHoursForm) this.editPersonHoursForm.addEventListener('submit', (e) => this.handleEditPersonHoursSubmit(e));
        if (this.useGlobalHoursCheckbox) this.useGlobalHoursCheckbox.addEventListener('change', (e) => this.handleUseGlobalHoursChange(e));

        // 点击模态框外部关闭
        if (this.workingHoursModal) {
            this.workingHoursModal.addEventListener('click', (e) => {
                if (e.target === this.workingHoursModal) {
                    this.hideWorkingHoursModal();
                }
            });
        }

        if (this.editPersonHoursModal) {
            this.editPersonHoursModal.addEventListener('click', (e) => {
                if (e.target === this.editPersonHoursModal) {
                    this.hideEditPersonHoursModal();
                }
            });
        }

        // 类别管理事件
        if (this.addCategoryBtn) this.addCategoryBtn.addEventListener('click', () => this.showAddCategoryModal());
        if (this.expandAllBtn) this.expandAllBtn.addEventListener('click', () => this.expandAllCategories());
        if (this.collapseAllBtn) this.collapseAllBtn.addEventListener('click', () => this.collapseAllCategories());
        if (this.categorySearch) this.categorySearch.addEventListener('input', (e) => this.handleCategorySearch(e));
        if (this.clearSearchBtn) this.clearSearchBtn.addEventListener('click', () => this.clearCategorySearch());

        // 类别模态框事件
        if (this.categoryForm) this.categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        if (this.closeCategoryModal) this.closeCategoryModal.addEventListener('click', () => this.hideCategoryModal());
        if (this.cancelCategory) this.cancelCategory.addEventListener('click', () => this.hideCategoryModal());
        if (this.categoryParent) this.categoryParent.addEventListener('change', () => this.updateCategoryPathPreview());

        // 移动类别模态框事件
        if (this.moveCategoryForm) this.moveCategoryForm.addEventListener('submit', (e) => this.handleMoveCategorySubmit(e));
        if (this.closeMoveModal) this.closeMoveModal.addEventListener('click', () => this.hideMoveModal());
        if (this.cancelMove) this.cancelMove.addEventListener('click', () => this.hideMoveModal());
        if (this.moveTargetParent) this.moveTargetParent.addEventListener('change', () => this.updateMovePathPreview());

        // 删除确认弹窗事件
        if (this.confirmDeleteBtn) this.confirmDeleteBtn.addEventListener('click', () => this.confirmCategoryDelete());
        if (this.cancelDeleteBtn) this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());

        // 成功提示弹窗事件
        if (this.successOkBtn) this.successOkBtn.addEventListener('click', () => this.hideSuccessModal());

        // 警告提示弹窗事件
        if (this.warningOkBtn) this.warningOkBtn.addEventListener('click', () => this.hideWarningModal());

        // 点击弹窗外部关闭
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.addEventListener('click', (e) => {
                if (e.target === this.deleteConfirmModal) {
                    this.hideDeleteModal();
                }
            });
        }

        if (this.successModal) {
            this.successModal.addEventListener('click', (e) => {
                if (e.target === this.successModal) {
                    this.hideSuccessModal();
                }
            });
        }

        if (this.warningModal) {
            this.warningModal.addEventListener('click', (e) => {
                if (e.target === this.warningModal) {
                    this.hideWarningModal();
                }
            });
        }

        // 统计事件
        console.log('Binding stats events. generateStatsBtn exists:', !!this.generateStatsBtn);
        if (this.generateStatsBtn) {
            this.generateStatsBtn.addEventListener('click', () => {
                console.log('Generate stats button clicked');
                this.generateStats();
            });
            console.log('Generate stats button event listener bound successfully');
        } else {
            console.error('Generate stats button not found!');
        }

        if (this.exportWordBtn) {
            this.exportWordBtn.addEventListener('click', () => {
                console.log('Export Word button clicked');
                this.exportToWord();
            });
            console.log('Export Word button event listener bound successfully');
        } else {
            console.error('Export Word button not found!');
        }

        // 任务管理事件
        if (this.refreshTasksBtn) this.refreshTasksBtn.addEventListener('click', () => this.refreshTasksData());
        if (this.categoryFilterTasks) this.categoryFilterTasks.addEventListener('change', () => this.renderTasks());
        if (this.statusFilterTasks) this.statusFilterTasks.addEventListener('change', () => this.renderTasks());

        // 调试任务管理元素
        console.log('Task management elements found:', {
            refreshTasksBtn: !!this.refreshTasksBtn,
            categoryFilterTasks: !!this.categoryFilterTasks,
            statusFilterTasks: !!this.statusFilterTasks,
            tasksList: !!this.tasksList,
            tasksSection: !!this.tasksSection
        });
        
        // 模态框外部点击关闭
        window.addEventListener('click', (e) => {
            if (e.target === this.personnelModal) {
                this.hidePersonnelModal();
            }
        });
    }

    switchSection(section) {
        console.log('switchSection called with:', section);

        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));

        this.currentSection = section;

        // 保存当前打开的菜单到localStorage
        localStorage.setItem('adminCurrentSection', section);

        if (section === 'personnel') {
            console.log('Switching to personnel section');
            this.personnelTab.classList.add('active');
            this.personnelSection.classList.add('active');
            this.refreshPersonnelData();
        } else if (section === 'category') {
            console.log('Switching to category section');
            if (this.categoryTab) this.categoryTab.classList.add('active');
            if (this.categorySection) this.categorySection.classList.add('active');
            this.initializeCategoryPage();
        } else if (section === 'tasks') {
            console.log('Switching to tasks section');
            if (this.tasksTab) this.tasksTab.classList.add('active');
            if (this.tasksSection) this.tasksSection.classList.add('active');
            this.refreshTasksData();
        } else if (section === 'stats') {
            console.log('Switching to stats section');
            this.statsTab.classList.add('active');
            this.statsSection.classList.add('active');
            this.initializeStatsPage();
        } else if (section === 'database') {
            console.log('Switching to database section');
            this.databaseTab.classList.add('active');
            this.databaseSection.classList.add('active');
            this.initializeDatabasePage();
        }
    }

    backToMain() {
        window.location.href = 'index.html';
    }

    // 人员管理方法
    showAddPersonnelModal() {
        this.currentEditingId = null;
        this.personnelModalTitle.textContent = '添加人员';
        this.personnelForm.reset();
        this.showPersonnelModal();
    }

    showEditPersonnelModal(id) {
        console.log('Edit modal request for ID:', id, 'Type:', typeof id);

        const person = this.personnelManager.getPersonnelById(id);
        console.log('Found person for edit:', person);

        if (!person) {
            console.error('Person not found for edit ID:', id);
            alert('无法找到要编辑的人员');
            return;
        }

        this.currentEditingId = id;
        this.personnelModalTitle.textContent = '编辑人员';
        this.personnelName.value = person.name;
        this.personnelRole.value = person.role;
        this.personnelDepartment.value = person.department;
        this.personnelPhone.value = person.phone;
        this.showPersonnelModal();
    }

    showPersonnelModal() {
        this.personnelModal.style.display = 'block';
    }

    hidePersonnelModal() {
        this.personnelModal.style.display = 'none';
        this.currentEditingId = null;
        this.personnelForm.reset();
    }

    async handlePersonnelSubmit(e) {
        e.preventDefault();

        const name = this.personnelName.value.trim();
        const role = this.personnelRole.value.trim();
        const department = this.personnelDepartment.value.trim();
        const phone = this.personnelPhone.value.trim();

        if (!name) {
            alert('请输入人员姓名');
            return;
        }

        try {
            if (this.currentEditingId) {
                // 编辑模式
                await this.personnelManager.updatePersonnel(this.currentEditingId, {
                    name, role, department, phone
                });
                this.showSuccessModal('人员信息更新成功！');
            } else {
                // 添加模式
                await this.personnelManager.addPersonnel(name, role, department, phone);
                this.showSuccessModal('人员添加成功！');
            }

            this.hidePersonnelModal();
            this.renderPersonnel();
            this.updateFilters();
        } catch (error) {
            alert('操作失败: ' + error.message);
            console.error('Personnel operation error:', error);
        }
    }

    async handleDeletePersonnel(id) {
        console.log('Delete request for ID:', id, 'Type:', typeof id);

        const person = this.personnelManager.getPersonnelById(id);
        console.log('Found person:', person);

        if (!person) {
            console.error('Person not found for ID:', id);
            alert('无法找到要删除的人员');
            return;
        }

        if (confirm(`确定要删除人员"${person.name}"吗？\n\n注意：删除后该人员将从所有相关任务中移除。`)) {
            try {
                // Show loading state
                this.personnelList.innerHTML = '<div class="no-data">正在删除人员...</div>';

                console.log('Attempting to delete person with ID:', id);
                await this.personnelManager.deletePersonnel(id);
                console.log('Delete successful');

                // 删除成功后直接更新界面，不需要重新加载数据
                console.log('人员删除成功，正在更新界面...');

                this.renderPersonnel();
                this.updateFilters();
            } catch (error) {
                console.error('Personnel delete error:', error);
                alert('删除失败: ' + error.message);
                // Restore the personnel list on error
                this.renderPersonnel();
            }
        }
    }

    handleSearchChange(e) {
        this.personnelFilter.search = e.target.value.trim();
        this.renderPersonnel();
    }

    handleRoleFilterChange(e) {
        this.personnelFilter.role = e.target.value;
        this.renderPersonnel();
    }

    handleDepartmentFilterChange(e) {
        this.personnelFilter.department = e.target.value;
        this.renderPersonnel();
    }

    getFilteredPersonnel() {
        if (!this.personnelManager) {
            return [];
        }
        
        let personnel = this.personnelManager.getAllPersonnel();
        
        // 搜索过滤
        if (this.personnelFilter.search) {
            const query = this.personnelFilter.search.toLowerCase();
            personnel = personnel.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.role.toLowerCase().includes(query) ||
                p.department.toLowerCase().includes(query)
            );
        }
        
        // 角色过滤
        if (this.personnelFilter.role !== 'all') {
            personnel = personnel.filter(p => p.role === this.personnelFilter.role);
        }
        
        // 部门过滤
        if (this.personnelFilter.department !== 'all') {
            personnel = personnel.filter(p => p.department === this.personnelFilter.department);
        }
        
        return personnel;
    }

    renderPersonnel() {
        console.log('renderPersonnel called');

        if (!this.personnelManager) {
            console.log('PersonnelManager not available');
            this.personnelList.innerHTML = '<div class="no-data">正在加载人员数据...</div>';
            return;
        }

        const personnel = this.getFilteredPersonnel();
        console.log('Filtered personnel count:', personnel.length);
        console.log('Personnel data:', personnel);

        this.personnelList.innerHTML = '';

        if (personnel.length === 0) {
            this.personnelList.innerHTML = '<div class="no-data">没有找到匹配的人员</div>';
            return;
        }

        personnel.forEach(person => {
            console.log('Rendering person:', person, 'ID type:', typeof person.id);
            const personElement = document.createElement('div');
            personElement.className = 'personnel-item';
            personElement.innerHTML = `
                <div class="personnel-name">${this.escapeHtml(person.name)}</div>
                <div class="personnel-role">${this.escapeHtml(person.role || '未设置')}</div>
                <div class="personnel-department">${this.escapeHtml(person.department || '未设置')}</div>
                <div class="personnel-phone">${this.escapeHtml(person.phone || '未设置')}</div>
                <div class="personnel-date">${this.formatDate(person.createdAt)}</div>
                <div class="personnel-actions">
                    <button class="btn-edit" data-person-id="${person.id}" data-action="edit">编辑</button>
                    <button class="btn-delete" data-person-id="${person.id}" data-action="delete">删除</button>
                </div>
            `;

            // 添加事件监听器
            const editBtn = personElement.querySelector('.btn-edit');
            const deleteBtn = personElement.querySelector('.btn-delete');

            editBtn.addEventListener('click', () => {
                const personId = parseInt(person.id, 10);
                console.log('Edit button clicked for person ID:', personId);
                this.showEditPersonnelModal(personId);
            });

            deleteBtn.addEventListener('click', () => {
                const personId = parseInt(person.id, 10);
                console.log('Delete button clicked for person ID:', personId);
                this.handleDeletePersonnel(personId);
            });

            this.personnelList.appendChild(personElement);
        });

        console.log('Personnel rendering completed');
    }

    updateFilters() {
        if (!this.personnelManager) {
            return;
        }
        
        // 更新角色筛选器
        const roles = this.personnelManager.getRoles();
        const currentRole = this.roleFilter.value;
        this.roleFilter.innerHTML = '<option value="all">所有角色</option>';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            this.roleFilter.appendChild(option);
        });
        if (roles.includes(currentRole)) {
            this.roleFilter.value = currentRole;
        }

        // 更新部门筛选器
        const departments = this.personnelManager.getDepartments();
        const currentDept = this.departmentFilter.value;
        this.departmentFilter.innerHTML = '<option value="all">所有部门</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            this.departmentFilter.appendChild(option);
        });
        if (departments.includes(currentDept)) {
            this.departmentFilter.value = currentDept;
        }
    }

    // 统计方法
    initializeStatsPage() {
        console.log('initializeStatsPage called');

        // 设置默认日期范围（最近30天）
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        console.log('Setting default dates:', {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });

        // 正确设置日期输入框的值
        this.statsStartDate.value = startDate.toISOString().split('T')[0];
        this.statsEndDate.value = endDate.toISOString().split('T')[0];

        // 检查TaskManager是否已初始化
        if (!this.taskManager) {
            console.log('TaskManager not initialized yet, will generate stats when ready');
            return;
        }

        console.log('Generating initial stats');

        // 初始化类别完成率菜单
        this.initializeCategoryStatsMenu();

        this.generateStats();
    }

    generateStats() {
        console.log('generateStats called');

        // 检查TaskManager是否已初始化
        if (!this.taskManager) {
            console.error('TaskManager not initialized');
            alert('系统尚未初始化完成，请稍后再试');
            return;
        }

        // 获取日期值
        const startDateValue = this.statsStartDate.value;
        const endDateValue = this.statsEndDate.value;

        console.log('Date values from inputs:', { startDateValue, endDateValue });

        if (!startDateValue || !endDateValue) {
            alert('请选择开始和结束日期');
            return;
        }

        // 创建日期对象
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);

        console.log('Parsed date objects:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });

        if (startDate > endDate) {
            alert('开始日期不能晚于结束日期');
            return;
        }

        try {
            // 获取所有任务用于调试
            const allTasks = this.taskManager.getTasks();
            console.log('Total tasks in system:', allTasks.length);
            console.log('First few tasks:', allTasks.slice(0, 3).map(t => ({
                title: t.title,
                createdAt: t.createdAt,
                status: t.status
            })));

            // 获取日期范围内的任务
            const tasks = this.getTasksInDateRange(startDate, endDate);
            console.log('Tasks in date range:', tasks.length);

            if (tasks.length === 0) {
                console.log('No tasks found in date range, showing empty state');
                this.showEmptyStatsState();
            } else {
                console.log('Found tasks, generating stats:', tasks.map(t => ({
                    title: t.title,
                    createdAt: t.createdAt,
                    status: t.status
                })));

                // 更新总体统计
                this.updateOverallStats(tasks);

                // 更新人员工作量统计
                this.updatePersonnelWorkloadStats(tasks);

                // 更新类别分布统计
                this.updateCategoryStats(tasks);
            }

            console.log('Stats generation completed successfully');
        } catch (error) {
            console.error('Error generating stats:', error);
            alert('生成报表时发生错误：' + error.message);
        }
    }

    getTasksInDateRange(startDate, endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        console.log('Filtering tasks by date range:', {
            start: start.toISOString(),
            end: end.toISOString()
        });

        const filteredTasks = this.taskManager.getTasks().filter(task => {
            if (!task.createdAt) {
                console.log('Task without createdAt found:', task.title);
                return false;
            }

            const taskDate = new Date(task.createdAt);
            console.log('Checking task:', {
                title: task.title,
                taskDate: taskDate.toISOString(),
                inRange: taskDate >= start && taskDate <= end
            });

            return taskDate >= start && taskDate <= end;
        });

        console.log('Filtered tasks result:', filteredTasks.length);
        return filteredTasks;
    }

    showEmptyStatsState() {
        // 显示空状态
        this.totalTasksStat.textContent = '0';
        this.completedTasksStat.textContent = '0';
        this.inprogressTasksStat.textContent = '0';
        this.pendingTasksStat.textContent = '0';

        this.personnelWorkload.innerHTML = '<div class="no-data">该时间段内没有分配任务</div>';
        this.categoryDistribution.innerHTML = '<div class="no-data">该时间段内没有任务</div>';
    }

    updateOverallStats(tasks) {
        console.log('updateOverallStats called with', tasks.length, 'tasks');

        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            pending: tasks.filter(t => t.status === 'pending').length
        };

        console.log('Calculated stats:', stats);

        this.totalTasksStat.textContent = stats.total;
        this.completedTasksStat.textContent = stats.completed;
        this.inprogressTasksStat.textContent = stats.inProgress;
        this.pendingTasksStat.textContent = stats.pending;

        console.log('Updated overall stats display');
    }

    updatePersonnelWorkloadStats(tasks) {
        console.log('updatePersonnelWorkloadStats called with', tasks.length, 'tasks');

        const workload = {};

        tasks.forEach(task => {
            if (task.assignees && Array.isArray(task.assignees)) {
                task.assignees.forEach(assignee => {
                    if (assignee) {
                        workload[assignee] = (workload[assignee] || 0) + 1;
                    }
                });
            }
        });

        console.log('Calculated workload:', workload);

        const sortedWorkload = Object.entries(workload)
            .sort(([,a], [,b]) => b - a);

        this.personnelWorkload.innerHTML = '';

        if (sortedWorkload.length === 0) {
            this.personnelWorkload.innerHTML = '<div class="no-data">该时间段内没有分配任务</div>';
            console.log('No personnel workload data');
        } else {
            console.log('Rendering personnel workload:', sortedWorkload);
            sortedWorkload.forEach(([name, count]) => {
                const item = document.createElement('div');
                item.className = 'workload-item';
                item.innerHTML = `
                    <span class="workload-name">${this.escapeHtml(name)}</span>
                    <span class="workload-count">${count}</span>
                `;
                this.personnelWorkload.appendChild(item);
            });
        }
    }

    updateCategoryStats(tasks) {
        console.log('updateCategoryStats called with', tasks.length, 'tasks');

        const categories = {};

        tasks.forEach(task => {
            const category = task.category || '一般';
            categories[category] = (categories[category] || 0) + 1;
        });

        console.log('Calculated categories:', categories);

        const sortedCategories = Object.entries(categories)
            .sort(([,a], [,b]) => b - a);

        this.categoryDistribution.innerHTML = '';

        if (sortedCategories.length === 0) {
            this.categoryDistribution.innerHTML = '<div class="no-data">该时间段内没有任务</div>';
            console.log('No category distribution data');
        } else {
            console.log('Rendering category distribution:', sortedCategories);
            sortedCategories.forEach(([category, count]) => {
                const item = document.createElement('div');
                item.className = 'workload-item';
                item.innerHTML = `
                    <span class="workload-name">${this.escapeHtml(category)}</span>
                    <span class="workload-count">${count}</span>
                `;
                this.categoryDistribution.appendChild(item);
            });
        }
    }

    // Word文档导出功能
    async exportToWord() {
        console.log('exportToWord called');

        if (!this.taskManager) {
            alert('系统尚未初始化完成，请稍后再试');
            return;
        }

        try {
            // 获取当前统计数据
            const startDateValue = this.statsStartDate.value;
            const endDateValue = this.statsEndDate.value;

            if (!startDateValue || !endDateValue) {
                alert('请先生成报表再导出');
                return;
            }

            const startDate = new Date(startDateValue);
            const endDate = new Date(endDateValue);
            const tasks = this.getTasksInDateRange(startDate, endDate);

            // 显示加载状态
            this.exportWordBtn.textContent = '正在生成...';
            this.exportWordBtn.disabled = true;

            // 生成Word文档
            await this.generateWordDocument(tasks, startDate, endDate);

        } catch (error) {
            console.error('Error exporting to Word:', error);
            alert('导出Word文档失败：' + error.message);
        } finally {
            // 恢复按钮状态
            this.exportWordBtn.textContent = '导出Word报表';
            this.exportWordBtn.disabled = false;
        }
    }

    async generateWordDocument(tasks, startDate, endDate) {
        try {
            // 计算统计数据
            const stats = {
                total: tasks.length,
                completed: tasks.filter(t => t.status === 'completed').length,
                inProgress: tasks.filter(t => t.status === 'in-progress').length,
                pending: tasks.filter(t => t.status === 'pending').length
            };

            // 计算人员工作量
            const workloadMap = {};
            tasks.forEach(task => {
                if (task.assignees && Array.isArray(task.assignees)) {
                    task.assignees.forEach(assignee => {
                        if (assignee) {
                            workloadMap[assignee] = (workloadMap[assignee] || 0) + 1;
                        }
                    });
                }
            });
            const workload = Object.entries(workloadMap).sort(([,a], [,b]) => b - a);

            // 计算类别分布
            const categoryMap = {};
            tasks.forEach(task => {
                const category = task.category || '一般';
                categoryMap[category] = (categoryMap[category] || 0) + 1;
            });
            const categories = Object.entries(categoryMap).sort(([,a], [,b]) => b - a);

            // 准备数据
            const data = {
                title: '施工任务管理系统统计报表',
                dateRange: `统计时间：${startDate.toLocaleDateString('zh-CN')} 至 ${endDate.toLocaleDateString('zh-CN')}`,
                generateTime: `生成时间：${new Date().toLocaleString('zh-CN')}`,
                stats,
                workload,
                categories,
                tasks
            };

            let blob;
            let fileName;

            if (typeof window.JSZip !== 'undefined') {
                // 生成真正的docx文档
                const xmlContent = await this.wordExporter.generateWordDocument(data);
                blob = await this.wordExporter.createDocxBlob(xmlContent);
                fileName = `施工任务统计报表_${startDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}_${endDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`;
            } else {
                // 生成HTML格式的Word兼容文档
                blob = await this.wordExporter.createDocxBlob(data);
                fileName = `施工任务统计报表_${startDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}_${endDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}.doc`;
            }

            // 下载文件
            this.wordExporter.downloadFile(blob, fileName);

            console.log('Word document generated and downloaded successfully');
            alert('Word文档已成功生成并下载！');

        } catch (error) {
            console.error('Error generating Word document:', error);
            throw error;
        }
    }

    // 工具方法
    formatDate(date) {
        if (!date) return '-';

        try {
            const dateObj = new Date(date);

            // 检查日期是否有效
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date received:', date);
                return '-';
            }

            return dateObj.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Date value:', date);
            return '-';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 数据库管理页面初始化
    initializeDatabasePage() {
        // 导入数据库相关的功能
        // 确保taskManager已经初始化
        if (this.taskManager) {
            console.log('TaskManager available, initializing database events...');
            this.initializeDatabaseEvents();
        } else {
            console.warn('TaskManager not initialized yet, waiting...');
            // 等待taskManager初始化
            const checkTaskManager = setInterval(() => {
                if (this.taskManager) {
                    console.log('TaskManager initialized, initializing database events...');
                    clearInterval(checkTaskManager);
                    this.initializeDatabaseEvents();
                }
            }, 100);

            // 最多等待5秒
            setTimeout(() => {
                clearInterval(checkTaskManager);
                if (!this.taskManager) {
                    console.error('TaskManager not initialized within 5 seconds');
                    alert('数据管理器初始化失败，请刷新页面');
                }
            }, 5000);
        }
    }

    initializeDatabaseEvents() {
        // 直接在admin中处理数据库事件
        console.log('Initializing database events...');

        const exportBtn = document.getElementById('export-data-btn');
        const importBtn = document.getElementById('import-data-btn');
        const importTextBtn = document.getElementById('import-text-btn');
        const importFileInput = document.getElementById('import-file-input');

        console.log('Elements found:', {
            exportBtn: !!exportBtn,
            importBtn: !!importBtn,
            importTextBtn: !!importTextBtn,
            importFileInput: !!importFileInput,
            appAvailable: !!window.app,
            taskManagerAvailable: window.app ? !!window.app.taskManager : false
        });

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('Export button clicked');
                this.handleExportData();
            });
            console.log('Export button event listener added');
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                console.log('Import button clicked');
                this.handleImportDataClick();
            });
            console.log('Import button event listener added');
        }

        if (importTextBtn) {
            importTextBtn.addEventListener('click', () => {
                console.log('Import text button clicked');
                this.handleImportTextClick();
            });
            console.log('Import text button event listener added');
        }

        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                console.log('File selected');
                this.handleImportFileSelected(e);
            });
            console.log('Import file input event listener added');
        }
    }

    // 导出数据
    async handleExportData() {
        console.log('handleExportData called');
        console.log('this.taskManager:', this.taskManager);

        try {
            if (!this.taskManager) {
                console.error('taskManager not available');
                alert('数据管理器未就绪，请稍候后重试。');
                return;
            }

            // 先尝试文件下载
            console.log('Attempting to download data as file...');
            await this.taskManager.downloadDataAsFile();
            alert('数据导出成功！文件已下载到您的下载文件夹。');
        } catch (error) {
            console.error('文件下载失败，尝试备用方法:', error);
            // 如果下载失败，显示数据供用户复制
            try {
                console.log('Attempting fallback export method...');
                await this.taskManager.showExportData();
                alert('请复制显示的数据并保存到文件中。');
            } catch (fallbackError) {
                console.error('备用导出方法也失败:', fallbackError);
                alert('导出数据失败: ' + fallbackError.message);
            }
        }
    }

    // 导入数据按钮点击处理
    handleImportDataClick() {
        console.log('handleImportDataClick called');
        const importFileInput = document.getElementById('import-file-input');
        console.log('importFileInput found:', !!importFileInput);
        if (importFileInput) {
            importFileInput.click();
        } else {
            alert('找不到文件输入框，请刷新页面后重试。');
        }
    }

    // 文件选择处理
    async handleImportFileSelected(e) {
        console.log('handleImportFileSelected called');
        const file = e.target.files[0];
        console.log('File selected:', file);

        if (!file) {
            console.log('No file selected');
            return;
        }

        try {
            if (!this.taskManager) {
                console.error('taskManager not available');
                alert('数据管理器未就绪，请稍候后重试。');
                return;
            }

            console.log('Starting import...');
            const success = await this.taskManager.importDataFromFile(file);
            console.log('Import result:', success);

            if (success) {
                alert('数据导入成功！页面将刷新以显示导入的数据。');
                // 刷新页面以显示导入的数据
                await this.taskManager.init();
                if (this.personnelManager) {
                    await this.personnelManager.init();
                }
                // 重新渲染admin页面
                this.refreshData();
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败: ' + error.message);
        }

        // 清空文件输入框
        e.target.value = '';
    }

    // 手动导入数据处理（通过文本框）
    async handleImportTextClick() {
        console.log('handleImportTextClick called');
        try {
            if (!this.taskManager) {
                console.error('taskManager not available');
                alert('数据管理器未就绪，请稍候后重试。');
                return;
            }

            console.log('Showing import data modal...');
            const success = await this.taskManager.showImportDataModal();
            console.log('Import modal result:', success);

            if (success) {
                alert('数据导入成功！页面将刷新以显示导入的数据。');
                // 刷新页面以显示导入的数据
                await this.taskManager.init();
                if (this.personnelManager) {
                    await this.personnelManager.init();
                }
                // 重新渲染admin页面
                this.refreshData();
            }
        } catch (error) {
            console.error('手动导入数据失败:', error);
            alert('导入数据失败: ' + error.message);
        }
    }

    // 任务管理方法
    initializeTasksPage() {
        console.log('initializeTasksPage called');
        console.log('TaskManager available:', !!this.taskManager);
        console.log('Task elements available:', {
            categoryFilterTasks: !!this.categoryFilterTasks,
            statusFilterTasks: !!this.statusFilterTasks,
            tasksList: !!this.tasksList
        });

        if (!this.taskManager) {
            console.warn('TaskManager not initialized yet');
            if (this.tasksList) {
                this.tasksList.innerHTML = '<div class="no-data">正在初始化任务管理器...</div>';
            }
            return;
        }

        this.updateTaskFilters();
        this.renderTasks();
    }

    updateTaskFilters() {
        if (!this.taskManager) return;

        // 更新类别筛选器
        const categories = this.getTaskCategories();
        const currentCategory = this.categoryFilterTasks.value;
        this.categoryFilterTasks.innerHTML = '<option value="all">所有类别</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categoryFilterTasks.appendChild(option);
        });
        if (categories.includes(currentCategory)) {
            this.categoryFilterTasks.value = currentCategory;
        }
    }

    getTaskCategories() {
        if (!this.taskManager) return [];
        const tasks = this.taskManager.getTasks();
        const categories = [...new Set(tasks.map(task => task.category || '一般'))];
        return categories.sort();
    }

    getFilteredTasks() {
        if (!this.taskManager) return [];

        let tasks = this.taskManager.getTasks();

        // 类别过滤
        const categoryFilter = this.categoryFilterTasks.value;
        if (categoryFilter !== 'all') {
            tasks = tasks.filter(task => (task.category || '一般') === categoryFilter);
        }

        // 状态过滤
        const statusFilter = this.statusFilterTasks.value;
        if (statusFilter !== 'all') {
            tasks = tasks.filter(task => task.status === statusFilter);
        }

        return tasks;
    }

    renderTasks() {
        console.log('renderTasks called');

        if (!this.taskManager) {
            console.log('TaskManager not available');
            this.tasksList.innerHTML = '<div class="no-data">正在加载任务数据...</div>';
            return;
        }

        const tasks = this.getFilteredTasks();
        console.log('Filtered tasks count:', tasks.length);

        // 更新统计
        this.updateTaskStats(tasks);

        // 渲染任务列表
        this.tasksList.innerHTML = '';

        if (tasks.length === 0) {
            this.tasksList.innerHTML = '<div class="no-data">没有找到匹配的任务</div>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';

            // 计算完成时间
            const completionTime = this.calculateCompletionTime(task);
            const completionDisplay = completionTime !== null ? completionTime : '-';
            const completionClass = completionTime && completionTime.includes('天') ? 'highlight' : '';

            taskElement.innerHTML = `
                <div class="task-title" data-label="标题">${this.escapeHtml(task.title)}</div>
                <div class="task-category" data-label="类别">${this.escapeHtml(task.category || '一般')}</div>
                <div class="task-status ${task.status}" data-label="状态">${this.getStatusText(task.status)}</div>
                <div class="task-assignees" data-label="分配人员">${this.escapeHtml(this.formatAssignees(task.assignees))}</div>
                <div class="task-date" data-label="创建时间">${this.formatDate(task.createdAt)}</div>
                <div class="task-date" data-label="完成时间">${task.status === 'completed' ? this.formatDate(task.updatedAt) : '-'}</div>
                <div class="task-duration ${completionClass}" data-label="用时">${completionDisplay}</div>
                <div class="task-actions" data-label="操作">
                    <button class="btn-view" onclick="window.location.href='index.html'">查看详情</button>
                </div>
            `;

            this.tasksList.appendChild(taskElement);
        });

        console.log('Tasks rendering completed');
    }

    updateTaskStats(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');

        // 计算平均完成时间（以分钟为单位）
        const completedTasksWithMinutes = completedTasks
            .map(task => this.calculateCompletionMinutes(task))
            .filter(minutes => minutes !== null);

        let avgDisplay = '-';
        if (completedTasksWithMinutes.length > 0) {
            const avgMinutes = Math.round(completedTasksWithMinutes.reduce((sum, minutes) => sum + minutes, 0) / completedTasksWithMinutes.length);

            // 转换为易读格式
            const days = Math.floor(avgMinutes / (24 * 60));
            const hours = Math.floor((avgMinutes % (24 * 60)) / 60);
            const mins = avgMinutes % 60;

            if (days > 0) {
                avgDisplay = `${days}天${hours}时${mins}分`;
            } else if (hours > 0) {
                avgDisplay = `${hours}时${mins}分`;
            } else {
                avgDisplay = `${mins}分`;
            }
        }

        // 更新统计显示
        this.totalTasksCount.textContent = totalTasks;
        this.completedTasksCount.textContent = completedTasks.length;
        this.inprogressTasksCount.textContent = inProgressTasks.length;
        this.pendingTasksCount.textContent = pendingTasks.length;
        this.avgCompletionDays.textContent = avgDisplay;
    }

    calculateCompletionMinutes(task) {
        if (task.status !== 'completed') {
            return null;
        }

        try {
            const createdDate = new Date(task.createdAt);
            const completedDate = new Date(task.updatedAt);

            if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) {
                return null;
            }

            const timeDiff = completedDate.getTime() - createdDate.getTime();
            const totalMinutes = Math.floor(timeDiff / (1000 * 60));

            return totalMinutes >= 0 ? totalMinutes : null;
        } catch (error) {
            console.error('Error calculating completion minutes:', error);
            return null;
        }
    }

    calculateCompletionTime(task) {
        if (task.status !== 'completed') {
            return null;
        }

        try {
            const createdDate = new Date(task.createdAt);
            const completedDate = new Date(task.updatedAt);

            if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) {
                return null;
            }

            if (completedDate.getTime() < createdDate.getTime()) {
                return null;
            }

            // 获取工作时间配置
            const startTimeStr = this.globalStartTime ? this.globalStartTime.value : '08:00';
            const endTimeStr = this.globalEndTime ? this.globalEndTime.value : '17:00';

            // 解析工作时间
            const [startHour, startMin] = startTimeStr.split(':').map(Number);
            const [endHour, endMin] = endTimeStr.split(':').map(Number);

            // 计算只包含工作时间的总分钟数
            const workingMinutes = this.calculateWorkingMinutes(
                createdDate,
                completedDate,
                startHour,
                startMin,
                endHour,
                endMin
            );

            if (workingMinutes < 0) {
                return null;
            }

            // 计算天、小时、分钟
            const days = Math.floor(workingMinutes / (24 * 60));
            const hours = Math.floor((workingMinutes % (24 * 60)) / 60);
            const minutes = workingMinutes % 60;

            // 格式化输出
            if (days > 0) {
                return `${days}天${hours}时${minutes}分`;
            } else if (hours > 0) {
                return `${hours}时${minutes}分`;
            } else {
                return `${minutes}分`;
            }
        } catch (error) {
            console.error('Error calculating completion time:', error);
            return null;
        }
    }

    /**
     * 计算两个日期之间只在工作时间内的分钟数
     * @param {Date} startDate 开始日期
     * @param {Date} endDate 结束日期
     * @param {Number} workStartHour 工作开始小时
     * @param {Number} workStartMin 工作开始分钟
     * @param {Number} workEndHour 工作结束小时
     * @param {Number} workEndMin 工作结束分钟
     * @returns {Number} 工作时间分钟数
     */
    calculateWorkingMinutes(startDate, endDate, workStartHour, workStartMin, workEndHour, workEndMin) {
        let totalWorkingMinutes = 0;

        // 将日期规范化为午夜
        let currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);

        const endDateMidnight = new Date(endDate);
        endDateMidnight.setHours(0, 0, 0, 0);

        // 遍历每一天
        while (currentDate <= endDateMidnight) {
            // 当天工作时间的开始和结束（生成完整的Date对象）
            const dayWorkStart = new Date(currentDate);
            dayWorkStart.setHours(workStartHour, workStartMin, 0, 0);

            const dayWorkEnd = new Date(currentDate);
            dayWorkEnd.setHours(workEndHour, workEndMin, 0, 0);

            // 计算该天的实际工作时间段
            let dayStart, dayEnd;

            // 判断是否是开始日期
            const isStartDay = currentDate.getDate() === startDate.getDate() &&
                startDate.getMonth() === currentDate.getMonth() &&
                startDate.getFullYear() === currentDate.getFullYear();

            // 判断是否是结束日期
            const isEndDay = currentDate.getTime() === endDateMidnight.getTime();

            if (isStartDay && isEndDay) {
                // 同一天内的任务
                dayStart = startDate.getTime();
                dayEnd = endDate.getTime();
            } else if (isStartDay) {
                // 开始日期 - 从任务开始时间到当天工作结束时间
                dayStart = Math.max(startDate.getTime(), dayWorkStart.getTime());
                dayEnd = dayWorkEnd.getTime();
            } else if (isEndDay) {
                // 结束日期 - 从当天工作开始时间到任务结束时间
                dayStart = dayWorkStart.getTime();
                dayEnd = Math.min(endDate.getTime(), dayWorkEnd.getTime());
            } else {
                // 中间日期 - 整天都是工作时间
                dayStart = dayWorkStart.getTime();
                dayEnd = dayWorkEnd.getTime();
            }

            // 只计算工作时间内的分钟
            if (dayStart < dayWorkEnd.getTime() && dayEnd > dayWorkStart.getTime()) {
                dayStart = Math.max(dayStart, dayWorkStart.getTime());
                dayEnd = Math.min(dayEnd, dayWorkEnd.getTime());
                totalWorkingMinutes += Math.floor((dayEnd - dayStart) / (1000 * 60));
            }

            // 移到下一天
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return totalWorkingMinutes;
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待办',
            'in-progress': '进行中',
            'completed': '已完成'
        };
        return statusMap[status] || status;
    }

    formatAssignees(assignees) {
        if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
            return '未分配';
        }
        return assignees.join(', ');
    }

    // 设置数据变化监听器
    setupDataListeners() {
        // 监听任务数据变化事件
        window.addEventListener('tasksChanged', (event) => {
            console.log('Admin received tasksChanged event:', event.detail);
            this.handleDataChange(event.detail);
        });

        // 监听人员数据变化事件
        window.addEventListener('personnelChanged', (event) => {
            console.log('Admin received personnelChanged event:', event.detail);
            this.handlePersonnelChange(event.detail);
        });

        console.log('Data listeners setup completed');
    }

    // 处理数据变化
    handleDataChange(detail) {
        const { action } = detail;
        console.log(`Handling data change: ${action}`);

        // 根据当前显示的页面进行相应的刷新
        if (this.currentSection === 'tasks') {
            console.log('Refreshing tasks section');
            this.updateTaskFilters();
            this.renderTasks();
        } else if (this.currentSection === 'stats') {
            console.log('Refreshing stats section');
            this.generateStats();
        }

        // 如果有任务变化，也可能影响人员工作量统计，所以在统计页面时也要刷新
        if (this.currentSection === 'stats') {
            this.generateStats();
        }
    }

    // 处理人员变化
    handlePersonnelChange(detail) {
        console.log('Handling personnel change:', detail);

        // 刷新人员页面
        if (this.currentSection === 'personnel') {
            console.log('Refreshing personnel section');
            this.renderPersonnel();
            this.updateFilters();
        }

        // 刷新任务页面的人员筛选器
        if (this.currentSection === 'tasks') {
            console.log('Updating task filters due to personnel change');
            this.updateTaskFilters();
            this.renderTasks();
        }
    }

    // 刷新人员数据
    async refreshPersonnelData() {
        console.log('Refreshing personnel data...');
        try {
            // 确保人员管理器已经初始化
            if (!this.personnelManager) {
                console.log('PersonnelManager not initialized yet, waiting...');
                return;
            }

            // 直接重新加载人员数据，不调用init以避免重复添加默认人员
            await this.personnelManager.loadPersonnel();
            this.renderPersonnel();
            this.updateFilters();
            console.log('Personnel data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing personnel data:', error);
            // 显示错误信息
            if (this.personnelList) {
                this.personnelList.innerHTML = '<div class="no-data">加载人员数据失败: ' + error.message + '</div>';
            }
        }
    }

    // 刷新任务数据
    async refreshTasksData() {
        console.log('Refreshing tasks data...');
        try {
            // 重新加载任务数据
            await this.taskManager.loadTasks();
            this.initializeTasksPage();
            console.log('Tasks data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing tasks data:', error);
            // 如果刷新失败，至少显示当前缓存的数据
            this.initializeTasksPage();
        }
    }

    // 刷新所有数据（用于导入后更新）
    async refreshData() {
        console.log('Refreshing all data after import...');
        try {
            // 根据当前打开的菜单刷新对应的数据
            const currentSection = localStorage.getItem('adminCurrentSection') || 'personnel';

            if (currentSection === 'personnel') {
                await this.refreshPersonnelData();
            } else if (currentSection === 'tasks') {
                await this.refreshTasksData();
            } else if (currentSection === 'stats') {
                this.initializeStatsPage();
            }
            // 数据库菜单无需特殊刷新
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    // 类别管理页面初始化
    initializeCategoryPage() {
        console.log('Initializing category page');
        try {
            // 确保CategoryManager已经初始化
            if (!this.categoryManager) {
                console.error('CategoryManager not found');
                if (this.categoryTree) {
                    this.categoryTree.innerHTML = '<div class="no-categories">CategoryManager未初始化</div>';
                }
                return;
            }

            this.updateCategoryStats();
            this.renderCategoryTree();
        } catch (error) {
            console.error('Error initializing category page:', error);
            if (this.categoryTree) {
                this.categoryTree.innerHTML = '<div class="no-categories">加载类别数据失败: ' + error.message + '</div>';
            }
        }
    }

    updateCategoryStats() {
        const categories = this.categoryManager.getFlatCategories();
        const allCategories = this.categoryManager.getAllCategories();
        const maxLevel = Math.max(...categories.map(c => c.level), 0);
        const leafCount = categories.filter(c => !c.hasChildren).length;
        const rootCount = allCategories.length;

        if (this.categoryCount) {
            this.categoryCount.textContent = categories.length;
        }
        if (this.levelInfo) {
            this.levelInfo.textContent = maxLevel;
        }
        if (this.leafCount) {
            this.leafCount.textContent = leafCount;
        }
        if (this.rootCount) {
            this.rootCount.textContent = rootCount;
        }
    }

    async renderCategoryTree(forceReload = false) {
        try {
            // 如果需要强制重新加载，从数据库重新获取数据
            if (forceReload) {
                await this.categoryManager.loadCategories();
            }

            const categories = this.categoryManager.getAllCategories();
            console.log('Rendering category tree with:', categories);

            if (!this.categoryTree) {
                console.error('Category tree element not found');
                return;
            }

            if (categories.length === 0) {
                this.categoryTree.innerHTML = '<div class="no-categories">暂无类别数据</div>';
                return;
            }

            const treeHtml = this.buildCategoryTreeHtml(categories);
            this.categoryTree.innerHTML = treeHtml;

            // 只在首次绑定树形控件事件
            if (!this.categoryTreeEventsBound) {
                this.bindCategoryTreeEvents();
                this.categoryTreeEventsBound = true;
            }

        } catch (error) {
            console.error('Error rendering category tree:', error);
            if (this.categoryTree) {
                this.categoryTree.innerHTML = '<div class="no-categories">加载类别数据失败</div>';
            }
        }
    }

    buildCategoryTreeHtml(categories) {
        return categories.map(category => this.buildCategoryItemHtml(category)).join('');
    }

    buildCategoryItemHtml(category) {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = this.categoryExpandedState.has(category.id);
        const levelClass = `level-${category.level}`;
        const categoryIcon = this.getCategoryIcon(category.name, category.level);

        let html = `
            <div class="category-item" data-category-id="${category.id}">
                <div class="category-header">
                    <div class="category-toggle ${hasChildren ? (isExpanded ? 'expanded' : '') : 'no-children'}"
                         data-category-id="${category.id}">
                        ${hasChildren ? (isExpanded ? '−' : '+') : '🌿'}
                    </div>
                    <div class="category-info">
                        <span class="category-icon">${categoryIcon}</span>
                        <span class="category-name">${this.escapeHtml(category.name)}</span>
                        <span class="category-level ${levelClass}">第${category.level}级</span>
                        <span class="category-path">${this.escapeHtml(category.path)}</span>
                    </div>
                    <div class="category-actions">
                        ${category.level < 4 ? `<button class="category-action-btn add" data-action="add" data-category-id="${category.id}">➕ 添加子类</button>` : ''}
                        <button class="category-action-btn edit" data-action="edit" data-category-id="${category.id}">✏️ 编辑</button>
                        <button class="category-action-btn move" data-action="move" data-category-id="${category.id}">🔄 移动</button>
                        <button class="category-action-btn delete" data-action="delete" data-category-id="${category.id}">🗑️ 删除</button>
                    </div>
                </div>`;

        if (hasChildren) {
            const childrenHtml = this.buildCategoryTreeHtml(category.children);
            html += `<div class="category-children ${isExpanded ? 'expanded' : ''}" data-parent-id="${category.id}">
                        ${childrenHtml}
                     </div>`;
        }

        html += '</div>';
        return html;
    }

    getCategoryIcon(categoryName, level) {
        // 根据类别名称和层级返回对应的图标
        const name = categoryName.toLowerCase();

        // 施工相关
        if (name.includes('施工') || name.includes('建设') || name.includes('工程')) {
            if (level === 1) return '🏗️';
            if (name.includes('基础')) return '🏢';
            if (name.includes('主体')) return '🏬';
            if (name.includes('装修') || name.includes('装饰')) return '🎨';
            return '⚒️';
        }

        // 质检相关
        if (name.includes('质检') || name.includes('检验') || name.includes('测试')) {
            if (level === 1) return '🔍';
            if (name.includes('材料')) return '🧱';
            if (name.includes('安全')) return '🛡️';
            return '✅';
        }

        // 设计相关
        if (name.includes('设计') || name.includes('规划') || name.includes('方案')) {
            if (level === 1) return '📐';
            if (name.includes('建筑')) return '🏛️';
            if (name.includes('结构')) return '🏗️';
            return '📊';
        }

        // 管理相关
        if (name.includes('管理') || name.includes('监督') || name.includes('协调')) {
            if (level === 1) return '📋';
            if (name.includes('进度')) return '⏰';
            if (name.includes('成本')) return '💰';
            return '📌';
        }

        // 安装相关
        if (name.includes('安装') || name.includes('调试')) {
            if (level === 1) return '🔧';
            if (name.includes('电气')) return '⚡';
            if (name.includes('管道')) return '🚰';
            if (name.includes('空调')) return '❄️';
            return '🔩';
        }

        // 维护相关
        if (name.includes('维护') || name.includes('保养') || name.includes('修理')) {
            if (level === 1) return '🛠️';
            if (name.includes('设备')) return '⚙️';
            return '🔧';
        }

        // 根据层级返回默认图标
        switch (level) {
            case 1: return '📁';
            case 2: return '📂';
            case 3: return '📄';
            case 4: return '📋';
            default: return '📌';
        }
    }

    bindCategoryTreeEvents() {
        // 展开/收起事件
        this.categoryTree.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-toggle') && !e.target.classList.contains('no-children')) {
                const categoryId = parseInt(e.target.dataset.categoryId);
                this.toggleCategoryExpansion(categoryId);
            }

            // 操作按钮事件
            if (e.target.classList.contains('category-action-btn')) {
                e.stopPropagation();
                const action = e.target.dataset.action;
                const categoryId = parseInt(e.target.dataset.categoryId);
                this.handleCategoryAction(action, categoryId);
            }
        });
    }

    toggleCategoryExpansion(categoryId) {
        if (this.categoryExpandedState.has(categoryId)) {
            this.categoryExpandedState.delete(categoryId);
        } else {
            this.categoryExpandedState.add(categoryId);
        }
        this.renderCategoryTree();
    }

    // 处理类别操作按钮事件
    handleCategoryAction(action, categoryId) {
        console.log('Category action:', action, 'for category ID:', categoryId);

        switch (action) {
            case 'add':
                this.showAddCategoryModal(categoryId);
                break;
            case 'edit':
                this.showEditCategoryModal(categoryId);
                break;
            case 'move':
                this.showMoveCategoryModal(categoryId);
                break;
            case 'delete':
                this.deleteCategoryWithConfirm(categoryId);
                break;
            default:
                console.warn('Unknown category action:', action);
        }
    }

    expandAllCategories() {
        const categories = this.categoryManager.getFlatCategories();
        categories.forEach(category => {
            if (category.hasChildren) {
                this.categoryExpandedState.add(category.id);
            }
        });
        this.renderCategoryTree();
    }

    collapseAllCategories() {
        this.categoryExpandedState.clear();
        this.renderCategoryTree();
    }

    // 搜索功能
    handleCategorySearch(e) {
        const keyword = e.target.value.trim();
        if (keyword === '') {
            this.renderCategoryTree();
            return;
        }

        const results = this.categoryManager.searchCategories(keyword);
        this.renderSearchResults(results, keyword);
    }

    renderSearchResults(results, keyword) {
        if (results.length === 0) {
            this.categoryTree.innerHTML = '<div class="no-categories">未找到匹配的类别</div>';
            return;
        }

        const highlightedResults = results.map(category => {
            const highlightedCategory = { ...category };
            highlightedCategory.name = this.highlightKeyword(category.name, keyword);
            highlightedCategory.path = this.highlightKeyword(category.path, keyword);
            return highlightedCategory;
        });

        const resultsHtml = highlightedResults.map(category => {
            const levelClass = `level-${category.level}`;
            const categoryIcon = this.getCategoryIcon(category.name, category.level);

            return `
                <div class="category-item search-highlight" data-category-id="${category.id}">
                    <div class="category-header">
                        <div class="category-toggle no-children">🔍</div>
                        <div class="category-info">
                            <span class="category-icon">${categoryIcon}</span>
                            <span class="category-name">${category.name}</span>
                            <span class="category-level ${levelClass}">第${category.level}级</span>
                            <span class="category-path">${category.path}</span>
                        </div>
                        <div class="category-actions">
                            ${category.level < 4 ? `<button class="category-action-btn add" data-action="add" data-category-id="${category.id}">添加子类</button>` : ''}
                            <button class="category-action-btn edit" data-action="edit" data-category-id="${category.id}">编辑</button>
                            <button class="category-action-btn move" data-action="move" data-category-id="${category.id}">移动</button>
                            <button class="category-action-btn delete" data-action="delete" data-category-id="${category.id}">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.categoryTree.innerHTML = resultsHtml;
        this.bindCategoryTreeEvents();
    }

    clearCategorySearch() {
        this.categorySearch.value = '';
        this.renderCategoryTree();
    }

    highlightKeyword(text, keyword) {
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, '<span class="search-match">$1</span>');
    }

    // 模态框相关方法
    showAddCategoryModal(parentId = null) {
        this.currentEditingCategoryId = null;
        this.categoryModalTitle.textContent = parentId ? '添加子类别' : '添加根类别';

        this.populateParentDropdown(parentId);
        this.categoryName.value = '';
        this.categoryParent.value = parentId || '';
        this.updateCategoryPathPreview();

        this.categoryModal.style.display = 'block';
        this.categoryName.focus();
    }

    showEditCategoryModal(categoryId) {
        const category = this.categoryManager.findCategoryById(categoryId);
        if (!category) return;

        this.currentEditingCategoryId = categoryId;
        this.categoryModalTitle.textContent = '编辑类别';

        this.populateParentDropdown(category.parentId, categoryId);
        this.categoryName.value = category.name;
        this.categoryParent.value = category.parentId || '';
        this.updateCategoryPathPreview();

        this.categoryModal.style.display = 'block';
        this.categoryName.focus();
    }

    populateParentDropdown(selectedParentId = null, excludeCategoryId = null) {
        const categories = this.categoryManager.getFlatCategories();

        // 清空下拉框
        this.categoryParent.innerHTML = '<option value="">选择父类别（留空为根类别）</option>';

        categories.forEach(category => {
            // 排除当前编辑的类别及其子类别
            if (excludeCategoryId && (category.id === excludeCategoryId || category.path.startsWith(this.categoryManager.findCategoryById(excludeCategoryId)?.path + '/'))) {
                return;
            }

            // 只显示前3级类别（第4级不能再有子类别）
            if (category.level < 4) {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${'  '.repeat(category.level - 1)}${category.name} (${category.path})`;

                if (category.id === selectedParentId) {
                    option.selected = true;
                }

                this.categoryParent.appendChild(option);
            }
        });
    }

    updateCategoryPathPreview() {
        const parentId = this.categoryParent.value;
        const categoryName = this.categoryName.value.trim();

        if (parentId) {
            const parent = this.categoryManager.findCategoryById(parseInt(parentId));
            if (parent && categoryName) {
                this.categoryPathPreview.textContent = `${parent.path}/${categoryName}`;
            } else if (parent) {
                this.categoryPathPreview.textContent = `${parent.path}/[类别名称]`;
            } else {
                this.categoryPathPreview.textContent = '父类别不存在';
            }
        } else {
            this.categoryPathPreview.textContent = categoryName || '[类别名称]';
        }
    }

    async handleCategorySubmit(e) {
        e.preventDefault();

        const name = this.categoryName.value.trim();
        const parentId = this.categoryParent.value ? parseInt(this.categoryParent.value) : null;

        try {
            if (this.currentEditingCategoryId) {
                // 编辑模式
                await this.categoryManager.updateCategory(this.currentEditingCategoryId, name);
                this.showSuccessModal('类别更新成功！');
            } else {
                // 添加模式
                await this.categoryManager.addCategory(name, parentId);
                this.showSuccessModal('类别添加成功！');
            }

            this.hideCategoryModal();
            // 强制从数据库重新加载并渲染类别树
            await this.renderCategoryTree(true);
            this.updateCategoryStats();

        } catch (error) {
            console.error('Error saving category:', error);
            alert('操作失败：' + error.message);
        }
    }

    hideCategoryModal() {
        this.categoryModal.style.display = 'none';
        this.currentEditingCategoryId = null;
        this.categoryForm.reset();
    }

    // 移动类别相关方法
    showMoveCategoryModal(categoryId) {
        const category = this.categoryManager.findCategoryById(categoryId);
        if (!category) return;

        this.currentEditingCategoryId = categoryId;
        this.currentCategoryInfo.innerHTML = `
            <strong>${category.name}</strong><br>
            <small>当前路径：${category.path}</small>
        `;

        this.populateMoveTargetDropdown(categoryId);
        this.moveTargetParent.value = '';
        this.updateMovePathPreview();

        this.moveCategoryModal.style.display = 'block';
    }

    populateMoveTargetDropdown(categoryId) {
        const categories = this.categoryManager.getFlatCategories();
        const category = this.categoryManager.findCategoryById(categoryId);

        this.moveTargetParent.innerHTML = '<option value="">移动到根级别</option>';

        categories.forEach(cat => {
            // 排除自己和自己的子类别
            if (cat.id === categoryId || cat.path.startsWith(category.path + '/')) {
                return;
            }

            // 检查层级限制
            const categoryDepth = this.categoryManager.getCategoryDepth(category);
            if (cat.level + categoryDepth <= 4) {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${'  '.repeat(cat.level - 1)}${cat.name} (${cat.path})`;
                this.moveTargetParent.appendChild(option);
            }
        });
    }

    updateMovePathPreview() {
        const categoryId = this.currentEditingCategoryId;
        const targetParentId = this.moveTargetParent.value;
        const category = this.categoryManager.findCategoryById(categoryId);

        if (!category) return;

        if (targetParentId) {
            const targetParent = this.categoryManager.findCategoryById(parseInt(targetParentId));
            if (targetParent) {
                this.newPathPreview.textContent = `${targetParent.path}/${category.name}`;
            }
        } else {
            this.newPathPreview.textContent = category.name;
        }
    }

    async handleMoveCategorySubmit(e) {
        e.preventDefault();

        const categoryId = this.currentEditingCategoryId;
        const targetParentId = this.moveTargetParent.value ? parseInt(this.moveTargetParent.value) : null;

        try {
            await this.categoryManager.moveCategory(categoryId, targetParentId);
            this.showSuccessModal('类别移动成功！');

            this.hideMoveModal();
            // 强制从数据库重新加载并渲染类别树
            await this.renderCategoryTree(true);
            this.updateCategoryStats();

        } catch (error) {
            console.error('Error moving category:', error);
            alert('移动失败：' + error.message);
        }
    }

    hideMoveModal() {
        this.moveCategoryModal.style.display = 'none';
        this.currentEditingCategoryId = null;
        this.moveCategoryForm.reset();
    }

    // 删除类别
    async deleteCategoryWithConfirm(categoryId) {
        const category = this.categoryManager.findCategoryById(categoryId);
        if (!category) return;

        const hasChildren = category.children && category.children.length > 0;

        if (hasChildren) {
            this.showWarningModal('该类别包含子类别，请先删除所有子类别。');
            return;
        }

        // 显示自定义删除确认弹窗
        this.showDeleteModal(category);
    }

    // 显示删除确认弹窗
    showDeleteModal(category) {
        this.currentDeletingCategoryId = category.id;
        this.deleteConfirmCategory.textContent = `"${category.name}"`;
        this.deleteConfirmModal.style.display = 'block';

        // 让弹窗获得焦点以便用户可以用键盘操作
        setTimeout(() => {
            this.cancelDeleteBtn.focus();
        }, 100);
    }

    // 隐藏删除确认弹窗
    hideDeleteModal() {
        this.deleteConfirmModal.style.display = 'none';
        this.currentDeletingCategoryId = null;
    }

    // 确认删除类别
    async confirmCategoryDelete() {
        if (!this.currentDeletingCategoryId) return;

        try {
            await this.categoryManager.deleteCategory(this.currentDeletingCategoryId);

            this.hideDeleteModal();

            // 强制从数据库重新加载并渲染类别树
            await this.renderCategoryTree(true);
            this.updateCategoryStats();

            // 成功提示使用弹窗而不是临时消息
            this.showSuccessModal('类别删除成功！');

        } catch (error) {
            console.error('Error deleting category:', error);
            alert('删除失败：' + error.message);
        }
    }

    // 显示成功消息
    showSuccessMessage(message) {
        // 创建一个临时的成功提示
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = message;
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            z-index: 10001;
            font-weight: 500;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        `;

        document.body.appendChild(successMsg);

        // 3秒后自动移除
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 3000);
    }

    // 显示美化的成功弹窗
    showSuccessModal(message) {
        this.successMessage.textContent = message;
        this.successModal.style.display = 'block';

        // 让弹窗获得焦点以便用户可以用键盘操作
        setTimeout(() => {
            this.successOkBtn.focus();
        }, 100);
    }

    // 隐藏成功弹窗
    hideSuccessModal() {
        this.successModal.style.display = 'none';
    }

    // 显示美化的警告弹窗
    showWarningModal(message) {
        this.warningMessage.textContent = message;
        this.warningModal.style.display = 'block';

        // 让弹窗获得焦点以便用户可以用键盘操作
        setTimeout(() => {
            this.warningOkBtn.focus();
        }, 100);
    }

    // 隐藏警告弹窗
    hideWarningModal() {
        this.warningModal.style.display = 'none';
    }

    // 搜索功能（更新版本）
    handleCategorySearch(e) {
        const keyword = e.target.value.trim();

        // 实时搜索，重新渲染树形视图
        this.renderCategoryTree();

        // 如果有搜索关键字，进行高亮处理
        if (keyword !== '') {
            this.highlightSearchResults(keyword);
        }
    }

    // 搜索结果高亮
    highlightSearchResults(keyword) {
        const categoryItems = this.categoryTree.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            const name = item.querySelector('.category-name');
            const path = item.querySelector('.category-path');

            if (name && path) {
                const nameText = name.textContent;
                const pathText = path.textContent;

                if (nameText.toLowerCase().includes(keyword.toLowerCase()) ||
                    pathText.toLowerCase().includes(keyword.toLowerCase())) {
                    item.classList.add('search-highlight');

                    // 高亮匹配的文本
                    name.innerHTML = this.highlightKeyword(nameText, keyword);
                    path.innerHTML = this.highlightKeyword(pathText, keyword);
                } else {
                    item.classList.remove('search-highlight');
                }
            }
        });
    }

    clearCategorySearch() {
        this.categorySearch.value = '';
        this.renderCategoryTree();
    }

    renderSearchResults(results, keyword) {
        if (results.length === 0) {
            this.categoryTree.innerHTML = '<div class="no-categories">未找到匹配的类别</div>';
            return;
        }

        const highlightedResults = results.map(category => {
            const highlightedCategory = { ...category };
            highlightedCategory.name = this.highlightKeyword(category.name, keyword);
            highlightedCategory.path = this.highlightKeyword(category.path, keyword);
            return highlightedCategory;
        });

        const resultsHtml = highlightedResults.map(category => `
            <div class="category-item search-highlight" data-category-id="${category.id}">
                <div class="category-header">
                    <div class="category-toggle no-children"></div>
                    <div class="category-info">
                        <span class="category-name">${category.name}</span>
                        <span class="category-level level-${category.level}">第${category.level}级</span>
                        <span class="category-path">${category.path}</span>
                    </div>
                    <div class="category-actions">
                        ${category.level < 4 ? `<button class="category-action-btn add" data-action="add" data-category-id="${category.id}">添加子类</button>` : ''}
                        <button class="category-action-btn edit" data-action="edit" data-category-id="${category.id}">编辑</button>
                        <button class="category-action-btn move" data-action="move" data-category-id="${category.id}">移动</button>
                        <button class="category-action-btn delete" data-action="delete" data-category-id="${category.id}">删除</button>
                    </div>
                </div>
            </div>
        `).join('');

        this.categoryTree.innerHTML = resultsHtml;
        this.bindCategoryTreeEvents();
    }

    highlightKeyword(text, keyword) {
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, '<span class="search-match">$1</span>');
    }

    clearCategorySearch() {
        this.categorySearch.value = '';
        this.renderCategoryTree();
    }

    // 初始化统计页面中的类别完成率菜单
    initializeCategoryStatsMenu() {
        const menuContainer = document.getElementById('category-stats-menu');
        if (!menuContainer) return;

        // 获取所有一级类别
        const firstLevelCategories = this.categoryManager.categories || [];
        menuContainer.innerHTML = '';

        if (firstLevelCategories.length === 0) {
            menuContainer.innerHTML = '<div class="no-data">暂无类别数据</div>';
            return;
        }

        firstLevelCategories.forEach((category, index) => {
            const item = document.createElement('div');
            item.className = `category-stats-item ${index === 0 ? 'active' : ''}`;
            item.innerHTML = category.name;
            item.addEventListener('click', () => {
                document.querySelectorAll('.category-stats-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                this.displayCategoryStats(category);
            });
            menuContainer.appendChild(item);
        });

        // 默认显示第一个类别的统计
        if (firstLevelCategories.length > 0) {
            this.displayCategoryStats(firstLevelCategories[0]);
        }
    }

    // 显示指定一级类别的子类别完成率统计
    displayCategoryStats(parentCategory) {
        const displayContainer = document.getElementById('category-stats-display');
        if (!displayContainer) return;

        // 如果没有子类别，显示该类别本身的信息
        if (!parentCategory.children || parentCategory.children.length === 0) {
            displayContainer.innerHTML = `
                <div class="no-data">"${parentCategory.name}"没有子类别</div>
            `;
            return;
        }

        // 收集所有子类别的任务统计
        const allTasks = this.taskManager.getTasks();
        const subCategories = parentCategory.children;
        let html = '<div class="stats-circle-container">';

        subCategories.forEach(subCategory => {
            const stats = this.calculateCategoryStats(subCategory, allTasks);

            if (stats.total === 0) {
                // 没有任务的情况
                html += `
                    <div class="category-stat-item">
                        <div class="no-tasks-message">
                            <div style="font-size: 14px; color: #999;">暂无任务</div>
                        </div>
                        <div style="text-align: center; margin-top: 10px; color: #555; font-weight: 600;">
                            ${subCategory.name}
                        </div>
                    </div>
                `;
            } else {
                // 计算各状态的百分比
                const completedPercentage = Math.round((stats.completed / stats.total) * 100);
                const inProgressPercentage = Math.round((stats.inProgress / stats.total) * 100);
                const pendingPercentage = Math.round((stats.pending / stats.total) * 100);

                html += `
                    <div class="category-stat-item">
                        <div class="status-circles-group">
                            <!-- 已完成 -->
                            <div class="status-circle-wrapper">
                                <div class="stats-circle completed" style="--percentage: ${completedPercentage * 3.6}deg">
                                    <div class="stats-circle-inner">
                                        <div class="stats-circle-percentage">${completedPercentage}%</div>
                                        <div class="stats-circle-label">已完成</div>
                                    </div>
                                </div>
                                <div class="status-circle-count">${stats.completed}个</div>
                            </div>

                            <!-- 进行中 -->
                            <div class="status-circle-wrapper">
                                <div class="stats-circle in-progress" style="--percentage: ${inProgressPercentage * 3.6}deg">
                                    <div class="stats-circle-inner">
                                        <div class="stats-circle-percentage">${inProgressPercentage}%</div>
                                        <div class="stats-circle-label">进行中</div>
                                    </div>
                                </div>
                                <div class="status-circle-count">${stats.inProgress}个</div>
                            </div>

                            <!-- 待办 -->
                            <div class="status-circle-wrapper">
                                <div class="stats-circle pending" style="--percentage: ${pendingPercentage * 3.6}deg">
                                    <div class="stats-circle-inner">
                                        <div class="stats-circle-percentage">${pendingPercentage}%</div>
                                        <div class="stats-circle-label">待办</div>
                                    </div>
                                </div>
                                <div class="status-circle-count">${stats.pending}个</div>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 15px; color: #555; font-weight: 600;">
                            ${subCategory.name} (共${stats.total}个)
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';

        // 添加详细统计信息
        html += '<div class="category-stats-info">';
        html += `<div class="stats-info-row">
            <span class="stats-info-label">类别：</span>
            <span class="stats-info-value">${parentCategory.name}</span>
        </div>`;

        let totalTasks = 0;
        let totalCompleted = 0;
        let totalInProgress = 0;
        let totalPending = 0;

        subCategories.forEach(subCategory => {
            const stats = this.calculateCategoryStats(subCategory, allTasks);
            totalTasks += stats.total;
            totalCompleted += stats.completed;
            totalInProgress += stats.inProgress;
            totalPending += stats.pending;
        });

        const overallCompletedPercentage = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);
        const overallInProgressPercentage = totalTasks === 0 ? 0 : Math.round((totalInProgress / totalTasks) * 100);
        const overallPendingPercentage = totalTasks === 0 ? 0 : Math.round((totalPending / totalTasks) * 100);

        html += `<div class="stats-info-row">
            <span class="stats-info-label">子类别数：</span>
            <span class="stats-info-value">${subCategories.length}</span>
        </div>`;
        html += `<div class="stats-info-row">
            <span class="stats-info-label">总任务数：</span>
            <span class="stats-info-value">${totalTasks}</span>
        </div>`;
        html += `<div class="stats-info-row" style="color: #27ae60;">
            <span class="stats-info-label">已完成：</span>
            <span class="stats-info-value">${totalCompleted}个 (${overallCompletedPercentage}%)</span>
        </div>`;
        html += `<div class="stats-info-row" style="color: #f39c12;">
            <span class="stats-info-label">进行中：</span>
            <span class="stats-info-value">${totalInProgress}个 (${overallInProgressPercentage}%)</span>
        </div>`;
        html += `<div class="stats-info-row" style="color: #e74c3c;">
            <span class="stats-info-label">待办：</span>
            <span class="stats-info-value">${totalPending}个 (${overallPendingPercentage}%)</span>
        </div>`;
        html += '</div>';

        displayContainer.innerHTML = html;
    }

    // 计算子类别的任务统计
    calculateCategoryStats(category, allTasks) {
        let completed = 0;
        let inProgress = 0;
        let pending = 0;
        let total = 0;

        // 获取该类别及其所有后代类别的任务
        const categoryIds = this.getCategoryAndDescendants(category);

        allTasks.forEach(task => {
            if (task.category && categoryIds.includes(task.category)) {
                total++;
                if (task.status === 'completed') {
                    completed++;
                } else if (task.status === 'in-progress') {
                    inProgress++;
                } else {
                    pending++;
                }
            }
        });

        return { completed, inProgress, pending, total };
    }

    // 获取类别及其所有后代类别的ID列表
    getCategoryAndDescendants(category) {
        const ids = [category.name]; // 使用category.name作为匹配标识

        const getChildren = (cat) => {
            if (cat.children && cat.children.length > 0) {
                cat.children.forEach(child => {
                    ids.push(child.name);
                    getChildren(child);
                });
            }
        };

        getChildren(category);
        return ids;
    }

    /**
     * ===== 上下班时间管理功能 =====
     */

    // 显示工作时间设置模态框
    async showWorkingHoursModal() {
        // 加载全局时间
        await this.loadGlobalWorkingHours();
        // 加载人员时间列表
        await this.loadPersonnelWorkingHoursList();
        this.workingHoursModal.style.display = 'flex';
    }

    // 隐藏工作时间设置模态框
    hideWorkingHoursModal() {
        this.workingHoursModal.style.display = 'none';
    }

    // 隐藏编辑个人时间模态框
    hideEditPersonHoursModal() {
        this.editPersonHoursModal.style.display = 'none';
        this.currentEditingPersonId = null;
    }

    // 加载全局工作时间
    async loadGlobalWorkingHours() {
        try {
            const response = await fetch('api/index.php/working-hours?action=get-global');
            const data = await response.json();
            if (data.success && data.data) {
                this.globalStartTime.value = data.data.start_time || '08:00';
                this.globalEndTime.value = data.data.end_time || '17:00';
            }
        } catch (error) {
            console.error('Failed to load global working hours:', error);
        }
    }

    // 保存全局工作时间
    async handleSaveGlobalHours() {
        const startTime = this.globalStartTime.value;
        const endTime = this.globalEndTime.value;

        if (!startTime || !endTime) {
            alert('请填写上班时间和下班时间');
            return;
        }

        try {
            console.log('发送工作时间:', { startTime, endTime });
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
                alert('全局工作时间已保存成功！');
                // 重新加载人员列表，显示最新的时间
                await this.loadPersonnelWorkingHoursList();
            } else {
                alert('保存失败：' + (data.error || data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Failed to save global hours:', error);
            alert('保存失败，请检查网络连接');
        }
    }

    // 加载人员工作时间列表
    async loadPersonnelWorkingHoursList(searchText = '') {
        try {
            const response = await fetch('api/index.php/working-hours?action=get-all');
            const data = await response.json();

            if (data.success) {
                const allPersonnel = this.personnelManager.getAllPersonnel();
                const workingHoursMap = {};

                // 将API返回的数据转换为Map
                data.data.forEach(item => {
                    workingHoursMap[item.personnel_id] = {
                        start_time: item.start_time,
                        end_time: item.end_time,
                        use_global: item.use_global
                    };
                });

                // 过滤人员
                let filteredPersonnel = allPersonnel;
                if (searchText.trim()) {
                    filteredPersonnel = allPersonnel.filter(p =>
                        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
                        (p.role && p.role.toLowerCase().includes(searchText.toLowerCase()))
                    );
                }

                // 生成HTML
                let html = '';
                if (filteredPersonnel.length === 0) {
                    html = '<div class="no-data">暂无人员数据</div>';
                } else {
                    filteredPersonnel.forEach(person => {
                        const hours = workingHoursMap[person.id];
                        const startTime = hours && hours.start_time ? hours.start_time : '08:00';
                        const endTime = hours && hours.end_time ? hours.end_time : '17:00';
                        const useGlobal = !hours || hours.use_global;

                        const timeDisplay = useGlobal ? '使用全局时间' : `${startTime} - ${endTime}`;
                        const timeClass = useGlobal ? 'using-global' : '';

                        html += `
                            <div class="hours-grid-item">
                                <div class="hours-grid-item-name">${person.name}</div>
                                <div class="hours-grid-item-role">${person.role || ''}</div>
                                <div class="hours-grid-item-time-display ${timeClass}">${timeDisplay}</div>
                                <div class="hours-grid-item-actions">
                                    <button type="button" class="btn-edit" onclick="window.adminApp.showEditPersonHoursModal(${person.id}, '${person.name}', '${startTime}', '${endTime}', ${useGlobal ? 1 : 0})">编辑</button>
                                    <button type="button" class="btn-delete" onclick="window.adminApp.deletePersonnelHours(${person.id})">删除</button>
                                </div>
                            </div>
                        `;
                    });
                }

                this.personnelHoursContent.innerHTML = html;
            } else {
                this.personnelHoursContent.innerHTML = '<div class="no-data">加载失败</div>';
            }
        } catch (error) {
            console.error('Failed to load personnel working hours:', error);
            this.personnelHoursContent.innerHTML = '<div class="no-data">加载失败</div>';
        }
    }

    // 处理人员搜索
    handleHoursPersonnelSearch(e) {
        const searchText = e.target.value;
        this.loadPersonnelWorkingHoursList(searchText);
    }

    // 显示编辑个人时间模态框
    showEditPersonHoursModal(personId, personName, startTime, endTime, useGlobal) {
        this.currentEditingPersonId = personId;
        this.editPersonName.textContent = personName;
        this.editStartTime.value = startTime;
        this.editEndTime.value = endTime;
        this.useGlobalHoursCheckbox.checked = useGlobal ? true : false;

        // 根据复选框状态显示/隐藏时间输入框
        this.handleUseGlobalHoursChange({ target: this.useGlobalHoursCheckbox });

        this.editPersonHoursModal.style.display = 'flex';
    }

    // 处理使用全局时间复选框变化
    handleUseGlobalHoursChange(e) {
        const isGlobal = e.target.checked;
        this.editStartTime.disabled = isGlobal;
        this.editEndTime.disabled = isGlobal;
    }

    // 处理编辑个人时间提交
    async handleEditPersonHoursSubmit(e) {
        e.preventDefault();

        if (!this.currentEditingPersonId) return;

        const useGlobal = this.useGlobalHoursCheckbox.checked;
        let startTime = this.editStartTime.value;
        let endTime = this.editEndTime.value;

        if (!useGlobal && (!startTime || !endTime)) {
            alert('请填写上班时间和下班时间');
            return;
        }

        try {
            const response = await fetch('api/index.php/working-hours', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save-personnel',
                    personnel_id: this.currentEditingPersonId,
                    start_time: useGlobal ? null : startTime,
                    end_time: useGlobal ? null : endTime,
                    use_global: useGlobal ? 1 : 0
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('人员工作时间已保存成功！');
                this.hideEditPersonHoursModal();
                // 重新加载列表
                await this.loadPersonnelWorkingHoursList();
            } else {
                alert('保存失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Failed to save personnel hours:', error);
            alert('保存失败，请检查网络连接');
        }
    }

    // 删除人员工作时间设置
    async deletePersonnelHours(personId) {
        if (!confirm('确定要删除该人员的工作时间设置吗？')) {
            return;
        }

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
                alert('人员工作时间设置已删除！');
                // 重新加载列表
                await this.loadPersonnelWorkingHoursList();
            } else {
                alert('删除失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Failed to delete personnel hours:', error);
            alert('删除失败，请检查网络连接');
        }
    }
}

// 创建全局实例
window.adminApp = new AdminApp();