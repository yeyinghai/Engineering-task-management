// 标准Word文档导出功能
class StandardWordExporter {
    constructor() {
        this.relationships = [];
        this.relId = 1;
    }

    // 生成Word文档的document.xml内容
    generateDocumentXML(content) {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
            xmlns:wp15="http://schemas.microsoft.com/office/word/2012/wordprocessingDrawing"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            mc:Ignorable="wp14 wp15">
    <w:body>
        ${content}
        <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
            <w:cols w:space="708"/>
            <w:docGrid w:linePitch="360"/>
        </w:sectPr>
    </w:body>
</w:document>`;
    }

    // 创建段落
    createParagraph(text, style = {}) {
        const { bold = false, size = 24, alignment = 'left', spacing = {} } = style;

        let alignmentXML = '';
        if (alignment === 'center') {
            alignmentXML = '<w:jc w:val="center"/>';
        } else if (alignment === 'right') {
            alignmentXML = '<w:jc w:val="right"/>';
        }

        let spacingXML = '';
        if (spacing.before || spacing.after) {
            spacingXML = `<w:spacing ${spacing.before ? `w:before="${spacing.before}"` : ''} ${spacing.after ? `w:after="${spacing.after}"` : ''}/>`;
        }

        return `
        <w:p>
            <w:pPr>
                ${alignmentXML}
                ${spacingXML}
            </w:pPr>
            <w:r>
                <w:rPr>
                    ${bold ? '<w:b/><w:bCs/>' : ''}
                    <w:sz w:val="${size}"/>
                    <w:szCs w:val="${size}"/>
                    <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/>
                </w:rPr>
                <w:t xml:space="preserve">${this.escapeXML(text)}</w:t>
            </w:r>
        </w:p>`;
    }

    // 创建表格
    createTable(headers, rows) {
        const headerCells = headers.map(header => `
            <w:tc>
                <w:tcPr>
                    <w:tcW w:w="1600" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>
                    <w:tcBorders>
                        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    </w:tcBorders>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:jc w:val="center"/></w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:b/><w:bCs/>
                            <w:sz w:val="22"/>
                            <w:szCs w:val="22"/>
                            <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/>
                        </w:rPr>
                        <w:t>${this.escapeXML(header)}</w:t>
                    </w:r>
                </w:p>
            </w:tc>`).join('');

        const dataRows = rows.map(row => {
            const cells = row.map(cell => `
            <w:tc>
                <w:tcPr>
                    <w:tcW w:w="1600" w:type="dxa"/>
                    <w:tcBorders>
                        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    </w:tcBorders>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:jc w:val="center"/></w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:sz w:val="20"/>
                            <w:szCs w:val="20"/>
                            <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/>
                        </w:rPr>
                        <w:t>${this.escapeXML(cell)}</w:t>
                    </w:r>
                </w:p>
            </w:tc>`).join('');

            return `<w:tr>${cells}</w:tr>`;
        }).join('');

        return `
        <w:tbl>
            <w:tblPr>
                <w:tblStyle w:val="TableGrid"/>
                <w:tblW w:w="0" w:type="auto"/>
                <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
            </w:tblPr>
            <w:tblGrid>
                ${headers.map(() => '<w:gridCol w:w="1600"/>').join('')}
            </w:tblGrid>
            <w:tr>
                ${headerCells}
            </w:tr>
            ${dataRows}
        </w:tbl>`;
    }

    // 转义XML特殊字符
    escapeXML(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // 生成完整的Word文档内容
    async generateWordDocument(data) {
        const { title, dateRange, generateTime, stats, workload, categories, tasks } = data;

        let content = '';

        // 标题
        content += this.createParagraph(title, {
            bold: true,
            size: 32,
            alignment: 'center',
            spacing: { after: '400' }
        });

        // 统计时间
        content += this.createParagraph(dateRange, {
            bold: true,
            size: 24,
            alignment: 'center',
            spacing: { after: '300' }
        });

        // 生成时间
        content += this.createParagraph(generateTime, {
            size: 20,
            alignment: 'right',
            spacing: { after: '400' }
        });

        // 总体统计
        content += this.createParagraph('一、总体统计', {
            bold: true,
            size: 28,
            spacing: { before: '300', after: '200' }
        });
        content += this.createParagraph(`总任务数：${stats.total} 个`, {
            size: 24,
            spacing: { after: '150' }
        });
        content += this.createParagraph(`已完成：${stats.completed} 个`, {
            size: 24,
            spacing: { after: '150' }
        });
        content += this.createParagraph(`进行中：${stats.inProgress} 个`, {
            size: 24,
            spacing: { after: '150' }
        });
        content += this.createParagraph(`待办：${stats.pending} 个`, {
            size: 24,
            spacing: { after: '300' }
        });

        // 人员工作量统计
        content += this.createParagraph('二、人员工作量统计', {
            bold: true,
            size: 28,
            spacing: { before: '300', after: '200' }
        });

        if (workload.length > 0) {
            workload.forEach(([name, count]) => {
                content += this.createParagraph(`${name}：${count} 个任务`, {
                    size: 24,
                    spacing: { after: '150' }
                });
            });
        } else {
            content += this.createParagraph('该时间段内没有分配任务', {
                size: 24,
                spacing: { after: '150' }
            });
        }

        // 类别分布统计
        content += this.createParagraph('三、任务类别分布', {
            bold: true,
            size: 28,
            spacing: { before: '300', after: '200' }
        });

        if (categories.length > 0) {
            categories.forEach(([category, count]) => {
                content += this.createParagraph(`${category}：${count} 个任务`, {
                    size: 24,
                    spacing: { after: '150' }
                });
            });
        } else {
            content += this.createParagraph('该时间段内没有任务', {
                size: 24,
                spacing: { after: '150' }
            });
        }

        // 任务详细列表
        if (tasks.length > 0) {
            content += this.createParagraph('四、任务详细列表', {
                bold: true,
                size: 28,
                spacing: { before: '300', after: '200' }
            });

            const headers = ['序号', '任务标题', '类别', '状态', '分配人员', '创建时间'];
            const rows = tasks.map((task, index) => [
                (index + 1).toString(),
                task.title,
                task.category || '一般',
                this.getStatusText(task.status),
                this.formatAssignees(task.assignees),
                task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '-'
            ]);

            content += this.createTable(headers, rows);
        }

        return this.generateDocumentXML(content);
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

    // 创建标准的docx文件
    async createDocxBlob(xmlContent) {
        if (typeof window.JSZip !== 'undefined') {
            // 使用JSZip创建真正的docx文件
            return await this.createRealDocx(xmlContent);
        } else {
            // 备选方案：创建HTML格式的Word兼容文件
            console.warn('JSZip未加载，使用HTML格式作为备选方案');
            return this.createHtmlWordDoc(xmlContent);
        }
    }

    // 使用JSZip创建真正的docx文件
    async createRealDocx(xmlContent) {
        const zip = new window.JSZip();

        // [Content_Types].xml
        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

        // _rels/.rels
        const mainRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

        // word/_rels/document.xml.rels
        const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

        // word/styles.xml
        const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault>
            <w:rPr>
                <w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/>
                <w:sz w:val="24"/>
                <w:szCs w:val="24"/>
            </w:rPr>
        </w:rPrDefault>
        <w:pPrDefault/>
    </w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
    </w:style>
    <w:style w:type="table" w:default="1" w:styleId="TableNormal">
        <w:name w:val="Normal Table"/>
        <w:uiPriority w:val="99"/>
        <w:semiHidden/>
        <w:unhideWhenUsed/>
        <w:tblPr>
            <w:tblInd w:w="0" w:type="dxa"/>
            <w:tblCellMar>
                <w:top w:w="0" w:type="dxa"/>
                <w:left w:w="108" w:type="dxa"/>
                <w:bottom w:w="0" w:type="dxa"/>
                <w:right w:w="108" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>
    </w:style>
    <w:style w:type="table" w:styleId="TableGrid">
        <w:name w:val="Table Grid"/>
        <w:basedOn w:val="TableNormal"/>
        <w:uiPriority w:val="39"/>
        <w:tblPr>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
        </w:tblPr>
    </w:style>
</w:styles>`;

        // docProps/core.xml
        const coreProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>施工任务管理系统统计报表</dc:title>
    <dc:creator>施工任务管理系统</dc:creator>
    <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
    <dc:language>zh-CN</dc:language>
</cp:coreProperties>`;

        // docProps/app.xml
        const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Application>施工任务管理系统</Application>
    <DocSecurity>0</DocSecurity>
    <ScaleCrop>false</ScaleCrop>
    <SharedDoc>false</SharedDoc>
    <HyperlinksChanged>false</HyperlinksChanged>
    <AppVersion>1.0</AppVersion>
</Properties>`;

        // 添加所有文件到ZIP
        zip.file('[Content_Types].xml', contentTypes);
        zip.file('_rels/.rels', mainRels);
        zip.file('word/document.xml', xmlContent);
        zip.file('word/_rels/document.xml.rels', wordRels);
        zip.file('word/styles.xml', styles);
        zip.file('docProps/core.xml', coreProps);
        zip.file('docProps/app.xml', appProps);

        // 生成标准的docx文件
        return await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    }

    // 备选方案：创建HTML格式的Word兼容文件
    createHtmlWordDoc(data) {
        const { title, dateRange, generateTime, stats, workload, categories, tasks } = data;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>施工任务管理系统统计报表</title>
    <style>
        body {
            font-family: '宋体', SimSun, serif;
            margin: 2cm;
            line-height: 1.5;
        }
        .title {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .subtitle {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .generate-time {
            text-align: right;
            font-size: 10pt;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
        }
        .content {
            font-size: 12pt;
            margin: 8px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
        }
        th {
            background-color: #D9D9D9;
            font-weight: bold;
        }
        @media print {
            body { margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="title">${title}</div>
    <div class="subtitle">${dateRange}</div>
    <div class="generate-time">${generateTime}</div>

    <div class="section-title">一、总体统计</div>
    <div class="content">总任务数：${stats.total} 个</div>
    <div class="content">已完成：${stats.completed} 个</div>
    <div class="content">进行中：${stats.inProgress} 个</div>
    <div class="content">待办：${stats.pending} 个</div>

    <div class="section-title">二、人员工作量统计</div>
    ${workload.length > 0 ?
        workload.map(([name, count]) => `<div class="content">${name}：${count} 个任务</div>`).join('') :
        '<div class="content">该时间段内没有分配任务</div>'
    }

    <div class="section-title">三、任务类别分布</div>
    ${categories.length > 0 ?
        categories.map(([category, count]) => `<div class="content">${category}：${count} 个任务</div>`).join('') :
        '<div class="content">该时间段内没有任务</div>'
    }

    ${tasks.length > 0 ? `
    <div class="section-title">四、任务详细列表</div>
    <table>
        <thead>
            <tr>
                <th>序号</th>
                <th>任务标题</th>
                <th>类别</th>
                <th>状态</th>
                <th>分配人员</th>
                <th>创建时间</th>
            </tr>
        </thead>
        <tbody>
            ${tasks.map((task, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(task.title)}</td>
                <td>${this.escapeHtml(task.category || '一般')}</td>
                <td>${this.escapeHtml(this.getStatusText(task.status))}</td>
                <td>${this.escapeHtml(this.formatAssignees(task.assignees))}</td>
                <td>${task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '-'}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}
</body>
</html>`;

        return new Blob([htmlContent], {
            type: 'application/msword'
        });
    }

    // HTML转义
    escapeHtml(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 下载文件
    downloadFile(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            // 添加到文档并触发下载
            document.body.appendChild(a);
            a.click();

            // 延迟清理，确保下载开始
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('下载文件失败:', error);
            alert('文件下载失败，请稍后重试');
        }
    }
}

export default StandardWordExporter;