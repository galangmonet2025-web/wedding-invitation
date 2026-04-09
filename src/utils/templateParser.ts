/**
 * Utility to parse HTML templates with dynamic data binding.
 * Supports:
 * - Simple variable replacement: {{variable}}
 * - Conditional blocks: {{#if variable}}...{{/if}}
 * - Array looping: {{#each array_name}}...{{/each}}
 */
export const parseTemplate = (html: string, data: Record<string, any>): string => {
    let parsedHtml = html;

    // 1. Process Conditionals: {{#if condition}}...{{/if}} or {{#unless condition}}...{{/unless}}
    // Also supports {{^if condition}}...{{/if}} as shorthand for unless
    // Supports {{else}} within these blocks
    
    // Handler for truthiness evaluation
    const evaluate = (condition: string): boolean => {
        const value = data[condition];
        return value !== undefined && value !== null && value !== '' && value !== false && (Array.isArray(value) ? value.length > 0 : true);
    };

    // 1.1 Process {{#if ...}}...{{/if}}
    const ifRegex = /\{\{\s*#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
    parsedHtml = parsedHtml.replace(ifRegex, (match, condition, content) => {
        const isTruthy = evaluate(condition);
        const parts = content.split(/\{\{\s*else\s*\}\}/);
        if (parts.length > 1) {
            return isTruthy ? parts[0] : parts[1];
        }
        return isTruthy ? content : '';
    });

    // 1.2 Process {{#unless ...}}...{{/unless}} or {{#unless ...}}...{{/if}}
    const unlessRegex = /\{\{\s*#unless\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/(?:unless|if)\s*\}\}/g;
    parsedHtml = parsedHtml.replace(unlessRegex, (match, condition, content) => {
        const isTruthy = evaluate(condition);
        const parts = content.split(/\{\{\s*else\s*\}\}/);
        if (parts.length > 1) {
            return !isTruthy ? parts[0] : parts[1];
        }
        return !isTruthy ? content : '';
    });

    // 1.3 Process {{^if ...}}...{{/if}}
    const notIfRegex = /\{\{\s*\^if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
    parsedHtml = parsedHtml.replace(notIfRegex, (match, condition, content) => {
        const isTruthy = evaluate(condition);
        const parts = content.split(/\{\{\s*else\s*\}\}/);
        if (parts.length > 1) {
            return !isTruthy ? parts[0] : parts[1];
        }
        return !isTruthy ? content : '';
    });

    // 2. Process Loops: {{#each array_name}}...{{/each}}
    const eachRegex = /\{\{\s*#each\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g;
    parsedHtml = parsedHtml.replace(eachRegex, (match, arrayName, content) => {
        const arr = data[arrayName];
        if (!Array.isArray(arr) || arr.length === 0) return '';

        // Iterate over the array and replace variables within the loop block
        return arr.map((item: any) => {
            let itemHtml = content;
            if (typeof item === 'object' && item !== null) {
                // If it's an object, replace {{this.property}}
                Object.keys(item).forEach(key => {
                    const itemVarRegex = new RegExp(`\\{\\{\\s*this\\.${key}\\s*\\}\\}`, 'g');
                    itemHtml = itemHtml.replace(itemVarRegex, item[key] || '');
                });
            } else {
                // If it's a primitive, replace {{this}}
                const thisRegex = /\{\{\s*this\s*\}\}/g;
                itemHtml = itemHtml.replace(thisRegex, item || '');
            }
            return itemHtml;
        }).join('');
    });

    // 3. Process Simple Variables: {{variable}}
    Object.keys(data).forEach(key => {
        const varValue = data[key];
        // Only replace simple variables if they are not objects/arrays
        if (typeof varValue !== 'object') {
            const varRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            parsedHtml = parsedHtml.replace(varRegex, varValue !== undefined && varValue !== null ? String(varValue) : '');
        }
    });

    return parsedHtml;
};
