import { parseTemplate } from '../src/utils/templateParser';

const template = `
{{#if show}}
  Outer True
  {{#each items}}
    Item {{@index}}: {{this}}
    {{#if @index == 1}}
      (This is the second item!)
    {{else}}
      (Not the second item)
    {{/if}}
    {{#if @first}} - First! {{/if}}
    {{#if @last}} - Last! {{/if}}
  {{/each}}
{{else}}
  Outer False
{{/if}}
`;

const data = { 
  show: true, 
  items: ['Apple', 'Banana', 'Cherry'] 
};

console.log('--- RENDERING ---');
const result = parseTemplate(template, data);
console.log(result);
console.log('--- DONE ---');
