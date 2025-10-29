import TaskManager from './taskManager.js';
import DataManager from './dataManager.js';

class TodoApp {
    constructor() {
        console.log('TodoApp constructor started');
        this.taskManager = null;
        this.personnelManager = null;
        this.dataManager = null;
        this.currentFilter = 'all';
        this.currentCategoryFilter = 'all';
        this.currentAssigneeFilter = 'all';
        this.currentEditingId = null;
        this.selectedDate = new Date();
        this.currentTaskAssignees = [];
        console.log('TodoApp initialized with currentTaskAssignees:', this.currentTaskAssignees);
        this.initializeElements();
        this.bindEvents();
        this.initializeDates();
        this.init();
    }

    async init() {
        try {
            console.log('Initializing managers...');
            this.taskManager = new TaskManager();

            // 检查是否需要迁移数据
            const databaseManager = new (await import('./database.js')).default();
            const needsMigration = await databaseManager.needsMigration();

            if (needsMigration) {
                console.log('检测到需要迁移数据，开始迁移...');
                const migrationSuccess = await databaseManager.migrateFromLocalStorage();
                if (migrationSuccess) {
                    console.log('数据迁移成功！');
                    alert('检测到历史数据，已成功迁移到新的本地数据库！');
                } else {
                    console.error('数据迁移失败');
                    alert('数据迁移过程中出现问题，请检查控制台日志');
                }
            }

            // 初始化TaskManager（包含PersonnelManager）
            await this.taskManager.init();

            // 使用TaskManager的PersonnelManager实例
            this.personnelManager = this.taskManager.getPersonnelManager();
            this.dataManager = new DataManager();

            // 检查数据恢复
            console.log('检查数据状态...');
            const hasData = await this.taskManager.recoverData();

            if (!hasData) {
                const addSample = confirm('未找到任何数据。是否添加示例数据以便开始使用？');
                if (addSample) {
                    await this.taskManager.addSampleData();
                }
            }

            console.log('Managers initialized successfully');
            this.render();
            this.updateDatabaseStatus();

            // 初始化加载类别
            await this.loadCategories();

            console.log('TodoApp initialization completed');

            // 调试信息：检查初始化状态
            console.log('Debug info:');
            console.log('- TaskManager:', !!this.taskManager);
            console.log('- PersonnelManager:', !!this.personnelManager);
            console.log('- DataManager:', !!this.dataManager);
            console.log('- TaskManager.nextId:', this.taskManager.nextId);
            console.log('- Total tasks:', this.taskManager.getTasks().length);
            console.log('- SelectAssigneesBtn element:', !!this.selectAssigneesBtn);
            console.log('- EditSelectAssigneesBtn element:', !!this.editSelectAssigneesBtn);
            console.log('- AssigneeSelectModal element:', !!this.assigneeSelectModal);
        } catch (error) {
            console.error('Error initializing TodoApp:', error);
        }
    }

    initializeElements() {
        // 表单元素
        this.addForm = document.getElementById('add-task-form');
        this.taskTitle = document.getElementById('task-title');
        this.taskDescription = document.getElementById('task-description');
        this.taskCategory = document.getElementById('task-category');
        this.selectAssigneesBtn = document.getElementById('select-assignees-btn');
        this.selectCategoryBtn = document.getElementById('select-category-btn');
        this.selectedCategoryDisplay = document.getElementById('selected-category-display');

        // 编辑表单的类别元素
        this.editTaskCategory = document.getElementById('edit-task-category');
        this.editSelectCategoryBtn = document.getElementById('edit-select-category-btn');
        this.editSelectedCategoryDisplay = document.getElementById('edit-selected-category-display');
        
        // 任务容器
        this.allTasksContainer = document.getElementById('all-tasks-container');
        this.todayTasksContainer = document.getElementById('today-tasks-container');
        this.yesterdayTasksContainer = document.getElementById('yesterday-tasks-container');
        
        // 搜索和筛选
        this.searchInput = document.getElementById('search-input');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.categoryFilter = document.getElementById('category-filter');
        this.assigneeFilter = document.getElementById('assignee-filter');
        
        // 日期控制
        this.dateSelector = document.getElementById('date-selector');
        this.todayBtn = document.getElementById('today-btn');
        this.prevDayBtn = document.getElementById('prev-day-btn');
        this.nextDayBtn = document.getElementById('next-day-btn');
        this.migrateDataBtn = document.getElementById('migrate-data-btn');
        this.recoverDataBtn = document.getElementById('recover-data-btn');
        this.writeToDbBtn = document.getElementById('write-to-db-btn');
        this.createSampleDataBtn = document.getElementById('create-sample-data-btn');
        this.verifyDbBtn = document.getElementById('verify-db-btn');
        this.clearDbBtn = document.getElementById('clear-db-btn');
        this.exportDataBtn = document.getElementById('export-data-btn');
        this.importDataBtn = document.getElementById('import-data-btn');
        this.importTextBtn = document.getElementById('import-text-btn');
        this.importFileInput = document.getElementById('import-file-input');
        this.printBtn = document.getElementById('print-today-btn');
        
        // 数据库状态元素
        this.dbStatus = document.getElementById('db-status');
        this.dbIndicator = document.getElementById('db-indicator');
        this.dbText = document.getElementById('db-text');
        
        // 统计元素
        this.statsElements = {
            total: document.getElementById('total-tasks'),
            pending: document.getElementById('pending-tasks'),
            inProgress: document.getElementById('in-progress-tasks'),
            completed: document.getElementById('completed-tasks')
        };
        
        this.todayStatsElements = {
            total: document.getElementById('today-total'),
            pending: document.getElementById('today-pending'),
            inProgress: document.getElementById('today-in-progress'),
            completed: document.getElementById('today-completed')
        };
        
        // 前一天统计
        this.yesterdayStatsElements = {
            totalCount: document.getElementById('yesterday-total-count'),
            completedCount: document.getElementById('yesterday-completed-count'),
            incompleteCount: document.getElementById('yesterday-incomplete-count'),
            percentage: document.getElementById('completion-percentage')
        };
        
        // 日期显示
        this.todayDateDisplay = document.getElementById('today-date');
        this.yesterdayDateDisplay = document.getElementById('yesterday-date');
        
        // 模态框
        this.modal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-task-form');
        this.editTitle = document.getElementById('edit-task-title');
        this.editDescription = document.getElementById('edit-task-description');
        this.editStatus = document.getElementById('edit-task-status');
        this.editCategory = document.getElementById('edit-task-category');
        this.editSelectAssigneesBtn = document.getElementById('edit-select-assignees-btn');
        this.closeModal = document.querySelector('.close');
        this.cancelEdit = document.getElementById('cancel-edit');
        
        // 备注模态框
        this.notesModal = document.getElementById('notes-modal');
        this.notesModalTitle = document.getElementById('notes-modal-title');
        this.addNoteForm = document.getElementById('add-note-form');
        this.newNoteContent = document.getElementById('new-note-content');
        this.notesList = document.getElementById('notes-list');
        this.closeNotesModal = document.getElementById('close-notes-modal');
        
        // 编辑备注模态框
        this.editNoteModal = document.getElementById('edit-note-modal');
        this.editNoteForm = document.getElementById('edit-note-form');
        this.editNoteContent = document.getElementById('edit-note-content');
        this.closeEditNoteModal = document.getElementById('close-edit-note-modal');
        this.cancelEditNote = document.getElementById('cancel-edit-note');
        
        // 人员选择模态框
        this.assigneeSelectModal = document.getElementById('assignee-select-modal');
        this.closeAssigneeModal = document.getElementById('close-assignee-modal');
        this.assigneeModalSearch = document.getElementById('assignee-modal-search');
        this.assigneeModalList = document.getElementById('assignee-modal-list');
        this.confirmAssigneeSelection = document.getElementById('confirm-assignee-selection');
        this.cancelAssigneeSelection = document.getElementById('cancel-assignee-selection');

        // 图片管理模态框
        this.imagesModal = document.getElementById('images-modal');
        this.imagesModalTitle = document.getElementById('images-modal-title');
        this.closeImagesModal = document.getElementById('close-images-modal');
        this.imageUpload = document.getElementById('image-upload');
        this.uploadBtn = document.getElementById('upload-btn');
        this.imagesGallery = document.getElementById('images-gallery');

        // 图片预览模态框
        this.imagePreviewModal = document.getElementById('image-preview-modal');
        this.closeImagePreview = document.getElementById('close-image-preview');
        this.previewImage = document.getElementById('preview-image');
        this.prevImageBtn = document.getElementById('prev-image-btn');
        this.nextImageBtn = document.getElementById('next-image-btn');
        this.imageCounter = document.getElementById('image-counter');
        this.imageName = document.getElementById('image-name');
        this.deleteImageBtn = document.getElementById('delete-image-btn');

        // 任务完成确认模态框
        this.completeConfirmModal = document.getElementById('complete-confirm-modal');
        this.completeConfirmTask = document.getElementById('complete-confirm-task');
        this.confirmCompleteBtn = document.getElementById('confirm-complete-btn');
        this.cancelCompleteBtn = document.getElementById('cancel-complete-btn');

        // 任务完成成功模态框
        this.completeSuccessModal = document.getElementById('complete-success-modal');
        this.completeSuccessMessage = document.getElementById('complete-success-message');
        this.completeSuccessOkBtn = document.getElementById('complete-success-ok-btn');

        // 类别选择模态框
        this.categorySelectModal = document.getElementById('category-select-modal');
        this.closeCategoryModal = document.getElementById('close-category-modal');
        this.categoryModalSearch = document.getElementById('category-modal-search');
        this.categoryTreeContainer = document.getElementById('category-tree-container');
        this.categoryFirstLevelContainer = document.getElementById('category-first-level');
        this.confirmCategorySelection = document.getElementById('confirm-category-selection');
        this.cancelCategorySelection = document.getElementById('cancel-category-selection');

        // 删除任务确认弹窗
        this.deleteConfirmModal = document.getElementById('delete-confirm-modal');
        this.deleteConfirmTask = document.getElementById('delete-confirm-task');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        this.currentTaskId = null;
        this.currentNoteId = null;
        this.currentImageIndex = null;
        this.currentCompletingTaskId = null; // 当前正在完成的任务ID
        this.currentAssigneeTarget = null; // 'add' or 'edit'
        this.tempSelectedAssignees = []; // 临时选中的人员
        this.currentTaskAssignees = []; // 当前任务的人员

        // 类别选择相关
        this.allCategories = []; // 所有类别
        this.selectedCategory = null; // 当前选中的类别
        this.currentCategoryTarget = null; // 'add' or 'edit'

        // 删除任务相关
        this.currentDeletingTaskId = null; // 当前正在删除的任务ID
    }

    bindEvents() {
        // 添加安全检查，只有元素存在时才绑定事件
        if (this.addForm) this.addForm.addEventListener('submit', (e) => this.handleAddTask(e));
        if (this.searchInput) this.searchInput.addEventListener('input', () => this.render());
        if (this.categoryFilter) this.categoryFilter.addEventListener('change', (e) => this.handleCategoryFilterChange(e));
        if (this.assigneeFilter) this.assigneeFilter.addEventListener('change', (e) => this.handleAssigneeFilterChange(e));

        if (this.filterButtons && this.filterButtons.length > 0) {
            this.filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => this.handleFilterChange(e));
            });
        }

        if (this.editForm) this.editForm.addEventListener('submit', (e) => this.handleEditTask(e));
        if (this.closeModal) this.closeModal.addEventListener('click', () => this.hideModal());
        if (this.cancelEdit) this.cancelEdit.addEventListener('click', () => this.hideModal());

        window.addEventListener('personnelChanged', (event) => {
            console.log('Received personnelChanged event:', event.detail);
            this.personnelManager.refreshPersonnelList(event.detail.personnel);
            // 更新人员筛选器以反映人员变化
            this.updateAssigneeFilter();
        });

        // 备注相关事件
        if (this.addNoteForm) this.addNoteForm.addEventListener('submit', (e) => this.handleAddNote(e));
        if (this.closeNotesModal) this.closeNotesModal.addEventListener('click', () => this.hideNotesModal());
        if (this.editNoteForm) this.editNoteForm.addEventListener('submit', (e) => this.handleEditNote(e));
        if (this.closeEditNoteModal) this.closeEditNoteModal.addEventListener('click', () => this.hideEditNoteModal());
        if (this.cancelEditNote) this.cancelEditNote.addEventListener('click', () => this.hideEditNoteModal());

        // 图片相关事件
        if (this.closeImagesModal) this.closeImagesModal.addEventListener('click', () => this.hideImagesModal());
        if (this.uploadBtn) this.uploadBtn.addEventListener('click', () => this.imageUpload.click());
        if (this.imageUpload) this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        if (this.closeImagePreview) this.closeImagePreview.addEventListener('click', () => this.hideImagePreview());
        if (this.prevImageBtn) this.prevImageBtn.addEventListener('click', () => this.showPreviousImage());
        if (this.nextImageBtn) this.nextImageBtn.addEventListener('click', () => this.showNextImage());
        if (this.deleteImageBtn) this.deleteImageBtn.addEventListener('click', () => this.handleDeleteImage());
        
        // 日期控制事件
        if (this.dateSelector) this.dateSelector.addEventListener('change', (e) => this.handleDateChange(e));
        if (this.todayBtn) this.todayBtn.addEventListener('click', () => this.goToToday());
        if (this.prevDayBtn) this.prevDayBtn.addEventListener('click', () => this.goToPreviousDay());
        if (this.nextDayBtn) this.nextDayBtn.addEventListener('click', () => this.goToNextDay());

        // 数据库管理按钮事件（仅在元素存在时绑定）
        if (this.migrateDataBtn) {
            this.migrateDataBtn.addEventListener('click', () => this.handleMigrateData());
        }
        if (this.recoverDataBtn) {
            this.recoverDataBtn.addEventListener('click', () => this.handleRecoverData());
        }
        if (this.writeToDbBtn) {
            this.writeToDbBtn.addEventListener('click', () => this.handleWriteToDatabase());
        }
        if (this.createSampleDataBtn) {
            this.createSampleDataBtn.addEventListener('click', () => this.handleCreateSampleData());
        }
        if (this.verifyDbBtn) {
            this.verifyDbBtn.addEventListener('click', () => this.handleVerifyDatabase());
        }
        if (this.clearDbBtn) {
            this.clearDbBtn.addEventListener('click', () => this.handleClearDatabase());
        }
        if (this.exportDataBtn) {
            this.exportDataBtn.addEventListener('click', () => this.handleExportData());
        }
        if (this.importDataBtn) {
            this.importDataBtn.addEventListener('click', () => this.handleImportDataClick());
        }
        if (this.importTextBtn) {
            this.importTextBtn.addEventListener('click', () => this.handleImportTextClick());
        }
        if (this.importFileInput) {
            this.importFileInput.addEventListener('change', (e) => this.handleImportFileSelected(e));
        }
        if (this.printBtn) {
            this.printBtn.addEventListener('click', () => this.printTodayTasks());
        }
        
        // 人员选择事件
        if (this.selectAssigneesBtn) {
            this.selectAssigneesBtn.addEventListener('click', () => {
                console.log('Select assignees button clicked');
                this.showAssigneeSelector('add');
            });
        } else {
            console.error('select-assignees-btn element not found!');
        }

        // 类别选择事件
        if (this.selectCategoryBtn) {
            this.selectCategoryBtn.addEventListener('click', () => {
                console.log('Select category button clicked');
                this.showCategorySelector('add');
            });
        } else {
            console.error('select-category-btn element not found!');
        }

        if (this.editSelectCategoryBtn) {
            this.editSelectCategoryBtn.addEventListener('click', () => {
                console.log('Edit select category button clicked');
                this.showCategorySelector('edit');
            });
        } else {
            console.error('edit-select-category-btn element not found!');
        }

        if (this.editSelectAssigneesBtn) {
            this.editSelectAssigneesBtn.addEventListener('click', () => {
                console.log('Edit select assignees button clicked');
                this.showAssigneeSelector('edit');
            });
        } else {
            console.error('edit-select-assignees-btn element not found!');
        }

        // 检查人员选择模态框元素是否存在
        if (this.closeAssigneeModal) {
            this.closeAssigneeModal.addEventListener('click', () => this.hideAssigneeSelector());
        } else {
            console.error('close-assignee-modal element not found!');
        }

        if (this.cancelAssigneeSelection) {
            this.cancelAssigneeSelection.addEventListener('click', () => this.hideAssigneeSelector());
        } else {
            console.error('cancel-assignee-selection element not found!');
        }

        if (this.confirmAssigneeSelection) {
            this.confirmAssigneeSelection.addEventListener('click', () => this.confirmAssigneeSelectionHandler());
        } else {
            console.error('confirm-assignee-selection element not found!');
        }

        if (this.assigneeModalSearch) {
            this.assigneeModalSearch.addEventListener('input', (e) => this.handleAssigneeSearch(e));
        } else {
            console.error('assignee-modal-search element not found!');
        }

        // 检查assigneeSelectModal是否存在
        if (!this.assigneeSelectModal) {
            console.error('assignee-select-modal element not found!');
        }

        // 类别选择模态框事件
        if (this.closeCategoryModal) {
            this.closeCategoryModal.addEventListener('click', () => this.hideCategorySelector());
        } else {
            console.error('close-category-modal element not found!');
        }

        if (this.cancelCategorySelection) {
            this.cancelCategorySelection.addEventListener('click', () => this.hideCategorySelector());
        } else {
            console.error('cancel-category-selection element not found!');
        }

        if (this.confirmCategorySelection) {
            this.confirmCategorySelection.addEventListener('click', () => this.confirmCategorySelectionHandler());
        } else {
            console.error('confirm-category-selection element not found!');
        }

        if (this.categoryModalSearch) {
            this.categoryModalSearch.addEventListener('input', () => this.renderCategoryTree());
        } else {
            console.error('category-modal-search element not found!');
        }

        if (!this.categorySelectModal) {
            console.error('category-select-modal element not found!');
        }

        // 删除任务确认弹窗事件
        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteTask());
        } else {
            console.error('confirm-delete-btn element not found!');
        }

        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteConfirmModal());
        } else {
            console.error('cancel-delete-btn element not found!');
        }

        if (!this.deleteConfirmModal) {
            console.error('delete-confirm-modal element not found!');
        }

        // 任务完成确认弹窗事件
        if (this.confirmCompleteBtn) {
            this.confirmCompleteBtn.addEventListener('click', () => this.confirmTaskCompletion());
        }
        if (this.cancelCompleteBtn) {
            this.cancelCompleteBtn.addEventListener('click', () => this.hideCompleteConfirmModal());
        }

        // 任务完成成功弹窗事件
        if (this.completeSuccessOkBtn) {
            this.completeSuccessOkBtn.addEventListener('click', () => this.hideCompleteSuccessModal());
        }

        window.addEventListener('click', (e) => {
            if (this.modal && e.target === this.modal) {
                this.hideModal();
            }
            if (this.notesModal && e.target === this.notesModal) {
                this.hideNotesModal();
            }
            if (this.editNoteModal && e.target === this.editNoteModal) {
                this.hideEditNoteModal();
            }
            if (this.assigneeSelectModal && e.target === this.assigneeSelectModal) {
                this.hideAssigneeSelector();
            }
            if (this.categorySelectModal && e.target === this.categorySelectModal) {
                this.hideCategorySelector();
            }
            if (this.deleteConfirmModal && e.target === this.deleteConfirmModal) {
                this.hideDeleteConfirmModal();
            }
            if (this.imagesModal && e.target === this.imagesModal) {
                this.hideImagesModal();
            }
            if (this.imagePreviewModal && e.target === this.imagePreviewModal) {
                this.hideImagePreview();
            }
            if (this.completeConfirmModal && e.target === this.completeConfirmModal) {
                this.hideCompleteConfirmModal();
            }
            if (this.completeSuccessModal && e.target === this.completeSuccessModal) {
                this.hideCompleteSuccessModal();
            }
        });

        // 添加键盘快捷键支持
        window.addEventListener('keydown', (e) => {
            // 检查是否在输入框中，如果是，则不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 左箭头键：前一天
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToPreviousDay();
            }
            // 右箭头键：后一天
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToNextDay();
            }
            // T键：今天
            else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                this.goToToday();
            }
        });

        // 确保 tasksChanged 事件监听器已正确绑定
        window.addEventListener('tasksChanged', (e) => {
            console.log('tasksChanged event received:', e.detail);
            try {
                this.render();
            } catch (err) {
                console.error('Error rendering after tasksChanged:', err);
            }
        });
    }

    initializeDates() {
        // 设置日期选择器为今天
        const today = new Date();
        this.dateSelector.valueAsDate = today;
        this.selectedDate = today;
        
        // 更新日期显示
        this.updateDateDisplays();
    }

    updateDateDisplays() {
        const today = new Date(this.selectedDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // 检查元素是否存在，避免 null 访问错误
        if (this.todayDateDisplay) {
            this.todayDateDisplay.textContent = this.formatDateDisplay(today);
        }
        if (this.yesterdayDateDisplay) {
            this.yesterdayDateDisplay.textContent = this.formatDateDisplay(yesterday);
        }
    }

    formatDateDisplay(date) {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        });
    }

    handleDateChange(e) {
        this.selectedDate = new Date(e.target.value);
        this.updateDateDisplays();
        this.render();
    }

    goToToday() {
        const today = new Date();
        this.dateSelector.valueAsDate = today;
        this.selectedDate = today;
        this.updateDateDisplays();
        this.render();
    }

    goToPreviousDay() {
        const currentDate = new Date(this.selectedDate);
        currentDate.setDate(currentDate.getDate() - 1);
        this.dateSelector.valueAsDate = currentDate;
        this.selectedDate = currentDate;
        this.updateDateDisplays();
        this.render();
    }

    goToNextDay() {
        const currentDate = new Date(this.selectedDate);
        currentDate.setDate(currentDate.getDate() + 1);
        this.dateSelector.valueAsDate = currentDate;
        this.selectedDate = currentDate;
        this.updateDateDisplays();
        this.render();
    }

    printTodayTasks() {
        window.print();
    }

    async handleMigrateData() {
        if (!confirm('确定要同步历史数据到本地数据库吗？这将把localStorage中的数据迁移到IndexedDB中。')) {
            return;
        }
        
        try {
            const DatabaseManager = (await import('./database.js')).default;
            const databaseManager = new DatabaseManager();
            
            console.log('开始手动迁移数据...');
            const migrationSuccess = await databaseManager.forceMigration();
            
            if (migrationSuccess) {
                alert('数据同步成功！所有历史任务和人员信息已迁移到本地数据库。');
                // 重新加载数据
                if (this.taskManager && this.personnelManager) {
                    await Promise.all([
                        this.taskManager.loadTasks(),
                        this.personnelManager.loadPersonnel()
                    ]);
                    this.render();
                }
            } else {
                alert('数据同步失败，请检查控制台错误信息。');
            }
        } catch (error) {
            console.error('手动迁移数据失败:', error);
            alert('数据同步过程中出现错误: ' + error.message);
        }
    }

    // 数据导出处理
    async handleExportData() {
        try {
            // 先尝试文件下载
            await this.taskManager.downloadDataAsFile();
            alert('数据导出成功！文件已下载到您的下载文件夹。');
        } catch (error) {
            console.error('文件下载失败，尝试备用方法:', error);
            // 如果下载失败，显示数据供用户复制
            try {
                await this.taskManager.showExportData();
                alert('请复制显示的数据并保存到文件中。');
            } catch (fallbackError) {
                console.error('备用导出方法也失败:', fallbackError);
                alert('导出数据失败: ' + fallbackError.message);
            }
        }
    }

    // 数据导入按钮点击处理
    handleImportDataClick() {
        this.importFileInput.click();
    }

    // 文件选择处理
    async handleImportFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const success = await this.taskManager.importDataFromFile(file);
            if (success) {
                alert('数据导入成功！页面将刷新以显示导入的数据。');
                // 刷新页面以显示导入的数据
                await this.taskManager.init();
                await this.personnelManager.init();
                this.render();
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败: ' + error.message);
        }

        // 清空文件输入框
        this.importFileInput.value = '';
    }

    // 手动导入数据处理（通过文本框）
    async handleImportTextClick() {
        try {
            const success = await this.taskManager.showImportDataModal();
            if (success) {
                alert('数据导入成功！页面将刷新以显示导入的数据。');
                // 刷新页面以显示导入的数据
                await this.taskManager.init();
                await this.personnelManager.init();
                this.render();
            }
        } catch (error) {
            console.error('手动导入数据失败:', error);
            alert('导入数据失败: ' + error.message);
        }
    }

    // 数据恢复处理
    async handleRecoverData() {
        try {
            console.log('开始手动数据恢复...');
            const hasData = await this.taskManager.recoverData();
            
            if (hasData) {
                alert('数据恢复成功！页面将刷新以显示恢复的数据。');
                await this.taskManager.init();
                await this.personnelManager.init();
                this.render();
            } else {
                const result = confirm('未找到可恢复的数据。是否添加示例数据？');
                if (result) {
                    await this.taskManager.addSampleData();
                    this.render();
                    alert('示例数据已添加！');
                } else {
                    alert('未找到可恢复的数据。您可以尝试导入之前导出的数据文件。');
                }
            }
        } catch (error) {
            console.error('数据恢复失败:', error);
            alert('数据恢复失败: ' + error.message);
        }
    }

    handleAddTask(e) {
        e.preventDefault();
        
        if (!this.taskManager) {
            console.log('TaskManager not initialized yet');
            return;
        }
        
        const title = this.taskTitle.value.trim();
        const description = this.taskDescription.value.trim();
        const category = this.taskCategory.value;
        const assignees = this.currentTaskAssignees || [];

        if (!title) {
            alert('请输入任务标题');
            return;
        }

        try {
            console.log('Raw assignees before processing:', this.currentTaskAssignees);
            
            const validatedAssignees = Array.isArray(assignees) ? 
                assignees
                    .filter(assignee => {
                        console.log('Checking assignee:', assignee);
                        return assignee != null && assignee !== undefined;
                    })
                    .map(assignee => {
                        console.log('Processing assignee:', assignee);
                        if (typeof assignee === 'string') {
                            return assignee;
                        } else if (typeof assignee === 'object' && assignee !== null && 'name' in assignee && assignee.name) {
                            return assignee.name;
                        }
                        console.warn('Invalid assignee format:', assignee);
                        return null;
                    })
                    .filter(assignee => assignee != null && typeof assignee === 'string' && assignee.trim() !== '')
                : [];

            console.log('Creating task with:', { title, description, category, validatedAssignees });

            this.taskManager.createTask(title, description, category, validatedAssignees);
            this.addForm.reset();
            this.currentTaskAssignees = [];
            this.selectedCategory = null;
            this.selectedCategoryDisplay.textContent = '未选择';
            this.updateButtonText('add');
            this.updateCategorySuggestions();
            this.updateAssigneeSuggestions();
            this.updateCategoryFilter();
            this.updateAssigneeFilter();
            this.render();
        } catch (error) {
            console.error('Task creation error:', error);
            console.error('Error stack:', error.stack);
            alert('添加任务失败: ' + error.message);
        }
    }

    handleEditTask(e) {
        e.preventDefault();
        
        if (!this.currentEditingId) return;

        const updates = {
            title: this.editTitle.value.trim(),
            description: this.editDescription.value.trim(),
            status: this.editStatus.value,
            category: this.editCategory.value,
            assignees: this.currentTaskAssignees // Use selected assignees
        };

        if (!updates.title) {
            alert('请输入任务标题');
            return;
        }

        try {
            this.taskManager.updateTask(this.currentEditingId, updates);
            this.hideModal();
            this.updateCategorySuggestions();
            this.updateAssigneeSuggestions();
            this.updateCategoryFilter();
            this.updateAssigneeFilter();
            this.render();
        } catch (error) {
            alert('更新任务失败: ' + error.message);
        }
    }

    handleFilterChange(e) {
        // 检查 filterButtons 是否存在，避免 null 访问错误
        if (this.filterButtons && this.filterButtons.length > 0) {
            this.filterButtons.forEach(btn => btn.classList.remove('active'));
        }

        if (e.target && e.target.classList) {
            e.target.classList.add('active');
        }

        this.currentFilter = e.target.dataset.filter;
        this.render();
    }

    handleCategoryFilterChange(e) {
        this.currentCategoryFilter = e.target.value;
        this.render();
    }

    handleAssigneeFilterChange(e) {
        this.currentAssigneeFilter = e.target.value;
        this.render();
    }

    async handleDeleteTask(id) {
        console.log('handleDeleteTask called with ID:', id);
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        // 显示删除确认弹窗
        this.showDeleteConfirmModal(task);
    }

    handleCompleteTask(id) {
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        // 使用自定义确认弹窗
        this.showCompleteConfirmModal(task);
    }

    // 暂停计时器
    handlePauseTimer(id) {
        console.log('handlePauseTimer called with ID:', id);
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        try {
            task.pauseTimer();
            this.taskManager.saveTasks().then(() => {
                console.log('Timer paused and saved');
                this.render();
            });
        } catch (error) {
            console.error('Pause timer error:', error);
            alert('暂停计时器失败: ' + error.message);
        }
    }

    // 继续计时器
    handleResumeTimer(id) {
        console.log('handleResumeTimer called with ID:', id);
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        try {
            task.resumeTimer();
            this.taskManager.saveTasks().then(() => {
                console.log('Timer resumed and saved');
                this.render();
            });
        } catch (error) {
            console.error('Resume timer error:', error);
            alert('继续计时器失败: ' + error.message);
        }
    }

    // 启动计时器
    handleStartTimer(id) {
        console.log('handleStartTimer called with ID:', id);
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        try {
            task.startTimer();

            // 如果任务状态是待办，则自动更新为进行中
            if (task.status === 'pending') {
                this.taskManager.updateTask(id, { status: 'in-progress' });
                console.log('Task status updated to in-progress');
            }

            this.taskManager.saveTasks().then(() => {
                console.log('Timer started and saved');
                this.render();
            });
        } catch (error) {
            console.error('Start timer error:', error);
            alert('启动计时器失败: ' + error.message);
        }
    }

    // 显示任务完成确认弹窗
    showCompleteConfirmModal(task) {
        this.currentCompletingTaskId = task.id;
        this.completeConfirmTask.textContent = task.title;
        this.completeConfirmModal.style.display = 'block';

        // 让确认按钮获得焦点
        setTimeout(() => {
            this.confirmCompleteBtn.focus();
        }, 100);
    }

    // 隐藏任务完成确认弹窗
    hideCompleteConfirmModal() {
        this.completeConfirmModal.style.display = 'none';
        this.currentCompletingTaskId = null;
    }

    // 确认完成任务
    confirmTaskCompletion() {
        if (!this.currentCompletingTaskId) return;

        try {
            const task = this.taskManager.getTaskById(this.currentCompletingTaskId);
            this.taskManager.updateTask(this.currentCompletingTaskId, { status: 'completed' });
            this.render();

            // 隐藏确认弹窗
            this.hideCompleteConfirmModal();

            // 显示成功弹窗
            const taskTitle = task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title;
            this.showCompleteSuccessModal(`任务"${taskTitle}"已成功标记为完成！`);
        } catch (error) {
            this.hideCompleteConfirmModal();
            alert('标记任务完成失败: ' + error.message);
        }
    }

    // 显示任务完成成功弹窗
    showCompleteSuccessModal(message) {
        this.completeSuccessMessage.textContent = message;
        this.completeSuccessModal.style.display = 'block';

        // 让确定按钮获得焦点
        setTimeout(() => {
            this.completeSuccessOkBtn.focus();
        }, 100);
    }

    // 隐藏任务完成成功弹窗
    hideCompleteSuccessModal() {
        this.completeSuccessModal.style.display = 'none';
    }

    handleEditClick(id) {
        const task = this.taskManager.getTaskById(id);
        if (!task) return;

        this.currentEditingId = id;
        this.editTitle.value = task.title;
        this.editDescription.value = task.description;
        this.editStatus.value = task.status;
        this.editTaskCategory.value = task.category || '一般';

        // 设置编辑表单的类别显示
        const categoryName = task.category || '一般';
        this.editSelectedCategoryDisplay.textContent = categoryName;

        // 设置当前选中的类别
        this.selectedCategory = this.allCategories.find(c => c.name === categoryName) || null;

        // 设置当前任务的人员
        this.currentTaskAssignees = task.assignees ? [...task.assignees] : [];
        this.updateButtonText('edit');
        
        this.showModal();
    }

    showModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.currentEditingId = null;
        this.currentTaskAssignees = [];
        this.selectedCategory = null;
        if (this.editForm) {
            this.editForm.reset();
        }
        this.updateButtonText('edit');
    }

    // 备注管理方法
    handleNotesClick(taskId) {
        const task = this.taskManager.getTaskById(taskId);
        if (!task) return;

        this.currentTaskId = taskId;

        // 检查元素是否存在，避免 null 访问错误
        if (this.notesModalTitle) {
            this.notesModalTitle.textContent = `任务备注：${task.title}`;
        }

        this.renderNotes();
        this.showNotesModal();
    }

    showNotesModal() {
        if (this.notesModal) {
            this.notesModal.style.display = 'block';
        }
    }

    hideNotesModal() {
        if (this.notesModal) {
            this.notesModal.style.display = 'none';
        }
        this.currentTaskId = null;
        if (this.addNoteForm) {
            this.addNoteForm.reset();
        }
    }

    handleAddNote(e) {
        e.preventDefault();
        
        if (!this.currentTaskId) return;

        const content = this.newNoteContent.value.trim();
        if (!content) {
            alert('请输入备注内容');
            return;
        }

        try {
            this.taskManager.addNoteToTask(this.currentTaskId, content);
            this.addNoteForm.reset();
            this.renderNotes();
            this.render(); // 更新任务显示
        } catch (error) {
            alert('添加备注失败: ' + error.message);
        }
    }

    handleEditNoteClick(taskId, noteId) {
        const task = this.taskManager.getTaskById(taskId);
        if (!task) return;

        const note = task.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentTaskId = taskId;
        this.currentNoteId = noteId;
        this.editNoteContent.value = note.content;
        this.showEditNoteModal();
    }

    showEditNoteModal() {
        if (this.editNoteModal) {
            this.editNoteModal.style.display = 'block';
        }
    }

    hideEditNoteModal() {
        if (this.editNoteModal) {
            this.editNoteModal.style.display = 'none';
        }
        this.currentTaskId = null;
        this.currentNoteId = null;
        if (this.editNoteForm) {
            this.editNoteForm.reset();
        }
    }

    // 人员选择相关方法
    showAssigneeSelector(target) {
        console.log('showAssigneeSelector called with target:', target);

        // 检查personnelManager是否已初始化
        if (!this.personnelManager) {
            console.error('PersonnelManager not initialized yet');
            alert('人员管理器尚未初始化，请稍后再试');
            return;
        }

        this.currentAssigneeTarget = target;
        
        // 获取当前已选择的人员
        if (target === 'edit') {
            const task = this.taskManager.getTaskById(this.currentEditingId);
            this.tempSelectedAssignees = task && task.assignees ? [...task.assignees] : [];
        } else {
            console.log('Setting tempSelectedAssignees from currentTaskAssignees:', this.currentTaskAssignees);
            this.tempSelectedAssignees = Array.isArray(this.currentTaskAssignees) ? 
                this.currentTaskAssignees
                    .filter(assignee => assignee != null && assignee !== undefined)
                    .map(assignee => {
                        if (typeof assignee === 'string') {
                            return assignee;
                        } else if (typeof assignee === 'object' && assignee !== null && 'name' in assignee && assignee.name) {
                            return assignee.name;
                        }
                        return null;
                    })
                    .filter(assignee => assignee != null)
                : [];
        }
        
        console.log('tempSelectedAssignees set to:', this.tempSelectedAssignees);
        this.renderAssigneeModal();
        if (this.assigneeSelectModal) {
            this.assigneeSelectModal.style.display = 'block';
        }
    }

    hideAssigneeSelector() {
        if (this.assigneeSelectModal) {
            this.assigneeSelectModal.style.display = 'none';
        }
        this.currentAssigneeTarget = null;
        this.tempSelectedAssignees = [];
        if (this.assigneeModalSearch) {
            this.assigneeModalSearch.value = '';
        }
    }

    renderAssigneeModal() {
        // 检查personnelManager是否已初始化
        if (!this.personnelManager) {
            console.error('PersonnelManager not initialized, cannot render assignee modal');
            this.assigneeModalList.innerHTML = '<p class="no-personnel">人员管理器未初始化</p>';
            return;
        }

        const searchQuery = this.assigneeModalSearch.value.trim().toLowerCase();
        let personnel = this.personnelManager.getAllPersonnel();
        
        if (searchQuery) {
            personnel = this.personnelManager.searchPersonnel(searchQuery);
        }
        
        this.assigneeModalList.innerHTML = '';
        
        personnel.forEach(person => {
            const isSelected = this.tempSelectedAssignees.some(assignee => {
                if (typeof assignee === 'string') {
                    return assignee === person.name;
                } else if (typeof assignee === 'object' && assignee && assignee.id) {
                    return assignee.id === person.id;
                } else if (typeof assignee === 'object' && assignee && assignee.name) {
                    return assignee.name === person.name;
                }
                return false;
            });
            
            const personElement = document.createElement('div');
            personElement.className = `assignee-item ${isSelected ? 'selected' : ''}`;
            personElement.innerHTML = `
                <div class="assignee-info">
                    <div class="assignee-name">${this.escapeHtml(person.name)}</div>
                    <div class="assignee-details">
                        <span class="assignee-role">${this.escapeHtml(person.role)}</span>
                        ${person.department ? `<span class="assignee-department">${this.escapeHtml(person.department)}</span>` : ''}
                    </div>
                </div>
                <div class="assignee-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-person-id="${person.id}">
                </div>
            `;

            // Add event listener to the checkbox
            const checkbox = personElement.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                this.toggleAssigneeSelection(person.id);
            });
            
            this.assigneeModalList.appendChild(personElement);
        });
        
        if (personnel.length === 0) {
            this.assigneeModalList.innerHTML = '<p class="no-personnel">未找到相关人员</p>';
        }
    }

    toggleAssigneeSelection(personId) {
        console.log('toggleAssigneeSelection called with personId:', personId);
        const person = this.personnelManager.getPersonnelById(personId);
        console.log('Found person:', person);
        if (!person) {
            console.error('Person not found for ID:', personId);
            return;
        }
        
        const existingIndex = this.tempSelectedAssignees.findIndex(assignee => {
            if (typeof assignee === 'string') {
                return assignee === person.name;
            } else if (typeof assignee === 'object' && assignee && assignee.id) {
                return assignee.id === person.id;
            } else if (typeof assignee === 'object' && assignee && assignee.name) {
                return assignee.name === person.name;
            }
            return false;
        });
        
        console.log('Existing index:', existingIndex);
        
        if (existingIndex >= 0) {
            // 移除选择
            console.log('Removing assignee:', this.tempSelectedAssignees[existingIndex]);
            this.tempSelectedAssignees.splice(existingIndex, 1);
        } else {
            // 添加选择
            console.log('Adding assignee:', person.name);
            this.tempSelectedAssignees.push(person.name); // Store only the name
        }
        
        console.log('Updated tempSelectedAssignees:', this.tempSelectedAssignees);
        this.renderAssigneeModal();
    }

    confirmAssigneeSelectionHandler() {
        console.log('confirmAssigneeSelectionHandler called with tempSelectedAssignees:', this.tempSelectedAssignees);
        
        this.currentTaskAssignees = this.tempSelectedAssignees
            .filter(assignee => assignee != null && assignee !== undefined)
            .map(assignee => {
                if (typeof assignee === 'string') {
                    return assignee;
                } else if (typeof assignee === 'object' && assignee !== null && 'name' in assignee && assignee.name) {
                    return assignee.name;
                }
                console.warn('Invalid assignee in selection:', assignee);
                return null;
            })
            .filter(assignee => assignee != null && typeof assignee === 'string' && assignee.trim() !== '');
            
        console.log('Processed currentTaskAssignees:', this.currentTaskAssignees);
        this.updateButtonText(this.currentAssigneeTarget);
        this.hideAssigneeSelector();
    }

    handleAssigneeSearch(e) {
        this.renderAssigneeModal();
    }

    updateButtonText(target) {
        const button = target === 'edit' ? this.editSelectAssigneesBtn : this.selectAssigneesBtn;

        // 检查按钮元素是否存在，避免 null 访问错误
        if (!button) {
            console.warn(`Button element not found for target: ${target}, skipping button text update`);
            return;
        }

        if (!this.currentTaskAssignees || this.currentTaskAssignees.length === 0) {
            button.textContent = '选择人员';
            button.classList.remove('has-selection');
        } else {
            const assigneeNames = this.currentTaskAssignees
                .filter(assignee => assignee != null)
                .map(assignee => {
                    if (typeof assignee === 'string') {
                        return assignee;
                    } else if (typeof assignee === 'object' && assignee && assignee.name) {
                        return assignee.name;
                    }
                    return '';
                })
                .filter(name => name.trim() !== '');

            if (assigneeNames.length === 0) {
                button.textContent = '选择人员';
                button.classList.remove('has-selection');
            } else {
                const displayText = assigneeNames.length > 2
                    ? `已选${assigneeNames.length}人`
                    : assigneeNames.join(', ');
                button.textContent = `已选: ${displayText}`;
                button.classList.add('has-selection');
            }
        }
    }

    handleEditNote(e) {
        e.preventDefault();
        
        if (!this.currentTaskId || !this.currentNoteId) return;

        const content = this.editNoteContent.value.trim();
        if (!content) {
            alert('请输入备注内容');
            return;
        }

        try {
            this.taskManager.updateTaskNote(this.currentTaskId, this.currentNoteId, content);
            this.hideEditNoteModal();
            this.renderNotes();
            this.render(); // 更新任务显示
        } catch (error) {
            alert('更新备注失败: ' + error.message);
        }
    }

    handleDeleteNote(taskId, noteId) {
        if (confirm('确定要删除这条备注吗？')) {
            try {
                this.taskManager.removeNoteFromTask(taskId, noteId);
                this.renderNotes();
                this.render(); // 更新任务显示
            } catch (error) {
                alert('删除备注失败: ' + error.message);
            }
        }
    }

    renderNotes() {
        if (!this.currentTaskId) return;

        const notes = this.taskManager.getTaskNotes(this.currentTaskId);
        this.notesList.innerHTML = '';

        if (notes.length === 0) {
            this.notesList.innerHTML = '<p class="no-notes">暂无备注</p>';
        } else {
            notes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';
                noteElement.innerHTML = `
                    <div class="note-header">
                        <span class="note-timestamp">${this.formatDate(note.timestamp)}</span>
                    </div>
                    <div class="note-content">${this.escapeHtml(note.content)}</div>
                    <div class="note-actions">
                        <button class="btn-edit-note" onclick="app.handleEditNoteClick(${this.currentTaskId}, ${note.id})">编辑</button>
                        <button class="btn-delete-note" onclick="app.handleDeleteNote(${this.currentTaskId}, ${note.id})">删除</button>
                    </div>
                `;
                this.notesList.appendChild(noteElement);
            });
        }
    }

    // 获取指定日期的任务
    getTasksByDate(date) {
        const targetDate = new Date(date);
        const dateStr = targetDate.toDateString();
        
        return this.taskManager.getTasks().filter(task => {
            if (!task.createdAt) return false;
            const taskDate = new Date(task.createdAt);
            return taskDate.toDateString() === dateStr;
        });
    }

    // 获取筛选后的所有任务
    getFilteredTasks() {
        let tasks = this.taskManager.getTasks();
        console.log('getFilteredTasks: initial tasks count =', tasks.length, 'currentFilter=', this.currentFilter, 'category=', this.currentCategoryFilter, 'assignee=', this.currentAssigneeFilter);
        
        const searchQuery = this.searchInput.value.trim();
        if (searchQuery) {
            tasks = this.taskManager.searchTasks(searchQuery);
        }
        
        if (this.currentFilter !== 'all') {
            tasks = tasks.filter(task => task.status === this.currentFilter);
        }
        
        if (this.currentCategoryFilter !== 'all') {
            tasks = tasks.filter(task => task.category === this.currentCategoryFilter);
        }
        
        if (this.currentAssigneeFilter !== 'all') {
            tasks = tasks.filter(task => {
                if (!task.assignees) return false;
                return Array.isArray(task.assignees) ? task.assignees.includes(this.currentAssigneeFilter) : false;
            });
        }
        
    const sorted = tasks.sort((a, b) => {
            // 首先按类别排序
            const categoryCompare = (a.category || '一般').localeCompare(b.category || '一般', 'zh-CN');
            if (categoryCompare !== 0) {
                return categoryCompare;
            }
            
            // 同类别任务按创建时间从新到旧排序
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bDate - aDate;
        });
        console.log('getFilteredTasks: final tasks count after filters =', sorted.length);
        return sorted;
    }

    // 获取今日任务 - 显示当前选定日期及之前的未完成任务 + 当日已完成任务
    getTodayTasks() {
        const selectedDate = new Date(this.selectedDate);
        // 将选定日期设置为当天的结束时间（23:59:59），这样可以包含当天的所有任务
        selectedDate.setHours(23, 59, 59, 999);

        // 获取当前选定日期及之前的未完成任务
        const incompleteTasksBeforeOrOnDate = this.taskManager.getTasks().filter(task => {
            // 只显示未完成的任务
            if (task.status !== 'pending' && task.status !== 'in-progress') {
                return false;
            }

            // 如果任务没有创建时间，也包含在内（向后兼容）
            if (!task.createdAt) {
                return true;
            }

            // 任务创建时间是在选定日期或之前的
            const taskDate = new Date(task.createdAt);
            return taskDate <= selectedDate;
        });

        // 获取当前选定日期的已完成任务
        const todayCompletedTasks = this.getTasksByDate(this.selectedDate).filter(task =>
            task.status === 'completed'
        );

        // 合并未完成任务和当日完成任务
        const allTodayTasks = [...incompleteTasksBeforeOrOnDate, ...todayCompletedTasks];

        return allTodayTasks.sort((a, b) => {
            // 首先按状态排序：pending -> in-progress -> completed
            const statusOrder = { 'pending': 1, 'in-progress': 2, 'completed': 3 };
            const statusCompare = statusOrder[a.status] - statusOrder[b.status];
            if (statusCompare !== 0) {
                return statusCompare;
            }

            // 同状态任务按创建时间从新到旧排序
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bDate - aDate;
        });
    }

    // 获取前一天任务
    getYesterdayTasks() {
        const yesterday = new Date(this.selectedDate);
        yesterday.setDate(yesterday.getDate() - 1);
        return this.getTasksByDate(yesterday).sort((a, b) => {
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bDate - aDate;
        });
    }

    renderTask(task, showActions = true) {
        console.log('Rendering task:', task.title, 'with assignees:', task.assignees);
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
        taskElement.setAttribute('data-task-id', task.id);

        const notesCount = task.notes ? task.notes.length : 0;
        const notesIndicator = notesCount > 0 ? `<span class="task-notes-indicator">${notesCount}条备注</span>` : '';

        const imagesCount = task.images ? task.images.length : 0;
        const imagesIndicator = imagesCount > 0 ? `<span class="task-images-indicator">${imagesCount}张图片</span>` : '';

        // 计时器相关
        const currentTime = task.getCurrentTime();
        const formattedTime = task.formatTime(currentTime);
        const timerButton = task.status !== 'completed' ? (
            task.timerRunning ?
                `<button class="btn-pause" onclick="app.handlePauseTimer(${task.id})">⏸ 暂停</button>` :
                (task.totalTime > 0 || task.timerRunning ?
                    `<button class="btn-resume" onclick="app.handleResumeTimer(${task.id})">▶ 继续</button>` :
                    `<button class="btn-start" onclick="app.handleStartTimer(${task.id})">⏱ 开始</button>`)
        ) : '';

        const timerDisplay = task.status !== 'completed' && (task.totalTime > 0 || task.timerRunning) ?
            `<span class="task-timer ${task.timerRunning ? 'running' : ''}">${formattedTime}</span>` : '';

        // 根据任务状态显示不同的按钮
        const completeButton = task.status !== 'completed' ?
            `<button class="btn-complete" onclick="app.handleCompleteTask(${task.id})">完成</button>` :
            `<button class="btn-completed" disabled>已完成</button>`;

        const actionsHtml = showActions ? `
            <div class="task-actions">
                ${completeButton}
                ${timerButton}
                <button class="btn-edit" onclick="app.handleEditClick(${task.id})">编辑</button>
                <button class="btn-notes" onclick="app.handleNotesClick(${task.id})">备注</button>
                <button class="btn-images ${imagesCount > 0 ? 'has-images' : ''}" onclick="app.handleImagesClick(${task.id})">
                    图片${imagesCount > 0 ? `<span class="btn-badge">${imagesCount}</span>` : ''}
                </button>
                <button class="btn-delete" onclick="app.handleDeleteTask(${task.id})">删除</button>
            </div>
        ` : '';

        taskElement.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">
                        ${this.escapeHtml(task.title)}
                        ${notesIndicator}
                        ${imagesIndicator}
                        ${timerDisplay}
                    </div>
                    <div class="task-meta">
                        <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
                        <span class="task-category ${this.getCategoryClass(task.category || '一般')}">${task.category || '一般'}</span>
                        ${task.assignees && task.assignees.length > 0 ?
                            `<span class="task-assignees">${task.assignees
                                .filter(assignee => assignee != null && assignee !== undefined && assignee !== '')
                                .map(assignee => {
                                    console.log('Displaying assignee:', assignee);
                                    if (typeof assignee === 'string') {
                                        return assignee;
                                    } else if (typeof assignee === 'object' && assignee && assignee.name) {
                                        return assignee.name;
                                    } else {
                                        console.warn('Invalid assignee found:', assignee);
                                        return null;
                                    }
                                })
                                .filter(name => name != null)
                                .join(', ')}</span>` : ''}
                        ${task.assignees && task.assignees.length > 0 ?
                            `<span class="personnel-count ${this.getPersonnelCountClass(task.assignees.filter(assignee => assignee != null && assignee !== undefined && assignee !== '').length)}">${task.assignees
                                .filter(assignee => assignee != null && assignee !== undefined && assignee !== '').length}人</span>` : ''}
                    </div>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-dates">
                创建时间: ${this.formatDate(task.createdAt)}
                ${task.updatedAt && task.createdAt && task.updatedAt.getTime() !== task.createdAt.getTime() ?
                    `| 更新时间: ${this.formatDate(task.updatedAt)}` : ''}
            </div>
            ${actionsHtml}
        `;
        return taskElement;
    }

    render() {
        if (!this.taskManager || !this.personnelManager) {
            console.log('Managers not initialized yet, skipping render');
            return;
        }

        // 恢复运行中的计时器（页面刷新后）
        this.recoverRunningTimers();

        this.renderAllTasks();
        this.renderTodayTasks();
        this.renderYesterdayTasks();
        this.updateStats();
        this.updateCategorySuggestions();
        this.updateAssigneeSuggestions();
        this.updateCategoryFilter();
        this.updateAssigneeFilter();

        // 初始化人员按钮显示
        this.updateButtonText('add');

        // 启动计时器实时更新（如果还未启动）
        if (!this.timerUpdateInterval) {
            this.timerUpdateInterval = setInterval(() => {
                this.updateRunningTimers();
            }, 1000); // 每秒更新一次
        }
    }

    // 恢复运行中的计时器（页面刷新后）
    recoverRunningTimers() {
        const tasks = this.taskManager.getTasks();
        tasks.forEach(task => {
            // 如果计时器在运行但 lastStartTime 为 null，说明是页面刷新后恢复的
            if (task.timerRunning && !task.lastStartTime && task.timerStartedAt) {
                console.log(`Recovering timer for task ${task.id}`, `timerStartedAt:`, task.timerStartedAt);
                // 将 timerStartedAt（Date 对象或字符串或时间戳）转换为时间戳
                let startTime;
                if (task.timerStartedAt instanceof Date) {
                    startTime = task.timerStartedAt.getTime();
                } else if (typeof task.timerStartedAt === 'string') {
                    // 字符串格式，可能是 "2025-10-22 11:19:12" 这样的格式
                    startTime = new Date(task.timerStartedAt).getTime();
                } else if (typeof task.timerStartedAt === 'number') {
                    // 已经是时间戳
                    startTime = task.timerStartedAt;
                } else {
                    console.warn(`Unknown timerStartedAt format for task ${task.id}:`, task.timerStartedAt);
                    return;
                }
                task.lastStartTime = startTime;
                console.log(`Restored lastStartTime: ${startTime}`);
            }
        });
    }

    // 更新正在运行的计时器显示
    updateRunningTimers() {
        const tasks = this.taskManager.getTasks();
        const hasRunningTimer = tasks.some(task => task.timerRunning);

        if (hasRunningTimer) {
            // 只更新计时器显示，不触发完整渲染
            const allTaskElements = document.querySelectorAll('.task-item');
            allTaskElements.forEach(element => {
                const taskId = element.getAttribute('data-task-id');
                if (taskId) {
                    const task = this.taskManager.getTaskById(parseInt(taskId));
                    if (task) {
                        const timerDisplay = element.querySelector('.task-timer');
                        if (task.timerRunning && timerDisplay) {
                            timerDisplay.textContent = task.formatTime(task.getCurrentTime());
                        }
                    }
                }
            });
        }
    }

    // 更新数据库状态显示
    updateDatabaseStatus() {
        if (!this.taskManager || !this.taskManager.databaseManager) {
            return;
        }

        const dbType = this.taskManager.databaseManager.getDatabaseType();
        const indicator = this.dbIndicator;
        const text = this.dbText;

        // 检查元素是否存在，避免 null 访问错误
        if (!indicator || !text) {
            console.warn('Database status elements not found in DOM, skipping status update');
            return;
        }

        // 移除所有状态类
        indicator.classList.remove('local', 'server', 'error');

        if (dbType === 'server') {
            indicator.classList.add('server');
            indicator.textContent = '服务器';
            text.textContent = '服务器存储 - 多设备共享';
        } else {
            indicator.classList.add('local');
            indicator.textContent = '本地';
            text.textContent = '本地存储';
        }

        console.log(`Database status updated: ${dbType} mode`);
    }

    renderAllTasks() {
        const tasks = this.getFilteredTasks();
        this.allTasksContainer.innerHTML = '';
        
        if (tasks.length === 0) {
            this.allTasksContainer.innerHTML = '<p class="no-tasks">暂无任务</p>';
        } else {
            tasks.forEach(task => {
                const taskElement = this.renderTask(task);
                this.allTasksContainer.appendChild(taskElement);
            });
        }
    }

    renderTodayTasks() {
        const todayTasks = this.getTodayTasks();
        this.todayTasksContainer.innerHTML = '';
        
        if (todayTasks.length === 0) {
            this.todayTasksContainer.innerHTML = '<p class="no-tasks">今日暂无任务</p>';
        } else {
            todayTasks.forEach(task => {
                const taskElement = this.renderTask(task);
                this.todayTasksContainer.appendChild(taskElement);
            });
        }
    }

    renderYesterdayTasks() {
        const yesterdayTasks = this.getYesterdayTasks();
        this.yesterdayTasksContainer.innerHTML = '';
        
        if (yesterdayTasks.length === 0) {
            this.yesterdayTasksContainer.innerHTML = '<p class="no-tasks">前一天暂无任务</p>';
        } else {
            yesterdayTasks.forEach(task => {
                const taskElement = this.renderTask(task, false); // 不显示操作按钮
                this.yesterdayTasksContainer.appendChild(taskElement);
            });
        }
    }

    updateStats() {
        // 更新总体统计
        const allStats = this.taskManager.getStats();
        this.statsElements.total.textContent = `总计: ${allStats.total}`;
        this.statsElements.pending.textContent = `待办: ${allStats.pending}`;
        this.statsElements.inProgress.textContent = `进行中: ${allStats.inProgress}`;
        this.statsElements.completed.textContent = `已完成: ${allStats.completed}`;
        
        // 更新今日统计 - 基于今日任务显示逻辑
        const todayTasks = this.getTodayTasks();
        const todayStats = this.calculateStats(todayTasks);
        this.todayStatsElements.total.textContent = `总计: ${todayStats.total}`;
        this.todayStatsElements.pending.textContent = `待办: ${todayStats.pending}`;
        this.todayStatsElements.inProgress.textContent = `进行中: ${todayStats.inProgress}`;
        this.todayStatsElements.completed.textContent = `已完成: ${todayStats.completed}`;
        
        // 更新前一天统计
        const yesterdayTasks = this.getYesterdayTasks();
        const yesterdayStats = this.calculateStats(yesterdayTasks);
        const completionRate = yesterdayStats.total > 0 ? 
            Math.round((yesterdayStats.completed / yesterdayStats.total) * 100) : 0;
        
        this.yesterdayStatsElements.totalCount.textContent = yesterdayStats.total;
        this.yesterdayStatsElements.completedCount.textContent = yesterdayStats.completed;
        this.yesterdayStatsElements.incompleteCount.textContent = 
            yesterdayStats.pending + yesterdayStats.inProgress;
        this.yesterdayStatsElements.percentage.textContent = `${completionRate}%`;
        
        // 更新完成率圆圈颜色
        const rateCircle = document.querySelector('.rate-circle');
        if (rateCircle) {
            if (completionRate >= 80) {
                rateCircle.style.borderColor = '#27ae60';
                rateCircle.style.color = '#27ae60';
            } else if (completionRate >= 60) {
                rateCircle.style.borderColor = '#f39c12';
                rateCircle.style.color = '#f39c12';
            } else {
                rateCircle.style.borderColor = '#e74c3c';
                rateCircle.style.color = '#e74c3c';
            }
        }
    }

    calculateStats(tasks) {
        return {
            total: tasks.length,
            pending: tasks.filter(task => task.status === 'pending').length,
            inProgress: tasks.filter(task => task.status === 'in-progress').length,
            completed: tasks.filter(task => task.status === 'completed').length
        };
    }

    updateAssigneeSuggestions() {
        const assignees = this.taskManager.getAssignees();
        const datalists = [
            document.getElementById('assignee-suggestions'),
            document.getElementById('edit-assignee-suggestions')
        ];
        
        datalists.forEach(datalist => {
            if (datalist) {
                datalist.innerHTML = '';
                assignees.forEach(assignee => {
                    const option = document.createElement('option');
                    option.value = assignee;
                    datalist.appendChild(option);
                });
            }
        });
    }

    updateCategorySuggestions() {
        const categories = this.taskManager.getCategories();
        const datalists = [
            document.getElementById('category-suggestions'),
            document.getElementById('edit-category-suggestions')
        ];
        
        datalists.forEach(datalist => {
            if (datalist) {
                datalist.innerHTML = '';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    datalist.appendChild(option);
                });
            }
        });
    }

    updateCategoryFilter() {
        const categories = this.taskManager.getCategories();
        const categoryFilter = this.categoryFilter;
        const currentValue = categoryFilter.value;

        // 保留"所有类别"选项
        categoryFilter.innerHTML = '<option value="all">所有类别</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // 恢复之前选择的值
        if (currentValue && [...categoryFilter.options].some(opt => opt.value === currentValue)) {
            categoryFilter.value = currentValue;
        }
    }

    updateAssigneeFilter() {
        if (!this.assigneeFilter) return;

        // 获取人员数据 - 首先尝试从人员管理器获取，如果没有则从任务中获取
        let assignees = [];
        if (this.personnelManager) {
            // 从人员管理器获取所有人员
            const personnel = this.personnelManager.getAllPersonnel();
            assignees = personnel.map(person => person.name);
        }

        // 如果人员管理器没有数据，则从任务中获取分配人员
        if (assignees.length === 0) {
            assignees = this.taskManager.getAssignees();
        }

        const currentValue = this.assigneeFilter.value;

        // 保留"所有人员"选项
        this.assigneeFilter.innerHTML = '<option value="all">所有人员</option>';

        // 添加人员选项
        assignees.forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee;
            option.textContent = assignee;
            this.assigneeFilter.appendChild(option);
        });

        // 恢复之前选择的值
        if (currentValue && [...this.assigneeFilter.options].some(opt => opt.value === currentValue)) {
            this.assigneeFilter.value = currentValue;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待办',
            'in-progress': '进行中',
            'completed': '已完成'
        };
        return statusMap[status] || status;
    }

    getCategoryClass(category) {
        // 为自定义类别生成一个简单的哈希类名
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
            const char = category.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // 预定义类别使用固定样式
        const predefinedClasses = {
            '一般': 'general',
            '工作': 'work', 
            '个人': 'personal',
            '学习': 'study',
            '健康': 'health',
            '购物': 'shopping',
            '财务': 'finance',
            '旅行': 'travel'
        };
        
        return predefinedClasses[category] || `custom-${Math.abs(hash) % 8}`;
    }

    getPersonnelCountClass(count) {
        if (count === 1) {
            return 'count-single';
        } else if (count >= 2 && count <= 3) {
            return 'count-small';
        } else if (count >= 4 && count <= 6) {
            return 'count-medium';
        } else {
            return 'count-large';
        }
    }

    formatDate(date) {
        if (!date) {
            return 'N/A';
        }
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 数据库管理方法
    async handleWriteToDatabase() {
        if (!this.taskManager || !this.personnelManager || !this.dataManager) {
            alert('管理器未初始化，请稍后再试');
            return;
        }

        if (!confirm('确定要将当前所有任务和人员信息写入数据库吗？这将覆盖数据库中的现有数据。')) {
            return;
        }

        try {
            console.log('开始写入数据到数据库...');
            
            // 获取当前应用中的数据
            const tasks = this.taskManager.getTasks();
            const personnel = this.personnelManager.getAllPersonnel();
            const nextId = this.taskManager.nextId;

            // 写入数据库
            const result = await this.dataManager.writeAllDataToDatabase(tasks, personnel, nextId);
            
            if (result.success) {
                alert(`数据写入成功！\n${result.message}`);
                console.log('Write result:', result);
            } else {
                alert('数据写入失败');
            }
        } catch (error) {
            console.error('写入数据库失败:', error);
            alert('写入数据库失败: ' + error.message);
        }
    }

    async handleCreateSampleData() {
        if (!this.dataManager) {
            alert('数据管理器未初始化，请稍后再试');
            return;
        }

        if (!confirm('确定要创建示例数据并写入数据库吗？这将覆盖数据库中的现有数据。')) {
            return;
        }

        try {
            console.log('创建示例数据并写入数据库...');
            const result = await this.dataManager.createSampleDataAndWrite();
            
            if (result.success) {
                alert(`示例数据创建成功！\n${result.message}`);
                console.log('Sample data created:', result);
                
                // 重新加载应用数据
                await this.taskManager.loadTasks();
                await this.personnelManager.loadPersonnel();
                this.render();
            } else {
                alert('创建示例数据失败');
            }
        } catch (error) {
            console.error('创建示例数据失败:', error);
            alert('创建示例数据失败: ' + error.message);
        }
    }

    async handleVerifyDatabase() {
        if (!this.dataManager) {
            alert('数据管理器未初始化，请稍后再试');
            return;
        }

        try {
            console.log('验证数据库数据...');
            const verification = await this.dataManager.verifyDatabaseData();
            
            const message = `数据库验证结果：
数据库类型：${verification.databaseType}
任务数量：${verification.tasksCount}
人员数量：${verification.personnelCount}
下一个任务ID：${verification.nextId}
最后写入时间：${verification.lastDataWrite || '未知'}

示例任务（前3个）：
${verification.tasks.map(t => `- ${t.title} (${t.status})`).join('\n')}

示例人员（前3个）：
${verification.personnel.map(p => `- ${p.name} (${p.role})`).join('\n')}`;

            alert(message);
            console.log('Database verification:', verification);
        } catch (error) {
            console.error('验证数据库失败:', error);
            alert('验证数据库失败: ' + error.message);
        }
    }

    async handleClearDatabase() {
        if (!this.dataManager) {
            alert('数据管理器未初始化，请稍后再试');
            return;
        }

        if (!confirm('警告：确定要清空数据库中的所有数据吗？此操作不可恢复！')) {
            return;
        }

        if (!confirm('再次确认：您将丢失数据库中的所有任务和人员信息，确定继续吗？')) {
            return;
        }

        try {
            console.log('清空数据库数据...');
            const result = await this.dataManager.clearDatabaseData();
            
            if (result.success) {
                alert('数据库已清空！');
                console.log('Database cleared');
            } else {
                alert('清空数据库失败');
            }
        } catch (error) {
            console.error('清空数据库失败:', error);
            alert('清空数据库失败: ' + error.message);
        }
    }

    // 图片管理方法
    handleImagesClick(taskId) {
        const task = this.taskManager.getTaskById(taskId);
        if (!task) return;

        this.currentTaskId = taskId;
        if (this.imagesModalTitle) {
            this.imagesModalTitle.textContent = `任务图片：${task.title}`;
        }

        this.renderImages();
        this.showImagesModal();
    }

    showImagesModal() {
        if (this.imagesModal) {
            this.imagesModal.style.display = 'block';
        }
    }

    hideImagesModal() {
        if (this.imagesModal) {
            this.imagesModal.style.display = 'none';
        }
        this.currentTaskId = null;
    }

    handleImageUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                alert(`文件 ${file.name} 不是图片格式`);
                return;
            }

            // 验证文件大小 (5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`文件 ${file.name} 大小超过5MB限制`);
                return;
            }

            // 使用新的上传API
            this.uploadImageToServer(file);
        });

        // 清空input
        e.target.value = '';
    }

    async uploadImageToServer(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('taskId', this.currentTaskId); // 添加任务ID

            const response = await fetch('api/endpoints/upload.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            const result = await response.json();
            console.log('Image uploaded successfully:', result);
            console.log('API response data:', result.data);

            // 创建图片数据对象（使用新的文件夹结构）
            const imageData = {
                id: result.data.id,
                name: result.data.name,
                fileName: result.data.fileName,
                url: result.data.url, // 使用新的分层文件路径
                dataUrl: result.data.dataUrl, // 保留base64作为备份
                mimeType: result.data.mimeType,
                size: result.data.size,
                uploadTime: result.data.uploadTime,
                taskId: result.data.taskId,
                dateFolder: result.data.dateFolder
            };

            console.log('Processed image data:', imageData);
            this.addImageToTask(this.currentTaskId, imageData);

        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('图片上传失败: ' + error.message);
        }
    }

    addImageToTask(taskId, imageData) {
        try {
            const task = this.taskManager.getTaskById(taskId);
            if (!task) return;

            // 使用Task类的addImage方法
            task.addImage(imageData);

            // 通过TaskManager保存更新
            this.taskManager.updateTask(taskId, { images: task.images });
            this.renderImages();
            this.render(); // 更新任务显示
        } catch (error) {
            console.error('添加图片失败:', error);
            alert('添加图片失败: ' + error.message);
        }
    }

    renderImages() {
        if (!this.currentTaskId) return;

        const task = this.taskManager.getTaskById(this.currentTaskId);
        const images = task && task.images ? task.images : [];

        this.imagesGallery.innerHTML = '';

        if (images.length === 0) {
            this.imagesGallery.innerHTML = '<div class="no-images">暂无图片</div>';
        } else {
            images.forEach((image, index) => {
                const imageElement = document.createElement('div');
                imageElement.className = 'image-item';

                // 优先使用文件URL，如果不存在则使用base64备份
                const imageSrc = image.url ? image.url : (image.dataUrl || image.data);
                const imageAlt = image.name || `图片${index + 1}`;

                imageElement.innerHTML = `
                    <img src="${imageSrc}" alt="${imageAlt}" onerror="this.src='${image.dataUrl || image.data}'">
                    <div class="image-item-overlay">
                        <span>👁️</span>
                    </div>
                `;

                imageElement.addEventListener('click', () => {
                    this.showImagePreview(image, index);
                });

                this.imagesGallery.appendChild(imageElement);
            });
        }
    }

    showImagePreview(image, index) {
        const task = this.taskManager.getTaskById(this.currentTaskId);
        const images = task && task.images ? task.images : [];

        this.currentImageIndex = index;
        this.currentImages = images; // 存储当前图片数组

        // 优先使用文件URL，如果不存在则使用base64备份
        const imageSrc = image.url ? image.url : (image.dataUrl || image.data);

        if (this.previewImage) {
            this.previewImage.src = imageSrc;
            this.previewImage.alt = image.name || `图片${index + 1}`;
            // 添加错误处理，如果文件URL失败则使用base64
            this.previewImage.onerror = () => {
                this.previewImage.src = image.dataUrl || image.data;
            };
        }

        if (this.imageCounter) {
            this.imageCounter.textContent = `${index + 1} / ${images.length}`;
        }

        if (this.imageName) {
            this.imageName.textContent = image.name || image.fileName || `图片${index + 1}`;
        }

        // 更新导航按钮状态
        if (this.prevImageBtn) {
            this.prevImageBtn.disabled = index === 0;
        }
        if (this.nextImageBtn) {
            this.nextImageBtn.disabled = index === images.length - 1;
        }

        if (this.imagePreviewModal) {
            this.imagePreviewModal.style.display = 'block';
        }
    }

    showPreviousImage() {
        if (this.currentImageIndex > 0 && this.currentImages) {
            const newIndex = this.currentImageIndex - 1;
            const image = this.currentImages[newIndex];
            this.showImagePreview(image, newIndex);
        }
    }

    showNextImage() {
        if (this.currentImageIndex < this.currentImages.length - 1 && this.currentImages) {
            const newIndex = this.currentImageIndex + 1;
            const image = this.currentImages[newIndex];
            this.showImagePreview(image, newIndex);
        }
    }

    hideImagePreview() {
        if (this.imagePreviewModal) {
            this.imagePreviewModal.style.display = 'none';
        }
        this.currentImageIndex = null;
        this.currentImages = null;
    }

    async handleDeleteImage() {
        if (this.currentTaskId === null || this.currentImageIndex === null) return;

        if (confirm('确定要删除这张图片吗？')) {
            try {
                const task = this.taskManager.getTaskById(this.currentTaskId);
                if (task && task.images && this.currentImageIndex < task.images.length) {
                    const imageToDelete = task.images[this.currentImageIndex];

                    // 如果图片有文件路径，尝试从服务器删除文件
                    if (imageToDelete.url || imageToDelete.fileName) {
                        try {
                            const deleteData = {};

                            // 优先使用url路径（新的文件夹结构）
                            if (imageToDelete.url) {
                                deleteData.url = imageToDelete.url;
                            }

                            // 如果没有url，则使用fileName（向后兼容）
                            if (imageToDelete.fileName) {
                                deleteData.fileName = imageToDelete.fileName;
                            }

                            const response = await fetch('api/endpoints/delete-image.php', {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(deleteData)
                            });

                            const result = await response.json();
                            console.log('Image file deletion result:', result);
                        } catch (fileDeleteError) {
                            console.warn('Failed to delete image file from server:', fileDeleteError);
                            // 继续删除数据库记录，即使文件删除失败
                        }
                    }

                    // 从任务中删除图片记录
                    task.images.splice(this.currentImageIndex, 1);
                    this.taskManager.updateTask(this.currentTaskId, { images: task.images });
                    this.hideImagePreview();
                    this.renderImages();
                    this.render(); // 更新任务显示
                }
            } catch (error) {
                console.error('删除图片失败:', error);
                alert('删除图片失败: ' + error.message);
            }
        }
    }

    // 类别选择相关方法
    async loadCategories() {
        try {
            const response = await fetch('api/index.php/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            const result = await response.json();
            if (result.success) {
                this.allCategories = result.data;
                console.log('Categories loaded:', this.allCategories);
            } else {
                console.error('Failed to load categories:', result.message);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // 使用默认类别作为备选
            this.allCategories = [
                { id: 1, name: '一般', level: 1, parentId: null, children: [] },
                { id: 2, name: '工作', level: 1, parentId: null, children: [] },
                { id: 3, name: '个人', level: 1, parentId: null, children: [] },
                { id: 4, name: '学习', level: 1, parentId: null, children: [] },
                { id: 5, name: '健康', level: 1, parentId: null, children: [] },
                { id: 6, name: '购物', level: 1, parentId: null, children: [] },
                { id: 7, name: '财务', level: 1, parentId: null, children: [] },
                { id: 8, name: '旅行', level: 1, parentId: null, children: [] }
            ];
        }
    }

    showCategorySelector(target) {
        console.log('showCategorySelector called with target:', target);
        this.currentCategoryTarget = target;

        // 如果类别还未加载，先加载
        if (this.allCategories.length === 0) {
            this.loadCategories().then(() => {
                this.renderCategoryTree();
                if (this.categorySelectModal) {
                    this.categorySelectModal.style.display = 'block';
                }
            });
        } else {
            this.renderCategoryTree();
            if (this.categorySelectModal) {
                this.categorySelectModal.style.display = 'block';
            }
        }
    }

    hideCategorySelector() {
        if (this.categorySelectModal) {
            this.categorySelectModal.style.display = 'none';
        }
        this.currentCategoryTarget = null;
        if (this.categoryModalSearch) {
            this.categoryModalSearch.value = '';
        }
    }

    renderCategoryTree() {
        const searchQuery = this.categoryModalSearch ? this.categoryModalSearch.value.trim().toLowerCase() : '';
        let categoriesToRender = this.allCategories;

        // 如果有搜索词，过滤类别
        if (searchQuery) {
            categoriesToRender = this.filterCategories(this.allCategories, searchQuery);
        }

        // 渲染左侧一级菜单
        this.renderFirstLevelMenu(categoriesToRender);

        // 渲染右侧二三级子菜单（默认显示第一个一级菜单的子菜单）
        if (categoriesToRender.length > 0) {
            this.renderSubCategoriesForParent(categoriesToRender[0]);
        } else {
            this.categoryTreeContainer.innerHTML = '<p class="no-categories">未找到相关类别</p>';
        }
    }

    renderFirstLevelMenu(categories) {
        this.categoryFirstLevelContainer.innerHTML = '';

        if (categories.length === 0) {
            this.categoryFirstLevelContainer.innerHTML = '<p class="no-categories">暂无类别</p>';
            return;
        }

        categories.forEach((category) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';

            const radioId = `category-first-level-${category.id}`;
            const optionDiv = document.createElement('div');
            optionDiv.className = 'category-option';
            optionDiv.innerHTML = `
                <input type="radio" id="${radioId}" name="category-first-level" value="${category.id}" data-category-id="${category.id}">
                <label for="${radioId}">${this.escapeHtml(category.name)}</label>
            `;

            const radio = optionDiv.querySelector('input[type="radio"]');

            // 点击整个选项区域时，切换 radio 状态
            optionDiv.addEventListener('click', () => {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            });

            radio.addEventListener('change', () => {
                // 更新一级菜单选中状态
                document.querySelectorAll('.category-first-level input[type="radio"]').forEach(r => {
                    const div = r.closest('.category-option');
                    if (r === radio) {
                        div.classList.add('selected');
                    } else {
                        div.classList.remove('selected');
                    }
                });
                // 更新右侧二三级菜单
                this.renderSubCategoriesForParent(category);
            });

            categoryDiv.appendChild(optionDiv);
            this.categoryFirstLevelContainer.appendChild(categoryDiv);
        });

        // 默认选中第一个
        const firstRadio = this.categoryFirstLevelContainer.querySelector('input[type="radio"]');
        if (firstRadio) {
            firstRadio.checked = true;
            firstRadio.closest('.category-option').classList.add('selected');
        }
    }

    renderSubCategoriesForParent(parentCategory) {
        this.categoryTreeContainer.innerHTML = '';

        // 如果一级菜单没有子菜单，说明是叶子节点
        if (!parentCategory.children || parentCategory.children.length === 0) {
            // 一级菜单本身就是最后一级，允许选择
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';

            const radioId = `category-${parentCategory.id}`;
            const optionDiv = document.createElement('div');
            optionDiv.className = `category-option ${this.selectedCategory && this.selectedCategory.id === parentCategory.id ? 'selected' : ''}`;
            optionDiv.innerHTML = `
                <input type="radio" id="${radioId}" name="category" value="${parentCategory.id}" data-category-id="${parentCategory.id}" ${this.selectedCategory && this.selectedCategory.id === parentCategory.id ? 'checked' : ''}>
                <label for="${radioId}">${this.escapeHtml(parentCategory.name)}</label>
            `;

            const radio = optionDiv.querySelector('input[type="radio"]');

            // 点击整个选项区域时，切换 radio 状态
            optionDiv.addEventListener('click', () => {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            });

            radio.addEventListener('change', () => {
                this.selectedCategory = parentCategory;
                this.updateCategorySelectionUI();
            });

            categoryDiv.appendChild(optionDiv);
            this.categoryTreeContainer.appendChild(categoryDiv);
            return;
        }

        // 渲染子菜单（不包括一级菜单本身，因为它有子菜单）
        parentCategory.children.forEach(child => {
            const childElement = this.createCategoryElement(child, 0);
            this.categoryTreeContainer.appendChild(childElement);
        });
    }

    updateCategorySelectionUI() {
        // 更新所有radio的checked状态和selected类
        document.querySelectorAll('.category-tree input[type="radio"], #category-tree-container input[type="radio"]').forEach(r => {
            const optionDiv = r.closest('.category-option');
            if (this.selectedCategory && parseInt(r.dataset.categoryId) === this.selectedCategory.id) {
                r.checked = true;
                if (optionDiv) optionDiv.classList.add('selected');
            } else {
                r.checked = false;
                if (optionDiv) optionDiv.classList.remove('selected');
            }
        });
    }

    filterCategories(categories, searchQuery) {
        const results = [];

        categories.forEach(category => {
            const matches = category.name.toLowerCase().includes(searchQuery);
            const hasMatchingChildren = category.children && category.children.length > 0 &&
                this.filterCategories(category.children, searchQuery).length > 0;

            if (matches || hasMatchingChildren) {
                if (matches) {
                    results.push(category);
                } else if (hasMatchingChildren) {
                    // 包含匹配的子类别
                    const filtered = { ...category };
                    filtered.children = this.filterCategories(category.children, searchQuery);
                    results.push(filtered);
                }
            }
        });

        return results;
    }

    createCategoryElement(category, level = 0) {
        const container = document.createElement('div');
        container.className = `category-item level-${level}`;

        const isSelected = this.selectedCategory && this.selectedCategory.id === category.id;
        // 判断是否有子类别（不是最后一级）
        const hasChildren = category.children && category.children.length > 0;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = `category-option ${isSelected ? 'selected' : ''} ${hasChildren ? 'has-children' : ''}`;
        categoryDiv.style.paddingLeft = `${level * 20}px`;

        // 如果有子类别，禁用选择
        const disabledAttr = hasChildren ? 'disabled' : '';
        const radioClass = hasChildren ? 'disabled-radio' : '';
        const radioId = `category-${category.id}-${level}`;

        categoryDiv.innerHTML = `
            <input type="radio" id="${radioId}" name="category" value="${category.id}" data-category-id="${category.id}" ${isSelected ? 'checked' : ''} ${disabledAttr} class="${radioClass}">
            <label for="${radioId}" class="${hasChildren ? 'disabled-label' : ''}">${this.escapeHtml(category.name)}</label>
        `;

        const radio = categoryDiv.querySelector('input[type="radio"]');

        // 只有没有子类别的项才能被选择
        if (!hasChildren) {
            // 点击整个选项区域时，切换 radio 状态
            categoryDiv.addEventListener('click', (e) => {
                // 避免重复触发事件
                if (e.target.tagName === 'INPUT') return;
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            });

            radio.addEventListener('change', () => {
                this.selectedCategory = category;
                this.updateCategorySelectionUI();
            });
        } else {
            // 有子类别的项显示提示
            categoryDiv.addEventListener('click', (e) => {
                e.preventDefault();
                alert('请选择最后一级的类别');
            });
        }

        container.appendChild(categoryDiv);

        // 如果有子类别，递归渲染
        if (hasChildren) {
            category.children.forEach(child => {
                const childElement = this.createCategoryElement(child, level + 1);
                container.appendChild(childElement);
            });
        }

        return container;
    }

    confirmCategorySelectionHandler() {
        console.log('confirmCategorySelectionHandler called with selectedCategory:', this.selectedCategory);

        if (!this.selectedCategory) {
            alert('请选择一个类别');
            return;
        }

        // 验证选中的类别是最后一级（没有子类别）
        const hasChildren = this.selectedCategory.children && this.selectedCategory.children.length > 0;
        if (hasChildren) {
            alert('请选择最后一级的类别');
            return;
        }

        // 更新隐藏的输入字段
        if (this.currentCategoryTarget === 'add') {
            this.taskCategory.value = this.selectedCategory.name;
            this.selectedCategoryDisplay.textContent = this.selectedCategory.name;
        } else if (this.currentCategoryTarget === 'edit') {
            this.editTaskCategory.value = this.selectedCategory.name;
            this.editSelectedCategoryDisplay.textContent = this.selectedCategory.name;
        }

        this.hideCategorySelector();
    }

    // 删除任务相关方法
    showDeleteConfirmModal(task) {
        this.currentDeletingTaskId = task.id;
        this.deleteConfirmTask.textContent = task.title;
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.style.display = 'block';
        }

        // 让删除按钮获得焦点
        setTimeout(() => {
            if (this.confirmDeleteBtn) {
                this.confirmDeleteBtn.focus();
            }
        }, 100);
    }

    hideDeleteConfirmModal() {
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.style.display = 'none';
        }
        this.currentDeletingTaskId = null;
    }

    async confirmDeleteTask() {
        if (!this.currentDeletingTaskId) return;

        try {
            await this.taskManager.deleteTask(this.currentDeletingTaskId);
            console.log('Task deleted successfully');
            this.hideDeleteConfirmModal();
            this.render();
        } catch (error) {
            console.error('Delete task error:', error);
            alert('删除任务失败: ' + error.message);
        }
    }
}

window.app = new TodoApp();