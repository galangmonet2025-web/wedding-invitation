/**
 * Utility to parse HTML templates with dynamic data binding.
 * Supports:
 * - Simple variable replacement: {{variable}}, {{this.prop}}, {{@index}}
 * - Conditional blocks: {{#if condition}}...{{else}}...{{/if}}
 * - Array looping: {{#each array_name}}...{{/each}}
 * - Conditional operators: ==, !=
 * - Loop metadata: @index, @index_plus_1, @first, @last
 */
export const parseTemplate = (html: string, data: Record<string, any>): string => {
    
    const evaluate = (condition: string): boolean => {
        const trimmed = condition.trim();
        
        // Handle modulo expressions: key % divisor == result or key % divisor != result
        const moduloRegex = /(@?[a-zA-Z0-9_]+)\s*%\s*(\d+)\s*(==|!=)\s*(\d+)/;
        const modMatch = trimmed.match(moduloRegex);
        if (modMatch) {
            const [_, key, divisor, op, result] = modMatch;
            const actualValue = Number(data[key]);
            const modResult = actualValue % Number(divisor);
            const expectedResult = Number(result);
            return op === '== text text' || op === '==' ? modResult === expectedResult : modResult !== expectedResult;
        }

        // Handle comparisons: key == value or key != value
        if (trimmed.includes(' == ')) {
            const [key, val] = trimmed.split(' == ').map(s => s.trim());
            const actualValue = data[key];
            const compareValue = val.replace(/['"]/g, '');
            return String(actualValue ?? '') === compareValue;
        }
        if (trimmed.includes(' != ')) {
            const [key, val] = trimmed.split(' != ').map(s => s.trim());
            const actualValue = data[key];
            const compareValue = val.replace(/['"]/g, '');
            return String(actualValue ?? '') !== compareValue;
        }

        const value = data[trimmed];
        return value !== undefined && value !== null && value !== '' && value !== false && (Array.isArray(value) ? value.length > 0 : true);
    };

    let output = html;

    // Process blocks (if, each, unless)
    const blockRegex = /\{\{\s*([#\^])(if|each|unless)\s+([^}]+)\}\}/g;
    let match;
    
    while ((match = blockRegex.exec(output)) !== null) {
        const type = match[1]; // # or ^
        const command = match[2]; // if, each, unless
        const expression = match[3].trim();
        const openTag = match[0];
        const startIndex = match.index;
        
        const closeTagStr = `{{/${command}}}`;
        
        // Find matching closing tag with depth tracking for nesting
        let depth = 1;
        let searchIndex = startIndex + openTag.length;
        let closingIndex = -1;
        
        while (depth > 0) {
            const nextOpen = output.indexOf(`{{#${command}`, searchIndex);
            const nextClose = output.indexOf(`{{/${command}}}`, searchIndex);
            
            if (nextClose === -1) break;
            
            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                searchIndex = nextOpen + 5;
            } else {
                depth--;
                searchIndex = nextClose + closeTagStr.length;
                if (depth === 0) closingIndex = nextClose;
            }
        }
        
        if (closingIndex !== -1) {
            const content = output.substring(startIndex + openTag.length, closingIndex);
            let replacement = '';
            
            if (command === 'if' || command === 'unless') {
                const isTruthy = evaluate(expression);
                const finalCondition = type === '^' ? !isTruthy : (command === 'unless' ? !isTruthy : isTruthy);
                
                // Find top-level {{else}} within this block
                let elseIndex = -1;
                let innerDepth = 0;
                for (let i = 0; i < content.length; i++) {
                    if (content.substring(i).startsWith('{{#if')) innerDepth++;
                    if (content.substring(i).startsWith('{{/if}}')) innerDepth--;
                    if (innerDepth === 0 && content.substring(i).startsWith('{{else}}')) {
                        elseIndex = i;
                        break;
                    }
                }

                if (elseIndex !== -1) {
                    const ifPart = content.substring(0, elseIndex);
                    const elsePart = content.substring(elseIndex + 8);
                    replacement = finalCondition ? parseTemplate(ifPart, data) : parseTemplate(elsePart, data);
                } else {
                    replacement = finalCondition ? parseTemplate(content, data) : '';
                }
            } else if (command === 'each') {
                const arr = data[expression];
                if (Array.isArray(arr)) {
                    replacement = arr.map((item, index) => {
                        const itemData: Record<string, any> = { 
                            ...data, 
                            this: item, 
                            '@index': index, 
                            '@index_plus_1': index + 1,
                            '@first': index === 0,
                            '@last': index === arr.length - 1,
                            '@even': index % 2 === 0,
                            '@odd': index % 2 !== 0
                        };
                        if (typeof item === 'object' && item !== null) {
                            Object.keys(item).forEach(key => {
                                itemData[`this.${key}`] = (item as any)[key];
                                // Also allow direct property access for convenience
                                if (itemData[key] === undefined) {
                                    itemData[key] = (item as any)[key];
                                }
                            });
                        }
                        return parseTemplate(content, itemData);
                    }).join('');
                }
            }
            
            output = output.substring(0, startIndex) + replacement + output.substring(closingIndex + closeTagStr.length);
            blockRegex.lastIndex = 0; // Restart regex search since string modified
        } else {
            blockRegex.lastIndex = startIndex + openTag.length;
        }
    }

    // Process Simple Variables: {{variable}}
    output = output.replace(/\{\{\s*(@?[a-zA-Z0-9_\.]+)\s*\}\}/g, (match, key) => {
        const val = data[key.trim()];
        if (val !== undefined && val !== null) {
            return typeof val === 'object' ? (val.url || val.id || JSON.stringify(val)) : String(val);
        }
        return ''; // Default to empty if not found
    });

    return output;
};
