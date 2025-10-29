import HybridDatabaseManager from './hybridDatabase.js';

// 这个文件作为向后兼容的入口，历史代码使用动态 import('./database.js')
// 现在直接导出 HybridDatabaseManager，保证既有接口（needsMigration、forceMigration 等）可用。

export default HybridDatabaseManager;
