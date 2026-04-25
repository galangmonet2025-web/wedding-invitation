import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export interface ExportColumn<T> {
    header: string;
    key: keyof T | string;
    render?: (item: T) => string;
}

export async function exportToExcel<T>(
    data: T[], 
    columns: ExportColumn<T>[], 
    filename: string, 
    sheetName: string = 'Data'
) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        const headerRow = worksheet.addRow(columns.map(c => c.header));
        
        // Style headers
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6A769' } // Gold theme
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add Data
        data.forEach(item => {
            const rowData = columns.map(c => {
                if (c.render) return c.render(item);
                const val = (item as any)[c.key as string];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            });
            const row = worksheet.addRow(rowData);
            
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                    right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
                };
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell!({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50); // Cap width at 50 to avoid crazy large columns
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${filename}.xlsx`);
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        toast.error('Gagal mengekspor data ke Excel');
    }
}

import { publicApi } from '@/core/api/endpoints';

async function getBase64Image(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function exportToPdf<T>(
    data: T[], 
    columns: ExportColumn<T>[], 
    filename: string, 
    title: string
) {
    const toastId = toast.loading('Menyiapkan file PDF...');
    try {
        let config = null;
        let logoBase64 = null;
        
        try {
            const res = await publicApi.getWebsiteConfig();
            if (res.success && res.data) {
                config = res.data;
                if (config.site_logo) {
                    logoBase64 = await getBase64Image(config.site_logo);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config for PDF footer', e);
        }

        const doc = new jsPDF('l', 'pt', 'a4'); 
        
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 40, 40);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 40, 60);

        const tableColumn = columns.map(c => c.header);
        const tableRows = data.map(item => {
            return columns.map(c => {
                if (c.render) return c.render(item);
                const val = (item as any)[c.key as string];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            });
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            margin: { bottom: 60 },
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 6,
                lineColor: [230, 230, 230],
                lineWidth: 0.5,
            },
            headStyles: {
                fillColor: [198, 167, 105], // Gold theme RGB
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            bodyStyles: {
                valign: 'middle'
            },
            didDrawPage: function (data) {
                if (config) {
                    const pageSize = doc.internal.pageSize;
                    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    
                    let yPos = pageHeight - 40;
                    const textX = pageWidth / 2;

                    // Tagline & URL
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    
                    const footerText = `${config.site_name} | ${config.tagline}\n${config.site_url}`;
                    
                    if (logoBase64) {
                        try {
                            const logoWidth = 24; 
                            const logoHeight = 24;
                            doc.addImage(logoBase64, 'PNG', textX - (logoWidth / 2), yPos - 26, logoWidth, logoHeight);
                        } catch (e) {
                            console.error('Error drawing image in PDF footer', e);
                        }
                    }

                    doc.text(footerText, textX, yPos + 6, { align: 'center' });
                }
            }
        });

        doc.save(`${filename}.pdf`);
        toast.success('PDF berhasil diunduh', { id: toastId });
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        toast.error('Gagal mengekspor data ke PDF', { id: toastId });
    }
}
