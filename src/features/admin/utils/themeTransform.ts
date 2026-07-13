// Shared "paste raw code" transforms used when importing a theme's authoring source
// (the src/sample-theme/<folder>/index.{html,js} files) into a stored theme template.
//
// These MUST match what ThemeEditorPage does in its own paste-raw flow, so that
// injecting a folder produces byte-identical templates to an admin pasting the same
// files into the editor and saving:
//   - HTML: data-var / data-img / data-bg / data-loop / data-if / data-unless
//           attributes are rewritten to {{var}} / {{#each}} / {{#if}} / {{#unless}}.
//           HTML that already uses {{...}} bindings passes through untouched.
//   - JS:   surrounding <script> tags are stripped (the host wraps JS in its own <script>).
//
// Runs in the browser only (uses DOMParser).

export function convertHtmlToHandlebars(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Convert data-var
    doc.querySelectorAll('[data-var]').forEach((el) => {
        const varName = el.getAttribute('data-var');
        el.removeAttribute('data-var');
        if (el.tagName === 'A' && (!el.getAttribute('href') || el.getAttribute('href') === '#' || el.getAttribute('href') === '')) {
            el.setAttribute('href', `{{${varName}}}`);
        } else {
            el.innerHTML = `{{${varName}}}`;
        }
    });

    // Convert data-img
    doc.querySelectorAll('[data-img]').forEach((el) => {
        const varName = el.getAttribute('data-img');
        el.removeAttribute('data-img');
        el.setAttribute('src', `{{${varName}}}`);
    });

    // Convert data-bg
    doc.querySelectorAll('[data-bg]').forEach((el) => {
        const varName = el.getAttribute('data-bg');
        el.removeAttribute('data-bg');
        const htmlEl = el as HTMLElement;
        const currentBg = htmlEl.style.backgroundImage;
        if (currentBg && currentBg.includes('url(')) {
            htmlEl.style.backgroundImage = currentBg.replace(/url\(['"]?[^)]+['"]?\)/gi, `url("{{${varName}}}")`);
        } else {
            htmlEl.style.backgroundImage = `url("{{${varName}}}")`;
        }
    });

    // Convert data-loop (reverse order to handle nesting)
    const loopNodes = Array.from(doc.querySelectorAll('[data-loop]'));
    for (let i = loopNodes.length - 1; i >= 0; i--) {
        const el = loopNodes[i];
        const loopVar = el.getAttribute('data-loop');
        el.removeAttribute('data-loop');
        if (el.children.length > 0) {
            const template = el.children[0].outerHTML;
            el.innerHTML = `\n{{#each ${loopVar}}}\n${template}\n{{/each}}\n`;
        } else {
            const template = el.innerHTML;
            el.innerHTML = `\n{{#each ${loopVar}}}\n${template}\n{{/each}}\n`;
        }
    }

    // Convert data-if (reverse order to handle nesting)
    const ifNodes = Array.from(doc.querySelectorAll('[data-if]'));
    for (let i = ifNodes.length - 1; i >= 0; i--) {
        const el = ifNodes[i];
        const condition = el.getAttribute('data-if');
        el.removeAttribute('data-if');
        const content = el.outerHTML;
        el.outerHTML = `\n{{#if ${condition}}}\n${content}\n{{/if}}\n`;
    }

    // Convert data-unless (reverse order to handle nesting)
    const unlessNodes = Array.from(doc.querySelectorAll('[data-unless]'));
    for (let i = unlessNodes.length - 1; i >= 0; i--) {
        const el = unlessNodes[i];
        const condition = el.getAttribute('data-unless');
        el.removeAttribute('data-unless');
        const content = el.outerHTML;
        el.outerHTML = `\n{{#unless ${condition}}}\n${content}\n{{/unless}}\n`;
    }

    const resultHtml = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
    return resultHtml.trim();
}

// Strip surrounding <script> wrappers from a theme JS bundle (mirrors the editor's
// paste-raw JS handling — the host injects its own <script id="theme-custom-js">).
export function cleanThemeJs(js: string): string {
    return (js || '').replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '');
}
